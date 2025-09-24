import React, { useState, useEffect } from 'react';
import { WidgetConfig, WidgetSize } from './Widget';
import MetricWidget from './MetricWidget';
import ChartWidget from './ChartWidget';
import { dashboardService } from '../services/dashboardService';
import './Dashboard.css';

interface DashboardProps {
  dashboardId?: string;
  title?: string;
  description?: string;
  initialWidgets?: WidgetConfig[];
  isEditing?: boolean;
  onSave?: (widgets: WidgetConfig[]) => void;
  onCancel?: () => void;
  className?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  dashboardId,
  title = 'Dashboard',
  description,
  initialWidgets = [],
  isEditing: propIsEditing = false,
  onSave,
  onCancel,
  className = ''
}) => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(initialWidgets);
  const [isEditing, setIsEditing] = useState(propIsEditing);
  const [gridColumns, setGridColumns] = useState(4);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dashboardId && !initialWidgets.length) {
      loadDashboard();
    }
  }, [dashboardId]);

  useEffect(() => {
    setIsEditing(propIsEditing);
  }, [propIsEditing]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setGridColumns(1);
      } else if (width < 1024) {
        setGridColumns(2);
      } else if (width < 1440) {
        setGridColumns(3);
      } else {
        setGridColumns(4);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadDashboard = async () => {
    if (!dashboardId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/dashboards/${dashboardId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setWidgets(result.data.widgets || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditWidget = (config: WidgetConfig) => {
    // This would open a widget configuration modal
    console.log('Edit widget:', config);
    // For now, just a placeholder
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(widget => widget.id !== widgetId));
  };

  const handleResizeWidget = (widgetId: string, size: WidgetSize) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, size }
        : widget
    ));
  };

  const handleRefreshWidget = async (widgetId: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, lastUpdated: new Date() }
        : widget
    ));
    
    // Trigger actual refresh logic here
    // This would depend on the widget type and its data source
  };

  const handleSave = () => {
    if (onSave) {
      onSave(widgets);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      setWidgets(initialWidgets);
    }
    setIsEditing(false);
  };

  const addSampleWidgets = async () => {
    try {
      // Fetch real dashboard stats
      const stats = await dashboardService.getStats();
      
      const sampleWidgets: WidgetConfig[] = [
        {
          id: `widget-${Date.now()}-1`,
          type: 'metric',
          title: 'Total Datasets',
          size: 'small',
          position: { x: 0, y: 0 },
          data: {
            value: stats.totalDatasets,
            label: 'Datasets',
            change: stats.totalDatasets > 0 ? {
              value: 0,
              type: 'neutral' as const,
              period: 'current'
            } : undefined,
            icon: '📁',
            color: '#007bff'
          }
        },
        {
          id: `widget-${Date.now()}-2`,
          type: 'metric',
          title: 'Analysis Sessions',
          size: 'small',
          position: { x: 1, y: 0 },
          data: {
            value: stats.totalAnalyses,
            label: 'Sessions',
            change: stats.totalAnalyses > 0 ? {
              value: 0,
              type: 'neutral' as const,
              period: 'current'
            } : undefined,
            icon: '🔍',
            color: '#28a745'
          }
        },
        {
          id: `widget-${Date.now()}-3`,
          type: 'metric',
          title: 'Data Quality Score',
          size: 'small',
          position: { x: 2, y: 0 },
          data: {
            value: stats.dataQualityScore || 0,
            label: 'Quality Score',
            format: 'percentage',
            change: stats.dataQualityScore ? {
              value: 0,
              type: 'neutral' as const,
              period: 'current'
            } : undefined,
            icon: '✅',
            color: '#17a2b8'
          }
        },
        {
          id: `widget-${Date.now()}-4`,
          type: 'metric',
          title: 'Storage Used',
          size: 'small',
          position: { x: 3, y: 0 },
          data: {
            value: stats.storageUsed || '0 Bytes',
            label: 'Storage',
            change: stats.storageUsed ? {
              value: 0,
              type: 'neutral' as const,
              period: 'current'
            } : undefined,
            icon: '💾',
            color: '#ffc107'
          }
        },
        {
          id: `widget-${Date.now()}-5`,
          type: 'metric',
          title: 'Recent Activity',
          size: 'small',
          position: { x: 0, y: 1 },
          data: {
            value: stats.recentActivity,
            label: 'Activities (30d)',
            change: stats.recentActivity > 0 ? {
              value: 0,
              type: 'neutral' as const,
              period: 'last 30 days'
            } : undefined,
            icon: '⚡',
            color: '#6f42c1'
          }
        },
        {
          id: `widget-${Date.now()}-6`,
          type: 'metric',
          title: 'Collaborations',
          size: 'small',
          position: { x: 1, y: 1 },
          data: {
            value: stats.collaborations,
            label: 'Collaborations',
            change: stats.collaborations > 0 ? {
              value: 0,
              type: 'neutral' as const,
              period: 'current'
            } : undefined,
            icon: '🤝',
            color: '#e83e8c'
          }
        }
      ];

      setWidgets(prev => [...prev, ...sampleWidgets]);
    } catch (error) {
      console.error('Failed to load real stats for widgets:', error);
      // Fallback to default widgets
      const fallbackWidgets: WidgetConfig[] = [
        {
          id: `widget-${Date.now()}-1`,
          type: 'metric',
          title: 'Getting Started',
          size: 'large',
          position: { x: 0, y: 0 },
          data: {
            value: 'Welcome!',
            label: 'Start by uploading a dataset',
            icon: '🚀',
            color: '#007bff'
          }
        }
      ];
      setWidgets(prev => [...prev, ...fallbackWidgets]);
    }
  };

  const renderWidget = (widget: WidgetConfig) => {
    const commonProps = {
      key: widget.id,
      config: widget,
      isEditing,
      onEdit: handleEditWidget,
      onDelete: handleDeleteWidget,
      onResize: handleResizeWidget,
      onRefresh: handleRefreshWidget
    };

    switch (widget.type) {
      case 'metric':
        // Type guard to ensure data exists for MetricWidget
        if (!widget.data) {
          return (
            <div key={widget.id} className="widget-placeholder">
              <p>Missing metric data</p>
            </div>
          );
        }
        return <MetricWidget {...commonProps} config={{...widget, data: widget.data}} />;
      case 'chart':
        // Type guard to ensure data exists for ChartWidget
        if (!widget.data) {
          return (
            <div key={widget.id} className="widget-placeholder">
              <p>Missing chart data</p>
            </div>
          );
        }
        return <ChartWidget {...commonProps} config={{...widget, data: widget.data}} />;
      default:
        return (
          <div key={widget.id} className="widget-placeholder">
            <p>Unsupported widget type: {widget.type}</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className={`dashboard ${className}`}>
      <div className="dashboard-header">
        <div className="dashboard-info">
          <h1 className="dashboard-title">{title}</h1>
          {description && <p className="dashboard-description">{description}</p>}
        </div>
        
        <div className="dashboard-controls">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="dashboard-button edit"
            >
              Edit Dashboard
            </button>
          )}
          
          {isEditing && (
            <>
              <button
                onClick={addSampleWidgets}
                className="dashboard-button add"
              >
                Add Dashboard Widgets
              </button>
              <button
                onClick={handleCancel}
                className="dashboard-button cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="dashboard-button save"
              >
                Save Dashboard
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="dashboard-content">
        {widgets.length === 0 ? (
          <div className="dashboard-empty">
            <div className="empty-icon">📊</div>
            <h3>No Widgets</h3>
            <p>Your dashboard is empty. Add some widgets to get started.</p>
            {isEditing && (
              <button
                onClick={addSampleWidgets}
                className="dashboard-button add"
              >
                Add Dashboard Widgets
              </button>
            )}
          </div>
        ) : (
          <div 
            className={`widgets-grid widgets-grid-${gridColumns}`}
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, 1fr)`
            }}
          >
            {widgets.map(renderWidget)}
          </div>
        )}
      </div>
      
      {isEditing && (
        <div className="dashboard-edit-help">
          <p>
            <strong>Edit Mode:</strong> You can resize widgets using the dropdown, 
            delete them with the trash icon, or add new ones using the controls above.
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;