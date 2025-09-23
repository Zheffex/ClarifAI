import React, { useState, useEffect } from 'react';
import { Dataset } from '../types/api';
import './SchemaViewer.css';

interface SchemaViewerProps {
  dataset: Dataset;
  onClose?: () => void;
}

interface SchemaData {
  schema: {
    fields: Array<{
      name: string;
      type: string;
      nullable: boolean;
      unique?: boolean;
      pattern?: string;
      minValue?: number;
      maxValue?: number;
      avgValue?: number;
      distinctValues?: number;
      sampleValues: any[];
      confidence: number;
    }>;
    relationships?: Array<{
      sourceField: string;
      targetField: string;
      type: string;
      strength: number;
    }>;
  };
  metadata: {
    rows: number;
    columns: number;
    qualityScore?: number;
    qualityGrade?: string;
  };
  totalRows: number;
  totalColumns: number;
}

const SchemaViewer: React.FC<SchemaViewerProps> = ({ dataset, onClose }) => {
  const [schemaData, setSchemaData] = useState<SchemaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'fields' | 'relationships' | 'summary'>('fields');

  useEffect(() => {
    loadSchemaData();
  }, [dataset.id]);

  const loadSchemaData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/datasets/${dataset.id}/schema`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load schema data');
      }

      const result = await response.json();
      setSchemaData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schema');
    } finally {
      setLoading(false);
    }
  };

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'number': return '🔢';
      case 'date': return '📅';
      case 'boolean': return '✓';
      case 'array': return '📋';
      case 'object': return '📦';
      default: return '📝';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#28a745';
    if (confidence >= 0.7) return '#ffc107';
    return '#dc3545';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  const formatSampleValue = (value: any) => {
    if (value == null) return 'null';
    if (typeof value === 'string') return `\"${value}\"`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderFieldDetails = (field: any) => {
    return (
      <div className=\"field-details\">
        <div className=\"field-details-header\">
          <h4>
            {getFieldTypeIcon(field.type)} {field.name}
          </h4>
          <span className=\"field-type-badge\">{field.type}</span>
        </div>
        
        <div className=\"field-properties\">
          <div className=\"property-grid\">
            <div className=\"property\">
              <label>Nullable:</label>
              <span className={`property-value ${field.nullable ? 'yes' : 'no'}`}>
                {field.nullable ? '✓' : '✗'}
              </span>
            </div>
            
            <div className=\"property\">
              <label>Unique:</label>
              <span className={`property-value ${field.unique ? 'yes' : 'no'}`}>
                {field.unique ? '✓' : '✗'}
              </span>
            </div>
            
            <div className=\"property\">
              <label>Confidence:</label>
              <span 
                className=\"confidence-badge\"
                style={{ backgroundColor: getConfidenceColor(field.confidence) }}
              >
                {getConfidenceLabel(field.confidence)} ({Math.round(field.confidence * 100)}%)
              </span>
            </div>
            
            {field.distinctValues && (
              <div className=\"property\">
                <label>Distinct Values:</label>
                <span className=\"property-value\">{field.distinctValues.toLocaleString()}</span>
              </div>
            )}
            
            {field.pattern && (
              <div className=\"property\">
                <label>Pattern:</label>
                <span className=\"property-value pattern\">{field.pattern}</span>
              </div>
            )}
            
            {field.type === 'number' && (
              <>
                {field.minValue !== undefined && (
                  <div className=\"property\">
                    <label>Min Value:</label>
                    <span className=\"property-value\">{field.minValue}</span>
                  </div>
                )}
                
                {field.maxValue !== undefined && (
                  <div className=\"property\">
                    <label>Max Value:</label>
                    <span className=\"property-value\">{field.maxValue}</span>
                  </div>
                )}
                
                {field.avgValue !== undefined && (
                  <div className=\"property\">
                    <label>Average:</label>
                    <span className=\"property-value\">{field.avgValue.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {field.sampleValues && field.sampleValues.length > 0 && (
          <div className=\"sample-values\">
            <h5>Sample Values:</h5>
            <div className=\"samples-list\">
              {field.sampleValues.map((value: any, index: number) => (
                <span key={index} className=\"sample-value\">
                  {formatSampleValue(value)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRelationships = () => {
    const relationships = schemaData?.schema.relationships || [];
    
    if (relationships.length === 0) {
      return (
        <div className=\"no-relationships\">
          <p>No relationships detected between fields.</p>
        </div>
      );
    }
    
    return (
      <div className=\"relationships-list\">
        {relationships.map((rel, index) => (
          <div key={index} className=\"relationship-item\">
            <div className=\"relationship-header\">
              <span className=\"relationship-type\">{rel.type.replace('_', ' ')}</span>
              <span className=\"relationship-strength\">
                Strength: {Math.round(rel.strength * 100)}%
              </span>
            </div>
            <div className=\"relationship-fields\">
              <span className=\"field-name\">{rel.sourceField}</span>
              <span className=\"relationship-arrow\">→</span>
              <span className=\"field-name\">{rel.targetField}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSummary = () => {
    if (!schemaData) return null;
    
    const fields = schemaData.schema.fields;
    const typeDistribution = fields.reduce((acc, field) => {
      acc[field.type] = (acc[field.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const nullableCount = fields.filter(f => f.nullable).length;
    const uniqueCount = fields.filter(f => f.unique).length;
    const avgConfidence = fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length;
    
    return (
      <div className=\"schema-summary\">
        <div className=\"summary-stats\">
          <div className=\"stat-card\">
            <h4>Dataset Size</h4>
            <div className=\"stat-value\">{schemaData.totalRows.toLocaleString()}</div>
            <div className=\"stat-label\">rows</div>
          </div>
          
          <div className=\"stat-card\">
            <h4>Fields</h4>
            <div className=\"stat-value\">{schemaData.totalColumns}</div>
            <div className=\"stat-label\">columns</div>
          </div>
          
          <div className=\"stat-card\">
            <h4>Quality Score</h4>
            <div className=\"stat-value\">
              {schemaData.metadata.qualityScore ? 
                Math.round(schemaData.metadata.qualityScore * 100) : 'N/A'}
            </div>
            <div className=\"stat-label\">
              {schemaData.metadata.qualityGrade || 'grade'}
            </div>
          </div>
          
          <div className=\"stat-card\">
            <h4>Avg Confidence</h4>
            <div className=\"stat-value\">{Math.round(avgConfidence * 100)}%</div>
            <div className=\"stat-label\">detection</div>
          </div>
        </div>
        
        <div className=\"type-distribution\">
          <h4>Field Type Distribution</h4>
          <div className=\"type-chart\">
            {Object.entries(typeDistribution).map(([type, count]) => (
              <div key={type} className=\"type-bar\">
                <div className=\"type-info\">
                  <span className=\"type-icon\">{getFieldTypeIcon(type)}</span>
                  <span className=\"type-name\">{type}</span>
                  <span className=\"type-count\">({count})</span>
                </div>
                <div className=\"type-bar-container\">
                  <div 
                    className=\"type-bar-fill\"
                    style={{ 
                      width: `${(count / fields.length) * 100}%`,
                      backgroundColor: `hsl(${Object.keys(typeDistribution).indexOf(type) * 60}, 70%, 60%)`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className=\"field-characteristics\">
          <h4>Field Characteristics</h4>
          <div className=\"characteristics-grid\">
            <div className=\"characteristic\">
              <span className=\"characteristic-label\">Nullable Fields:</span>
              <span className=\"characteristic-value\">
                {nullableCount} ({Math.round((nullableCount / fields.length) * 100)}%)
              </span>
            </div>
            <div className=\"characteristic\">
              <span className=\"characteristic-label\">Unique Fields:</span>
              <span className=\"characteristic-value\">
                {uniqueCount} ({Math.round((uniqueCount / fields.length) * 100)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className=\"schema-viewer-overlay\">
        <div className=\"schema-viewer-modal\">
          <div className=\"schema-loading\">
            <div className=\"loading-spinner\"></div>
            <p>Loading schema information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className=\"schema-viewer-overlay\">
        <div className=\"schema-viewer-modal\">
          <div className=\"schema-error\">
            <h3>Failed to Load Schema</h3>
            <p>{error}</p>
            <div className=\"error-actions\">
              <button onClick={loadSchemaData} className=\"retry-button\">
                Retry
              </button>
              {onClose && (
                <button onClick={onClose} className=\"close-button\">
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!schemaData) {
    return null;
  }

  return (
    <div className=\"schema-viewer-overlay\">
      <div className=\"schema-viewer-modal\">
        <div className=\"schema-viewer-header\">
          <h2>Dataset Schema</h2>
          <div className=\"view-mode-tabs\">
            <button
              className={viewMode === 'summary' ? 'active' : ''}
              onClick={() => setViewMode('summary')}
            >
              Summary
            </button>
            <button
              className={viewMode === 'fields' ? 'active' : ''}
              onClick={() => setViewMode('fields')}
            >
              Fields ({schemaData.schema.fields.length})
            </button>
            <button
              className={viewMode === 'relationships' ? 'active' : ''}
              onClick={() => setViewMode('relationships')}
            >
              Relationships ({schemaData.schema.relationships?.length || 0})
            </button>
          </div>
          {onClose && (
            <button onClick={onClose} className=\"close-button\">
              ✕
            </button>
          )}
        </div>
        
        <div className=\"schema-viewer-content\">
          {viewMode === 'summary' && renderSummary()}
          
          {viewMode === 'fields' && (
            <div className=\"fields-view\">
              <div className=\"fields-list\">
                {schemaData.schema.fields.map((field) => (
                  <div
                    key={field.name}
                    className={`field-item ${
                      selectedField === field.name ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedField(
                      selectedField === field.name ? null : field.name
                    )}
                  >
                    <div className=\"field-summary\">
                      <div className=\"field-header\">
                        <span className=\"field-icon\">
                          {getFieldTypeIcon(field.type)}
                        </span>
                        <span className=\"field-name\">{field.name}</span>
                        <span className=\"field-type\">{field.type}</span>
                      </div>
                      <div className=\"field-indicators\">
                        {field.nullable && <span className=\"indicator nullable\">nullable</span>}
                        {field.unique && <span className=\"indicator unique\">unique</span>}
                        {field.pattern && <span className=\"indicator pattern\">{field.pattern}</span>}
                      </div>
                    </div>
                    
                    {selectedField === field.name && renderFieldDetails(field)}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {viewMode === 'relationships' && renderRelationships()}
        </div>
      </div>
    </div>
  );
};

export default SchemaViewer;", "original_text": "", "replace_all": false}]