import React, { ReactNode } from 'react';
import './Widget.css';

export type WidgetSize = 'small' | 'medium' | 'large' | 'xlarge';
export type WidgetType = 'chart' | 'metric' | 'table' | 'text' | 'custom';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  size: WidgetSize;
  position: { x: number; y: number };
  data?: any;
  settings?: Record<string, any>;
  refreshInterval?: number; // in seconds
  lastUpdated?: Date;
}

interface WidgetProps {
  config: WidgetConfig;
  children: ReactNode;
  isEditing?: boolean;
  onEdit?: (config: WidgetConfig) => void;
  onDelete?: (id: string) => void;
  onResize?: (id: string, size: WidgetSize) => void;
  onMove?: (id: string, position: { x: number; y: number }) => void;
  onRefresh?: (id: string) => void;
  className?: string;
}

const Widget: React.FC<WidgetProps> = ({
  config,
  children,
  isEditing = false,
  onEdit,
  onDelete,
  onResize,
  onMove,
  onRefresh,
  className = ''
}) => {
  const getSizeClass = (size: WidgetSize) => {
    switch (size) {
      case 'small': return 'widget-small';
      case 'medium': return 'widget-medium';
      case 'large': return 'widget-large';
      case 'xlarge': return 'widget-xlarge';
      default: return 'widget-medium';
    }
  };

  const formatLastUpdated = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div 
      className={`widget ${getSizeClass(config.size)} ${className}`}
      data-widget-id={config.id}
      data-widget-type={config.type}
    >
      <div className=\"widget-header\">
        <div className=\"widget-title-section\">
          <h3 className=\"widget-title\">{config.title}</h3>
          {config.description && (
            <p className=\"widget-description\">{config.description}</p>
          )}
        </div>
        
        <div className=\"widget-controls\">
          {config.lastUpdated && (
            <span className=\"widget-last-updated\">
              {formatLastUpdated(config.lastUpdated)}
            </span>
          )}
          
          {onRefresh && (
            <button
              className=\"widget-control-button refresh\"
              onClick={() => onRefresh(config.id)}
              title=\"Refresh\"
            >
              🔄
            </button>
          )}
          
          {isEditing && (
            <>
              {onEdit && (
                <button
                  className=\"widget-control-button edit\"
                  onClick={() => onEdit(config)}
                  title=\"Edit Widget\"
                >
                  ✏️
                </button>
              )}
              
              {onResize && (
                <div className=\"widget-resize-controls\">
                  <select
                    value={config.size}
                    onChange={(e) => onResize(config.id, e.target.value as WidgetSize)}
                    className=\"widget-size-select\"
                    title=\"Resize Widget\"
                  >
                    <option value=\"small\">Small</option>
                    <option value=\"medium\">Medium</option>
                    <option value=\"large\">Large</option>
                    <option value=\"xlarge\">X-Large</option>
                  </select>
                </div>
              )}
              
              {onDelete && (
                <button
                  className=\"widget-control-button delete\"
                  onClick={() => onDelete(config.id)}
                  title=\"Delete Widget\"
                >
                  🗑️
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className=\"widget-content\">
        {children}
      </div>
      
      {isEditing && (
        <div className=\"widget-edit-overlay\">
          <div className=\"widget-drag-handle\" title=\"Drag to move\">
            ⋮⋮
          </div>
        </div>
      )}
    </div>
  );
};

export default Widget;", "original_text": "", "replace_all": false}]