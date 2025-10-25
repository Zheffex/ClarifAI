import React from 'react';
import Widget, { WidgetConfig } from './Widget';
import './MetricWidget.css';

interface MetricData {
  value: number | string;
  label: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  format?: 'number' | 'currency' | 'percentage' | 'duration';
  prefix?: string;
  suffix?: string;
  color?: string;
  icon?: string;
}

interface MetricWidgetProps {
  config: WidgetConfig & {
    data: MetricData;
  };
  isEditing?: boolean;
  onEdit?: (config: WidgetConfig) => void;
  onDelete?: (id: string) => void;
  onResize?: (id: string, size: any) => void;
  onRefresh?: (id: string) => void;
  className?: string;
}

const MetricWidget: React.FC<MetricWidgetProps> = ({
  config,
  isEditing,
  onEdit,
  onDelete,
  onResize,
  onRefresh,
  className
}) => {
  const formatValue = (value: number | string, format?: string, prefix?: string, suffix?: string): string => {
    if (typeof value === 'string') {
      return `${prefix || ''}${value}${suffix || ''}`;
    }

    let formatted: string;
    
    switch (format) {
      case 'currency':
        formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(value);
        break;
      case 'percentage':
        formatted = `${(value * 100).toFixed(1)}%`;
        break;
      case 'duration':
        if (value < 60) {
          formatted = `${value}s`;
        } else if (value < 3600) {
          formatted = `${Math.floor(value / 60)}m ${value % 60}s`;
        } else {
          const hours = Math.floor(value / 3600);
          const minutes = Math.floor((value % 3600) / 60);
          formatted = `${hours}h ${minutes}m`;
        }
        break;
      case 'number':
      default:
        if (value >= 1000000) {
          formatted = `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          formatted = `${(value / 1000).toFixed(1)}K`;
        } else {
          formatted = value.toLocaleString();
        }
        break;
    }
    
    return `${prefix || ''}${formatted}${suffix || ''}`;
  };

  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase': return '↗️';
      case 'decrease': return '↘️';
      case 'neutral': return '➡️';
    }
  };

  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase': return '#28a745';
      case 'decrease': return '#dc3545';
      case 'neutral': return '#6c757d';
    }
  };

  const { data } = config;

  return (
    <Widget
      config={config}
      isEditing={isEditing}
      onEdit={onEdit}
      onDelete={onDelete}
      onResize={onResize}
      onRefresh={onRefresh}
      className={`metric-widget ${className || ''}`}
    >
      <div className="metric-content">
        {data.icon && (
          <div className="metric-icon" style={{ color: data.color }}>
            {data.icon}
          </div>
        )}
        
        <div className="metric-main">
          <div 
            className="metric-value"
            style={{ color: data.color }}
          >
            {formatValue(data.value, data.format, data.prefix, data.suffix)}
          </div>
          
          <div className="metric-label">
            {data.label}
          </div>
        </div>
        
        {data.change && (
          <div className="metric-change">
            <div 
              className="metric-change-value"
              style={{ color: getChangeColor(data.change.type) }}
            >
              <span className="metric-change-icon">
                {getChangeIcon(data.change.type)}
              </span>
              {data.change.value > 0 ? '+' : ''}{data.change.value}%
            </div>
            <div className="metric-change-period">
              vs {data.change.period}
            </div>
          </div>
        )}
      </div>
    </Widget>
  );
};

export default MetricWidget;