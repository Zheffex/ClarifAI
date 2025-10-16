import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import { authService } from '../../services/authService'; 
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) return;

    setIsSubmitting(true);
    setButtonMessage('Signing In...');

    try {
      // ✅ Call your real login API
      const response = await authService.login({
        email: formData.email,
        password: formData.password
      });
      // ✅ Save token and user info
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // ✅ Notify success
      addNotification({
        type: 'success',
        title: 'Login Successful',
        message: `Welcome back, ${response.user.firstName || 'User'}!`
      });

      setButtonMessage('Successfully Logged In!');

      // ✅ Redirect to verify or dashboard depending on email verification
     setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (error: any) {
      // ❌ Notify error (invalid credentials or unregistered user)
      addNotification({
        type: 'error',
        title: 'Login Failed',
        message: error.message || 'Invalid email or password. Please try again.'
      });

      setButtonMessage('Login Failed ❌');
      setTimeout(() => setButtonMessage('/Login'), 1500);
    } finally {
      setIsSubmitting(false);
    }
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
