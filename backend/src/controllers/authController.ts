import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { User, IUser } from '../models/User';
import { generateToken } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { otpService } from '../services/otpService';
import { EmailService } from '../services/emailService';

// Register user
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new AppError('User with this email already exists', 400);
    } else {
      // User exists but email not verified - we can send a new OTP
      const otpResult = await otpService.generateAndSendOTP(email.toLowerCase(), firstName, 'email_verification');

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
    throw new AppError('Admin role cannot be assigned during registration', 400);
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

  // Generate and send OTP
  const otpResult = await otpService.generateAndSendOTP(email.toLowerCase(), firstName, 'email_verification');

  logger.info(`New user registered (pending verification): ${user.email}`);

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
});

// Verify OTP - Step 2: Complete registration
export const verifyOTP = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;

  // Find user
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if email already verified
  if (user.isEmailVerified) {
    throw new AppError('Email already verified', 400);
  }

  // Verify OTP
  const verificationResult = await otpService.verifyOTP(email, otp);
  if (!verificationResult.success) {
    throw new AppError(verificationResult.message, 400);
  }

  // Mark email as verified and activate user
  await user.markEmailAsVerified();

  // Generate token for the verified user
  const token = generateToken(user);

  // Send welcome email
  await EmailService.sendWelcomeEmail(user.email, user.firstName);

  // Remove password from response
  const userResponse = {
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
  };

  logger.info(`Email verified and user activated: ${user.email}`);

  res.status(200).json({
    success: true,
    data: {
      user: userResponse,
      token
    },
    message: 'Email verified successfully! Welcome to ClarifAI.'
  });
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

  // Find user and include password for comparison
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    // Resend OTP if user exists but email not verified
    const otpResult = await otpService.generateAndSendOTP(email, user.firstName, 'email_verification');

    throw new AppError('Please verify your email first. We have sent a new verification code to your email.', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Account has been deactivated', 401);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
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

  logger.info(`User logged in: ${user.email}`);

  res.json({
    success: true,
    data: {
      user: userResponse,
      token
    },
    message: 'Login successful'
  });
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

// Validation rules
export const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('role')
    .optional()
    .isIn(['analyst', 'viewer'])
    .withMessage('Role must be analyst or viewer')
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
];

export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Validation error handler middleware
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    next(new AppError(errorMessages.join('. '), 400));
    return;
  }
  next();
};