import React from "react";
import { LayoutDashboard, Folder, BarChart2, Settings, LogOut, User, Users } from "lucide-react";
import "./Sidebar.css";

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">

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
          <span>AI Analytics</span>
        </a>
        <a href="/settings" className="sidebar-link">
          <User size={20} />
          <span>Profile</span>
        </a>
        <a href="/settings" className="sidebar-link">
          <Users size={20} />
          <span>Collaborations</span>
        </a>
      </nav>

      <div className="sidebar-footer">
        <a href="/Landing" className="sidebar-link logout">
          <LogOut size={20} />
          <span>Logout</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
