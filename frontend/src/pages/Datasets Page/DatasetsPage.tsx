import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Upload,
  RefreshCw,
  Grid,
  List,
  MoreHorizontal,
  Calendar,
  FileText,
  Database,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Plus,
  Eye,
  BarChart3
} from 'lucide-react';
import "./DatasetsPage.css";
import { UploadDatasetFormModal } from '../../components/Dataset Components/UploadDatasetform';
import { DatasetList } from '../../components/Dataset Components/Datasetlist';
import { useDataset } from '../../contexts/DatasetContext';
import { Dataset } from '../../types';

type SortField = 'name' | 'createdAt' | 'size' | 'status';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'ready' | 'processing' | 'failed' | 'pending';

interface FilterState {
  search: string;
  status: StatusFilter;
  sortField: SortField;
  sortOrder: SortOrder;
  viewMode: ViewMode;
}

export const DatasetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { datasets, isLoading, error, refreshDatasets, deleteDataset, selectDataset } = useDataset();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all', // Show all datasets including failed ones by default
    sortField: 'createdAt',
    sortOrder: 'desc',
    viewMode: 'grid'
  });

  // Filter and sort datasets
  const filteredDatasets = useMemo(() => {
    let filtered = [...datasets];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(dataset =>
        dataset.name.toLowerCase().includes(searchLower) ||
        dataset.description?.toLowerCase().includes(searchLower) ||
        dataset.metadata?.type?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter - by default ('all'), show ALL datasets including failed ones
    // Only filter when user selects a specific status (like 'ready', 'processing', 'failed')
    if (filters.status !== 'all') {
      filtered = filtered.filter(dataset => {
        if (!dataset || !dataset.processingStatus) return false;
        const status = dataset.processingStatus.toLowerCase() || 'ready';
        // Map 'error' to 'failed' for display purposes
        const normalizedStatus = status === 'error' ? 'failed' : status;
        return normalizedStatus === filters.status;
      });
    }
    // When status is 'all', we keep all datasets (including failed ones)

    // Sort datasets
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'size':
          aValue = a.metadata?.size || 0;
          bValue = b.metadata?.size || 0;
          break;
        case 'status':
          aValue = a.processingStatus || 'ready';
          bValue = b.processingStatus || 'ready';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [datasets, filters]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshDatasets();
      showNotification('success', 'Datasets refreshed successfully!');
    } catch (error: any) {
      showNotification('error', 'Failed to refresh datasets');
    } finally {
      setIsRefreshing(false);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      sortField: 'createdAt',
      sortOrder: 'desc',
      viewMode: 'grid'
    });
  };

  const getStatusCount = (status: StatusFilter) => {
    if (status === 'all') return datasets.length;
    return datasets.filter(dataset => {
      if (!dataset || !dataset.processingStatus) return false;
      const datasetStatus = dataset.processingStatus.toLowerCase() || 'ready';
      // Map 'error' to 'failed' for display purposes
      const normalizedStatus = datasetStatus === 'error' ? 'failed' : datasetStatus;
      return normalizedStatus === status;
    }).length;
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready': return CheckCircle;
      case 'processing': return Clock;
      case 'failed': return AlertCircle;
      case 'pending': return Clock;
      default: return CheckCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready': return '#10b981';
      case 'processing': return '#f59e0b';
      case 'failed': return '#ef4444';
      case 'pending': return '#6b7280';
      default: return '#10b981';
    }
  };

  if (isLoading) {
    return (
      <div className="datasets-page">
        <div className="loading-container">
          <div className="loading-spinner">
            <RefreshCw className="spinner-icon" />
          </div>
          <h2>Loading Datasets</h2>
          <p>Fetching your data collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="datasets-page">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' ? (
              <CheckCircle className="notification-icon" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="notification-icon" />
            ) : (
              <Database className="notification-icon" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="datasets-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Datasets</h1>
            <p>Manage and analyze your data collections</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`btn-icon ${isRefreshing ? 'spinning' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <UploadDatasetFormModal onUploadSuccess={() => showNotification('success', 'Dataset uploaded successfully!')} />
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="filters-section">
        <div className="filters-header-top">
          <div className="dataset-stats">
            <div className="stat-item">
              <Database className="datasets-stat-icon" />
              <span>{datasets.length} Total</span>
            </div>
            <div className="stat-item">
              <CheckCircle className="datasets-stat-icon" style={{ color: '#10b981' }} />
              <span>{getStatusCount('ready')} Ready</span>
            </div>
            <div className="stat-item">
              <AlertCircle className="datasets-stat-icon" style={{ color: '#ef4444' }} />
              <span>{getStatusCount('failed')} Failed</span>
            </div>
          </div>
        </div>
        <div className="filters-header">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search datasets by name, description, or type..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="search-input"
            />
            {filters.search && (
              <button 
                className="clear-search"
                onClick={() => updateFilter('search', '')}
              >
                <X className="clear-icon" />
              </button>
            )}
          </div>
          <div className="controls-group">
            <button 
              className={`filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="btn-icon" />
              Filters
              {filters.status !== 'all' && (
                <span className="filter-badge">1</span>
              )}
            </button>
            <div className="view-toggle">
              <button 
                className={`view-btn ${filters.viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => updateFilter('viewMode', 'grid')}
              >
                <Grid className="btn-icon" />
              </button>
              <button 
                className={`view-btn ${filters.viewMode === 'list' ? 'active' : ''}`}
                onClick={() => updateFilter('viewMode', 'list')}
              >
                <List className="btn-icon" />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="advanced-filters">
            <div className="filter-group">
              <label>Status</label>
              <div className="status-filters">
                {(['all', 'ready', 'failed'] as StatusFilter[]).map(status => {
                  const StatusIcon = getStatusIcon(status);
                  const count = getStatusCount(status);
                  return (
                    <button
                      key={status}
                      className={`status-filter ${filters.status === status ? 'active' : ''}`}
                      onClick={() => updateFilter('status', status)}
                    >
                      <StatusIcon className="status-icon" style={{ color: getStatusColor(status) }} />
                      <span className="status-label">{status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}</span>
                      <span className="status-count">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="filter-group">
              <label>Sort by</label>
              <div className="sort-controls">
                <select 
                  value={filters.sortField}
                  onChange={(e) => updateFilter('sortField', e.target.value as SortField)}
                  className="sort-select"
                >
                  <option value="name">Name</option>
                  <option value="createdAt">Date Created</option>
                  <option value="size">File Size</option>
                  <option value="status">Status</option>
                </select>
                <button 
                  className="sort-order"
                  onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {filters.sortOrder === 'asc' ? <SortAsc className="btn-icon" /> : <SortDesc className="btn-icon" />}
                </button>
              </div>
            </div>
            <button className="clear-filters" onClick={clearFilters}>
              <X className="btn-icon" />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        <div className="results-info">
          <span className="results-count">
            {filteredDatasets.length} of {datasets.length} datasets
          </span>
          {filters.search && (
            <span className="search-term">
              matching "{filters.search}"
            </span>
          )}
        </div>
      </div>

      {/* Dataset List */}
      <div className="datasets-content">
        {error ? (
          <div className="error-state">
            <AlertCircle className="error-icon" />
            <h3>Failed to load datasets</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={handleRefresh}>
              <RefreshCw className="btn-icon" />
              Try Again
            </button>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="empty-state">
            <Database className="empty-icon" />
            <h3>No datasets found</h3>
            <p>
              {filters.search || filters.status !== 'all' 
                ? 'Try adjusting your filters or search terms'
                : 'Upload your first dataset to get started'
              }
            </p>
            {(!filters.search && filters.status === 'all') && (
              <UploadDatasetFormModal onUploadSuccess={() => showNotification('success', 'Dataset uploaded successfully!')} />
            )}
          </div>
        ) : (
          <DatasetList 
            datasets={filteredDatasets} 
            viewMode={filters.viewMode}
              onDatasetAction={async (action, dataset) => {
              switch (action) {
                case 'analyze':
                  try {
                    // Only analyze if dataset is ready
                    if (dataset.processingStatus === 'ready' || dataset.processingStatus === 'processing') {
                      await selectDataset(dataset._id);
                      navigate(`/analytics`);
                      showNotification('success', `Analyzing ${dataset.name}`);
                    } else {
                      showNotification('error', `Cannot analyze: Dataset is ${dataset.processingStatus}`);
                    }
                  } catch (error) {
                    showNotification('error', `Failed to analyze ${dataset.name}`);
                  }
                  break;
                case 'delete':
                  try {
                    await deleteDataset(dataset._id);
                    showNotification('success', `Successfully deleted ${dataset.name}`);
                  } catch (error) {
                    showNotification('error', `Failed to delete ${dataset.name}`);
                  }
                  break;
                case 'view':
                  showNotification('info', `Viewing ${dataset.name}`);
                  break;
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default DatasetsPage;