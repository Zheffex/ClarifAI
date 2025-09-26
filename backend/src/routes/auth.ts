import { Router } from 'express';
import {
  register,
  verifyOTP,
  resendOTP,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  searchUsers,
  validateRegister,
  validateVerifyOTP,
  validateResendOTP,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  handleValidationErrors
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import {requirePermission} from "../middleware/rbac";

const router = Router();

// Public routes
router.post('/register', validateRegister, handleValidationErrors, register);
router.post('/verify-otp', validateVerifyOTP, handleValidationErrors, verifyOTP);
router.post('/resend-otp', validateResendOTP, handleValidationErrors, resendOTP);
router.post('/login', validateLogin, handleValidationErrors, login);
// Protected routes  
router.post('/logout', 
  authenticate, 
  logout
);

router.get('/me', 
  authenticate, 
  requirePermission('profile:read'), 
  getProfile
);

router.put('/profile', 
  authenticate, 
  requirePermission('profile:update'),
  validateUpdateProfile, 
  handleValidationErrors, 
  updateProfile
);

router.post('/change-password', 
  authenticate, 
  requirePermission('profile:update'),
  validateChangePassword, 
  handleValidationErrors, 
  changePassword
);

router.get('/search', 
  authenticate, 
  requirePermission('collaboration:read'),
  searchUsers
);

export default router;