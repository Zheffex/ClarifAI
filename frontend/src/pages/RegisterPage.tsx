import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { RegisterData } from '../types';
import './AuthPages.css';

const RegisterPage: React.FC = () => {
  const { register, isAuthenticated, isLoading } = useAuth();
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

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate passwords match
    if (formData.password !== confirmPassword) {
      addNotification({
        type: 'error',
        title: 'Registration Failed',
        message: 'Passwords do not match. Please try again.'
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
    formData.email && 
    formData.password && 
    formData.firstName && 
    formData.lastName && 
    confirmPassword &&
    formData.password === confirmPassword &&
    formData.password.length >= 6;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">ClarifAI</h1>
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
                className="form-input"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={isSubmitting || isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                className="form-input"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={isSubmitting || isLoading}
              />
            </div>
          </div>

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
              <option value="admin">Admin - Full administrative access</option>
            </select>
          </div>

          <div className="form-row">
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
                minLength={6}
                disabled={isSubmitting || isLoading}
              />
              <small className="form-hint">Minimum 6 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="form-input"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting || isLoading}
              />
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
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>

      <div className="auth-info">
        <div className="info-card">
          <h3>Why Choose ClarifAI?</h3>
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon">🚀</div>
              <div>
                <h4>Fast Setup</h4>
                <p>Get started in minutes with our intuitive interface</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔍</div>
              <div>
                <h4>Smart Analytics</h4>
                <p>AI-powered insights from your data</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🤝</div>
              <div>
                <h4>Team Collaboration</h4>
                <p>Share and collaborate on data insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;