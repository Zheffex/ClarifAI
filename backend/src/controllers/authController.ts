import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { User, IUser } from '../models/User';
import { generateToken } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';

// Register user
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Prevent admin role assignment during registration
  if (role === 'admin') {
    throw new AppError('Admin role cannot be assigned during registration', 400);
  }

  // Create new user
  const user = new User({
    email: email.toLowerCase(),
    passwordHash: password, // Will be hashed by pre-save middleware
    firstName,
    lastName,
    role: role || 'viewer',
    preferences: {},
    isActive: true
  });

  await user.save();

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
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    data: {
      user: userResponse,
      token
    },
    message: 'User registered successfully'
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

// Search users by email (for collaboration)
export const searchUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.query;
  
  if (!email || typeof email !== 'string') {
    throw new AppError('Email query parameter is required', 400);
  }

  // Search for users with email containing the query string
  const users = await User.find({
    email: { $regex: email, $options: 'i' },
    isActive: true
  })
  .select('firstName lastName email')
  .limit(10);

  res.json({
    success: true,
    data: { users }
  });
});

// Validation rules
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