import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

const Header: React.FC = () => (
  <header className="site-header">
  <div className="nav-inner">
    <div className="brand">
      <img
        src="/logo192.png"
        alt="ClarifAI logo"
        className="brand-logo"
      />
      <span className="brand-text">ClarifAI</span>
    </div>

    <div className="nav-actions">
        <Link to="/login" className="btn-login">
          LOGIN
        </Link>
        <Link to="/register" className="btn-signup">
          SIGN UP
        </Link>
      </div>
  </div>
</header>
);

const Hero: React.FC = () => (
  <section className="hero" aria-label="Hero Section">
    <div className="container hero-grid">
      <div className="hero-content">
        <h1 className="hero-title">
          Unlock the Feature of Data. Instantly
        </h1>
        <p className="hero-desc">
          ClarifAI Transforms Complex raw data into actionable, predictive insights learning models. Stop guessing, start knowing.
        </p>

        <Link to="/register" className="btn-primary">
          START YOUR JOURNEY NOW
        </Link>

        <p className="small-note">
          Don't have an account yet?{" "}
          <Link to="/register" className="link-underline">
            Sign up here.
          </Link>
        </p>
      </div>

      <div className="hero-image-wrap">
        <div className="laptop-container">
          <div className="laptop">
            <div className="laptop-screen">
              <div className="screen-content">
                <div className="chart-bar"></div>
                <div className="chart-line"></div>
                <div className="chart-gauge"></div>
                <div className="data-elements">
                  <div className="data-point"></div>
                  <div className="data-point"></div>
                  <div className="data-point"></div>
                </div>
              </div>
            </div>
            <div className="laptop-keyboard"></div>
          </div>
          <div className="floating-icons">
            <div className="icon-user"></div>
            <div className="icon-list"></div>
            <div className="icon-chart"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const SocialSection: React.FC = () => (
  <section className="social-section">
    <div className="container">
      <div className="social-icons">
        <div className="social-item">
          <div className="social-icon instagram"></div>
          <span>Instagram</span>
        </div>
        <div className="social-item">
          <div className="social-icon x"></div>
          <span>X</span>
        </div>
        <div className="social-item">
          <div className="social-icon github"></div>
          <span>GitHub</span>
        </div>
        <div className="social-item">
          <div className="social-icon facebook"></div>
          <span>Facebook</span>
        </div>
      </div>
    </div>
  </section>
);

const FeaturesSection: React.FC = () => (
  <section className="features-section">
    <div className="container">
      <div className="section-header">
        <h2 className="section-title">What is ClarifAI?</h2>
        <p className="section-desc">
          ClarifAI is an AI-powered data insights platform designed to turn raw data into actionable intelligence
        </p>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#E8F4FD"/>
              <path d="M24 8L32 16H28V24H20V16H16L24 8Z" fill="#2B7CFF"/>
              <rect x="16" y="28" width="16" height="8" rx="4" fill="#2B7CFF"/>
            </svg>
          </div>
          <h3 className="feature-title">Predictive modeling for smarter decision-making</h3>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#E8F4FD"/>
              <circle cx="24" cy="20" r="8" fill="#2B7CFF"/>
              <rect x="20" y="32" width="8" height="8" rx="2" fill="#2B7CFF"/>
            </svg>
          </div>
          <h3 className="feature-title">Automated Insights Generation</h3>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#E8F4FD"/>
              <rect x="12" y="16" width="24" height="16" rx="2" fill="#2B7CFF"/>
              <rect x="16" y="20" width="4" height="8" fill="white"/>
              <rect x="22" y="20" width="4" height="6" fill="white"/>
              <rect x="28" y="20" width="4" height="10" fill="white"/>
            </svg>
          </div>
          <h3 className="feature-title">Clean, Visualized Dashboards</h3>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#E8F4FD"/>
              <circle cx="18" cy="20" r="4" fill="#2B7CFF"/>
              <circle cx="30" cy="20" r="4" fill="#2B7CFF"/>
              <circle cx="24" cy="28" r="4" fill="#2B7CFF"/>
              <path d="M18 20L24 28M30 20L24 28" stroke="#2B7CFF" strokeWidth="2"/>
            </svg>
          </div>
          <h3 className="feature-title">Shared Insight Boards</h3>
        </div>
      </div>

      <div className="detailed-features">
        <div className="detailed-feature">
          <div className="detailed-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2B7CFF"/>
              <path d="M8 8H24V24H8V8Z" fill="white"/>
              <circle cx="16" cy="16" r="4" fill="#2B7CFF"/>
            </svg>
          </div>
          <div className="detailed-content">
            <h4>Predictive Modeling for Smarter Decision-Making</h4>
            <p>Leverage machine learning models to anticipate future trends and outcomes, enabling data-driven decisions that give you a competitive edge.</p>
          </div>
        </div>

        <div className="detailed-feature">
          <div className="detailed-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2B7CFF"/>
              <circle cx="16" cy="12" r="4" fill="white"/>
              <rect x="12" y="20" width="8" height="8" rx="2" fill="white"/>
            </svg>
          </div>
          <div className="detailed-content">
            <h4>Clean, Visualized Dashboards</h4>
            <p>Transform complex data into intuitive dashboards that provide clear insights at a glance, making data accessible to everyone on your team.</p>
          </div>
        </div>

        <div className="detailed-feature">
          <div className="detailed-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2B7CFF"/>
              <circle cx="16" cy="16" r="6" fill="white"/>
              <circle cx="16" cy="16" r="3" fill="#2B7CFF"/>
            </svg>
          </div>
          <div className="detailed-content">
            <h4>Automated Insights Generation</h4>
            <p>Use AI to uncover hidden patterns and generate insights automatically, saving time and ensuring you never miss important trends.</p>
          </div>
        </div>

        <div className="detailed-feature">
          <div className="detailed-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2B7CFF"/>
              <circle cx="12" cy="12" r="3" fill="white"/>
              <circle cx="20" cy="12" r="3" fill="white"/>
              <circle cx="16" cy="20" r="3" fill="white"/>
            </svg>
          </div>
          <div className="detailed-content">
            <h4>Shared Insight Boards</h4>
            <p>Enable seamless collaboration through shared insight boards where teams can work together on data analysis and decision-making.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer className="site-footer" role="contentinfo">
    <div className="container footer-inner">
      <p>
        © 2025 ClarifAI, Inc. Terms of Service Content Takedown Privacy Policy
      </p>
    </div>
  </footer>
);

const LandingPage: React.FC = () => {
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev || "auto";
    };
  }, []);

  return (
    <div className="page-root">
      <Header />
      <main>
        <Hero />
        <SocialSection />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
