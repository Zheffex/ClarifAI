import React from 'react';
import { Link } from 'react-router-dom';
import './AnalyticsPage.css';

const AnalyticsPage: React.FC = () => {
  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>Analytics</h1>
        <p>AI-powered data analysis and insights</p>
      </div>

      <div className="analytics-content">
        <div className="coming-soon">
          <h2>🚧 Analytics Dashboard Coming Soon</h2>
          <p>
            We're building powerful AI-driven analytics features that will help you:
          </p>
          <ul>
            <li>Create interactive analysis sessions</li>
            <li>Generate insights with natural language queries</li>
            <li>Build custom visualizations</li>
            <li>Collaborate on data analysis</li>
          </ul>
          
          <div className="cta-section">
            <Link to="/datasets" className="btn-primary">
              Upload Your Data
            </Link>
            <Link to="/dashboard" className="btn-secondary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;