import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDataset } from '../../contexts/DatasetContext';
import { useAnalytics } from '../../contexts/AnalyticsContext';
import { dashboardService, DashboardStats } from '../../services/dashboardService';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { datasets, fetchDatasets } = useDataset();
  const { sessions, fetchSessions } = useAnalytics();
  const navigate = useNavigate();
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
        // Fetch real dashboard stats from API
        const dashboardStats = await dashboardService.getStats();
        setStats(dashboardStats);
        
        // Also fetch datasets and sessions for the lists
        await Promise.all([
          fetchDatasets(),
          fetchSessions()
        ]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Set default stats if API fails
        setStats({
          totalDatasets: 0,
          totalAnalyses: 0,
          recentActivity: 0,
          collaborations: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [fetchDatasets, fetchSessions]);

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
          <button 
            className="action-btn primary"
            onClick={() => navigate('/analytics/new')}
          >
            <span className="btn-icon">📈</span>
            New Analysis
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => navigate('/datasets')}
          >
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
        
        {stats.dataQualityScore !== undefined && (
          <div className="stat-card">
            <div className="stat-icon quality">✅</div>
            <div className="stat-content">
              <div className="stat-number">{stats.dataQualityScore}%</div>
              <div className="stat-label">Data Quality</div>
            </div>
          </div>
        )}
        
        {stats.storageUsed && (
          <div className="stat-card">
            <div className="stat-icon storage">💾</div>
            <div className="stat-content">
              <div className="stat-number">{stats.storageUsed}</div>
              <div className="stat-label">Storage Used</div>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-content">
        <div className="content-section">
          <div className="section-header">
            <h2>Recent Datasets</h2>
            <Link to="/datasets" className="section-link">View All</Link>
          </div>
          
          <div className="dataset-list">
            {Array.isArray(datasets) && datasets.length > 0 ? (
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
                    <button 
                      className="action-btn small"
                      onClick={() => navigate(`/analytics/new?dataset=${dataset._id}`)}
                    >
                      Analyze
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <h3>No datasets yet</h3>
                <p>Upload your first dataset to get started with AI-powered analytics.</p>
                <button 
                  className="action-btn primary"
                  onClick={() => navigate('/datasets')}
                >
                  Upload Dataset
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="content-section">
          <div className="section-header">
            <h2>Recent Analysis Sessions</h2>
            <Link to="/analytics" className="section-link">View All</Link>
          </div>
          
          <div className="analysis-list">
            {Array.isArray(sessions) && sessions.length > 0 ? (
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
                    <button 
                      className="action-btn small"
                      onClick={() => navigate(`/analytics/session/${session._id}`)}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No analyses yet</h3>
                <p>Start your first analysis session to explore your data with AI.</p>
                <button 
                  className="action-btn primary"
                  onClick={() => navigate('/analytics/new')}
                >
                  New Analysis
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-insights">
        <div className="insights-card">
          <h3>AI Insights</h3>
          <div className="insights-list">
            {stats.dataQualityScore !== undefined && (
              <div className="insight-item">
                <div className="insight-icon">📊</div>
                <div className="insight-content">
                  <p><strong>Data Quality:</strong> Your datasets have an average quality score of {stats.dataQualityScore}%.</p>
                </div>
              </div>
            )}
            
            <div className="insight-item">
              <div className="insight-icon">📈</div>
              <div className="insight-content">
                <p><strong>Activity Summary:</strong> You have {stats.recentActivity} recent activities in the last 30 days.</p>
              </div>
            </div>
            
            {stats.totalDatasets > 0 && stats.totalAnalyses === 0 && (
              <div className="insight-item">
                <div className="insight-icon">🎯</div>
                <div className="insight-content">
                  <p><strong>Recommendation:</strong> You have datasets ready for analysis. Try creating your first analysis session!</p>
                </div>
              </div>
            )}
            
            {stats.totalDatasets === 0 && (
              <div className="insight-item">
                <div className="insight-icon">🚀</div>
                <div className="insight-content">
                  <p><strong>Getting Started:</strong> Upload your first dataset to begin exploring your data with AI-powered analytics.</p>
                </div>
              </div>
            )}
            
            {stats.collaborations > 0 && (
              <div className="insight-item">
                <div className="insight-icon">👥</div>
                <div className="insight-content">
                  <p><strong>Collaboration:</strong> You're collaborating on {stats.collaborations} projects. Great teamwork!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;