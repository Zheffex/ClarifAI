import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./AuthPages.css";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Reset link sent to:", email);
  };

  return (
    <div className="forgot-container">
      <div className="forgot-card">
        <img src="logo192.png" alt="ClarifAI logo" className="forgot-logo" />
        <h2 className="forgot-title">Forgot your Password?</h2>
        <p className="forgot-subtitle">
          Provide your accounts email for which you want to reset password!
        </p>

        <form onSubmit={handleSubmit} className="forgot-form">
          <input
            type="email"
            placeholder="Enter Your Registered Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" className="forgot-button">
            Send
          </button>
        </form>

        <p className="forgot-footer">
          Don’t have an account?{" "}
          <Link to="/register" className="forgot-register">
            Register
          </Link>
        </p>

        <Link to="/login" className="forgot-back">
          <img
            src="return.png"  
            alt="Back"
            className="back-icon"
          />
          Back to Login
        </Link>

      </div>
    </div>
  );
};

export default ForgotPasswordPage;
