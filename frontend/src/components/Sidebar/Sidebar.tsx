// Sidebar.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Folder,
  User,
  BarChart2,
  Users,
  LogOut,
  Settings2,
} from "lucide-react";
import "./Sidebar.css";
import { authService } from "../../services/authService";

const Sidebar: React.FC = () => {
  return (
    <aside className="sb-root">
      <div className="sb-top">
        <div className="sb-brand">ClarifAI</div>
      </div>

      <nav className="sb-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}>
          <div className="sb-icon"><LayoutDashboard size={18} /></div>
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/datasets" className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}>
          <div className="sb-icon"><Folder size={18} /></div>
          <span>Datasets</span>
        </NavLink>

        <NavLink to="/profile" className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}>
          <div className="sb-icon"><User size={18} /></div>
          <span>Profile</span>
        </NavLink>

        <NavLink to="/analytics" className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}>
          <div className="sb-icon"><BarChart2 size={18} /></div>
          <span>AI analytics</span>
        </NavLink>

        <NavLink to="/collaboration" className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}>
          <div className="sb-icon"><Users size={18} /></div>
          <span>Collaboration</span>
        </NavLink>
      </nav>

      <div className="sb-middle">
        <hr className="sb-dividers" />
        <NavLink to="/settings" className="sb-link settings">
          <div className="sb-icon"><Settings2 size={18} /></div>
          <span   >Settings</span>
        </NavLink>
      </div>

      <div className="sb-bottom">
        <hr className="sb-divider" />

        <button
          onClick={async () => {
            await authService.logout();
            window.location.href = '/login'; // Or use navigate('/login')
          }}
          className="sb-link logout"
          style={{  cursor: 'pointer' }} // keeps style similar to NavLink
        >
          <div className="sb-icon"><LogOut size={18} /> </div>
          <span>Log out</span>
        </button>
        
    </div>

    </aside>
  );
};

export default Sidebar;
