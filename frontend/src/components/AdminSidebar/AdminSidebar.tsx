import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Shield,
  Users,
  Database,
  Settings,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X
} from "lucide-react";
import "./AdminSidebar.css";
import { useAuth } from "../../contexts/AuthContext";

const AdminSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // Call logout from context
      await logout();
      // Clear any admin-specific localStorage items if needed
      localStorage.removeItem('adminToken');
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('rememberedEmail');
      // Navigate to login page
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('rememberedEmail');
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
      to: "/admin/dashboard",
      icon: Shield,
      label: "Admin Dashboard",
      description: "System overview"
    },
    {
      to: "/admin/users",
      icon: Users,
      label: "User Management",
      description: "Manage users"
    },
    {
      to: "/admin/datasets",
      icon: Database,
      label: "Dataset Management",
      description: "Manage datasets"
    },
    {
      to: "/admin/analytics",
      icon: BarChart3,
      label: "Analytics",
      description: "System analytics"
    },
    {
      to: "/admin/reports",
      icon: FileText,
      label: "Reports",
      description: "View reports"
    },
    {
      to: "/admin/settings",
      icon: Settings,
      label: "Settings",
      description: "System settings"
    }
  ];

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="admin-mobile-overlay"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="brand-section">
            <div className="brand-icon">
              <img src="/logo192.png" alt="ClarifAI Logo" className="brand-logo" />
            </div>
            {!isCollapsed && (
              <div className="brand-text">
                <h1>ClarifAI</h1>
                <p className="brand-subtitle">Admin Panel</p>
              </div>
            )}
          </div>
          <button className="toggle-btn" onClick={toggleSidebar}>
            {isCollapsed ? <Menu size={24} /> : <X size={24} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
                onClick={toggleMobileMenu}
              >
                <Icon className="nav-icon" size={20} />
                {!isCollapsed && (
                  <>
                    <div className="nav-content">
                      <span className="nav-label">{item.label}</span>
                      <span className="nav-description">{item.description}</span>
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut className="logout-icon" size={20} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Mobile Toggle Button */}
        <button className="mobile-toggle" onClick={toggleMobileMenu}>
          <Menu size={24} />
        </button>
      </aside>
    </>
  );
};

export default AdminSidebar;

