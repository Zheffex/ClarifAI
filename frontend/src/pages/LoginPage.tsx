import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { LoginCredentials } from '../types';
import './AuthPages.css';

const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { addNotification } = useNotification();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login(formData);
      addNotification({
        type: 'success',
        title: 'Login Successful',
        message: 'Welcome back to ClarifAI!'
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Login Failed',
        message: error.message || 'Invalid credentials. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.email && formData.password;

  return (
    <div className="auth-container">
      {/* Info / Branding Section (Left side) */}
     <div className="auth-info">
        <div className="info-card">
          <div className="info-content">
            <img
              src="logo192.png" 
              className="info-image"
            />
            <title>Login</title>
            <h3>ClarifAI</h3>
          </div>
        </div>
      </div>


      {/* Login Form Card */}
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Welcome back!</h2>
          <p className="auth-subtitle">
            Please enter your details to login.
          </p>

          <h2 className='auth-titles'>SIGN IN </h2>
          
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Email */}
          <div className="form-group ">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              placeholder="johndoe@gmail.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isSubmitting || isLoading}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              placeholder="********"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isSubmitting || isLoading}
            />
          </div>

          {/* Options */}
          <div className="auth-options">
  <label className="remember-me">
    <input type="checkbox" name="remember" /> Remember me
  </label>
  <Link to="/forgot-password" className="forgot-password">
    Forgot Password?
  </Link>
</div>

          {/* Submit */}
          <div className="form-actions">
            <button
              type="submit"
              className={`auth-button ${!isFormValid ? 'disabled' : ''}`}
              disabled={!isFormValid || isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <span className="loading-spinner">Signing In...</span>
              ) : (
                <span>
                  <Link to="/dashboard" className="auth-link-SignIn">
                    Login
                  </Link>
                </span>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="auth-footer">
            <p>
              Don’t have an account?{' '}
              <Link to="/register" className="auth-link-SignUp">
                Register here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
