import React, { useState, useEffect } from 'react';
import { WidgetConfig, WidgetSize } from './Widget';
import MetricWidget from './MetricWidget';
import ChartWidget from './ChartWidget';
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

  const addSampleWidgets = () => {
    const sampleWidgets: WidgetConfig[] = [
      {
        id: `widget-${Date.now()}-1`,
        type: 'metric',
        title: 'Total Datasets',
        size: 'small',
        position: { x: 0, y: 0 },
        data: {
          value: 142,
          label: 'Datasets',
          change: {
            value: 12.5,
            type: 'increase',
            period: 'last month'
          },
          icon: '📊',
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
          value: 1247,
          label: 'Sessions',
          change: {
            value: -3.2,
            type: 'decrease',
            period: 'last week'
          },
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
          value: 94.7,
          label: 'Quality Score',
          format: 'percentage',
          change: {
            value: 2.1,
            type: 'increase',
            period: 'last month'
          },
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
          value: '2.4 GB',
          label: 'Storage',
          change: {
            value: 8.9,
            type: 'increase',
            period: 'last month'
          },
          icon: '💾',
          color: '#ffc107'
        }
      }
    ];

    setWidgets(prev => [...prev, ...sampleWidgets]);
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
                Add Sample Widgets
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
                Add Sample Widgets
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