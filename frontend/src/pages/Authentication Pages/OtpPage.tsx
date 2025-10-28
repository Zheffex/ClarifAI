import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Clock,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import './AuthPages.css';

const OtpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, markEmailVerified } = useAuth();

  // Get email from localStorage or location state
  const email = localStorage.getItem('email') || location.state?.email;
  const otpFlow = localStorage.getItem('otpFlow') || 'register';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showEmail, setShowEmail] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Auto-submit when all fields are filled
  useEffect(() => {
    if (otp.every(digit => digit !== '') && !isSubmitting) {
      handleSubmit();
    }
  }, [otp]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtp[i] = pastedData[i];
    }
    
    setOtp(newOtp);
    setError('');
    
    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async () => {
    if (!email) {
      setError('No email address found. Please go back and request a new code.');
      return;
    }

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (otpFlow === 'forgotPassword') {
        // Verify OTP for forgot password
        await authService.verifyForgotPasswordOtp(email, otpCode);
        setSuccess(true);
        
        setTimeout(() => {
          navigate('/new-password');
        }, 1500);
      } else {
        // Default registration OTP verification
        const response = await authService.verifyOtp(email, otpCode);
        
        // Mark email as verified in the AuthContext
        markEmailVerified();
        
        setSuccess(true);
        
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        setError('Invalid or expired verification code. Please try again.');
      } else if (error.message.includes('Too many attempts')) {
        setError('Too many failed attempts. Please request a new code.');
      } else {
        setError(error.message || 'Verification failed. Please try again.');
      }
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    setError('');
    
    try {
      // Here you would call the resend OTP API
      // await authService.resendOtp(email);
      
      // For now, just show success message
      setResendCooldown(60); // 60 seconds cooldown
      
      // Simulate API call
      setTimeout(() => {
        setIsResending(false);
      }, 1000);
    } catch (error: any) {
      setError('Failed to resend code. Please try again.');
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPageTitle = () => {
    switch (otpFlow) {
      case 'forgotPassword':
        return 'Reset Password';
      case 'register':
      default:
        return 'Verify Account';
    }
  };

  const getPageSubtitle = () => {
    switch (otpFlow) {
      case 'forgotPassword':
        return 'Enter the verification code sent to your email to reset your password.';
      case 'register':
      default:
        return 'We\'ve sent a 6-digit verification code to your email. Enter it below to verify your account.';
    }
  };

  const getSuccessMessage = () => {
    switch (otpFlow) {
      case 'forgotPassword':
        return 'Code verified! Redirecting to password reset...';
      case 'register':
      default:
        return 'Account verified! Redirecting to login...';
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-wrapper">
          <div className="auth-info">
            <div className="info-card">
              <div className="info-content">
                <div className="logo-section">
                  <div className="logo-icon">
                    <Zap className="logo-svg" />
                  </div>
                  <h1 className="logo-text">ClarifAI</h1>
                </div>
                <div className="welcome-content">
                  <h2>Verification Complete!</h2>
                  <p>Your account has been successfully verified. Please log in to access your dashboard and start your data analysis journey.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-card">
            <div className="success-state">
              <div className="success-icon">
                <CheckCircle className="success-svg" />
              </div>
              <h2 className="success-title">Verification Successful!</h2>
              <p className="success-message">{getSuccessMessage()}</p>
              <div className="loading-spinner">
                <Loader2 className="spinner-icon spinning" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        {/* Left Info Section */}
        <div className="auth-info">
          <div className="info-card">
            <div className="info-content">
              <div className="logo-section">
                <div className="logo-icon">
                  <Shield className="logo-svg" />
                </div>
                <h1 className="logo-text">ClarifAI</h1>
              </div>
              <div className="welcome-content">
                <h2>Verify Your Identity</h2>
                <p>We're securing your account with email verification. This ensures only you can access your data and analytics.</p>
                <div className="features-list">
                  <div className="feature-item">
                    <Shield className="feature-icon" />
                    <span>Secure Verification</span>
                  </div>
                  <div className="feature-item">
                    <Mail className="feature-icon" />
                    <span>Email Protected</span>
                  </div>
                  <div className="feature-item">
                    <Zap className="feature-icon" />
                    <span>Quick Setup</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right OTP Card */}
        <div className="auth-card">
        <div className="auth-header">
          <div className="header-content">
            <h2 className="auth-title">{getPageTitle()}</h2>
            <p className="auth-subtitle">{getPageSubtitle()}</p>
            
            {/* Email Display */}
            {email && (
              <div className="email-display">
                <Mail className="email-icon" />
                <span className="email-text">
                  {showEmail ? email : `${email.substring(0, 3)}***@${email.split('@')[1]}`}
                </span>
                <button
                  type="button"
                  className="email-toggle"
                  onClick={() => setShowEmail(!showEmail)}
                >
                  {showEmail ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
                </button>
              </div>
            )}
          </div>
        </div>

        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* Error Message */}
          {error && (
            <div className="error-message general-error">
              <AlertCircle className="error-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* OTP Input Fields */}
          <div className="otp-input-container">
            <label className="otp-label">Verification Code</label>
            <div className="otp-inputs">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={`otp-input ${error ? 'error' : ''} ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  maxLength={1}
                  disabled={isSubmitting}
                  autoComplete="one-time-code"
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className={`auth-button ${otp.join('').length !== 6 ? 'disabled' : ''}`}
              disabled={otp.join('').length !== 6 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="btn-icon spinning" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify Code
                  <ArrowRight className="btn-icon" />
                </>
              )}
            </button>
          </div>

          {/* Resend Section */}
          <div className="resend-section">
            <p className="resend-text">
              Didn't receive the code?
            </p>
            <button
              type="button"
              className={`resend-button ${resendCooldown > 0 ? 'disabled' : ''}`}
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
            >
              {isResending ? (
                <>
                  <Loader2 className="btn-icon spinning" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Clock className="btn-icon" />
                  Resend in {formatTime(resendCooldown)}
                </>
              ) : (
                <>
                  <RefreshCw className="btn-icon" />
                  Resend Code
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="auth-footer">
            <Link to="/login" className="back-link">
              <ArrowLeft className="btn-icon" />
              Back to Login
            </Link>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default OtpPage;