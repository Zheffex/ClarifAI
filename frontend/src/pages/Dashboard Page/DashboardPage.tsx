// DashboardPage.tsx
import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useDataset } from "../../contexts/DatasetContext";
import { useAnalytics } from "../../contexts/AnalyticsContext";
import { dashboardService, DashboardStats } from "../../services/dashboardService";
import "./DashboardPage.css";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    dashboardService
      .getStats()
      .then((data) => setStats(data))
      .catch((err) => console.error("Failed to load dashboard stats:", err));
  }, []);

  const sessions = [
    {
      name: "Market Trends 2025",
      dataset: "sales_data.csv",
      modified: "Oct 15, 2025, 1:12 AM",
      status: "Completed",
    },
    {
      name: "Market Trends 2025",
      dataset: "sales_data.csv",
      modified: "Oct 15, 2025, 1:12 AM",
      status: "Completed",
    },
    {
      name: "Market Trends 2025",
      dataset: "sales_data.csv",
      modified: "Oct 15, 2025, 1:12 AM",
      status: "Completed",
    },
    {
      name: "Market Trends 2025",
      dataset: "sales_data.csv",
      modified: "Oct 15, 2025, 1:12 AM",
      status: "Completed",
    },
  ];

  return (
    <div className="dp-root">
      <div className="dp-main">

        {/* Header */}
        <div className="dp-header">
          <title>Dashboard</title>
          <h1 className="dp-title">Dashboard</h1>

          <div className="dp-searchbar">
            <Search size={20} />
            <input type="text" placeholder="Search anything" />
          </div>

          <div className="dp-user-info">
            <div className="dp-user">
              <img
                src="https://ui-avatars.com/api/?name=Justin+Munar"
                alt="User Avatar"
              />
              <div>
                <p className="dp-username">{user?.firstName || "Justin Munar"}</p>
                <span>Admin</span>
              </div>
            </div>
            <Bell size={20} className="dp-bell" />
          </div>
        </div>

        {/* Overview Section */}
       <div className="dp-overview">
        <div className="dp-card">
          <div className="dp-card-icon dp-blue"><LayoutGrid size={30} /></div>

          <div className="dp-card-text">
            <p>Total datasets</p>
            <h2>{stats?.totalDatasets ?? 0}</h2>
          </div>
        </div>

        <div className="dp-card">
          <div className="dp-card-icon dp-blue"><Users size={30} /></div>
          <div className="dp-card-text">
            <p>Active collaborations</p>
            <h2>{stats?.collaborations ?? 0}</h2>
          </div>
        </div>

        <div className="dp-card">
          <div className="dp-card-icon dp-blue"><TrendingUp size={30} /></div>
          <div className="dp-card-text">
            <p>Recent analyses</p>
            <h2>{stats?.totalAnalyses ?? 0}</h2>
          </div>
        </div>

        <div className="dp-card">
          <div className="dp-card-icon dp-green"><BarChart2 size={30} /></div>
          <div className="dp-card-text">
            <p>Usage metrics</p>
            <h2>{stats?.recentActivity ?? 0}</h2>
          </div>
        </div>
      </div>


        {/* Main Content */}
        <div className="dp-content">
          {/* Quick Actions */}
          <div className="dp-left">
            <h3>Quick actions</h3>
            <div className="dp-actions" >
              <button className="dp-action-btn">
                <CloudUpload size={50} color="#2563eb" style={{ display: "flex" }} />
                <span className="dp-action-text">Upload Dataset</span>
              </button>
              <button className="dp-action-btn" >
                <TrendingUp size={50} color="#2563eb" style={{ display: "flex" }} />
                Start New Analysis
              </button>
              <button className="dp-action-btn">
                <GitPullRequest size={50} color="#2563eb"style={{ display: "flex" }} />
                Join Collaboration
              </button>
              <button className="dp-action-btn">
                <Eye size={50}color="#2563eb" style={{ display: "flex" }} />
                View Reports
              </button>
            </div>

            {/* Auto-generated Insight */}
              <h3>Auto-generated insight</h3>
              <div className="dp-insight-card">
                <div className="dp-chart">
                  <svg width="100%" height="180" viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg">
                    {/* Gradient background */}
                    <defs>
                      <linearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>

                    {/* Area fill */}
                    <path
                      d="M10,130 L50,80 L90,100 L130,40 L170,100 L210,60 L250,120 L290,130 Z"
                      fill="url(#gradientFill)"
                      stroke="none"
                    />

                    {/* Green line */}
                    <polyline
                      points="10,130 50,80 90,100 130,40 170,100 210,60 250,120 290,130"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                    />

                    {/* Data point circles */}
                    <circle cx="50" cy="80" r="3" fill="#16a34a" />
                    <circle cx="130" cy="40" r="3" fill="#16a34a" />
                    <circle cx="210" cy="60" r="3" fill="#16a34a" />
                    <circle cx="250" cy="120" r="3" fill="#16a34a" />
                  </svg>
                </div>

                {/* Legend / toggle buttons */}
                <div className="dp-chart-controls">
                  <label className="dp-toggle active">
                    <span className="dot green"></span> Trends
                  </label>
                  <label className="dp-toggle">
                    <span className="dot black"></span> Capital
                  </label>
                  <label className="dp-toggle">
                    <span className="dot black"></span> Anomalies
                  </label>
                </div>
              </div>
          </div>

          {/* Sessions Table */}
          <div className="dp-right">
            <h3>Sessions</h3>
            <div className="dp-table-container">
              <table className="dp-table">
                <thead>
                  <tr >
                    <th>Session Name</th>
                    <th>Dataset Name</th>
                    <th>Last Modified</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, index) => (
                    <tr key={index}>
                      <td>{s.name}</td>
                      <td>{s.dataset}</td>
                      <td>
                        <span className="dp-date">{s.modified}</span>
                      </td>
                      <td className="dp-status completed">● {s.status}</td>
                      <td>
                        <button className="dp-resume-btn">Resume</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="dp-pagination">
                <span>1</span>
                <span>2</span>
                <span className="active">3</span>
                <span>4</span>
                <span>...</span>
                <span>90</span>
              </div>
            </div>

            {/* Analyst */}
            <div className="dp-gradient-card">
              <h2>Good to see you, Analyst!</h2>
              <p>What would you like ClarifAI to analyze today?</p>

              <div className="dp-bar-placeholder"></div>

              <input
                type="text"
                className="dp-input"
                placeholder="What insights are you curious about today?"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
