import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  Shield,
  Zap,
  Users,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RegisterData } from '../../types';
import './AuthPages.css';

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  general?: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, isAuthenticated, user } = useAuth();

  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'viewer'
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

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
      setIsSubmitting(false);
      return;
    }

    try {
      await register(formData);
      
      // Store email for OTP verification
      localStorage.setItem('email', formData.email);
      localStorage.setItem('otpFlow', 'register');
      
      // Navigate to OTP verification page
      navigate('/verify');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific error cases
      if (error.message.includes('Email already exists') || error.message.includes('409')) {
        setValidationErrors({ 
          email: 'An account with this email already exists. Please use a different email or try signing in.' 
        });
      } else if (error.message.includes('Invalid email')) {
        setValidationErrors({ 
          email: 'Please enter a valid email address.' 
        });
      } else {
        setValidationErrors({ 
          general: error.message || 'Registration failed. Please try again.' 
        } as ValidationErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if step 1 is complete
  const isStep1Complete = 
    formData.firstName && 
    formData.lastName && 
    formData.email && 
    !validationErrors.firstName && 
    !validationErrors.lastName && 
    !validationErrors.email;

  // Check if step 2 is complete
  const isStep2Complete = 
    formData.password && 
    confirmPassword && 
    !validationErrors.password && 
    !validationErrors.confirmPassword &&
    formData.password === confirmPassword;

  const isFormValid = isStep1Complete && isStep2Complete;

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        {/* Left Info Section */}
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
                <h2>Join ClarifAI Today!</h2>
                <p>Start your journey with AI-powered data analysis and unlock insights from your data.</p>
                <div className="features-list">
                  <div className="feature-item">
                    <Users className="feature-icon" />
                    <span>Collaborative Analysis</span>
                  </div>
                  <div className="feature-item">
                    <FileText className="feature-icon" />
                    <span>Multiple Data Formats</span>
                  </div>
                  <div className="feature-item">
                    <Shield className="feature-icon" />
                    <span>Enterprise Security</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Register Card */}
        <div className="auth-card">
        <div className="auth-header">
          <div className="header-content">
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">Step {currentStep} of 2</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* General Error Message */}
          {validationErrors.general && (
            <div className="error-message general-error">
              <AlertCircle className="error-icon" />
              <span>{validationErrors.general}</span>
            </div>
          )}

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="form-step">
              <>
              {/* Name Fields */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName" className="form-label">
                    First Name
                  </label>
                  <div className="input-wrapper">
                    <User className="label-icon" />
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
                    {formData.firstName && !validationErrors.firstName && (
                      <CheckCircle className="input-success-icon" />
                    )}
                  </div>
                  {touchedFields.has('firstName') && validationErrors.firstName && (
                    <div className="field-error">
                      <AlertCircle className="error-icon" />
                      {validationErrors.firstName}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="lastName" className="form-label">
                    Last Name
                  </label>
                  <div className="input-wrapper">
                    <User className="label-icon" />
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
                    {formData.lastName && !validationErrors.lastName && (
                      <CheckCircle className="input-success-icon" />
                    )}
                  </div>
                  {touchedFields.has('lastName') && validationErrors.lastName && (
                    <div className="field-error">
                      <AlertCircle className="error-icon" />
                      {validationErrors.lastName}
                    </div>
                  )}
                </div>
              </div>

              {/* Email Field */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <Mail className="label-icon" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className={`form-input ${
                      touchedFields.has('email') && validationErrors.email ? 'error' : ''
                    } ${
                      touchedFields.has('email') && !validationErrors.email && formData.email ? 'success' : ''
                    }`}
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur('email')}
                    required
                    disabled={isSubmitting || isLoading}
                    autoComplete="email"
                  />
                  {formData.email && !validationErrors.email && (
                    <CheckCircle className="input-success-icon" />
                  )}
                </div>
                {touchedFields.has('email') && validationErrors.email && (
                  <div className="field-error">
                    <AlertCircle className="error-icon" />
                    {validationErrors.email}
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div className="form-group">
                <label htmlFor="role" className="form-label">
                  Role
                </label>
                <div className="input-wrapper">
                  <Users className="label-icon" />
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
              </div>

              {/* Next Button for Step 1 */}
              <div className="form-actions">
                <button
                  type="button"
                  className={`auth-button ${!isStep1Complete ? 'disabled' : ''}`}
                  onClick={() => setCurrentStep(2)}
                  disabled={!isStep1Complete || isSubmitting || isLoading}
                >
                  Continue
                  <ArrowRight className="btn-icon" />
                </button>
              </div>
              </>
            </div>
          )}

          {/* Step 2: Password Creation */}
          {currentStep === 2 && (
            <div className="form-step">
              <>
              {/* Password Fields */}
              <div className="form-row">
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className={`form-input ${
                    touchedFields.has('password') && validationErrors.password ? 'error' : ''
                  } ${
                    touchedFields.has('password') && !validationErrors.password && formData.password ? 'success' : ''
                  }`}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur('password')}
                  onFocus={() => setShowPasswordRequirements(true)}
                  required
                  minLength={6}
                  disabled={isSubmitting || isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting || isLoading}
                >
                  {showPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
                </button>
              </div>
              {touchedFields.has('password') && validationErrors.password && (
                <div className="field-error">
                  <AlertCircle className="error-icon" />
                  {validationErrors.password}
                </div>
              )}
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill"
                      style={{ 
                        width: `${(passwordStrength.score / 5) * 100}%`,
                        backgroundColor: passwordStrength.color
                      }}
                    ></div>
                  </div>
                  <span className="strength-label" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <div className="input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
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
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting || isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
                </button>
              </div>
              {touchedFields.has('confirmPassword') && validationErrors.confirmPassword && (
                <div className="field-error">
                  <AlertCircle className="error-icon" />
                  {validationErrors.confirmPassword}
                </div>
              )}
              {confirmPassword && !validationErrors.confirmPassword && formData.password === confirmPassword && (
                <div className="field-success">
                  Passwords match!
                </div>
              )}
            </div>
          </div>

              {/* Password Requirements */}
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

              {/* Submit Button for Step 2 */}
              <div className="form-actions">
                <button
                  type="button"
                  className="auth-button back-button"
                  onClick={() => setCurrentStep(1)}
                  disabled={isSubmitting || isLoading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className={`auth-button ${!isStep2Complete ? 'disabled' : ''}`}
                  disabled={!isStep2Complete || isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <Loader2 className="btn-icon spinning" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="btn-icon" />
                    </>
                  )}
                </button>
              </div>
              </>
            </div>
          )}

          {/* Footer */}
          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign In
              </Link>
            </p>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;