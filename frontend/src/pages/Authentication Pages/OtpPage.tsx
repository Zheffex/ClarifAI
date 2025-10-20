import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import { authService } from '../../services/authService';
import './AuthPages.css';

const OtpPage: React.FC = () => {
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  // Get email passed from previous page (e.g., via navigate('/otp', { state: { email } }))
  const email = localStorage.getItem('email');

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonMessage, setButtonMessage] = useState('Verify Code');

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!email) {
    addNotification({
      type: 'error',
      title: 'Missing Email',
      message: 'No email address found. Please go back and request a new code.'
    });
    return;
  }

  if (!code || code.length !== 6) return;

  setIsSubmitting(true);
  setButtonMessage('Verifying...');

  try {
    const flow = localStorage.getItem('otpFlow') || 'register';

    if (flow === 'forgotPassword') {
      // ✅ Verify OTP for forgot password
      await authService.verifyForgotPasswordOtp(email, code);

      addNotification({
        type: 'success',
        title: 'OTP Verified',
        message: 'You can now reset your password.'
      });

      setButtonMessage('✅ Verified!');

      // ✅ Wait for user to see success, then navigate to New Password page
      setTimeout(() => {
        console.log("✅ Navigating to /new-password");
        navigate('/new-password');
      }, 1200);
    } else {
      // 🔹 Default registration OTP verification
      const response = await authService.verifyOtp(email, code);
      localStorage.setItem('token', response.token);

      addNotification({
        type: 'success',
        title: 'Verification Successful',
        message: 'Your account has been verified. Welcome!'
      });

      setButtonMessage('✅ Verified!');
      setTimeout(() => navigate('/dashboard'), 1200);
    }

  } catch (error: any) {
    addNotification({
      type: 'error',
      title: 'Verification Failed',
      message: error.message || 'Invalid or expired OTP.'
    });
    setButtonMessage('Verify Code');
  } finally {
    setIsSubmitting(false);
  }
};


  const handleResend = () => {
    addNotification({
      type: 'info',
      title: 'Verification Code Resent',
      message: 'A new 6-digit code has been sent to your email.'
    });
  };

  return (
    <div className="otp-container">
      {/* Left Info Section */}
      <div className="otp-info-section">
        <div className="otp-info-content">
          <h2 className="otp-heading">
            Clarify your data.<br />Amplify your insight.
          </h2>
          <p className="otp-description">
            Join the ClarifAI data community and unlock AI-driven analytics and collaboration tools.
            It only takes a minute to start transforming your data with AI.
          </p>
        </div>
      </div>

      {/* Right OTP Card */}
      <div className="otp-card">
        <div className="otp-header">
          <img src="/logo192.png" alt="ClarifAI" className="otp-logo" />
          <h2 className="otp-title">Verify Your Account.</h2>
          <p className="otp-subtitle">
            We’ve sent a 6-digit verification code to your email.<br />
            Enter it below to verify your account and access your dashboard.
          </p>
          <title>Verify Account</title>
        </div>

        <form className="otp-form" onSubmit={handleSubmit}>
          {/* Code Input */}
          <div className="otp-input-group">
            <label htmlFor="code" className="otp-label">
              Enter code <span className="otp-required">*</span>
            </label>
            <input
              type="text"
              id="code"
              name="code"
              className="otp-input"
              placeholder="Enter the 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Buttons */}
          <div className="otp-actions">
            <button
              type="submit"
              className={`otp-button ${code.length !== 6 ? 'disabled' : ''}`}
              disabled={code.length !== 6 || isSubmitting}
            >
              {buttonMessage}
            </button>

            <Link to="/forgot-password" className="otp-secondary-btn">
              Go back
            </Link>
          </div>

          {/* Footer */}
          <div className="otp-footer">
            <p>
              Didn’t receive the code? You can{' '}
              <button type="button" onClick={handleResend} className="otp-resend-link">
                resend it
              </button>{' '}
              after 10 minutes.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OtpPage;
