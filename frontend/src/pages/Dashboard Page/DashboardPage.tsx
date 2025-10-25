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
import { dashboardService, DashboardStats } from "../../services/dashboardService";
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
  
  // State management
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

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

  const notifications: NotificationItem[] = [
    {
      id: '1',
      title: 'Analysis Complete',
      message: 'Market Trends Analysis has finished processing',
      type: 'success',
      timestamp: '2 hours ago',
      isRead: false
    },
    {
      id: '2',
      title: 'New Collaboration',
      message: 'You have been invited to join "Q4 Planning" project',
      type: 'info',
      timestamp: '4 hours ago',
      isRead: false
    },
    {
      id: '3',
      title: 'Data Quality Alert',
      message: 'Customer data has 5% missing values',
      type: 'warning',
      timestamp: '6 hours ago',
      isRead: true
    }
  ];

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
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const data = await dashboardService.getStats();
      setStats(data);
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
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search datasets, sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="time-range-selector">
              <select 
                value={selectedTimeRange} 
                onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                className="time-select"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
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
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="notification-badge">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <h3>Notifications</h3>
                    <button className="mark-all-read">Mark all read</button>
                  </div>
                  <div className="notifications-list">
                    {notifications.map((notification) => (
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
                    ))}
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
          <div className="stat-icon" style={{ backgroundColor: '#3b82f6' }}>
            <Database className="icon" />
          </div>
          <div className="stat-content">
            <h3>{stats?.totalDatasets || 0}</h3>
            <p>Total Datasets</p>
            <div className="stat-trend positive">
              <ArrowUpRight className="trend-icon" />
              <span>+12%</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#10b981' }}>
            <TrendingUp className="icon" />
          </div>
          <div className="stat-content">
            <h3>{stats?.totalAnalyses || 0}</h3>
            <p>Analyses Completed</p>
            <div className="stat-trend positive">
              <ArrowUpRight className="trend-icon" />
              <span>+8%</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#8b5cf6' }}>
            <Users className="icon" />
          </div>
          <div className="stat-content">
            <h3>{stats?.collaborations || 0}</h3>
            <p>Active Collaborations</p>
            <div className="stat-trend positive">
              <ArrowUpRight className="trend-icon" />
              <span>+3</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}>
            <Activity className="icon" />
          </div>
          <div className="stat-content">
            <h3>{stats?.recentActivity || 0}</h3>
            <p>Recent Activities</p>
            <div className="stat-trend negative">
              <ArrowDownRight className="trend-icon" />
              <span>-2%</span>
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
          <div className="card ai-assistant-card">
            <div className="card-header">
              <h2>
                <Zap className="card-icon" />
                AI Assistant
              </h2>
            </div>
            <div className="card-content">
              <div className="ai-welcome">
                <h3>What would you like ClarifAI to analyze today?</h3>
                <p>Ask me anything about your data or get insights on your datasets</p>
                <div className="ai-input-container">
                  <input
                    type="text"
                    className="ai-input"
                    placeholder="What insights are you curious about today?"
                  />
                  <button className="ai-send-btn">
                    <ArrowUpRight className="btn-icon" />
                  </button>
                </div>
                <div className="ai-suggestions">
                  <button className="suggestion-chip">Show data quality issues</button>
                  <button className="suggestion-chip">Find trends in sales data</button>
                  <button className="suggestion-chip">Generate insights report</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;