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
  Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './AuthPages.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated, user } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if user is admin and redirect accordingly
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setLoginAttempts(prev => prev + 1);

    try {
      await login({
        email: formData.email,
        password: formData.password
      });

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedEmail');
      }

      // Success - redirect will happen via useEffect
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific error cases
      if (error.message.includes('Invalid credentials') || error.message.includes('401')) {
        setErrors({ 
          general: 'Invalid email or password. Please check your credentials and try again.' 
        });
      } else if (error.message.includes('Account not verified')) {
        setErrors({ 
          general: 'Please verify your email address before logging in. Check your inbox for a verification link.' 
        });
      } else if (error.message.includes('Account locked')) {
        setErrors({ 
          general: 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later or contact support.' 
        });
      } else {
        setErrors({ 
          general: error.message || 'Login failed. Please try again.' 
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const shouldRemember = localStorage.getItem('rememberMe') === 'true';
    
    if (rememberedEmail && shouldRemember) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  const isFormValid = formData.email && formData.password && !Object.keys(errors).length;

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
                <h2>Welcome back!</h2>
                <p>You can sign in to access with your existing account.</p>
                <div className="features-list">
                  <div className="feature-item">
                    <Shield className="feature-icon" />
                    <span>Secure & Private</span>
                  </div>
                  <div className="feature-item">
                    <Zap className="feature-icon" />
                    <span>AI-Powered Analysis</span>
                  </div>
                  <div className="feature-item">
                    <User className="feature-icon" />
                    <span>Personalized Experience</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Login Card */}
        <div className="auth-card">
        <div className="auth-header">
          <div className="header-content">
            <h2 className="auth-title">Sign In</h2>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* General Error Message */}
          {errors.general && (
            <div className="error-message general-error">
              <AlertCircle className="error-icon" />
              <span>{errors.general}</span>
            </div>
          )}

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
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isSubmitting || isLoading}
                autoComplete="email"
              />
              {formData.email && !errors.email && (
                <CheckCircle className="input-success-icon" />
              )}
            </div>
            {errors.email && (
              <div className="field-error">
                <AlertCircle className="error-icon" />
                {errors.email}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isSubmitting || isLoading}
                autoComplete="current-password"
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
            {errors.password && (
              <div className="field-error">
                <AlertCircle className="error-icon" />
                {errors.password}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="auth-options">
            <label className="remember-me">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting || isLoading}
              />
              <span className="checkmark"></span>
              Remember me
            </label>
            <Link to="/forgot-password" className="forgot-password">
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className={`auth-button ${!isFormValid ? 'disabled' : ''}`}
              disabled={!isFormValid || isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="btn-icon spinning" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">
                Create Account
              </Link>
            </p>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;