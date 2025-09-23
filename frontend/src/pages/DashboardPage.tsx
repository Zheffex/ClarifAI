import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataset } from '../contexts/DatasetContext';
import { useAnalytics } from '../contexts/AnalyticsContext';
import './DashboardPage.css';

interface DashboardStats {
  totalDatasets: number;
  totalAnalyses: number;
  recentActivity: number;
  collaborations: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { datasets, fetchDatasets } = useDataset();
  const { sessions } = useAnalytics();
  const [stats, setStats] = useState<DashboardStats>({
    totalDatasets: 0,
    totalAnalyses: 0,
    recentActivity: 0,
    collaborations: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        await fetchDatasets();
        // Mock stats for now
        setStats({
          totalDatasets: datasets.length,
          totalAnalyses: sessions.length,
          recentActivity: 12,
          collaborations: 5
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [fetchDatasets, datasets.length, sessions.length]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title">
            {getGreeting()}, {user?.firstName}!
          </h1>
          <p className="dashboard-subtitle">
            Welcome back to your ClarifAI analytics workspace.
          </p>
        </div>
        
        <div className="quick-actions">
          <button className="action-btn primary">
            <span className="btn-icon">📈</span>
            New Analysis
          </button>
          <button className="action-btn secondary">
            <span className="btn-icon">📊</span>
            Upload Dataset
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon datasets">📁</div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalDatasets}</div>
            <div className="stat-label">Datasets</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon analyses">🔍</div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalAnalyses}</div>
            <div className="stat-label">Analyses</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon activity">⚡</div>
          <div className="stat-content">
            <div className="stat-number">{stats.recentActivity}</div>
            <div className="stat-label">Recent Activity</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon collaborations">🤝</div>
          <div className="stat-content">
            <div className="stat-number">{stats.collaborations}</div>
            <div className="stat-label">Collaborations</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="content-section">
          <div className="section-header">
            <h2>Recent Datasets</h2>
            <a href="/datasets" className="section-link">View All</a>
          </div>
          
          <div className="dataset-list">
            {datasets.length > 0 ? (
              datasets.slice(0, 3).map((dataset) => (
                <div key={dataset._id} className="dataset-item">
                  <div className="dataset-icon">📄</div>
                  <div className="dataset-info">
                    <h3 className="dataset-name">{dataset.name}</h3>
                    <p className="dataset-description">
                      {dataset.description || 'No description provided'}
                    </p>
                    <div className="dataset-meta">
                      <span className={`status-badge ${dataset.processingStatus}`}>
                        {dataset.processingStatus}
                      </span>
                      <span className="dataset-size">
                        {dataset.metadata.rows} rows
                      </span>
                    </div>
                  </div>
                  <div className="dataset-actions">
                    <button className="action-btn small">Analyze</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <h3>No datasets yet</h3>
                <p>Upload your first dataset to get started with AI-powered analytics.</p>
                <button className="action-btn primary">Upload Dataset</button>
              </div>
            )}
          </div>
        </div>

        <div className="content-section">
          <div className="section-header">
            <h2>Recent Analysis Sessions</h2>
            <a href="/analytics" className="section-link">View All</a>
          </div>
          
          <div className="analysis-list">
            {sessions.length > 0 ? (
              sessions.slice(0, 3).map((session) => (
                <div key={session._id} className="analysis-item">
                  <div className="analysis-icon">🔮</div>
                  <div className="analysis-info">
                    <h3 className="analysis-title">{session.title}</h3>
                    <p className="analysis-meta">
                      {session.queries.length} queries • 
                      {session.visualizations.length} charts •
                      Last updated {new Date(session.lastActivity).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="analysis-actions">
                    <button className="action-btn small">Continue</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No analyses yet</h3>
                <p>Start your first analysis session to explore your data with AI.</p>
                <button className="action-btn primary">New Analysis</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-insights">
        <div className="insights-card">
          <h3>AI Insights</h3>
          <div className="insights-list">
            <div className="insight-item">
              <div className="insight-icon">💡</div>
              <div className="insight-content">
                <p><strong>Data Quality Check:</strong> Your recent datasets show excellent completeness (97% average).</p>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-icon">📈</div>
              <div className="insight-content">
                <p><strong>Usage Pattern:</strong> You're most active analyzing data on Tuesday and Wednesday.</p>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-icon">🎯</div>
              <div className="insight-content">
                <p><strong>Recommendation:</strong> Consider setting up automated alerts for your key metrics.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;