import React, { useState, useEffect } from 'react';
import Widget, { WidgetConfig } from './Widget';
import Chart from './Chart';
import { ChartConfig, ChartService } from '../services/chartService';
import './ChartWidget.css';

interface ChartWidgetData {
  datasetId?: string;
  chartConfig?: ChartConfig;
  xField?: string;
  yField?: string;
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max';
  autoRefresh?: boolean;
}

interface ChartWidgetProps {
  config: WidgetConfig & {
    data: ChartWidgetData;
  };
  isEditing?: boolean;
  onEdit?: (config: WidgetConfig) => void;
  onDelete?: (id: string) => void;
  onResize?: (id: string, size: any) => void;
  onRefresh?: (id: string) => void;
  className?: string;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({
  config,
  isEditing,
  onEdit,
  onDelete,
  onResize,
  onRefresh,
  className
}) => {
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(config.data.chartConfig || null);
  const [loading, setLoading] = useState(!config.data.chartConfig);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config.data.datasetId && config.data.xField && !config.data.chartConfig) {
      loadChartData();
    }
  }, [config.data]);

  useEffect(() => {
    if (config.data.autoRefresh && config.refreshInterval) {
      const interval = setInterval(() => {
        if (onRefresh) {
          onRefresh(config.id);
        } else {
          loadChartData();
        }
      }, config.refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [config.data.autoRefresh, config.refreshInterval, onRefresh]);

  const loadChartData = async () => {
    if (!config.data.datasetId || !config.data.xField) {
      setError('Dataset ID and X field are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/datasets/${config.data.datasetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load dataset');
      }

      const result = await response.json();
      const dataset = result.data.dataset;

      // Generate chart from dataset
      const chartType = config.data.chartConfig?.type || 'bar';
      const generatedConfig = await ChartService.generateChartFromDataset(
        dataset,
        chartType,
        config.data.xField!,
        config.data.yField,
        config.data.aggregation
      );

      // Override with custom title/description if provided
      if (config.title && config.title !== generatedConfig.title) {
        generatedConfig.title = config.title;
      }
      if (config.description) {
        generatedConfig.description = config.description;
      }

      setChartConfig(generatedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const getWidgetHeight = () => {
    switch (config.size) {
      case 'small': return 150;
      case 'medium': return 250;
      case 'large': return 350;
      case 'xlarge': return 450;
      default: return 250;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="chart-widget-loading">
          <div className="loading-spinner"></div>
          <p>Loading chart data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="chart-widget-error">
          <div className="error-icon">⚠️</div>
          <h4>Chart Error</h4>
          <p>{error}</p>
          <button 
            onClick={loadChartData}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!chartConfig) {
      return (
        <div className="chart-widget-empty">
          <div className="empty-icon">📊</div>
          <h4>No Chart Data</h4>
          <p>Configure the widget to display a chart</p>
          {isEditing && onEdit && (
            <button 
              onClick={() => onEdit(config)}
              className="configure-button"
            >
              Configure Chart
            </button>
          )}
        </div>
      );
    }

    return (
      <Chart
        config={chartConfig}
        height={getWidgetHeight()}
        showControls={false}
        allowExport={!isEditing}
        className="chart-widget-chart"
      />
    );
  };

  return (
    <Widget
      config={{
        ...config,
        lastUpdated: loading ? undefined : new Date()
      }}
      isEditing={isEditing}
      onEdit={onEdit}
      onDelete={onDelete}
      onResize={onResize}
      onRefresh={onRefresh}
      className={`chart-widget ${className || ''} ${loading ? 'loading' : ''} ${error ? 'error' : ''}`}
    >
      {renderContent()}
    </Widget>
  );
};

export default ChartWidget;