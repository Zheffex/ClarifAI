import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { RegisterData } from '../../types';
import { useNavigate } from 'react-router-dom';
import './AuthPages.css';

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const { addNotification } = useNotification();
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'viewer'
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters long';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    return undefined;
  };

  const validateConfirmPassword = (confirmPass: string, password: string): string | undefined => {
    if (!confirmPass) return 'Please confirm your password';
    if (confirmPass !== password) return 'Passwords do not match';
    return undefined;
  };

  const validateName = (name: string, field: string): string | undefined => {
    if (!name.trim()) return `${field} is required`;
    if (name.trim().length < 2) return `${field} must be at least 2 characters long`;
    if (!/^[a-zA-Z\s]+$/.test(name)) return `${field} can only contain letters and spaces`;
    return undefined;
  };

  const validateForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    errors.email = validateEmail(formData.email);
    errors.password = validatePassword(formData.password);
    errors.confirmPassword = validateConfirmPassword(confirmPassword, formData.password);
    errors.firstName = validateName(formData.firstName, 'First name');
    errors.lastName = validateName(formData.lastName, 'Last name');
    
    // Remove undefined errors
    Object.keys(errors).forEach(key => {
      if (errors[key as keyof ValidationErrors] === undefined) {
        delete errors[key as keyof ValidationErrors];
      }
    });
    
    return errors;
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
    
    const errors = { ...validationErrors };
    
    switch (fieldName) {
      case 'email':
        const emailError = validateEmail(formData.email);
        if (emailError) errors.email = emailError;
        else delete errors.email;
        break;
      case 'password':
        const passwordError = validatePassword(formData.password);
        if (passwordError) errors.password = passwordError;
        else delete errors.password;
        // Also revalidate confirm password if it was touched
        if (touchedFields.has('confirmPassword')) {
          const confirmError = validateConfirmPassword(confirmPassword, formData.password);
          if (confirmError) errors.confirmPassword = confirmError;
          else delete errors.confirmPassword;
        }
        break;
      case 'confirmPassword':
        const confirmError = validateConfirmPassword(confirmPassword, formData.password);
        if (confirmError) errors.confirmPassword = confirmError;
        else delete errors.confirmPassword;
        break;
      case 'firstName':
        const firstNameError = validateName(formData.firstName, 'First name');
        if (firstNameError) errors.firstName = firstNameError;
        else delete errors.firstName;
        break;
      case 'lastName':
        const lastNameError = validateName(formData.lastName, 'Last name');
        if (lastNameError) errors.lastName = lastNameError;
        else delete errors.lastName;
        break;
    }
    
    setValidationErrors(errors);
  };

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    
    if (score <= 2) return { score, label: 'Weak', color: '#ef4444' };
    if (score <= 4) return { score, label: 'Medium', color: '#f59e0b' };
    return { score, label: 'Strong', color: '#10b981' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[name as keyof ValidationErrors];
        return updated;
      });
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    
    // Clear validation error when user starts typing
    if (validationErrors.confirmPassword) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated.confirmPassword;
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all fields
    const errors = validateForm();
    setValidationErrors(errors);
    setTouchedFields(new Set(['email', 'password', 'confirmPassword', 'firstName', 'lastName']));

    if (Object.keys(errors).length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the errors in the form before submitting.'
      });
      setIsSubmitting(false);
      return;
    }

    try {

      await register(formData);

      addNotification({
        type: 'success',
        title: 'Registration Successful',
        message: 'Welcome to ClarifAI! Your account has been created.'

      });
      localStorage.setItem('email', formData.email)
        navigate('/verify');

    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Registration Failed',
        message: error.message || 'Failed to create account. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = 
    !Object.keys(validationErrors).length &&
    formData.email && 
    formData.password && 
    formData.firstName && 
    formData.lastName && 
    confirmPassword &&
    formData.password === confirmPassword;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <title>Register</title>
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join ClarifAI and start analyzing your data with AI.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                className={`form-input ${
                  touchedFields.has('firstName') && validationErrors.firstName ? 'error' : ''
                } ${
                  touchedFields.has('firstName') && !validationErrors.firstName && formData.firstName ? 'success' : ''
                }`}
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={handleChange}
                onBlur={() => handleFieldBlur('firstName')}
                required
                disabled={isSubmitting || isLoading}
              />
              {touchedFields.has('firstName') && validationErrors.firstName && (
                <div className="field-error">{validationErrors.firstName}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                className={`form-input ${
                  touchedFields.has('lastName') && validationErrors.lastName ? 'error' : ''
                } ${
                  touchedFields.has('lastName') && !validationErrors.lastName && formData.lastName ? 'success' : ''
                }`}
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={handleChange}
                onBlur={() => handleFieldBlur('lastName')}
                required
                disabled={isSubmitting || isLoading}
              />
              {touchedFields.has('lastName') && validationErrors.lastName && (
                <div className="field-error">{validationErrors.lastName}</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className={`form-input ${
                touchedFields.has('email') && validationErrors.email ? 'error' : ''
              } ${
                touchedFields.has('email') && !validationErrors.email && formData.email ? 'success' : ''
              }`}
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleFieldBlur('email')}
              required
              disabled={isSubmitting || isLoading}
            />
            {touchedFields.has('email') && validationErrors.email && (
              <div className="field-error">{validationErrors.email}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="role" className="form-label">Role</label>
            <select
              id="role"
              name="role"
              className="form-input"
              value={formData.role}
              onChange={handleChange}
              disabled={isSubmitting || isLoading}
            >
              <option value="viewer">Viewer - View and explore data</option>
              <option value="analyst">Analyst - Create and manage analyses</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className={`form-input ${
                  touchedFields.has('password') && validationErrors.password ? 'error' : ''
                } ${
                  touchedFields.has('password') && !validationErrors.password && formData.password ? 'success' : ''
                }`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                onBlur={() => handleFieldBlur('password')}
                onFocus={() => setShowPasswordRequirements(true)}
                required
                minLength={6}
                disabled={isSubmitting || isLoading}
              />
              {touchedFields.has('password') && validationErrors.password && (
                <div className="field-error">{validationErrors.password}</div>
              )}
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill"
                      style={{ 
                        width: `${(passwordStrength.score / 6) * 100}%`,
                        backgroundColor: passwordStrength.color
                      }}
                    ></div>
                  </div>
                  <span className="strength-label" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}

              {/* CODE */}
              {showPasswordRequirements && (
                <div className="password-requirements">
                  <p className="requirements-title">Password must contain:</p>
                  <ul className="requirements-list">
                    <li className={formData.password.length >= 6 ? 'met' : 'unmet'}>
                      At least 6 characters
                    </li>
                    <li className={/(?=.*[a-z])/.test(formData.password) ? 'met' : 'unmet'}>
                      One lowercase letter
                    </li>
                    <li className={/(?=.*[A-Z])/.test(formData.password) ? 'met' : 'unmet'}>
                      One uppercase letter
                    </li>
                    <li className={/(?=.*\d)/.test(formData.password) ? 'met' : 'unmet'}>
                      One number
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className={`form-input ${
                  touchedFields.has('confirmPassword') && validationErrors.confirmPassword ? 'error' : ''
                } ${
                  touchedFields.has('confirmPassword') && !validationErrors.confirmPassword && confirmPassword ? 'success' : ''
                }`}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                onBlur={() => handleFieldBlur('confirmPassword')}
                required
                disabled={isSubmitting || isLoading}
              />
              {touchedFields.has('confirmPassword') && validationErrors.confirmPassword && (
                <div className="field-error">{validationErrors.confirmPassword}</div>
              )}
              {confirmPassword && !validationErrors.confirmPassword && formData.password === confirmPassword && (
                <div className="field-success">Passwords match!</div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className={`auth-button ${!isFormValid ? 'disabled' : ''}`}
              disabled={!isFormValid || isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <span className="loading-spinner">Creating Account...</span>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link-SignIn">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>

      <div className="auth-info">
        <div className="info-card">
          <img
            src="logo512.png"
            alt="ClarifAI preview"
            className="info-image"
          />
          <h3>ClarifAI</h3>
        </div>
      </div>

    </div>
  );
};

export default RegisterPage;