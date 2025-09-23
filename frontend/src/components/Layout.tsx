import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { notifications, removeNotification } = useNotification();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-left">
          <h1 className="logo">ClarifAI</h1>
          <nav className="main-nav">
            <a href="/dashboard" className="nav-link">Dashboard</a>
            <a href="/datasets" className="nav-link">Datasets</a>
            <a href="/analytics" className="nav-link">Analytics</a>
            <a href="/collaboration" className="nav-link">Collaboration</a>
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
              <li><a href="/datasets/upload">Upload Dataset</a></li>
              <li><a href="/analytics/new">New Analysis</a></li>
              <li><a href="/collaboration/shared">Shared Resources</a></li>
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