import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

const Nav: React.FC = () => (
  <header className="site-header" role="banner">
    <div className="nav-inner">
      <div className="brand">
        <div className="brand-circle">C</div>
        <span className="brand-text">ClarifAI</span>
      </div>
      <nav className="nav-links" aria-label="Main navigation">
        <a href="#features">Feature</a>
        <a href="#insights">Insights</a>
        <a href="#about">About Us</a>
        <Link to="/login" className="login">Login</Link>
      </nav>
    </div>
  </header>
);

const Hero: React.FC = () => (
  <section className="hero" id="home" aria-label="Hero Section">
    <div className="container hero-grid">
      <div className="hero-content">
        <h1 className="hero-title">Unlock the Feature of Data. Instantly</h1>
        <p className="hero-desc">
          ClarifAI transforms complex raw data into actionable, predictive insights. Stop guessing, start knowing.
        </p>

        <div className="hero-ctas">
          <Link to="/register" className="btn primary">
            START YOUR JOURNEY NOW
          </Link>
          <p className="small-note">
            Don’t have an account yet?{" "}
            <Link to="/register" className="link-underline">Sign up here.</Link>
          </p>
        </div>
      </div>

      <div className="hero-image-wrap">
        <img src="/images/hero.png" alt="Illustration of laptop and charts" className="hero-image" />
      </div>
    </div>
  </section>
);

const Features: React.FC = () => (
  <section className="features" id="features" aria-label="Key Features">
    <div className="container">
      <h2 className="section-title">Lorem Ipsum</h2>
      <p className="section-desc">
        is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy
        text ever since the 1500s.
      </p>

      <div className="features-card">
        <div className="card-head">Key Features</div>
        <div className="numbers">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="num-box">
              <span>{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const CarouselPlaceholder: React.FC = () => (
  <section className="carousel" id="insights" aria-label="Carousel Section">
    <div className="container">
      <div className="carousel-card">
        <div className="carousel-dots">
          {[...Array(4)].map((_, i) => (
            <span key={i} />
          ))}
        </div>
      </div>

      <div className="cta-bar">
        <Link to="/register" className="btn cta-floating">
          START YOUR JOURNEY NOW
        </Link>
      </div>
    </div>
  </section>
);

const About: React.FC = () => (
  <section className="about" id="about" aria-label="About Us">
    <div className="container about-inner">
      <div className="about-badge">
        <div className="brand-circle small">C</div>
      </div>
      <div>
        <h3>About Us</h3>
        <p>
          We build simple, powerful data products that help teams turn data into insights — built with privacy-first
          design and performant engineering.
        </p>
      </div>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer className="site-footer" role="contentinfo">
    <div className="container footer-inner">
      <p>
        © 2025 ClarifAI, Inc.&nbsp; Terms of Service&nbsp; •&nbsp; Content Takedown&nbsp; •&nbsp; Privacy Policy
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
      <Nav />
      <main>
        <Hero />
        <Features />
        <CarouselPlaceholder />
        <About />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
