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
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">ClarifAI</h1>
          <h2 className="auth-title">Sign In</h2>
          <p className="auth-subtitle">Welcome back! Please sign in to your account.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isSubmitting || isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isSubmitting || isLoading}
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className={`auth-button ${!isFormValid ? 'disabled' : ''}`}
              disabled={!isFormValid || isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <span className="loading-spinner">Signing In...</span>
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>

      <div className="auth-info">
        <div className="info-card">
          <h3>Intelligent Analytics Platform</h3>
          <ul>
            <li>🤖 AI-powered natural language queries</li>
            <li>📊 Automated data visualization</li>
            <li>🔮 Predictive analytics and forecasting</li>
            <li>🤝 Real-time collaboration features</li>
            <li>🔒 Enterprise-grade security</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;