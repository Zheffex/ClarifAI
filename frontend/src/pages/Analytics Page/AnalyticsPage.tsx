import React from 'react';
import './AnalyticsPage.css';

const AnalyticsPage: React.FC = () => {
  return (
    <div className="analytics-container">
      {/* Main Analytics Content */}
      <div className="analytics-page">
        <div className="analytics-header">
          <title>AI analytics</title>
          <h1>Analytics</h1>
          <p>AI-powered data analysis and insights</p>
        </div>

        <div className="analytics-grid">
          {/* AI Chat Section */}
          <div className="card ai-chat">
            <h2>AI Chat</h2>
            <input
              type="text"
              className="chat-input"
              placeholder="Ask your AI about the data..."
            />
            <div className="chat-buttons">
              <button className="btn-secondary">Send</button>
              <button className="btn-secondary">Clear</button>
            </div>
          </div>

          {/* Insights Section */}
          <div className="card insights">
            <h2>Insights</h2>
            <div className="insight-text">💡 Key trends and insights displayed here</div>
            <div className="insight-icons">
              <span>📊</span>
              <span>📈</span>
              <span>🧠</span>
            </div>
          </div>

          {/* Results Section */}
          <div className="card results">
            <h2>Results</h2>
            <div className="result-tabs">
              <span className="active-tab">Charts</span>
              <span>Tables</span>
              <span>Raw Data</span>
            </div>
            <div className="result-box"></div>
            <div className="export-buttons">
              <button className="btn-export">Export CSV</button>
              <button className="btn-export">Download Report</button>
            </div>
          </div>

          {/* Prediction Section */}
          <div className="card prediction">
            <h2>Prediction</h2>
            <select className="select-model">
              <option>Select a Model</option>
              <option>Linear Regression</option>
              <option>Random Forest</option>
              <option>Neural Network</option>
            </select>
            <div className="param-section">
              <label>Confidence Threshold</label>
              <input type="range" min="0" max="100" />
              <label>Max Iterations</label>
              <input type="range" min="10" max="500" />
            </div>
          </div>

          {/* Session Section */}
          <div className="card session">
            <h2>Analysis Session</h2>
            <div className="session-buttons">
              <button className="btn-primary">Start Session</button>
              <button className="btn-secondary">Load Previous</button>
            </div>
            <div className="session-history">No previous sessions found.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
