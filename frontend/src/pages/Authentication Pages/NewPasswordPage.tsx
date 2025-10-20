import React, { useState } from 'react';
import './AuthPages.css';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMessage('');

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    // TODO: Replace with backend reset password API
    setSuccessMessage('Password has been reset successfully!');
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  };

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  return (
    <div className="reset-container">
      <div className="reset-left">
        <div className="logo">ClarifAI</div>
        <div className="reset-text">

            <title>Forgot Password</title>
          <h2>
            Clarify your data.<br />Amplify your insight.
          </h2>
          <p>
            Join the ClarifAI data community and unlock AI-driven analytics and collaboration tools.
            It only takes a minute to start transforming your data with AI.
          </p>
        </div>
      </div>

      <div className="reset-right">
        <form className="reset-box" onSubmit={handleSubmit}>
          <h2>Create New Password</h2>
          <p className="subtitle">
            Enter your new password below. Make sure it’s strong and easy for you to remember.
          </p>

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              placeholder="Enter your new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleFieldBlur('password')}
              onFocus={() => setShowPasswordRequirements(true)}
              className={`form-input ${
                touchedFields.has('password') && validationError.includes('Password must be at least') ? 'error' : ''
              } ${
                touchedFields.has('password') && !validationError && password.length >= 8 ? 'success' : ''
              }`}
            />

            {confirmPassword && touchedFields.has('confirmPassword') && (
              <>
                {!passwordsMatch && (
                  <div className="field-error">Passwords do not match</div>
                )}
                {passwordsMatch && (
                  <div className="field-success">Passwords match!</div>
                )}
              </>
            )}

            <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => handleFieldBlur('confirmPassword')}
              className={`form-input ${
                touchedFields.has('confirmPassword') && !passwordsMatch && confirmPassword ? 'error' : ''
              } ${
                touchedFields.has('confirmPassword') && passwordsMatch ? 'success' : ''
              }`}
            />

            {confirmPassword && touchedFields.has('confirmPassword') && (
              <>
                {!passwordsMatch && (
                  <div className="field-error">Passwords do not match</div>
                )}
                {passwordsMatch && (
                  <div className="field-success">Passwords match!</div>
                )}
              </>
            )}       

            {/* ✅ Separate Password Requirement Styles */}
            {showPasswordRequirements && (
              <div className="reset-password-requirements">
                <p className="reset-req-title">Password must contain:</p>
                <ul className="reset-req-list">
                  <li className={password.length >= 8 ? 'met' : 'unmet'}>
                    At least 8 characters
                  </li>
                  <li className={/[a-z]/.test(password) ? 'met' : 'unmet'}>
                    One lowercase letter
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'met' : 'unmet'}>
                    One uppercase letter
                  </li>
                  <li className={/\d/.test(password) ? 'met' : 'unmet'}>
                    One number
                  </li>
                </ul>
              </div>
            )}
          </div>

          

            
          </div>

          {validationError && <p className="error">{validationError}</p>}
          {successMessage && <p className="success">{successMessage}</p>}

          <button type="submit" className="reset-btn">Reset Password</button>
          <button
            type="button"
            className="back-btn"
            onClick={() => window.history.back()}
          >
            Go Back
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
