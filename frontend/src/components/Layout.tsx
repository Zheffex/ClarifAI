import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { notifications, removeNotification } = useNotification();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-left">
          <h1 className="logo">ClarifAI</h1>
          <nav className="main-nav">
            <Link 
              to="/dashboard" 
              className={`nav-link ${isActive('/dashboard') || location.pathname === '/' ? 'active' : ''}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/datasets" 
              className={`nav-link ${isActive('/datasets') ? 'active' : ''}`}
            >
              Datasets
            </Link>
            <Link 
              to="/analytics" 
              className={`nav-link ${isActive('/analytics') ? 'active' : ''}`}
            >
              Analytics
            </Link>
            <Link 
              to="/collaboration" 
              className={`nav-link ${isActive('/collaboration') ? 'active' : ''}`}
            >
              Collaboration
            </Link>
          </nav>
        </div>
        
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{user?.firstName} {user?.lastName}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="layout-body">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>Quick Actions</h3>
            <ul className="sidebar-menu">
              <li>
                <Link to="/datasets" className="sidebar-link">
                  <span className="sidebar-icon">📁</span>
                  Upload Dataset
                </Link>
              </li>
              <li>
                <Link to="/analytics/new" className="sidebar-link">
                  <span className="sidebar-icon">📊</span>
                  New Analysis
                </Link>
              </li>
              <li>
                <Link to="/collaboration/share" className="sidebar-link">
                  <span className="sidebar-icon">🔗</span>
                  Share Resource
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="sidebar-section">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon">📊</div>
                <div className="activity-text">
                  <div className="activity-title">Dataset Analysis</div>
                  <div className="activity-time">2 hours ago</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">📄</div>
                <div className="activity-text">
                  <div className="activity-title">Data Upload</div>
                  <div className="activity-time">4 hours ago</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">🔗</div>
                <div className="activity-text">
                  <div className="activity-title">Resource Shared</div>
                  <div className="activity-time">1 day ago</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Notifications */}
      <div className="notifications">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`notification notification-${notification.type}`}
          >
            <div className="notification-content">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
            </div>
            <button 
              className="notification-close"
              onClick={() => removeNotification(notification.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Layout;