import React from 'react';
import {
  Users,
  Database,
  Shield,
  Activity,
  Settings,
  BarChart3,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Globe
} from 'lucide-react';
import './AdminDashboardPage.css';

const AdminDashboardPage: React.FC = () => {
  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <p>Manage your platform and monitor system activities</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-blue">
            <Users size={32} />
          </div>
          <div className="stat-content">
            <h3>1,234</h3>
            <p>Total Users</p>
            <span className="stat-change positive">+12.5% this month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-green">
            <Database size={32} />
          </div>
          <div className="stat-content">
            <h3>5,678</h3>
            <p>Total Datasets</p>
            <span className="stat-change positive">+8.3% this month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple">
            <Activity size={32} />
          </div>
          <div className="stat-content">
            <h3>98.5%</h3>
            <p>System Uptime</p>
            <span className="stat-change positive">All systems operational</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-orange">
            <BarChart3 size={32} />
          </div>
          <div className="stat-content">
            <h3>24.5 TB</h3>
            <p>Data Storage</p>
            <span className="stat-change negative">Capacity at 67%</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="admin-content-grid">
        {/* Recent Activities */}
        <div className="content-card">
          <div className="card-header">
            <div className="header-left">
              <Clock className="header-icon" />
              <h2>Recent Activities</h2>
            </div>
          </div>
          <div className="activity-list">
            <div className="activity-item">
              <CheckCircle className="activity-icon success" />
              <div className="activity-content">
                <h4>New user registered</h4>
                <p>user@example.com joined the platform</p>
                <span className="activity-time">2 minutes ago</span>
              </div>
            </div>
            <div className="activity-item">
              <CheckCircle className="activity-icon success" />
              <div className="activity-content">
                <h4>Dataset uploaded</h4>
                <p>sales_data_2024.csv uploaded successfully</p>
                <span className="activity-time">15 minutes ago</span>
              </div>
            </div>
            <div className="activity-item">
              <AlertCircle className="activity-icon warning" />
              <div className="activity-content">
                <h4>Storage alert</h4>
                <p>Storage capacity at 67%</p>
                <span className="activity-time">1 hour ago</span>
              </div>
            </div>
            <div className="activity-item">
              <CheckCircle className="activity-icon success" />
              <div className="activity-content">
                <h4>System backup completed</h4>
                <p>Daily backup process finished successfully</p>
                <span className="activity-time">3 hours ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Statistics */}
        <div className="content-card">
          <div className="card-header">
            <div className="header-left">
              <Users className="header-icon" />
              <h2>User Statistics</h2>
            </div>
          </div>
          <div className="stats-list">
            <div className="stat-row">
              <div className="stat-info">
                <p className="stat-label">Active Users</p>
                <p className="stat-value">856</p>
              </div>
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{ width: '68%' }}></div>
              </div>
            </div>
            <div className="stat-row">
              <div className="stat-info">
                <p className="stat-label">Admins</p>
                <p className="stat-value">12</p>
              </div>
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{ width: '95%' }}></div>
              </div>
            </div>
            <div className="stat-row">
              <div className="stat-info">
                <p className="stat-label">Analysts</p>
                <p className="stat-value">432</p>
              </div>
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{ width: '55%' }}></div>
              </div>
            </div>
            <div className="stat-row">
              <div className="stat-info">
                <p className="stat-label">Viewers</p>
                <p className="stat-value">412</p>
              </div>
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{ width: '48%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="content-card">
          <div className="card-header">
            <div className="header-left">
              <Shield className="header-icon" />
              <h2>System Health</h2>
            </div>
          </div>
          <div className="health-items">
            <div className="health-item">
              <CheckCircle className="health-icon success" />
              <div className="health-content">
                <h4>Database</h4>
                <p>All systems operational</p>
              </div>
              <div className="health-status success">100%</div>
            </div>
            <div className="health-item">
              <CheckCircle className="health-icon success" />
              <div className="health-content">
                <h4>API Server</h4>
                <p>Response time: 120ms</p>
              </div>
              <div className="health-status success">99.9%</div>
            </div>
            <div className="health-item">
              <CheckCircle className="health-icon success" />
              <div className="health-content">
                <h4>File Storage</h4>
                <p>Storage available: 8.2 TB</p>
              </div>
              <div className="health-status success">67%</div>
            </div>
            <div className="health-item">
              <CheckCircle className="health-icon success" />
              <div className="health-content">
                <h4>AI Services</h4>
                <p>Processing queue: 45 tasks</p>
              </div>
              <div className="health-status success">98%</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="content-card">
          <div className="card-header">
            <div className="header-left">
              <Settings className="header-icon" />
              <h2>Quick Actions</h2>
            </div>
          </div>
          <div className="action-grid">
            <div className="action-button">
              <Users className="action-icon" />
              <h4>Manage Users</h4>
              <p>View and manage user accounts</p>
            </div>
            <div className="action-button">
              <Settings className="action-icon" />
              <h4>System Settings</h4>
              <p>Configure platform settings</p>
            </div>
            <div className="action-button">
              <FileText className="action-icon" />
              <h4>View Reports</h4>
              <p>Generate system reports</p>
            </div>
            <div className="action-button">
              <Globe className="action-icon" />
              <h4>API Status</h4>
              <p>Monitor API endpoints</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

