import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Map, 
  Box, 
  Activity,
  Sparkles,
  Layout,
  Layers
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import './Visualizations.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface VisualizationsProps {
  dataset: any;
}

interface VisualizationCategory {
  name: string;
  icon: React.ComponentType<any>;
  items: VisualizationType[];
}

interface VisualizationType {
  name: string;
  icon: React.ComponentType<any>;
  description: string;
}

const VisualizationCategories: VisualizationCategory[] = [
  {
    name: 'Distribution',
    icon: BarChart3,
    items: [
      { name: 'Histogram', icon: BarChart3, description: 'Frequency distribution of data points' },
      { name: 'Box Plot', icon: Box, description: 'Quartiles and outliers visualization' },
      { name: 'Violin Plot', icon: Activity, description: 'Combines box plot with density estimation' },
      { name: 'Density Plot', icon: TrendingUp, description: 'Smooth probability distribution curve' },
      { name: 'Rug Plot', icon: BarChart3, description: 'One-dimensional data strip representation' },
      { name: 'Dot Plot', icon: BarChart3, description: 'Individual data points display' }
    ]
  },
  {
    name: 'Trend / Time Series',
    icon: TrendingUp,
    items: [
      { name: 'Line Chart', icon: TrendingUp, description: 'Continuous data over time' },
      { name: 'Area Chart', icon: TrendingUp, description: 'Magnitude over time with fill' },
      { name: 'Spline Chart', icon: TrendingUp, description: 'Smooth curved line chart' },
      { name: 'Time Series Plot', icon: TrendingUp, description: 'Temporal data visualization' },
      { name: 'Candlestick Chart', icon: BarChart3, description: 'Financial data representation' },
      { name: 'Stream Graph', icon: Activity, description: 'Layered area chart for streams' }
    ]
  },
  {
    name: 'Comparison',
    icon: BarChart3,
    items: [
      { name: 'Bar Chart', icon: BarChart3, description: 'Categorical data comparison' },
      { name: 'Grouped Bar Chart', icon: BarChart3, description: 'Multiple series side-by-side' },
      { name: 'Stacked Bar Chart', icon: Layers, description: 'Parts-to-whole relationship' },
      { name: 'Lollipop Chart', icon: BarChart3, description: 'Hybrid bar and dot chart' },
      { name: 'Bullet Chart', icon: BarChart3, description: 'Performance indicator display' },
      { name: 'Dumbbell Plot', icon: Activity, description: 'Two-points comparison' },
      { name: 'Radar Chart', icon: Sparkles, description: 'Multi-variable comparison' }
    ]
  },
  {
    name: 'Composition',
    icon: PieChart,
    items: [
      { name: 'Pie Chart', icon: PieChart, description: 'Proportions of a whole' },
      { name: 'Donut Chart', icon: PieChart, description: 'Pie chart with central hole' },
      { name: 'Stacked Area Chart', icon: Layers, description: 'Composition changes over time' },
      { name: 'Treemap', icon: Layout, description: 'Hierarchical data rectangles' },
      { name: 'Sunburst Chart', icon: Sparkles, description: 'Multi-level pie chart' },
      { name: 'Waterfall Chart', icon: BarChart3, description: 'Sequential value changes' },
      { name: 'Mosaic Plot', icon: Layout, description: 'Multi-dimensional contingency table' }
    ]
  },
  {
    name: 'Geospatial',
    icon: Map,
    items: [
      { name: 'Choropleth Map', icon: Map, description: 'Regions colored by data values' },
      { name: 'Heat Map', icon: Map, description: 'Geographic intensity visualization' },
      { name: 'Symbol Map', icon: Map, description: 'Geographic point markers' },
      { name: 'Bubble Map', icon: Map, description: 'Size-based geographic markers' },
      { name: 'Cartogram', icon: Map, description: 'Distorted by data values' },
      { name: 'Flow Map', icon: TrendingUp, description: 'Movement or connections between locations' }
    ]
  }
];

const Visualizations: React.FC<VisualizationsProps> = ({ dataset }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedVisualization, setSelectedVisualization] = useState<string>('');
  const [showRecommended, setShowRecommended] = useState(true);
  const chartRef = useRef<any>(null);

  // Recommended visualization logic
  const getRecommendedVisualization = () => {
    if (!dataset) return null;
    
    const fields = dataset.dataSchema?.fields || [];
    const hasNumericFields = fields.some(f => f.type === 'number');
    const hasDateFields = fields.some(f => f.type === 'date');
    const hasCategoricalFields = fields.some(f => f.type === 'string' || f.type === 'boolean');
    
    if (hasDateFields && hasNumericFields) {
      return { type: 'Line Chart', category: 'Trend / Time Series', reason: 'Time series data detected' };
    } else if (hasCategoricalFields && fields.length <= 5) {
      return { type: 'Pie Chart', category: 'Composition', reason: 'Categorical composition data' };
    } else if (hasNumericFields) {
      return { type: 'Bar Chart', category: 'Comparison', reason: 'Numeric comparison available' };
    }
    return { type: 'Bar Chart', category: 'Comparison', reason: 'General purpose visualization' };
  };

  const recommended = getRecommendedVisualization();

  // Generate sample chart data based on visualization type
  const generateChartData = (type: string) => {
    const sampleData = {
      labels: dataset?.dataSchema?.fields?.slice(0, 6).map((f: any) => f.name) || ['Field 1', 'Field 2', 'Field 3', 'Field 4', 'Field 5'],
      datasets: []
    };

    const colors = [
      'rgba(59, 130, 246, 0.8)', // blue
      'rgba(16, 185, 129, 0.8)', // green
      'rgba(239, 68, 68, 0.8)', // red
      'rgba(245, 158, 11, 0.8)', // orange
      'rgba(139, 92, 246, 0.8)', // purple
      'rgba(236, 72, 153, 0.8)'  // pink
    ];

    switch (type) {
      case 'Histogram':
      case 'Bar Chart':
      case 'Grouped Bar Chart':
      case 'Waterfall Chart':
      case 'Bullet Chart':
      case 'Dot Plot':
        return {
          labels: sampleData.labels,
          datasets: [{
            label: 'Value',
            data: sampleData.labels.map(() => Math.floor(Math.random() * 100) + 10),
            backgroundColor: colors[0],
            borderColor: colors[0].replace('0.8', '1'),
            borderWidth: 2,
            borderRadius: 8
          }]
        };

      case 'Line Chart':
      case 'Area Chart':
      case 'Spline Chart':
      case 'Time Series Plot':
        return {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Trend',
            data: [65, 59, 80, 81, 56, 85],
            borderColor: colors[0],
            backgroundColor: colors[0].replace('0.8', '0.1'),
            tension: type === 'Spline Chart' ? 0.4 : 0,
            fill: type === 'Area Chart',
            borderWidth: 3
          }]
        };

      case 'Pie Chart':
      case 'Donut Chart':
      case 'Sunburst Chart':
        const pieData = [25, 20, 20, 18, 17];
        const total = pieData.reduce((sum, val) => sum + val, 0);
        const piePercentages = pieData.map(val => ((val / total) * 100).toFixed(1));
        const labelsWithPercentages = sampleData.labels.slice(0, 5).map((label: string, index: number) => 
          `${label} (${piePercentages[index]}%)`
        );
        return {
          labels: labelsWithPercentages,
          datasets: [{
            data: pieData,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#fff'
          }],
          percentages: piePercentages
        };

      case 'Stacked Bar Chart':
      case 'Stacked Area Chart':
        return {
          labels: sampleData.labels,
          datasets: [
            {
              label: 'Series 1',
              data: [20, 30, 40, 30, 25],
              backgroundColor: colors[0]
            },
            {
              label: 'Series 2',
              data: [10, 20, 30, 20, 15],
              backgroundColor: colors[1]
            }
          ]
        };

      case 'Box Plot':
      case 'Violin Plot':
      case 'Density Plot':
      case 'Rug Plot':
        return {
          labels: sampleData.labels,
          datasets: [{
            label: 'Distribution',
            data: [
              { min: 10, q1: 25, median: 30, q3: 35, max: 50 },
              { min: 15, q1: 28, median: 32, q3: 38, max: 55 },
              { min: 12, q1: 30, median: 35, q3: 40, max: 60 },
              { min: 18, q1: 33, median: 38, q3: 42, max: 65 },
              { min: 20, q1: 35, median: 40, q3: 45, max: 70 }
            ],
            backgroundColor: colors[0],
            borderColor: colors[0].replace('0.8', '1'),
            borderWidth: 2
          }]
        };

      default:
        return {
          labels: sampleData.labels,
          datasets: [{
            label: 'Value',
            data: [65, 59, 80, 81, 56],
            backgroundColor: colors[0],
            borderColor: colors[0].replace('0.8', '1')
          }]
        };
    }
  };

  const renderVisualizationPreview = (type: string) => {
    const chartData = generateChartData(type);
    const getCommonOptions = (percentages?: string[]) => ({
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(30, 41, 59, 0.9)',
          padding: 12,
          titleFont: {
            size: 14
          },
          bodyFont: {
            size: 12
          },
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed || context.raw || 0;
              if (percentages && percentages[context.dataIndex]) {
                return `${label}: ${value} (${percentages[context.dataIndex]}%)`;
              }
              return `${label}: ${value}`;
            }
          }
        }
      }
    });

    // Check if it's a geospatial visualization
    if (type.includes('Map') || type === 'Cartogram') {
      return (
        <div className="visualization-preview">
          <div className="preview-placeholder">
            <div className="placeholder-content">
              <Map size={48} className="placeholder-icon" />
              <h3>{type}</h3>
              <p>Geospatial visualizations require location data</p>
            </div>
          </div>
        </div>
      );
    }

    // Render appropriate chart type
    if (type === 'Pie Chart' || type === 'Sunburst Chart') {
      return (
        <div className="visualization-preview">
          <Pie data={chartData} options={getCommonOptions(chartData.percentages)} />
        </div>
      );
    }

    if (type === 'Donut Chart') {
      return (
        <div className="visualization-preview">
          <Doughnut 
            data={chartData} 
            options={{ 
              ...getCommonOptions(chartData.percentages), 
              cutout: 50,
              plugins: {
                ...getCommonOptions(chartData.percentages).plugins,
                legend: {
                  ...getCommonOptions(chartData.percentages).plugins.legend
                }
              }
            }} 
          />
        </div>
      );
    }

    if (type === 'Line Chart' || type === 'Area Chart' || type === 'Spline Chart' || 
        type === 'Time Series Plot' || type === 'Stream Graph') {
      return (
        <div className="visualization-preview">
          <Line data={chartData} options={getCommonOptions()} />
        </div>
      );
    }

    if (type.includes('Bar') || type === 'Histogram' || type === 'Waterfall Chart' || 
        type === 'Bullet Chart' || type === 'Dot Plot' || type === 'Lollipop Chart') {
      return (
        <div className="visualization-preview">
          <Bar data={chartData} options={{ ...getCommonOptions(), indexAxis: type === 'Bullet Chart' ? 'y' as const : undefined }} />
        </div>
      );
    }

    // Default to placeholder for unsupported types
    return (
      <div className="visualization-preview">
        <div className="preview-placeholder">
          <div className="placeholder-content">
            <Sparkles size={48} className="placeholder-icon" />
            <h3>{type}</h3>
            <p>Visualization coming soon</p>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveVisualization = () => {
    if (!selectedVisualization) {
      alert('Please select a visualization first');
      return;
    }
    const visualizationData = {
      type: selectedVisualization,
      category: selectedCategory,
      dataset: dataset?.name,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('savedVisualization', JSON.stringify(visualizationData));
    alert('Visualization saved successfully!');
  };

  const handleExportAsImage = () => {
    if (!selectedVisualization) {
      alert('Please select a visualization first');
      return;
    }
    // Get the canvas element from the chart
    const canvas = document.querySelector('.visualization-preview canvas') as HTMLCanvasElement;
    if (canvas) {
      // Create a new canvas with white background
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const ctx = exportCanvas.getContext('2d');
      
      if (ctx) {
        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Draw the original chart on top
        ctx.drawImage(canvas, 0, 0);
        
        // Export as PNG
        const url = exportCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `visualization-${selectedVisualization.replace(/\s+/g, '-')}-${Date.now()}.png`;
        link.href = url;
        link.click();
      } else {
        alert('Unable to export visualization');
      }
    } else {
      alert('Unable to export visualization');
    }
  };

  return (
    <div className="visualizations-container">
      <div className="visualizations-header">
        <div className="header-info">
          <h2>
            <Sparkles className="header-icon" />
            Data Visualizations
          </h2>
          <p>Create custom visualizations of your dataset</p>
        </div>
      </div>

      {/* Recommended Visualization */}
      {showRecommended && recommended && (
        <div className="recommended-section">
          <div className="recommended-header">
            <div className="recommended-badge">
              <Sparkles size={16} />
              Recommended for your dataset
            </div>
            <button 
              className="close-recommended"
              onClick={() => setShowRecommended(false)}
            >
              ✕
            </button>
          </div>
          <div className="recommended-content">
            <div className="recommended-info">
              <h3>{recommended.type}</h3>
              <p>{recommended.reason}</p>
            </div>
            <button 
              className="btn-use-recommended"
              onClick={() => {
                if (recommended) {
                  setSelectedCategory(recommended.category);
                  setSelectedVisualization(recommended.type);
                  setShowRecommended(false);
                }
              }}
            >
              Use This Visualization
            </button>
          </div>
        </div>
      )}

      {/* Visualization Selector */}
      <div className="visualization-selector">
        <div className="category-tabs">
          {VisualizationCategories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.name}
                className={`category-tab ${selectedCategory === category.name ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(category.name);
                  setSelectedVisualization(category.items[0].name);
                }}
              >
                <Icon size={18} />
                {category.name}
              </button>
            );
          })}
        </div>

        {selectedCategory && (
          <div className="visualization-options">
            <div className="options-grid">
              {VisualizationCategories
                .find(c => c.name === selectedCategory)
                ?.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      className={`option-card ${selectedVisualization === item.name ? 'active' : ''}`}
                      onClick={() => setSelectedVisualization(item.name)}
                    >
                      <div className="option-icon">
                        <Icon size={24} />
                      </div>
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Visualization Canvas */}
      <div className="visualization-canvas">
        {selectedVisualization ? (
          renderVisualizationPreview(selectedVisualization)
        ) : (
          <div className="canvas-placeholder">
            <Sparkles size={64} className="canvas-icon" />
            <h3>No Visualization Selected</h3>
            <p>Choose a category and visualization type to begin</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="visualization-actions">
        <button 
          className="btn-secondary"
          onClick={handleSaveVisualization}
          disabled={!selectedVisualization}
        >
          Save Visualization
        </button>
        <button 
          className="btn-secondary"
          onClick={handleExportAsImage}
          disabled={!selectedVisualization}
        >
          Export as Image
        </button>
        <button 
          className="btn-secondary"
          disabled
        >
          Share
        </button>
      </div>
    </div>
  );
};

export default Visualizations;

