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
import { ChartConfig } from '../services/chartService';
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
}

const Chart: React.FC<ChartProps> = ({
  config,
  height = 400,
  width,
  className = '',
  onChartClick,
  showControls = true,
  allowExport = true
}) => {
  const chartRef = useRef<ChartJS>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    setIsFullscreen(!isFullscreen);
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
          <div className=\"heatmap-placeholder\">
            <p>Heatmap visualization coming soon</p>
            <p>This chart type requires custom D3.js implementation</p>
          </div>
        );
      default:
        return (
          <div className=\"chart-error\">
            <p>Unsupported chart type: {config.type}</p>
          </div>
        );
    }
  };

  return (
    <div className={`chart-container ${className} ${isFullscreen ? 'fullscreen' : ''}`}>
      {showControls && (
        <div className=\"chart-header\">
          <div className=\"chart-info\">
            {config.title && <h3 className=\"chart-title\">{config.title}</h3>}
            {config.description && <p className=\"chart-description\">{config.description}</p>}
          </div>
          
          <div className=\"chart-controls\">
            <div className=\"chart-toggles\">
              <button
                className={`toggle-button ${showLegend ? 'active' : ''}`}
                onClick={() => setShowLegend(!showLegend)}
                title=\"Toggle Legend\"
              >
                Legend
              </button>
              <button
                className={`toggle-button ${showTooltip ? 'active' : ''}`}
                onClick={() => setShowTooltip(!showTooltip)}
                title=\"Toggle Tooltips\"
              >
                Tooltips
              </button>
            </div>
            
            {allowExport && (
              <div className=\"export-controls\">
                <div className=\"dropdown\">
                  <button className=\"dropdown-toggle\" title=\"Export Chart\">
                    Export ↓
                  </button>
                  <div className=\"dropdown-menu\">
                    <button onClick={() => handleExport('png')}>PNG</button>
                    <button onClick={() => handleExport('jpeg')}>JPEG</button>
                    <button onClick={() => handleExport('pdf')} disabled>
                      PDF (Coming Soon)
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <button
              className=\"fullscreen-button\"
              onClick={handleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? '⤋' : '⤢'}
            </button>
          </div>
        </div>
      )}
      
      <div className=\"chart-content\" style={{ height: `${height}px` }}>
        {renderChart()}
      </div>
      
      {isFullscreen && (
        <div className=\"fullscreen-overlay\" onClick={() => setIsFullscreen(false)}>
          <div className=\"fullscreen-chart\" onClick={(e) => e.stopPropagation()}>
            <div className=\"fullscreen-header\">
              <h2>{config.title}</h2>
              <button
                className=\"close-fullscreen\"
                onClick={() => setIsFullscreen(false)}
              >
                ✕
              </button>
            </div>
            <div className=\"fullscreen-content\">
              {renderChart()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chart;", "original_text": "", "replace_all": false}]