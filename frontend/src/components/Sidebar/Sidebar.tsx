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
} from "lucide-react";
import "./Sidebar.css";

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

      <div className="sb-bottom">
        <hr className="sb-divider" />
        <NavLink to="/landing" className="sb-link logout">
          <div className="sb-icon"><LogOut size={18} /></div>
          <span>Log out</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
