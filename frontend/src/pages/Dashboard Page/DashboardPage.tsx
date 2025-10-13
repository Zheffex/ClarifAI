// DashboardPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useDataset } from "../../contexts/DatasetContext";
import { useAnalytics } from "../../contexts/AnalyticsContext";
import { dashboardService, DashboardStats } from "../../services/dashboardService";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./DashboardPage.css";

import { Bell, Sliders } from "lucide-react";

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { datasets, fetchDatasets } = useDataset();
  const { sessions, fetchSessions } = useAnalytics();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>({
    totalDatasets: 0,
    totalAnalyses: 0,
    recentActivity: 0,
    collaborations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const load = async () => {
      try {
        const s = await dashboardService.getStats();
        setStats(s);
        // Keep existing dataset/session fetchers working
        await Promise.all([fetchDatasets(), fetchSessions()]);
      } catch (err) {
        console.error("dashboard load failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchDatasets, fetchSessions]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const greeting = (() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good Morning!";
    if (hr < 17) return "Good Afternoon!";
    return "Good Evening!";
  })();

  // calendar generation (weeks) for the selected month
  const calendar = useMemo(() => {
    const now = new Date(selectedDate);
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay(); // 0..6
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: (number | null)[][] = [];
    let day = 1 - startDay;
    for (let r = 0; r < 6; r++) {
      const row: (number | null)[] = [];
      for (let c = 0; c < 7; c++) {
        if (day < 1 || day > daysInMonth) row.push(null);
        else row.push(day);
        day++;
      }
      weeks.push(row);
    }
    return { weeks, monthName: now.toLocaleString(undefined, { month: "long" }), year };
  }, [selectedDate]);

  // static SVG path generator for a simple line chart using stats (faux activity)
  const chartSvg = useMemo(() => {
    // Create a simple 10-point series using stats values for a believable visual
    const base = Math.max(1, Math.round((stats.totalDatasets || 0) / 6));
    const values: number[] = [];
    for (let i = 0; i < 10; i++) {
      // sine-ish variation
      const v = Math.max(0, base + Math.round(Math.sin(i / 1.8) * (base / 2 + 1)));
      values.push(v);
    }

    // normalize to chart height
    const width = 640;
    const height = 260;
    const paddingX = 20;
    const paddingY = 18;
    const innerW = width - paddingX * 2;
    const innerH = height - paddingY * 2;

    const maxV = Math.max(...values, 1);

    const points: { x: number; y: number }[] = values.map((val, idx) => {
      const x = paddingX + (idx / (values.length - 1)) * innerW;
      const y = paddingY + innerH - (val / maxV) * innerH;
      return { x, y };
    });

    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    // area path for a filled look
    const areaPath =
      path + ` L ${points[points.length - 1].x.toFixed(1)} ${height - paddingY} L ${points[0].x.toFixed(1)} ${height - paddingY} Z`;

    const dots = points.map((p, i) => `<circle key="${i}" cx="${p.x}" cy="${p.y}" r="3.5" fill="#0b845a" stroke="#064e3b" stroke-width="1"></circle>`).join("");

    return { svg: `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#6d7dfb" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#a78bfa" stop-opacity="0.15"/>
        </linearGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="#3b82f6" flood-opacity="0.08"/>
        </filter>
      </defs>
      <g fill="none" stroke="none" filter="none">
        <path d="${areaPath}" fill="url(#g1)" opacity="0.95"></path>
        <path d="${path}" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>
        ${dots}
      </g>
    </svg>` , width, height };
  }, [stats]);

  return (
    <div className="dp-root">
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Main content — scrollable independently */}
      <div className="dp-main">
        <div className="dp-top">
          <div>
            <h1 className="dp-title">Dashboard</h1>
            <div className="dp-sub"> {greeting} {user?.firstName || ""}</div>
          </div>

          <div className="dp-controls">
            <form className="dp-search" onSubmit={onSearchSubmit}>
              <input
                className="dp-search-input"
                placeholder="Search Here..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            <button className="icon-btn" onClick={() => setFilterOpen((s) => !s)} title="Filter">
              <Sliders size={16} />
            </button>

            <button className="icon-btn" onClick={() => setNotifOpen((s) => !s)} title="Notifications">
              <Bell size={16} />
            </button>
          </div>
        </div>

        <div className="dp-stats-row">
          <div className="dp-stat-card">
            <div className="dp-stat-icon">📁</div>
            <div className="dp-stat-body">
              <div className="dp-stat-label">Datasets</div>
              <div className="dp-stat-num">{stats.totalDatasets}</div>
            </div>
          </div>

          <div className="dp-stat-card">
            <div className="dp-stat-icon">📊</div>
            <div className="dp-stat-body">
              <div className="dp-stat-label">Analysis</div>
              <div className="dp-stat-num">{stats.totalAnalyses}</div>
            </div>
          </div>

          <div className="dp-stat-card">
            <div className="dp-stat-icon">⚡</div>
            <div className="dp-stat-body">
              <div className="dp-stat-label">Recent Activity</div>
              <div className="dp-stat-num">{stats.recentActivity}</div>
            </div>
          </div>

          <div className="dp-stat-card">
            <div className="dp-stat-icon">🤝</div>
            <div className="dp-stat-body">
              <div className="dp-stat-label">Collaboration</div>
              <div className="dp-stat-num">{stats.collaborations}</div>
            </div>
          </div>
        </div>

        <div className="dp-visual-row">
          <div className="dp-chart-card">
            {/* static SVG chart */}
            <div
              className="dp-chart-svg"
              dangerouslySetInnerHTML={{ __html: (chartSvg.svg) }}
            />
          </div>

          <div className="dp-calendar-card">
            <div className="cal-head">
              <div className="cal-title">{calendar.monthName} {selectedDate.getFullYear()}</div>
              <div className="cal-controls">
                <button className="cal-btn" onClick={() => setSelectedDate(d => { const nd = new Date(d); nd.setMonth(d.getMonth() - 1); return nd; })}>&lsaquo;</button>
                <button className="cal-btn" onClick={() => setSelectedDate(d => { const nd = new Date(d); nd.setMonth(d.getMonth() + 1); return nd; })}>&rsaquo;</button>
              </div>
            </div>

            <div className="cal-grid">
              <div className="cal-weekdays">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((wd) => <div key={wd} className="cal-wd">{wd}</div>)}
              </div>

              <div className="cal-weeks">
                {calendar.weeks.map((row, rIdx) => (
                  <div key={rIdx} className="cal-week-row">
                    {row.map((d, cIdx) => {
                      const isToday = d === new Date().getDate() && selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear();
                      return (
                        <div
                          key={cIdx}
                          className={`cal-cell ${d ? "" : "empty"} ${isToday ? "today" : ""}`}
                          onClick={() => d && setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d))}
                        >
                          {d || ""}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="cal-footer">
                <small>Time</small>
                <div className="cal-time">{new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent lists */}
        <section className="dp-section">
          <div className="section-head">
            <h3>Recent Datasets</h3>
            <Link to="/datasets" className="section-link">View All</Link>
          </div>

          <div className="section-body">
            {Array.isArray(datasets) && datasets.length > 0 ? (
              datasets.slice(0,3).map(ds => (
                <div key={ds._id} className="dataset-row">
                  <div className="dataset-icon">📄</div>
                  <div className="dataset-info">
                    <div className="dataset-name">{ds.name}</div>
                    <div className="dataset-desc">{ds.description || "No description provided"}</div>
                  </div>
                  <div className="dataset-actions">
                    <button className="btn small" onClick={() => navigate(`/analytics/new?dataset=${ds._id}`)}>Analyze</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-block">
                <div className="empty-icon">📁</div>
                <div className="empty-text">No datasets yet</div>
                <button className="btn primary" onClick={() => navigate('/datasets')}>Upload Dataset</button>
              </div>
            )}
          </div>
        </section>

        <section className="dp-section">
          <div className="section-head">
            <h3>Recent Analysis Sessions</h3>
            <Link to="/analytics" className="section-link">View All</Link>
          </div>

          <div className="section-body">
            {Array.isArray(sessions) && sessions.length > 0 ? (
              sessions.slice(0,3).map(s => (
                <div key={s._id} className="dataset-row">
                  <div className="dataset-icon">🔮</div>
                  <div className="dataset-info">
                    <div className="dataset-name">{s.title}</div>
                    <div className="dataset-desc">{s.queries?.length || 0} queries • {s.visualizations?.length || 0} charts</div>
                  </div>
                  <div className="dataset-actions">
                    <button className="btn small" onClick={() => navigate(`/analytics/session/${s._id}`)}>Continue</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-block">
                <div className="empty-icon">🔍</div>
                <div className="empty-text">No analyses yet</div>
                <button className="btn primary" onClick={() => navigate('/analytics/new')}>New Analysis</button>
              </div>
            )}
          </div>
        </section>

        {/* Insights */}
        <div className="dp-insights">
          <div className="insights-card">
            <h3>AI Insights</h3>
            <div className="insight-banner">📈 Activity Summary: You have {stats.recentActivity} recent activities in the last 30 days.</div>
            {stats.dataQualityScore !== undefined && <div className="insight-banner">📊 Data Quality: {stats.dataQualityScore}%</div>}
          </div>
        </div>

        {/* bottom spacing so right-panel has breathing room */}
        <div style={{height: 36}} />
      </div>

      {/* small overlay panels (UI only) */}
      {filterOpen && (
        <div className="dp-overlay right">
          <div className="panel-head"><strong>Filters</strong><button onClick={() => setFilterOpen(false)} className="close">✕</button></div>
          <div className="panel-body">
            <label>Range<select><option>Last 7 days</option><option>Last 30 days</option></select></label>
            <label>Type<select><option>All</option><option>Datasets</option></select></label>
            <button className="btn primary" onClick={() => setFilterOpen(false)}>Apply</button>
          </div>
        </div>
      )}

      {notifOpen && (
        <div className="dp-overlay right">
          <div className="panel-head"><strong>Notifications</strong><button onClick={() => setNotifOpen(false)} className="close">✕</button></div>
          <div className="panel-body">
            <p>No new notifications</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
