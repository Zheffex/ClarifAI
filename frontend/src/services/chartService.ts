import { Dataset } from '../types/api';

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }>;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    title?: {
      display: boolean;
      text: string;
    };
    legend?: {
      display: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip?: {
      enabled: boolean;
    };
  };
  scales?: {
    x?: {
      display: boolean;
      title?: {
        display: boolean;
        text: string;
      };
    };
    y?: {
      display: boolean;
      title?: {
        display: boolean;
        text: string;
      };
      beginAtZero?: boolean;
    };
  };
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'area' | 'histogram' | 'heatmap';
  data: ChartData;
  options: ChartOptions;
  title?: string;
  description?: string;
}

export class ChartService {
  private static readonly COLORS = [
    '#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
    '#6f42c1', '#fd7e14', '#20c997', '#6c757d', '#343a40'
  ];

  private static readonly GRADIENTS = [
    ['#007bff', '#0056b3'],
    ['#28a745', '#1e7e34'],
    ['#dc3545', '#bd2130'],
    ['#ffc107', '#e0a800'],
    ['#17a2b8', '#117a8b']
  ];

  /**
   * Generate chart data from dataset
   */
  static async generateChartFromDataset(
    dataset: Dataset,
    chartType: ChartConfig['type'],
    xField: string,
    yField?: string,
    aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max'
  ): Promise<ChartConfig> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/datasets/${dataset._id}/preview?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load dataset preview');
      }

      const result = await response.json();
      const data = result.data.rows;

      return this.createChartConfig(data, chartType, xField, yField, aggregation);
    } catch (error) {
      throw new Error(`Failed to generate chart: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create chart configuration from raw data
   */
  static createChartConfig(
    data: any[],
    chartType: ChartConfig['type'],
    xField: string,
    yField?: string,
    aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' = 'count'
  ): ChartConfig {
    switch (chartType) {
      case 'bar':
      case 'line':
      case 'area':
        return this.createCategoricalChart(data, chartType, xField, yField, aggregation);
      case 'pie':
      case 'doughnut':
        return this.createPieChart(data, chartType, xField, yField, aggregation);
      case 'scatter':
        return this.createScatterChart(data, xField, yField!);
      case 'histogram':
        return this.createHistogram(data, xField);
      case 'heatmap':
        return this.createHeatmap(data, xField, yField!);
      default:
        throw new Error(`Unsupported chart type: ${chartType}`);
    }
  }

  /**
   * Create categorical charts (bar, line, area)
   */
  private static createCategoricalChart(
    data: any[],
    chartType: 'bar' | 'line' | 'area',
    xField: string,
    yField?: string,
    aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' = 'count'
  ): ChartConfig {
    const groupedData = this.groupAndAggregate(data, xField, yField, aggregation);
    const labels = Object.keys(groupedData).sort();
    const values = labels.map(label => groupedData[label]);

    const chartData: ChartData = {
      labels,
      datasets: [{
        label: yField ? `${aggregation}(${yField})` : 'Count',
        data: values,
        backgroundColor: chartType === 'line' ? 'transparent' : this.COLORS[0] + '80',
        borderColor: this.COLORS[0],
        borderWidth: 2,
        fill: chartType === 'area',
        tension: chartType === 'line' || chartType === 'area' ? 0.4 : 0
      }]
    };

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `${this.capitalizeFirst(aggregation)} by ${this.capitalizeFirst(xField)}`
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: this.capitalizeFirst(xField)
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: yField ? `${this.capitalizeFirst(aggregation)} of ${this.capitalizeFirst(yField)}` : 'Count'
          },
          beginAtZero: true
        }
      }
    };

    return {
      type: chartType,
      data: chartData,
      options,
      title: `${this.capitalizeFirst(aggregation)} by ${this.capitalizeFirst(xField)}`,
      description: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart showing ${aggregation} of ${yField || 'records'} grouped by ${xField}`
    };
  }

  /**
   * Create pie/doughnut charts
   */
  private static createPieChart(
    data: any[],
    chartType: 'pie' | 'doughnut',
    xField: string,
    yField?: string,
    aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' = 'count'
  ): ChartConfig {
    const groupedData = this.groupAndAggregate(data, xField, yField, aggregation);
    const labels = Object.keys(groupedData).sort();
    const values = labels.map(label => groupedData[label]);

    const chartData: ChartData = {
      labels,
      datasets: [{
        label: yField ? `${aggregation}(${yField})` : 'Count',
        data: values,
        backgroundColor: this.COLORS.slice(0, labels.length),
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    };

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Distribution of ${this.capitalizeFirst(xField)}`
        },
        legend: {
          display: true,
          position: 'right'
        }
      }
    };

    return {
      type: chartType,
      data: chartData,
      options,
      title: `Distribution of ${this.capitalizeFirst(xField)}`,
      description: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart showing distribution of ${xField}`
    };
  }

  /**
   * Create scatter plot
   */
  private static createScatterChart(
    data: any[],
    xField: string,
    yField: string
  ): ChartConfig {
    const scatterData = data
      .filter(row => row[xField] != null && row[yField] != null)
      .map(row => ({
        x: Number(row[xField]) || 0,
        y: Number(row[yField]) || 0
      }));

    const chartData: ChartData = {
      labels: [],
      datasets: [{
        label: `${yField} vs ${xField}`,
        data: scatterData as any,
        backgroundColor: this.COLORS[0] + '80',
        borderColor: this.COLORS[0],
        borderWidth: 1
      }]
    };

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `${this.capitalizeFirst(yField)} vs ${this.capitalizeFirst(xField)}`
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: this.capitalizeFirst(xField)
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: this.capitalizeFirst(yField)
          }
        }
      }
    };

    return {
      type: 'scatter',
      data: chartData,
      options,
      title: `${this.capitalizeFirst(yField)} vs ${this.capitalizeFirst(xField)}`,
      description: `Scatter plot showing relationship between ${xField} and ${yField}`
    };
  }

  /**
   * Create histogram
   */
  private static createHistogram(
    data: any[],
    field: string,
    bins: number = 10
  ): ChartConfig {
    const values = data
      .map(row => Number(row[field]))
      .filter(val => !isNaN(val))
      .sort((a, b) => a - b);

    if (values.length === 0) {
      throw new Error('No numeric values found for histogram');
    }

    const min = values[0];
    const max = values[values.length - 1];
    const binSize = (max - min) / bins;

    const binCounts = new Array(bins).fill(0);
    const binLabels = [];

    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binSize;
      const binEnd = min + (i + 1) * binSize;
      binLabels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
    }

    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      binCounts[binIndex]++;
    });

    const chartData: ChartData = {
      labels: binLabels,
      datasets: [{
        label: 'Frequency',
        data: binCounts,
        backgroundColor: this.COLORS[0] + '80',
        borderColor: this.COLORS[0],
        borderWidth: 1
      }]
    };

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Distribution of ${this.capitalizeFirst(field)}`
        },
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: this.capitalizeFirst(field)
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Frequency'
          },
          beginAtZero: true
        }
      }
    };

    return {
      type: 'bar',
      data: chartData,
      options,
      title: `Distribution of ${this.capitalizeFirst(field)}`,
      description: `Histogram showing frequency distribution of ${field}`
    };
  }

  /**
   * Create heatmap (using custom D3 implementation)
   */
  private static createHeatmap(
    data: any[],
    xField: string,
    yField: string
  ): ChartConfig {
    // This will be implemented with D3.js
    // For now, return a placeholder configuration
    return {
      type: 'heatmap',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Heatmap: ${this.capitalizeFirst(yField)} vs ${this.capitalizeFirst(xField)}`
          }
        }
      },
      title: `Heatmap: ${this.capitalizeFirst(yField)} vs ${this.capitalizeFirst(xField)}`,
      description: `Heatmap showing correlation between ${xField} and ${yField}`
    };
  }

  /**
   * Group data and apply aggregation
   */
  private static groupAndAggregate(
    data: any[],
    groupField: string,
    valueField?: string,
    aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' = 'count'
  ): Record<string, number> {
    const grouped: Record<string, any[]> = {};

    data.forEach(row => {
      const key = String(row[groupField] || 'null');
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(row);
    });

    const result: Record<string, number> = {};

    Object.keys(grouped).forEach(key => {
      const group = grouped[key];
      
      if (aggregation === 'count') {
        result[key] = group.length;
      } else if (valueField) {
        const values = group
          .map(row => Number(row[valueField]))
          .filter(val => !isNaN(val));
        
        if (values.length === 0) {
          result[key] = 0;
        } else {
          switch (aggregation) {
            case 'sum':
              result[key] = values.reduce((sum, val) => sum + val, 0);
              break;
            case 'avg':
              result[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
              break;
            case 'min':
              result[key] = Math.min(...values);
              break;
            case 'max':
              result[key] = Math.max(...values);
              break;
            default:
              result[key] = values.length;
          }
        }
      } else {
        result[key] = group.length;
      }
    });

    return result;
  }

  /**
   * Analyze data and suggest best chart types
   */
  static suggestChartTypes(data: any[], xField: string, yField?: string): Array<{
    type: ChartConfig['type'];
    score: number;
    reason: string;
  }> {
    const suggestions: Array<{ type: ChartConfig['type']; score: number; reason: string }> = [];

    if (!data || data.length === 0) {
      return suggestions;
    }

    const xValues = data.map(row => row[xField]).filter(val => val != null);
    const xUniqueCount = new Set(xValues).size;
    const xIsNumeric = xValues.every(val => !isNaN(Number(val)));

    if (yField) {
      const yValues = data.map(row => row[yField]).filter(val => val != null);
      const yIsNumeric = yValues.every(val => !isNaN(Number(val)));

      if (xIsNumeric && yIsNumeric) {
        suggestions.push({
          type: 'scatter',
          score: 0.9,
          reason: 'Both fields are numeric - scatter plot shows correlation'
        });
      }

      if (!xIsNumeric && yIsNumeric) {
        suggestions.push(
          {
            type: 'bar',
            score: 0.8,
            reason: 'Categorical X with numeric Y - bar chart shows comparison'
          },
          {
            type: 'line',
            score: 0.6,
            reason: 'Good for showing trends over categories'
          }
        );
      }
    } else {
      // Single field analysis
      if (xIsNumeric) {
        suggestions.push({
          type: 'histogram',
          score: 0.9,
          reason: 'Numeric field - histogram shows distribution'
        });
      } else {
        if (xUniqueCount <= 10) {
          suggestions.push(
            {
              type: 'pie',
              score: 0.8,
              reason: 'Few categories - pie chart shows proportion'
            },
            {
              type: 'doughnut',
              score: 0.7,
              reason: 'Few categories - doughnut chart shows proportion'
            },
            {
              type: 'bar',
              score: 0.6,
              reason: 'Categorical data - bar chart shows counts'
            }
          );
        } else {
          suggestions.push({
            type: 'bar',
            score: 0.8,
            reason: 'Many categories - bar chart shows counts'
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.score - a.score);
  }

  /**
   * Get color palette
   */
  static getColorPalette(count: number = 10): string[] {
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(this.COLORS[i % this.COLORS.length]);
    }
    return colors;
  }

  /**
   * Capitalize first letter
   */
  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}