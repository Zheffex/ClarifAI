import React, { useState, useEffect } from 'react';
import { Dataset } from '../types/api';
import './DataQualityReport.css';

interface DataQualityReportProps {
  dataset: Dataset;
  onClose?: () => void;
}

interface QualityData {
  qualityReport: {
    overall: {
      score: number;
      grade: 'A' | 'B' | 'C' | 'D' | 'F';
      summary: string;
    };
    dimensions: {
      completeness: { score: number; details: string };
      consistency: { score: number; details: string };
      validity: { score: number; details: string };
      uniqueness: { score: number; details: string };
    };
    recommendations: string[];
  };
  validation: {
    totalRows: number;
    validRows: number;
    errorCount: number;
    warningCount: number;
    fieldSummary: Record<string, {
      validCount: number;
      errorCount: number;
      warningCount: number;
    }>;
  };
}

const DataQualityReport: React.FC<DataQualityReportProps> = ({ dataset, onClose }) => {
  const [qualityData, setQualityData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'dimensions' | 'fields' | 'recommendations'>('overview');

  useEffect(() => {
    loadQualityData();
  }, [dataset.id]);

  const loadQualityData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/datasets/${dataset.id}/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load quality data');
      }

      const result = await response.json();
      setQualityData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quality report');
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#28a745';
      case 'B': return '#17a2b8';
      case 'C': return '#ffc107';
      case 'D': return '#fd7e14';
      case 'F': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return '#28a745';
    if (score >= 0.8) return '#17a2b8';
    if (score >= 0.7) return '#ffc107';
    if (score >= 0.6) return '#fd7e14';
    return '#dc3545';
  };

  const formatPercentage = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  const renderScoreCircle = (score: number, size: number = 120) => {
    const circumference = 2 * Math.PI * (size / 2 - 10);
    const strokeDasharray = `${score * circumference} ${circumference}`;
    const color = getScoreColor(score);
    
    return (
      <div className=\"score-circle\" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 10}
            fill=\"none\"
            stroke=\"#e9ecef\"
            strokeWidth=\"8\"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 10}
            fill=\"none\"
            stroke={color}
            strokeWidth=\"8\"
            strokeDasharray={strokeDasharray}
            strokeDashoffset=\"0\"
            strokeLinecap=\"round\"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className=\"score-progress\"
          />
        </svg>
        <div className=\"score-text\">
          <div className=\"score-value\">{formatPercentage(score)}</div>
        </div>
      </div>
    );
  };

  const renderOverview = () => {
    if (!qualityData) return null;
    
    const { overall } = qualityData.qualityReport;
    const { validation } = qualityData;
    
    return (
      <div className=\"quality-overview\">
        <div className=\"overall-score-section\">
          <div className=\"score-display\">
            {renderScoreCircle(overall.score, 150)}
            <div className=\"grade-info\">
              <div 
                className=\"grade-badge\"
                style={{ backgroundColor: getGradeColor(overall.grade) }}
              >
                Grade {overall.grade}
              </div>
              <p className=\"score-summary\">{overall.summary}</p>
            </div>
          </div>
        </div>
        
        <div className=\"validation-stats\">
          <div className=\"stat-grid\">
            <div className=\"stat-card\">
              <div className=\"stat-value\">{validation.totalRows.toLocaleString()}</div>
              <div className=\"stat-label\">Total Rows</div>
            </div>
            
            <div className=\"stat-card valid\">
              <div className=\"stat-value\">{validation.validRows.toLocaleString()}</div>
              <div className=\"stat-label\">Valid Rows</div>
              <div className=\"stat-percentage\">
                {formatPercentage(validation.validRows / validation.totalRows)}
              </div>
            </div>
            
            <div className=\"stat-card errors\">
              <div className=\"stat-value\">{validation.errorCount.toLocaleString()}</div>
              <div className=\"stat-label\">Errors</div>
            </div>
            
            <div className=\"stat-card warnings\">
              <div className=\"stat-value\">{validation.warningCount.toLocaleString()}</div>
              <div className=\"stat-label\">Warnings</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDimensions = () => {
    if (!qualityData) return null;
    
    const { dimensions } = qualityData.qualityReport;
    
    return (
      <div className=\"quality-dimensions\">
        <div className=\"dimensions-grid\">
          {Object.entries(dimensions).map(([key, dimension]) => (
            <div key={key} className=\"dimension-card\">
              <div className=\"dimension-header\">
                <h4>{key.charAt(0).toUpperCase() + key.slice(1)}</h4>
                <div className=\"dimension-score\">
                  {renderScoreCircle(dimension.score, 80)}
                </div>
              </div>
              <div className=\"dimension-details\">
                <p>{dimension.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFields = () => {
    if (!qualityData) return null;
    
    const { fieldSummary } = qualityData.validation;
    
    return (
      <div className=\"field-quality\">
        <div className=\"field-quality-list\">
          {Object.entries(fieldSummary).map(([fieldName, summary]) => {
            const total = summary.validCount + summary.errorCount + summary.warningCount;
            const validPercentage = total > 0 ? summary.validCount / total : 0;
            const errorPercentage = total > 0 ? summary.errorCount / total : 0;
            const warningPercentage = total > 0 ? summary.warningCount / total : 0;
            
            return (
              <div key={fieldName} className=\"field-quality-item\">
                <div className=\"field-info\">
                  <h4>{fieldName}</h4>
                  <div className=\"field-stats\">
                    <span className=\"field-stat valid\">
                      ✓ {summary.validCount} valid
                    </span>
                    {summary.errorCount > 0 && (
                      <span className=\"field-stat errors\">
                        ✗ {summary.errorCount} errors
                      </span>
                    )}
                    {summary.warningCount > 0 && (
                      <span className=\"field-stat warnings\">
                        ⚠ {summary.warningCount} warnings
                      </span>
                    )}
                  </div>
                </div>
                
                <div className=\"field-quality-bar\">
                  <div className=\"quality-bar\">
                    <div 
                      className=\"bar-segment valid\"
                      style={{ width: `${validPercentage * 100}%` }}
                    />
                    <div 
                      className=\"bar-segment warnings\"
                      style={{ width: `${warningPercentage * 100}%` }}
                    />
                    <div 
                      className=\"bar-segment errors\"
                      style={{ width: `${errorPercentage * 100}%` }}
                    />
                  </div>
                  <div className=\"quality-percentage\">
                    {formatPercentage(validPercentage)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRecommendations = () => {
    if (!qualityData) return null;
    
    const { recommendations } = qualityData.qualityReport;
    
    if (recommendations.length === 0) {
      return (
        <div className=\"no-recommendations\">
          <div className=\"success-icon\">✓</div>
          <h3>Excellent Data Quality!</h3>
          <p>No specific recommendations at this time. Your data appears to be well-structured and clean.</p>
        </div>
      );
    }
    
    return (
      <div className=\"recommendations\">
        <div className=\"recommendations-list\">
          {recommendations.map((recommendation, index) => (
            <div key={index} className=\"recommendation-item\">
              <div className=\"recommendation-icon\">💡</div>
              <div className=\"recommendation-content\">
                <p>{recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className=\"quality-report-overlay\">
        <div className=\"quality-report-modal\">
          <div className=\"quality-loading\">
            <div className=\"loading-spinner\"></div>
            <p>Analyzing data quality...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className=\"quality-report-overlay\">
        <div className=\"quality-report-modal\">
          <div className=\"quality-error\">
            <h3>Failed to Load Quality Report</h3>
            <p>{error}</p>
            <div className=\"error-actions\">
              <button onClick={loadQualityData} className=\"retry-button\">
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

  if (!qualityData) {
    return null;
  }

  return (
    <div className=\"quality-report-overlay\">
      <div className=\"quality-report-modal\">
        <div className=\"quality-report-header\">
          <h2>Data Quality Report</h2>
          <div className=\"view-mode-tabs\">
            <button
              className={viewMode === 'overview' ? 'active' : ''}
              onClick={() => setViewMode('overview')}
            >
              Overview
            </button>
            <button
              className={viewMode === 'dimensions' ? 'active' : ''}
              onClick={() => setViewMode('dimensions')}
            >
              Dimensions
            </button>
            <button
              className={viewMode === 'fields' ? 'active' : ''}
              onClick={() => setViewMode('fields')}
            >
              Fields ({Object.keys(qualityData.validation.fieldSummary).length})
            </button>
            <button
              className={viewMode === 'recommendations' ? 'active' : ''}
              onClick={() => setViewMode('recommendations')}
            >
              Recommendations ({qualityData.qualityReport.recommendations.length})
            </button>
          </div>
          {onClose && (
            <button onClick={onClose} className=\"close-button\">
              ✕
            </button>
          )}
        </div>
        
        <div className=\"quality-report-content\">
          {viewMode === 'overview' && renderOverview()}
          {viewMode === 'dimensions' && renderDimensions()}
          {viewMode === 'fields' && renderFields()}
          {viewMode === 'recommendations' && renderRecommendations()}
        </div>
      </div>
    </div>
  );
};

export default DataQualityReport;", "original_text": "", "replace_all": false}]