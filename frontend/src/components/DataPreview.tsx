import React, { useState, useEffect } from 'react';
import { Dataset } from '../types/api';
import './DataPreview.css';

interface DataPreviewProps {
  dataset: Dataset;
  onSchemaView?: () => void;
  onQualityView?: () => void;
}

interface PreviewData {
  rows: any[];
  totalCount: number;
  columns: string[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  schema: any;
}

const DataPreview: React.FC<DataPreviewProps> = ({ 
  dataset, 
  onSchemaView, 
  onQualityView 
}) => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  useEffect(() => {
    loadPreviewData();
  }, [dataset.id, currentPage, pageSize]);

  const loadPreviewData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const offset = (currentPage - 1) * pageSize;
      
      const response = await fetch(
        `/api/datasets/${dataset.id}/preview?limit=${pageSize}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load preview data');
      }

      const result = await response.json();
      setPreviewData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const getFieldType = (columnName: string) => {
    if (!previewData?.schema?.fields) return 'string';
    const field = previewData.schema.fields.find((f: any) => f.name === columnName);
    return field?.type || 'string';
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'number': return '🔢';
      case 'date': return '📅';
      case 'boolean': return '✓';
      case 'array': return '📋';
      case 'object': return '📦';
      default: return '📝';
    }
  };

  const formatCellValue = (value: any, type: string) => {
    if (value == null) {
      return <span className=\"null-value\">null</span>;
    }

    switch (type) {
      case 'date':
        try {
          return new Date(value).toLocaleString();
        } catch {
          return String(value);
        }
      case 'boolean':
        return (
          <span className={`boolean-value ${value ? 'true' : 'false'}`}>
            {value ? '✓' : '✗'}
          </span>
        );
      case 'number':
        return (
          <span className=\"number-value\">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        );
      case 'array':
        return (
          <span className=\"array-value\">
            [{Array.isArray(value) ? value.length : '?'} items]
          </span>
        );
      case 'object':
        return (
          <span className=\"object-value\">
            {typeof value === 'object' ? '{object}' : String(value)}
          </span>
        );
      default:
        return String(value);
    }
  };

  const totalPages = previewData ? Math.ceil(previewData.totalCount / pageSize) : 0;

  if (loading) {
    return (
      <div className=\"data-preview-loading\">
        <div className=\"loading-spinner\"></div>
        <p>Loading data preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className=\"data-preview-error\">
        <h3>Failed to Load Data</h3>
        <p>{error}</p>
        <button onClick={loadPreviewData} className=\"retry-button\">
          Retry
        </button>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className=\"data-preview-empty\">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className=\"data-preview\">
      <div className=\"data-preview-header\">
        <div className=\"preview-info\">
          <h3>Data Preview</h3>
          <p>
            Showing {previewData.pagination.offset + 1} - {Math.min(
              previewData.pagination.offset + pageSize,
              previewData.totalCount
            )} of {previewData.totalCount.toLocaleString()} rows
          </p>
        </div>
        
        <div className=\"preview-controls\">
          <div className=\"view-mode-toggle\">
            <button
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
            >
              Table View
            </button>
            <button
              className={viewMode === 'json' ? 'active' : ''}
              onClick={() => setViewMode('json')}
            >
              JSON View
            </button>
          </div>
          
          <div className=\"page-size-selector\">
            <label>Rows per page:</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className=\"action-buttons\">
            {onSchemaView && (
              <button onClick={onSchemaView} className=\"schema-button\">
                View Schema
              </button>
            )}
            {onQualityView && (
              <button onClick={onQualityView} className=\"quality-button\">
                Data Quality
              </button>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className=\"table-container\">
          <table className=\"data-table\">
            <thead>
              <tr>
                <th className=\"row-number-header\">#</th>
                {previewData.columns.map(column => {
                  const fieldType = getFieldType(column);
                  return (
                    <th key={column} className=\"column-header\">
                      <div className=\"column-header-content\">
                        <span className=\"column-icon\">
                          {getFieldIcon(fieldType)}
                        </span>
                        <span className=\"column-name\">{column}</span>
                        <span className=\"column-type\">{fieldType}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {previewData.rows.map((row, index) => (
                <tr key={previewData.pagination.offset + index}>
                  <td className=\"row-number\">
                    {previewData.pagination.offset + index + 1}
                  </td>
                  {previewData.columns.map(column => {
                    const fieldType = getFieldType(column);
                    const value = row[column];
                    return (
                      <td key={column} className={`cell cell-${fieldType}`}>
                        {formatCellValue(value, fieldType)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className=\"json-container\">
          <pre className=\"json-preview\">
            {JSON.stringify(previewData.rows, null, 2)}
          </pre>
        </div>
      )}

      <div className=\"pagination-container\">
        <div className=\"pagination-info\">
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>
        
        <div className=\"pagination-controls\">
          <button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(1)}
            className=\"pagination-button\"
          >
            First
          </button>
          <button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className=\"pagination-button\"
          >
            Previous
          </button>
          
          <div className=\"page-numbers\">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, currentPage - 2) + i;
              if (pageNum > totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  className={`pagination-button ${
                    pageNum === currentPage ? 'active' : ''
                  }`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className=\"pagination-button\"
          >
            Next
          </button>
          <button
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(totalPages)}
            className=\"pagination-button\"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataPreview;", "original_text": "", "replace_all": false}]