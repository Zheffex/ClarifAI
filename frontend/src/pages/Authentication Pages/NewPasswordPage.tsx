import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock } from 'lucide-react';
import { authService } from "../../services/authService";
import "./AuthPages.css";

const NewPasswordPage: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Get email from localStorage
  const email = localStorage.getItem('email');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Email not found. Please go back and request a new password reset.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsSubmitting(true);

    try {
      // Call backend endpoint to reset password with email
      await authService.resetPassword(email, password); 

      // Clean up localStorage
      localStorage.removeItem('email');
      localStorage.removeItem('otpFlow');

      // Show success alert
      alert("✅ Password reset successfully!");

      // Navigate to login page after success
      navigate("/login");
    } catch (error: any) {
      setError(error.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="forgot-container">
      <div className="forgot-card">
        <img src="logo192.png" alt="ClarifAI logo" className="forgot-logo" />
        <h2 className="forgot-title">Create New Password</h2>
        <p className="forgot-subtitle">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="forgot-form">
          {error && (
            <div style={{ 
              background: "#fef2f2", 
              border: "1px solid #fecaca", 
              color: "#dc2626", 
              padding: "0.75rem", 
              borderRadius: "8px",
              fontSize: "0.875rem"
            }}>
              {error}
            </div>
          )}

          <div className="input-wrapper">
            <Lock className="label-icon" />
            <input
              type="password"
              placeholder="Enter New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="input-wrapper">
            <Lock className="label-icon" />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className="forgot-button" disabled={isSubmitting}>
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="forgot-footer">
          Remember your password?{" "}
          <Link to="/login" className="forgot-register">
            Sign In
          </Link>
        </p>

        <Link to="/login" className="forgot-back">
          <img src="return.png" alt="Back" className="back-icon" />
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default NewPasswordPage;

