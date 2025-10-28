import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Folder,
  User,
  BarChart2,
  Users,
  LogOut,
  Settings2,
  ChevronRight,
  List,
  ListCollapse
} from "lucide-react";
import "./Sidebar.css";
import { authService } from "../../services/authService";
import { useAuth } from "../../contexts/AuthContext";

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      navigate('/login');
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navigationItems = [
    {
      to: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      description: "Overview and insights"
    },
    {
      to: "/datasets",
      icon: Folder,
      label: "Datasets",
      description: "Manage your data"
    },
    {
      to: "/analytics",
      icon: BarChart2,
      label: "Analytics",
      description: "AI-powered analysis"
    },
    {
      to: "/collaboration",
      icon: Users,
      label: "Collaboration",
      description: "Team workspace"
    },
    {
      to: "/profile",
      icon: User,
      label: "Profile",
      description: "Account settings"
    }
  ];

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="brand-section">
            <div className="brand-icon">
              <img src="/logo192.png" alt="ClarifAI Logo" className="brand-logo" />
            </div>
            {!isCollapsed && (
              <div className="brand-text">
                <h1>ClarifAI</h1>
              </div>
            )}
          </div>
          
          {/* Toggle Button */}
          <button 
            className="sidebar-toggle"
            onClick={toggleSidebar}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <List className="toggle-icon" /> : <ListCollapse className="toggle-icon" />}
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="user-section">
            <div className="user-avatar">
              <User className="avatar-icon" />
            </div>
            <div className="user-info">
              <h3 className="user-name">{user?.firstName || 'User'} {user?.lastName || ''}</h3>
              <span className="user-role">{user?.role || 'Analyst'}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="nav-icon">
                  <item.icon className="icon" />
                </div>
                {!isCollapsed && (
                  <div className="nav-content">
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-description">{item.description}</span>
                  </div>
                )}
                {isActive && <div className="nav-indicator" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Settings Section */}
        <div className="sidebar-settings">
          <NavLink
            to="/settings"
            className={`nav-item settings-item ${location.pathname === '/settings' ? 'active' : ''}`}
            title={isCollapsed ? "Settings" : undefined}
          >
            <div className="nav-icon">
              <Settings2 className="icon" />
            </div>
            {!isCollapsed && (
              <div className="nav-content">
                <span className="nav-label">Settings</span>
                <span className="nav-description">Preferences</span>
              </div>
            )}
          </NavLink>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="logout-btn"
            title={isCollapsed ? "Logout" : undefined}
          >
            <div className="nav-icon">
              <LogOut className="icon" />
            </div>
            {!isCollapsed && (
              <div className="nav-content">
                <span className="nav-label">Logout</span>
                <span className="nav-description">Sign out</span>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={toggleMobileMenu}
        title="Open menu"
      >
        <ChevronRight className="menu-icon" />
      </button>
    </>
  );
};

export default Sidebar;