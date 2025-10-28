import React, { useRef, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import {
  Chart as ReactChart,
  Bar,
  Line,
  Pie,
  Doughnut,
  Scatter
} from 'react-chartjs-2';
import { ChartConfig } from '../../services/chartService';
import './Chart.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface ChartProps {
  config: ChartConfig;
  height?: number;
  width?: number;
  className?: string;
  onChartClick?: (event: any, elements: any[]) => void;
  showControls?: boolean;
  allowExport?: boolean;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

const Chart: React.FC<ChartProps> = ({
  config,
  height = 400,
  width,
  className = '',
  onChartClick,
  showControls = true,
  allowExport = true,
  isFullscreen = false,
  onFullscreenToggle
}) => {
  const chartRef = useRef<ChartJS>(null);
  const [showTooltip, setShowTooltip] = useState(true);
  const [showLegend, setShowLegend] = useState(config.options.plugins?.legend?.display ?? true);

  const handleExport = (format: 'png' | 'jpeg' | 'pdf') => {
    if (!chartRef.current) return;

    const canvas = chartRef.current.canvas;
    if (!canvas) return;

    if (format === 'pdf') {
      // For PDF export, would need additional library like jsPDF
      console.warn('PDF export requires additional implementation');
      return;
    }

    const url = canvas.toDataURL(`image/${format}`);
    const link = document.createElement('a');
    link.download = `chart-${Date.now()}.${format}`;
    link.href = url;
    link.click();
  };

  const handleFullscreen = () => {
    if (onFullscreenToggle) {
      onFullscreenToggle();
    }
  };

  const updatedConfig = {
    ...config,
    options: {
      ...config.options,
      plugins: {
        ...config.options.plugins,
        tooltip: {
          enabled: showTooltip
        },
        legend: {
          ...config.options.plugins?.legend,
          display: showLegend
        }
      },
      onClick: onChartClick
    }
  };

  const renderChart = () => {
    switch (config.type) {
      case 'bar':
        return (
          <Bar
            ref={chartRef as any}
            data={updatedConfig.data}
            options={updatedConfig.options}
            height={height}
            width={width}
          />
        );
      case 'line':
      case 'area':
        return (
          <Line
            ref={chartRef as any}
            data={updatedConfig.data}
            options={updatedConfig.options}
            height={height}
            width={width}
          />
        );
      case 'pie':
        return (
          <Pie
            ref={chartRef as any}
            data={updatedConfig.data}
            options={updatedConfig.options}
            height={height}
            width={width}
          />
        );
      case 'doughnut':
        return (
          <Doughnut
            ref={chartRef as any}
            data={updatedConfig.data}
            options={updatedConfig.options}
            height={height}
            width={width}
          />
        );
      case 'scatter':
        return (
          <Scatter
            ref={chartRef as any}
            data={updatedConfig.data}
            options={updatedConfig.options}
            height={height}
            width={width}
          />
        );
      case 'histogram':
        // Histogram is rendered as a bar chart
        return (
          <Bar
            ref={chartRef as any}
            data={updatedConfig.data}
            options={updatedConfig.options}
            height={height}
            width={width}
          />
        );
      case 'heatmap':
        return (
          <div className="heatmap-placeholder">
            <p>Heatmap visualization coming soon</p>
            <p>This chart type requires custom D3.js implementation</p>
          </div>
        );
      default:
        return (
          <div className="chart-error">
            <p>Unsupported chart type: {config.type}</p>
          </div>
        );
    }
  };

  return (
    <div className={`chart-container ${className} ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="chart-content" style={{ minHeight: `${height}px`, height: '100%' }}>
        {renderChart()}
      </div>
      
      {isFullscreen && (
        <div className="fullscreen-overlay" onClick={() => onFullscreenToggle && onFullscreenToggle()}>
          <div className="fullscreen-chart" onClick={(e) => e.stopPropagation()}>
            <div className="fullscreen-header">
              <h2>{config.title}</h2>
              <button
                className="close-fullscreen"
                onClick={() => onFullscreenToggle && onFullscreenToggle()}
              >
                ✕
              </button>
            </div>
            <div className="fullscreen-content">
              {renderChart()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chart;