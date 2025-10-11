import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

const Header: React.FC = () => (
  <header className="site-header">
    <div className="nav-inner">
      <div className="brand">
        <img
          src="/images/clarifailogo.png"
          alt="ClarifAI logo"
          className="brand-logo"
        />
        <span className="brand-text">ClarifAI</span>
      </div>
    </div>
  </header>
);

const Hero: React.FC = () => (
  <section className="hero" aria-label="Hero Section">
    <div className="container hero-grid">
      <div className="hero-content">
        <h1 className="hero-title">Unlock the Feature of Data. Instantly</h1>
        <p className="hero-desc">
          ClarifAI transforms complex raw data into actionable, predictive insights.
          Stop guessing, start knowing.
        </p>

        <Link to="/register" className="btn primary">
          START YOUR JOURNEY NOW
        </Link>

        <p className="small-note">
          Don’t have an account yet?{" "}
          <Link to="/register" className="link-underline">
            Sign up here.
          </Link>
        </p>
      </div>

      <div className="hero-image-wrap">
        <img
          src="/images/hero.png"
          alt="Laptop illustration"
          className="hero-image"
        />
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
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
