import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { User, IUser } from '../models/User';
import { generateToken } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { otpService } from '../services/otpService';
import { EmailService } from '../services/emailService';
import { 
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  ValidationError,
  RecordNotFoundError,
  DuplicateRecordError,
  BusinessRuleViolationError,
  OperationNotAllowedError
} from '../types/errors';
import { 
  sanitizeInput, 
  handleValidationErrors,
  commonValidations 
} from '../middleware/validation';
import { 
  retryEmailOperation,
  withCircuitBreakerEmail 
} from '../middleware/retry';
import { 
  withGracefulDegradation 
} from '../middleware/gracefulDegradation';

// Register user
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, role } = req.body;
  const requestId = req.headers['x-request-id'] as string;
  const context = { requestId, operation: 'user_registration' };

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        throw new DuplicateRecordError('User', 'email', context);
      } else {
        // User exists but email not verified - we can send a new OTP
        const otpResult = await withGracefulDegradation(
          'email',
          () => otpService.generateAndSendOTP(email.toLowerCase(), firstName, 'email_verification'),
          context
        );

        res.status(200).json({
          success: true,
          data: {
            emailSent: otpResult.success,
            canResend: otpResult.canResend,
            nextResendTime: otpResult.nextResendTime
          },
          message: 'Account exists but not verified. A new verification code has been sent to your email.'
        });
        return;
      }
    }

    // Prevent admin role assignment during registration
    if (role === 'admin') {
      throw new BusinessRuleViolationError('Admin role cannot be assigned during registration', context);
    }

    // Create new user (inactive until email verified)
    const user = new User({
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by pre-save middleware
      firstName,
      lastName,
      role: role || 'viewer',
      preferences: {},
      isActive: false, // User starts inactive
      isEmailVerified: false
    });

    await user.save();

    // Generate and send OTP with graceful degradation
    const otpResult = await withGracefulDegradation(
      'email',
      () => otpService.generateAndSendOTP(email.toLowerCase(), firstName, 'email_verification'),
      context
    );

    logger.info(`New user registered (pending verification): ${user.email}`, {
      userId: user._id,
      email: user.email,
      context
    });

    res.status(201).json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        emailSent: otpResult.success,
        canResend: otpResult.canResend,
        nextResendTime: otpResult.nextResendTime
      },
      message: 'Registration successful! Please check your email for the verification code.'
    });
  } catch (error) {
    logger.error('User registration failed', {
      email,
      error: (error as Error).message,
      context
    });
    throw error;
  }
});

// Verify OTP
export const verifyOTP = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError('User not found', 404);
  if (user.isEmailVerified) throw new AppError('Email already verified', 400);

  const verificationResult = await otpService.verifyOTP(email, otp);
  if (!verificationResult.success) throw new AppError(verificationResult.message, 400);

  await user.markEmailAsVerified();
  const token = generateToken(user);
  await EmailService.sendWelcomeEmail(user.email, user.firstName);

  res.status(200).json({
    success: true,
    data: { 
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
        preferences: user.preferences,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token
    },
    message: 'Email verified successfully! Welcome to ClarifAI.'
  });
});

// Forgot password
export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(200).json({
      success: true,
      message: 'If an account with this email exists, a reset link has been sent.'
    });
    return;
  }

  try {
    const otpResult = await otpService.generateAndSendOTP(email.toLowerCase(), user.firstName, 'password_reset');

    logger.info(`Password reset link sent to: ${email}`, { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'If an account with this email exists, a reset link has been sent.',
      data: {
        canResend: otpResult.canResend,
        nextResendTime: otpResult.nextResendTime
      }
    });
  } catch (error) {
    logger.error('Failed to send password reset email', { email, error: (error as Error).message });
    throw new AppError('Failed to send password reset email', 500);
  }
});


// Resend OTP
export const resendOTP = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  // Find user
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if email already verified
  if (user.isEmailVerified) {
    throw new AppError('Email already verified', 400);
  }

  // Generate and send new OTP
  const otpResult = await otpService.generateAndSendOTP(email, user.firstName, 'email_verification');

  if (!otpResult.success) {
    throw new AppError(otpResult.message, 500);
  }

  logger.info(`OTP resent to: ${email}`);

  res.status(200).json({
    success: true,
    message: 'Verification code sent to your email.',
    data: {
      email: email.toLowerCase(),
      canResend: otpResult.canResend,
      nextResendTime: otpResult.nextResendTime
    }
  });
});

// Login user
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const requestId = req.headers['x-request-id'] as string;
  const context = { requestId, operation: 'user_login' };

  try {
    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new InvalidCredentialsError(context);
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Resend OTP if user exists but email not verified
      const otpResult = await withGracefulDegradation(
        'email',
        () => otpService.generateAndSendOTP(email, user.firstName, 'email_verification'),
        context
      );

      throw new AuthenticationError('Please verify your email first. We have sent a new verification code to your email.', context);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new OperationNotAllowedError('login', 'Account has been deactivated', context);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError(context);
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user);

    // Remove password from response
    const userResponse = {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      preferences: user.preferences,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    logger.info(`User logged in: ${user.email}`, {
      userId: user._id,
      email: user.email,
      context
    });

    res.json({
      success: true,
      data: {
        user: userResponse,
        token
      },
      message: 'Login successful'
    });
  } catch (error) {
    logger.error('User login failed', {
      email,
      error: (error as Error).message,
      context
    });
    throw error;
  }
});

// Logout user (client-side token removal, optional server-side blacklisting)
export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // In a stateless JWT implementation, logout is primarily handled client-side
  // Here we can log the logout event and potentially blacklist the token if needed
  
  const user = req.user as IUser;
  if (user) {
    logger.info(`User logged out: ${user.email}`);
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user profile
export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;

  const userResponse = {
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    role: user.role,
    organizationId: user.organizationId,
    preferences: user.preferences,
    lastLogin: user.lastLogin,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  res.json({
    success: true,
    data: { user: userResponse }
  });
});

// Update user profile
export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { firstName, lastName, preferences } = req.body;

  // Update allowed fields
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (preferences !== undefined) user.preferences = { ...user.preferences, ...preferences };

  await user.save();

  const userResponse = {
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    role: user.role,
    organizationId: user.organizationId,
    preferences: user.preferences,
    lastLogin: user.lastLogin,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  logger.info(`User profile updated: ${user.email}`);

  res.json({
    success: true,
    data: { user: userResponse },
    message: 'Profile updated successfully'
  });
});

// Change password
export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { currentPassword, newPassword } = req.body;

  // Get user with password hash
  const userWithPassword = await User.findById(user._id).select('+passwordHash');
  if (!userWithPassword) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await userWithPassword.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Update password
  userWithPassword.passwordHash = newPassword; // Will be hashed by pre-save middleware
  await userWithPassword.save();

  logger.info(`Password changed for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

// Search users by query (for collaboration)
export const searchUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { q, limit = '10', page = '1' } = req.query;
  
  if (!q || typeof q !== 'string') {
    throw new AppError('Query parameter "q" is required', 400);
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  // Validate pagination parameters
  if (pageNum < 1) {
    throw new AppError('Page must be greater than 0', 400);
  }
  if (limitNum < 1 || limitNum > 50) {
    throw new AppError('Limit must be between 1 and 50', 400);
  }

  // Search for users with email, firstName, or lastName containing the query string
  const searchRegex = { $regex: q, $options: 'i' };
  const searchQuery = {
    $and: [
      {
        $or: [
          { email: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex }
        ]
      },
      { isActive: true }
    ]
  };

  // Get total count for pagination
  const totalUsers = await User.countDocuments(searchQuery);
  const totalPages = Math.ceil(totalUsers / limitNum);

  // Search for users
  const users = await User.find(searchQuery)
    .select('firstName lastName email')
    .skip(skip)
    .limit(limitNum)
    .sort({ firstName: 1, lastName: 1 });

  res.json({
    success: true,
    data: { 
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalUsers,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    }
  });
});

// Validation rules for OTP verification
export const validateVerifyOTP = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
];

export const validateResendOTP = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

// Enhanced validation rules using new validation middleware
export const validateRegister = [
  sanitizeInput,
  ...commonValidations.userRegistration,
  handleValidationErrors
];

export const validateLogin = [
  sanitizeInput,
  ...commonValidations.userLogin,
  handleValidationErrors
];

export const validateUpdateProfile = [
  sanitizeInput,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('First name contains invalid characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('Last name contains invalid characters'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  handleValidationErrors
];

export const validateChangePassword = [
  sanitizeInput,
  ...commonValidations.passwordChange,
  handleValidationErrors
];


export const validateSearchUsers = [
  sanitizeInput,
  ...commonValidations.search,
  ...commonValidations.pagination,
  handleValidationErrors
];