import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Database, 
  Eye, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Download,
  Filter,
  Search,
  Settings,
  Zap
} from "lucide-react";
import "./AnalyticsPage.css";
import AIChat from "../../components/AIChat/AIChat";
import Chart from "../../components/Analytics/Chart";
import ChartWidget from "../../components/Analytics/ChartWidget";
import DataPreview from "../../components/Analytics/DataPreview";
import DataQualityReport from "../../components/Analytics/DataQualityReport";
import MetricWidget from "../../components/Analytics/MetricWidget";
import SchemaViewer from "../../components/Analytics/SchemaViewer";
import { aiService } from '../../services/aiService';
import { useDataset } from "../../contexts/DatasetContext";

const AnalyticsPage: React.FC = () => {
  const { datasets, selectedDataset, isLoading, error, fetchDatasets } = useDataset();
  
  // Local state for UI interactions
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed'>('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Get the current dataset (selectedDataset or first available)
  const currentDataset = selectedDataset || datasets?.[0];
  const datasetId = currentDataset?._id;

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchDatasets();
      showNotification('success', 'Data refreshed successfully!');
    } catch (error: any) {
      showNotification('error', 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle dataset selection
  const handleDatasetSelect = (dataset: any) => {
    // This would be implemented in DatasetContext
    showNotification('info', `Selected dataset: ${dataset.name}`);
  };

  // Mock data for demonstration when no real data is available
  const mockMetrics = [
    { id: 'total-rows', label: 'Total Rows', value: currentDataset?.metadata?.rows || 0, icon: Database, color: '#3b82f6' },
    { id: 'total-columns', label: 'Total Columns', value: currentDataset?.metadata?.columns || 0, icon: BarChart3, color: '#10b981' },
    { id: 'data-quality', label: 'Data Quality', value: '85%', icon: CheckCircle, color: '#f59e0b' },
    { id: 'completeness', label: 'Completeness', value: '92%', icon: TrendingUp, color: '#8b5cf6' }
  ];

  const mockCharts = [
    {
      id: 'distribution',
      title: 'Data Distribution',
      type: 'bar' as const,
      data: {
        labels: ['Valid', 'Missing', 'Invalid'],
        datasets: [{
          label: 'Records',
          data: [850, 120, 30],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
          },
          title: {
            display: true,
            text: 'Data Distribution'
          }
        }
      }
    },
    {
      id: 'trends',
      title: 'Data Trends',
      type: 'line' as const,
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Growth',
          data: [65, 78, 90, 81, 96, 105],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
          },
          title: {
            display: true,
            text: 'Data Trends'
          }
        }
      }
    }
  ];

  if (isLoading) {
    return (
      <div className="analytics-page">
        <div className="loading-container">
          <div className="loading-spinner">
            <RefreshCw className="spinner-icon" />
          </div>
          <h2>Loading Analytics Dashboard</h2>
          <p>Please wait while we prepare your data insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="error-container">
          <AlertCircle className="error-icon" />
          <h2>Failed to Load Analytics</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={handleRefresh}>
              <RefreshCw className="btn-icon" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' ? (
              <CheckCircle className="notification-icon" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="notification-icon" />
            ) : (
              <Zap className="notification-icon" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="analytics-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Analytics Dashboard</h1>
            <p>Interactive analytics and AI insights for your data</p>
          </div>
          <div className="header-actions">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button 
              className={`btn btn-outline ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="btn-icon" />
              Filters
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`btn-icon ${isRefreshing ? 'spinning' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button 
          className={`toggle-btn ${selectedView === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedView('overview')}
        >
          <Eye className="btn-icon" />
          Overview
        </button>
        <button 
          className={`toggle-btn ${selectedView === 'detailed' ? 'active' : ''}`}
          onClick={() => setSelectedView('detailed')}
        >
          <Settings className="btn-icon" />
          Detailed
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Dataset Status</label>
            <select className="filter-select">
              <option value="all">All Status</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Data Type</label>
            <select className="filter-select">
              <option value="all">All Types</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xlsx">Excel</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Date Range</label>
            <input type="date" className="filter-input" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="analytics-content">
        {/* AI Chat Section */}
        <div className="card ai-chat-card">
          <div className="card-header">
            <h2>
              <Zap className="card-icon" />
              AI Assistant
            </h2>
            <div className="card-actions">
              <button className="btn btn-sm btn-outline">
                <Settings className="btn-icon" />
              </button>
            </div>
          </div>
          <div className="card-content">
            <AIChat datasets={datasets} />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="metrics-grid">
          {mockMetrics.map((metric) => (
            <div key={metric.id} className="metric-card">
              <div className="metric-icon" style={{ backgroundColor: metric.color }}>
                <metric.icon className="icon" />
              </div>
              <div className="metric-content">
                <h3>{metric.value}</h3>
                <p>{metric.label}</p>
              </div>
              <div className="metric-trend">
                <TrendingUp className="trend-icon" />
                <span>+12%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Data Preview */}
        <div className="card data-preview-card">
          <div className="card-header">
            <h2>
              <Database className="card-icon" />
              Data Preview
            </h2>
            <div className="card-actions">
              <button className="btn btn-sm btn-outline">
                <Download className="btn-icon" />
                Export
              </button>
            </div>
          </div>
          <div className="card-content">
            {currentDataset ? (
              <DataPreview dataset={currentDataset} />
            ) : (
              <div className="empty-state">
                <Database className="empty-icon" />
                <h3>No Dataset Selected</h3>
                <p>Please upload a dataset to view data preview</p>
                <button className="btn btn-primary">
                  Upload Dataset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          {mockCharts.map((chart) => (
            <div key={chart.id} className="card chart-card">
              <div className="card-header">
                <h2>
                  <BarChart3 className="card-icon" />
                  {chart.title}
                </h2>
                <div className="card-actions">
                  <button className="btn btn-sm btn-outline">
                    <PieChart className="btn-icon" />
                  </button>
                  <button className="btn btn-sm btn-outline">
                    <Download className="btn-icon" />
                  </button>
                </div>
              </div>
              <div className="card-content">
                <Chart config={chart} />
              </div>
            </div>
          ))}
        </div>

        {/* Data Quality & Schema */}
        <div className="analysis-section">
          <div className="card quality-card">
            <div className="card-header">
              <h2>
                <CheckCircle className="card-icon" />
                Data Quality Report
              </h2>
            </div>
            <div className="card-content">
              {currentDataset ? (
                <DataQualityReport dataset={currentDataset} />
              ) : (
                <div className="empty-state">
                  <CheckCircle className="empty-icon" />
                  <h3>No Quality Data</h3>
                  <p>Select a dataset to view quality analysis</p>
                </div>
              )}
            </div>
          </div>

          <div className="card schema-card">
            <div className="card-header">
              <h2>
                <Settings className="card-icon" />
                Schema Viewer
              </h2>
            </div>
            <div className="card-content">
              {currentDataset ? (
                <SchemaViewer dataset={currentDataset} />
              ) : (
                <div className="empty-state">
                  <Settings className="empty-icon" />
                  <h3>No Schema Data</h3>
                  <p>Select a dataset to view schema information</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;