import React from "react";
import { LayoutDashboard, Folder, BarChart2, Settings, LogOut } from "lucide-react";
import "./Sidebar.css";

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/logo192.png" alt="ClarifAI Logo" className="sidebar-logo" />
        <h2>ClarifAI</h2>
      </div>

      <nav className="sidebar-nav">
        <a href="/dashboard" className="sidebar-link active">
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </a>
        <a href="/datasets" className="sidebar-link">
          <Folder size={20} />
          <span>Datasets</span>
        </a>
        <a href="/analytics" className="sidebar-link">
          <BarChart2 size={20} />
          <span>Analytics</span>
        </a>
        <a href="/settings" className="sidebar-link">
          <Settings size={20} />
          <span>Settings</span>
        </a>
      </nav>

      <div className="sidebar-footer">
        <a href="/logout" className="sidebar-link logout">
          <LogOut size={20} />
          <span>Logout</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
