import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import './AuthPages.css';

const LoginPage: React.FC = () => {
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonMessage, setButtonMessage] = useState('Login');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) return; // extra safety

    setIsSubmitting(true);
    setButtonMessage('Signing In...');

    // Simulate login request (you can later replace with actual API)
    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Login Successful',
        message: 'Welcome back to ClarifAI!'
      });

      // Show success on button before redirect
      setButtonMessage('✅ Successfully Logged In!');

      // Wait a bit before navigating
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    }, 1200);
  };

  const isFormValid = formData.email && formData.password;

  return (
    <div className="auth-container">
      {/* Left Info Section */}
      <div className="auth-info">
        <div className="info-card">
          <div className="info-content">
            <img src="logo192.png" className="info-image" alt="ClarifAI Logo" />
            <h3>ClarifAI</h3>
          </div>
        </div>
      </div>

      {/* Right Login Card */}
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Welcome back!</h2>
          <p className="auth-subtitle">Please enter your details to login.</p>
          <title>Login</title>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              placeholder="johndoe@gmail.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              placeholder="********"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isSubmitting}
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
              disabled={!isFormValid || isSubmitting}
            >
              {buttonMessage}
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
