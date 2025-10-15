
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../services/authService"; 
import "./AuthPages.css";

const ForgotPasswordPage: React.FC = () => {

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await authService.forgotPassword(email); 
      alert("✅ Password reset link sent to your email!");
      setEmail("");
    } catch (error: any) {
      alert(`❌ ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Step 3: UI Layout
  return (
    <div className="forgot-container">
      <div className="forgot-card">
        {/* Logo */}
        <img src="logo192.png" alt="ClarifAI logo" className="forgot-logo" />

        {/* Title */}
        <h2 className="forgot-title">Forgot your Password?</h2>
        <p className="forgot-subtitle">
          Provide your account’s email to receive a reset link.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="forgot-form">
          <input
            type="email"
            placeholder="Enter Your Registered Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting}
          />

          <button type="submit" className="forgot-button" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send"}
          </button>
        </form>

        {/* Footer Links */}
        <p className="forgot-footer">
          Don’t have an account?{" "}
          <Link to="/register" className="forgot-register">
            Register
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

export default ForgotPasswordPage;
