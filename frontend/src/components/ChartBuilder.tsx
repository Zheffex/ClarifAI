import React, { useState, useEffect } from 'react';
import { Dataset } from '../types/api';
import { ChartService, ChartConfig } from '../services/chartService';
import Chart from './Chart';
import './ChartBuilder.css';

interface ChartBuilderProps {
  dataset: Dataset;
  onSave?: (config: ChartConfig) => void;
  onCancel?: () => void;
  initialConfig?: Partial<ChartConfig>;
}

interface FieldInfo {
  name: string;
  type: string;
  isNumeric: boolean;
  uniqueCount: number;
}

const ChartBuilder: React.FC<ChartBuilderProps> = ({
  dataset,
  onSave,
  onCancel,
  initialConfig
}) => {
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  // Chart configuration state
  const [chartType, setChartType] = useState<ChartConfig['type']>(initialConfig?.type || 'bar');
  const [xField, setXField] = useState<string>('');
  const [yField, setYField] = useState<string>('');
  const [aggregation, setAggregation] = useState<'sum' | 'count' | 'avg' | 'min' | 'max'>('count');
  const [title, setTitle] = useState(initialConfig?.title || '');
  const [description, setDescription] = useState(initialConfig?.description || '');
  
  // Generated chart state
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{
    type: ChartConfig['type'];
    score: number;
    reason: string;
  }>>([]);

  useEffect(() => {
    loadDatasetInfo();
  }, [dataset.id]);

  useEffect(() => {
    if (xField && previewData.length > 0) {
      const newSuggestions = ChartService.suggestChartTypes(previewData, xField, yField);
      setSuggestions(newSuggestions);
      
      // Auto-select best suggestion if no chart type is explicitly chosen
      if (!initialConfig?.type && newSuggestions.length > 0) {
        setChartType(newSuggestions[0].type);
      }
    }
  }, [xField, yField, previewData]);

  useEffect(() => {
    generateChart();
  }, [chartType, xField, yField, aggregation, title, description]);

  const loadDatasetInfo = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Load schema and preview data
      const [schemaResponse, previewResponse] = await Promise.all([
        fetch(`/api/datasets/${dataset.id}/schema`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`/api/datasets/${dataset.id}/preview?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (!schemaResponse.ok || !previewResponse.ok) {
        throw new Error('Failed to load dataset information');
      }

      const schemaData = await schemaResponse.json();
      const previewData = await previewResponse.json();

      // Process fields information
      const fieldInfo: FieldInfo[] = schemaData.data.schema.fields.map((field: any) => {
        const isNumeric = field.type === 'number';
        return {
          name: field.name,
          type: field.type,
          isNumeric,
          uniqueCount: field.distinctValues || 0
        };
      });

      setFields(fieldInfo);
      setPreviewData(previewData.data.rows);
      
      // Set default fields if not already set
      if (!xField && fieldInfo.length > 0) {
        setXField(fieldInfo[0].name);
      }
      
    } catch (error) {
      console.error('Failed to load dataset info:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChart = async () => {
    if (!xField || previewData.length === 0) {
      setChartConfig(null);
      return;
    }

    try {
      setChartError(null);
      const config = ChartService.createChartConfig(
        previewData,
        chartType,
        xField,
        yField || undefined,
        aggregation
      );
      
      // Override title and description if provided
      if (title) config.title = title;
      if (description) config.description = description;
      
      setChartConfig(config);
    } catch (error) {
      setChartError(error instanceof Error ? error.message : 'Failed to generate chart');
      setChartConfig(null);
    }
  };

  const handleSave = () => {
    if (chartConfig && onSave) {
      onSave(chartConfig);
    }
  };

  const getFieldOptions = (filterNumeric?: boolean) => {
    return fields.filter(field => {
      if (filterNumeric === true) return field.isNumeric;
      if (filterNumeric === false) return !field.isNumeric;
      return true;
    });
  };

  const getAggregationOptions = () => {
    if (!yField || !fields.find(f => f.name === yField)?.isNumeric) {
      return [{ value: 'count', label: 'Count' }];
    }
    
    return [
      { value: 'count', label: 'Count' },
      { value: 'sum', label: 'Sum' },
      { value: 'avg', label: 'Average' },
      { value: 'min', label: 'Minimum' },
      { value: 'max', label: 'Maximum' }
    ];
  };

  const renderChartTypeSelector = () => {
    const chartTypes: Array<{ type: ChartConfig['type']; label: string; icon: string }> = [
      { type: 'bar', label: 'Bar Chart', icon: '📊' },
      { type: 'line', label: 'Line Chart', icon: '📈' },
      { type: 'area', label: 'Area Chart', icon: '🏔️' },
      { type: 'pie', label: 'Pie Chart', icon: '🥧' },
      { type: 'doughnut', label: 'Doughnut Chart', icon: '🍩' },
      { type: 'scatter', label: 'Scatter Plot', icon: '⚡' },
      { type: 'histogram', label: 'Histogram', icon: '📋' }
    ];

    return (
      <div className=\"chart-type-selector\">
        <h4>Chart Type</h4>
        <div className=\"chart-type-grid\">
          {chartTypes.map(({ type, label, icon }) => (
            <button
              key={type}
              className={`chart-type-button ${chartType === type ? 'selected' : ''}`}
              onClick={() => setChartType(type)}
            >
              <span className=\"chart-type-icon\">{icon}</span>
              <span className=\"chart-type-label\">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderSuggestions = () => {
    if (suggestions.length === 0) return null;

    return (
      <div className=\"chart-suggestions\">
        <h4>Suggested Charts</h4>
        <div className=\"suggestions-list\">
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${index}`}
              className={`suggestion-item ${chartType === suggestion.type ? 'selected' : ''}`}
              onClick={() => setChartType(suggestion.type)}
            >
              <div className=\"suggestion-header\">
                <span className=\"suggestion-type\">{suggestion.type}</span>
                <span className=\"suggestion-score\">{Math.round(suggestion.score * 100)}%</span>
              </div>
              <p className=\"suggestion-reason\">{suggestion.reason}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className=\"chart-builder-loading\">
        <div className=\"loading-spinner\"></div>
        <p>Loading dataset information...</p>
      </div>
    );
  }

  return (
    <div className=\"chart-builder\">
      <div className=\"chart-builder-header\">
        <h2>Chart Builder</h2>
        <div className=\"header-actions\">
          {onCancel && (
            <button onClick={onCancel} className=\"cancel-button\">
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!chartConfig}
            className=\"save-button\"
          >
            Save Chart
          </button>
        </div>
      </div>

      <div className=\"chart-builder-content\">
        <div className=\"configuration-panel\">
          <div className=\"config-section\">
            <h3>Data Configuration</h3>
            
            <div className=\"form-group\">
              <label>X-Axis Field:</label>
              <select
                value={xField}
                onChange={(e) => setXField(e.target.value)}
                className=\"form-select\"
              >
                <option value=\"\">Select field...</option>
                {fields.map(field => (
                  <option key={field.name} value={field.name}>
                    {field.name} ({field.type})
                  </option>
                ))}
              </select>
            </div>

            {(chartType === 'bar' || chartType === 'line' || chartType === 'area' || chartType === 'scatter') && (
              <div className=\"form-group\">
                <label>Y-Axis Field (optional):</label>
                <select
                  value={yField}
                  onChange={(e) => setYField(e.target.value)}
                  className=\"form-select\"
                >
                  <option value=\"\">Count records</option>
                  {getFieldOptions(chartType === 'scatter' ? true : undefined).map(field => (
                    <option key={field.name} value={field.name}>
                      {field.name} ({field.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {yField && chartType !== 'scatter' && (
              <div className=\"form-group\">
                <label>Aggregation:</label>
                <select
                  value={aggregation}
                  onChange={(e) => setAggregation(e.target.value as any)}
                  className=\"form-select\"
                >
                  {getAggregationOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className=\"config-section\">
            <h3>Chart Appearance</h3>
            
            <div className=\"form-group\">
              <label>Title:</label>
              <input
                type=\"text\"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder=\"Enter chart title...\"
                className=\"form-input\"
              />
            </div>

            <div className=\"form-group\">
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder=\"Enter chart description...\"
                className=\"form-textarea\"
                rows={3}
              />
            </div>
          </div>

          {renderChartTypeSelector()}
          {renderSuggestions()}
        </div>

        <div className=\"preview-panel\">
          <div className=\"preview-header\">
            <h3>Preview</h3>
            {chartConfig && (
              <div className=\"preview-info\">
                <span>Data points: {previewData.length}</span>
              </div>
            )}
          </div>

          <div className=\"preview-content\">
            {chartError && (
              <div className=\"preview-error\">
                <h4>Chart Error</h4>
                <p>{chartError}</p>
              </div>
            )}
            
            {chartConfig && !chartError && (
              <Chart
                config={chartConfig}
                height={400}
                showControls={false}
                allowExport={false}
              />
            )}
            
            {!chartConfig && !chartError && (
              <div className=\"preview-placeholder\">
                <div className=\"placeholder-icon\">📊</div>
                <h4>Configure your chart</h4>
                <p>Select fields and chart type to see preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartBuilder;", "original_text": "", "replace_all": false}]