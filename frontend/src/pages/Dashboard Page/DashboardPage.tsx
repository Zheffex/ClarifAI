import React, { useState, useEffect } from "react";
import {
  LayoutGrid,
  Search,
  Bell,
  CloudUpload,
  TrendingUp,
  Users,
  BarChart2,
  GitPullRequest,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Zap,
  Database,
  Activity,
  Calendar,
  Download,
  Settings,
  Plus,
  Filter,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Star,
  Target,
  PieChart,
  LineChart,
  BarChart3
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useDataset } from "../../contexts/DatasetContext";
import { useAnalytics } from "../../contexts/AnalyticsContext";
import { useNotification } from "../../contexts/NotificationContext";
import { dashboardService, DashboardStats } from "../../services/dashboardService";
import { notificationService } from "../../services/notificationService";
import AIChat from "../../components/AIChat/AIChat";
import "./DashboardPage.css";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  href: string;
}

interface RecentSession {
  id: string;
  name: string;
  dataset: string;
  modified: string;
  status: 'completed' | 'processing' | 'pending' | 'error';
  progress?: number;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  timestamp: string;
  isRead: boolean;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { datasets, isLoading: datasetsLoading } = useDataset();
  const { notifications, addNotification, clearAll } = useNotification();
  
  // State management
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [analysisSessions, setAnalysisSessions] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [shouldShowNullValues, setShouldShowNullValues] = useState(true);

  // Mock data for demonstration
  const quickActions: QuickAction[] = [
    {
      id: 'upload',
      title: 'Upload Dataset',
      description: 'Add new data for analysis',
      icon: CloudUpload,
      color: '#3b82f6',
      href: '/datasets'
    },
    {
      id: 'analyze',
      title: 'Start Analysis',
      description: 'Create new analytics session',
      icon: TrendingUp,
      color: '#10b981',
      href: '/analytics'
    },
    {
      id: 'collaborate',
      title: 'Collaborate',
      description: 'Join team projects',
      icon: GitPullRequest,
      color: '#8b5cf6',
      href: '/collaboration'
    },
    {
      id: 'reports',
      title: 'View Reports',
      description: 'Access saved insights',
      icon: Eye,
      color: '#f59e0b',
      href: '/reports'
    }
  ];

  const recentSessions: RecentSession[] = [
    {
      id: '1',
      name: 'Market Trends Analysis',
      dataset: 'sales_data_2024.csv',
      modified: '2 hours ago',
      status: 'completed',
      progress: 100
    },
    {
      id: '2',
      name: 'Customer Segmentation',
      dataset: 'customer_data.csv',
      modified: '5 hours ago',
      status: 'processing',
      progress: 75
    },
    {
      id: '3',
      name: 'Revenue Forecasting',
      dataset: 'financial_data.xlsx',
      modified: '1 day ago',
      status: 'completed',
      progress: 100
    },
    {
      id: '4',
      name: 'Product Performance',
      dataset: 'product_metrics.csv',
      modified: '2 days ago',
      status: 'error',
      progress: 45
    }
  ];

  // Convert context notifications to display format
  const displayNotifications = notifications.map(notif => ({
    id: notif.id,
    title: notif.title || 'Notification',
    message: notif.message,
    type: notif.type as 'success' | 'warning' | 'info' | 'error',
    timestamp: notif.timestamp.toLocaleString(),
    isRead: notif.isRead || false
  }));

  // Chart data for insights
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Data Processing',
      data: [65, 78, 90, 81, 96, 105],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true
    }]
  };

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    fetchAnalysisSessions();
    
    // Add some sample notifications for demonstration
    if (notifications.length === 0) {
      addNotification({
        title: 'Welcome to ClarifAI!',
        message: 'Your dashboard is ready. Start by uploading a dataset.',
        type: 'info',
        autoClose: false,
        isRead: false
      });
      
      addNotification({
        title: 'System Update',
        message: 'New features have been added to the analytics section.',
        type: 'success',
        isRead: false
      });
    }
  }, []);

  // Update stats when datasets change
  useEffect(() => {
    if (datasets && datasets.length > 0) {
      loadDashboardData();
      fetchAnalysisSessions();
    }
  }, [datasets]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Show null values initially
      setShouldShowNullValues(true);
      setStats(null);
      
      // Wait a moment to show the null state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const data = await dashboardService.getStats();
      setStats(data);
      
      // Show real data after fetching
      setShouldShowNullValues(false);
    } catch (error: any) {
      console.error("Failed to load dashboard stats:", error);
      // Set mock data if API fails
      setStats({
        totalDatasets: datasets?.length || 12,
        totalAnalyses: 45,
        recentActivity: 8,
        collaborations: 3,
        dataQualityScore: 87,
        storageUsed: '2.5 GB'
      });
      setShouldShowNullValues(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadDashboardData();
      showNotification('success', 'Dashboard refreshed successfully!');
    } catch (error: any) {
      showNotification('error', 'Failed to refresh dashboard');
    } finally {
      setIsRefreshing(false);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch analysis sessions
  const fetchAnalysisSessions = async () => {
    try {
      const response = await dashboardService.getRecentActivity(50);
      const analysisActivities = response.filter(activity => 
        activity.type === 'analysis_created' || activity.type === 'analysis_completed'
      );
      setAnalysisSessions(analysisActivities);
    } catch (error) {
      console.error('Failed to fetch analysis sessions:', error);
    }
  };

  // Create new analysis session
  const createAnalysisSession = async (datasetId?: string) => {
    if (!user) return;
    
    setIsAnalyzing(true);
    try {
      const response = await apiClient.post('/analytics/sessions', {
        datasetId: datasetId || datasets?.[0]?._id,
        title: `Analysis - ${new Date().toLocaleDateString()}`
      });
      
      if (response.data.success) {
        // Refresh stats to get updated analysis count
        await fetchStats();
        await fetchAnalysisSessions();
        
        showNotification('success', 'Analysis session created successfully!');
        
        // Navigate to analytics page with the new session
        navigate(`/analytics?session=${response.data.data.session._id}`);
      }
    } catch (error: any) {
      console.error('Failed to create analysis session:', error);
      showNotification('error', error.response?.data?.message || 'Failed to create analysis session');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle analyze button click
  const handleAnalyzeClick = () => {
    if (datasets && datasets.length > 0) {
      createAnalysisSession();
    } else {
      showNotification('info', 'Please upload a dataset first to start analysis');
      navigate('/datasets');
    }
  };

  // Mark analysis as completed (can be called from other components)
  const markAnalysisCompleted = async (sessionId: string) => {
    try {
      // Update the analysis session to mark as completed
      await apiClient.patch(`/analytics/sessions/${sessionId}`, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      
      // Trigger the same refresh logic as the event listener
      setShouldShowNullValues(true);
      setStats(null);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await loadDashboardData();
      await fetchAnalysisSessions();
      
      setShouldShowNullValues(false);
      
      showNotification('success', 'Analysis completed successfully! Dashboard updated.');
    } catch (error: any) {
      console.error('Failed to mark analysis as completed:', error);
      setShouldShowNullValues(false);
      showNotification('error', 'Failed to mark analysis as completed');
    }
  };

  // Expose the function globally for other components to use
  useEffect(() => {
    (window as any).markAnalysisCompleted = markAnalysisCompleted;
    return () => {
      delete (window as any).markAnalysisCompleted;
    };
  }, []);

  // Listen for analysis completion events from other pages
  useEffect(() => {
    const handleAnalysisCompleted = async (event: CustomEvent) => {
      console.log('Analysis completed event received:', event.detail);
      
      // Show null values initially
      setShouldShowNullValues(true);
      setStats(null);
      
      // Wait a moment to show the null state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh dashboard data
      await loadDashboardData();
      await fetchAnalysisSessions();
      
      // Show real data after fetching
      setShouldShowNullValues(false);
      
      showNotification('success', 'Analysis completed! Dashboard updated.');
    };

    window.addEventListener('analysisCompleted', handleAnalysisCompleted as EventListener);
    
    return () => {
      window.removeEventListener('analysisCompleted', handleAnalysisCompleted as EventListener);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'processing': return '#f59e0b';
      case 'pending': return '#6b7280';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'processing': return RefreshCw;
      case 'pending': return Clock;
      case 'error': return AlertCircle;
      default: return Clock;
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="loading-container">
          <div className="loading-spinner">
            <RefreshCw className="spinner-icon" />
          </div>
          <h2>Loading Dashboard</h2>
          <p>Preparing your analytics overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' ? (
              <CheckCircle className="notification-icon" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="notification-icon" />
            ) : (
              <Zap className="notification-icon" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Welcome back, {user?.firstName || 'Analyst'}!</h1>
            <p>Here's what's happening with your data today</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`btn-icon ${isRefreshing ? 'spinning' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <div className="notifications-container">
              <button 
                className="notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="notification-icon" />
                {displayNotifications.filter(n => !n.isRead).length > 0 && (
                  <span className="notification-badge">
                    {displayNotifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <h3>Notifications</h3>
                    <button 
                      className="mark-all-read"
                      onClick={() => clearAll()}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="notifications-list">
                    {displayNotifications.length > 0 ? (
                      displayNotifications.map((notification) => (
                        <div key={notification.id} className={`notification-item ${!notification.isRead ? 'unread' : ''}`}>
                          <div className="notification-content">
                            <div className={`notification-type ${notification.type}`}>
                              {notification.type === 'success' ? <CheckCircle /> :
                               notification.type === 'warning' ? <AlertCircle /> :
                               notification.type === 'error' ? <AlertCircle /> : <Zap />}
                            </div>
                            <div className="notification-text">
                              <h4>{notification.title}</h4>
                              <p>{notification.message}</p>
                              <span className="notification-time">{notification.timestamp}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-notifications">
                        <Bell className="no-notifications-icon" />
                        <p>No notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="dashboard-stat-icon" style={{ backgroundColor: '#3b82f6' }}>
            <Database className="icon" />
          </div>
          <div className="stat-content">
            <h3 className={shouldShowNullValues ? 'loading-value' : ''}>
              {shouldShowNullValues ? '--' : (stats?.totalDatasets || 0)}
            </h3>
            <p>Total Datasets</p>
            <div className="stat-trend positive">
              <ArrowUpRight className="trend-icon" />
              <span className={shouldShowNullValues ? 'loading-value' : ''}>
                {shouldShowNullValues ? '--' : '+12%'}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="dashboard-stat-icon" style={{ backgroundColor: '#10b981' }}>
            <TrendingUp className="icon" />
          </div>
          <div className="stat-content">
            <h3 className={shouldShowNullValues ? 'loading-value' : ''}>
              {shouldShowNullValues ? '--' : (stats?.totalAnalyses || 0)}
            </h3>
            <p>Analyses Completed</p>
            <div className="stat-trend positive">
              <ArrowUpRight className="trend-icon" />
              <span className={shouldShowNullValues ? 'loading-value' : ''}>
                {shouldShowNullValues ? '--' : (
                  analysisSessions.length > 0 
                    ? `+${analysisSessions.filter(s => 
                        new Date(s.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
                      ).length} this week`
                    : '+8%'
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="dashboard-stat-icon" style={{ backgroundColor: '#8b5cf6' }}>
            <Users className="icon" />
          </div>
          <div className="stat-content">
            <h3 className={shouldShowNullValues ? 'loading-value' : ''}>
              {shouldShowNullValues ? '--' : (stats?.collaborations || 0)}
            </h3>
            <p>Active Collaborations</p>
            <div className="stat-trend positive">
              <ArrowUpRight className="trend-icon" />
              <span className={shouldShowNullValues ? 'loading-value' : ''}>
                {shouldShowNullValues ? '--' : '+3'}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="dashboard-stat-icon" style={{ backgroundColor: '#f59e0b' }}>
            <Activity className="icon" />
          </div>
          <div className="stat-content">
            <h3 className={shouldShowNullValues ? 'loading-value' : ''}>
              {shouldShowNullValues ? '--' : (stats?.recentActivity || 0)}
            </h3>
            <p>Recent Activities</p>
            <div className="stat-trend negative">
              <ArrowDownRight className="trend-icon" />
              <span className={shouldShowNullValues ? 'loading-value' : ''}>
                {shouldShowNullValues ? '--' : '-2%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Left Column */}
        <div className="dashboard-left">
          {/* Quick Actions */}
          <div className="card quick-actions-card">
            <div className="card-header">
              <h2>
                <Zap className="card-icon" />
                Quick Actions
              </h2>
              <button className="btn btn-sm btn-outline">
                <Settings className="btn-icon" />
              </button>
            </div>
            <div className="card-content">
              <div className="actions-grid">
                {quickActions.map((action) => (
                  action.id === 'analyze' ? (
                    <button 
                      key={action.id} 
                      className="action-item"
                      onClick={handleAnalyzeClick}
                      disabled={isAnalyzing}
                    >
                      <div className="action-icon" style={{ backgroundColor: action.color }}>
                        {isAnalyzing ? (
                          <RefreshCw className="icon spinning" />
                        ) : (
                          <action.icon className="icon" />
                        )}
                      </div>
                      <div className="action-content">
                        <h3>{isAnalyzing ? 'Creating Analysis...' : action.title}</h3>
                        <p>{action.description}</p>
                      </div>
                      <ArrowUpRight className="action-arrow" />
                    </button>
                  ) : (
                    <Link key={action.id} to={action.href} className="action-item">
                      <div className="action-icon" style={{ backgroundColor: action.color }}>
                        <action.icon className="icon" />
                      </div>
                      <div className="action-content">
                        <h3>{action.title}</h3>
                        <p>{action.description}</p>
                      </div>
                      <ArrowUpRight className="action-arrow" />
                    </Link>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* Data Insights */}
          <div className="card insights-card">
            <div className="card-header">
              <h2>
                <BarChart3 className="card-icon" />
                Data Insights
              </h2>
              <div className="chart-controls">
                <button className="chart-btn active">
                  <LineChart className="btn-icon" />
                </button>
                <button className="chart-btn">
                  <BarChart3 className="btn-icon" />
                </button>
                <button className="chart-btn">
                  <PieChart className="btn-icon" />
                </button>
              </div>
            </div>
            <div className="card-content">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>Processing Trends</h3>
                  <div className="chart-legend">
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
                      <span>Data Processing</span>
                    </div>
                  </div>
                </div>
                <div className="chart-placeholder">
                  <svg width="100%" height="200" viewBox="0 0 400 200">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M20,160 L60,120 L100,140 L140,80 L180,140 L220,100 L260,160 L300,140 L340,120 L380,100"
                      fill="url(#chartGradient)"
                      stroke="none"
                    />
                    <path
                      d="M20,160 L60,120 L100,140 L140,80 L180,140 L220,100 L260,160 L300,140 L340,120 L380,100"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                    <circle cx="60" cy="120" r="3" fill="#3b82f6" />
                    <circle cx="140" cy="80" r="3" fill="#3b82f6" />
                    <circle cx="220" cy="100" r="3" fill="#3b82f6" />
                    <circle cx="300" cy="140" r="3" fill="#3b82f6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard-right">
          {/* Recent Sessions */}
          <div className="card sessions-card">
            <div className="card-header">
              <h2>
                <Clock className="card-icon" />
                Recent Sessions
              </h2>
              <div className="card-actions">
                <button className="btn btn-sm btn-outline">
                  <Filter className="btn-icon" />
                </button>
                <button className="btn btn-sm btn-primary">
                  <Plus className="btn-icon" />
                  New
                </button>
              </div>
            </div>
            <div className="card-content">
              <div className="sessions-list">
                {recentSessions.map((session) => {
                  const StatusIcon = getStatusIcon(session.status);
                  return (
                    <div key={session.id} className="session-item">
                      <div className="session-info">
                        <div className="session-header">
                          <h3>{session.name}</h3>
                          <div className="session-status" style={{ color: getStatusColor(session.status) }}>
                            <StatusIcon className="status-icon" />
                            <span>{session.status}</span>
                          </div>
                        </div>
                        <p className="session-dataset">{session.dataset}</p>
                        <div className="session-meta">
                          <span className="session-time">{session.modified}</span>
                          {session.progress && session.status === 'processing' && (
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${session.progress}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="session-actions">
                        <button className="btn btn-sm btn-outline">
                          <Eye className="btn-icon" />
                        </button>
                        <button className="btn btn-sm btn-outline">
                          <MoreHorizontal className="btn-icon" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Assistant */}
          <AIChat datasets={datasets} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;