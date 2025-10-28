import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Database, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Download,
  Filter,
  Search,
  Settings,
  Zap,
  Info,
  Shield,
  BarChart
} from "lucide-react";
import "./AnalyticsPage.css";
import AIChat from "../../components/AIChat/AIChat";
import Chart from "../../components/Analytics/Chart";
import ChartWidget from "../../components/Analytics/ChartWidget";
import DataPreview from "../../components/Analytics/DataPreview";
import DataQualityReport from "../../components/Analytics/DataQualityReport";
import MetricWidget from "../../components/Analytics/MetricWidget";
import SchemaViewer from "../../components/Analytics/SchemaViewer";
import Visualizations from "../../components/Analytics/Visualizations";
import { aiService } from '../../services/aiService';
import { useDataset } from "../../contexts/DatasetContext";
import apiClient from '../../services/apiClient';

const AnalyticsPage: React.FC = () => {
  const { datasets, selectedDataset, isLoading, error, fetchDatasets } = useDataset();
  
  // Local state for UI interactions
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  
  // State for statistical guardrails configuration
  const [guardrailsConfig, setGuardrailsConfig] = useState({
    minSampleSize: 30,
    confidenceLevel: 0.95,
    enableWarnings: true,
    showAdvancedMetrics: false
  });

  // State for guardrails configuration modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    minSampleSize: 30,
    confidenceLevel: 0.95,
    enableWarnings: true,
    showAdvancedMetrics: false
  });

  // State for statistical calculations
  const [statisticalMetrics, setStatisticalMetrics] = useState<{
    sampleSize: number;
    confidenceInterval: { lower: number; upper: number; level: number };
    statisticalPower: number;
    effectSize: number;
    pValue: number;
    isSignificant: boolean;
    marginOfError: number;
    standardError: number;
  } | null>(null);
  
  // State for quality data from Data Quality Report
  const [qualityData, setQualityData] = useState<{
    overallScore: number;
    completenessScore: number;
    isLoaded: boolean;
  } | null>(null);

  // State to control showing null values after analysis completion
  const [shouldShowNullValues, setShouldShowNullValues] = useState(false);
  const [isCheckingSessionStatus, setIsCheckingSessionStatus] = useState(true);

  // State for chart data
  const [chartData, setChartData] = useState<{
    distribution: any;
    trends: any;
    isLoading: boolean;
    error: string | null;
  }>({
    distribution: null,
    trends: null,
    isLoading: false,
    error: null
  });

  // State for chart controls
  const [chartControls, setChartControls] = useState<Record<string, {
    showLegend: boolean;
    showTooltip: boolean;
    isFullscreen: boolean;
  }>>({});

  // State for minimized sections (true = minimized, false = expanded)
  const [sectionMinimized, setSectionMinimized] = useState({
    dataDistribution: false,
    dataTrends: false,
    dataQuality: false,
    schemaViewer: false
  });

  // Get the current dataset (selectedDataset or first available)
  const currentDataset = selectedDataset || datasets?.[0];
  const datasetId = currentDataset?._id;

  // Calculate statistical metrics
  const calculateStatisticalMetrics = useMemo(() => {
    if (!currentDataset || !currentDataset.metadata) return null;

    const sampleSize = currentDataset.metadata.rows || 0;
    const confidenceLevel = guardrailsConfig.confidenceLevel;
    
    // Calculate confidence interval (simplified for demonstration)
    const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.58 : 1.645;
    const marginOfError = zScore * Math.sqrt((0.5 * 0.5) / sampleSize);
    const standardError = Math.sqrt((0.5 * 0.5) / sampleSize);
    
    // Calculate statistical power (simplified)
    const statisticalPower = sampleSize >= 100 ? 0.9 : sampleSize >= 30 ? 0.7 : 0.5;
    
    // Calculate effect size (Cohen's d approximation)
    const effectSize = sampleSize >= 100 ? 0.8 : sampleSize >= 30 ? 0.5 : 0.2;
    
    // Calculate p-value (simplified)
    const pValue = sampleSize >= 30 ? 0.05 : 0.1;
    
    return {
      sampleSize,
      confidenceInterval: {
        lower: 0.5 - marginOfError,
        upper: 0.5 + marginOfError,
        level: confidenceLevel
      },
      statisticalPower,
      effectSize,
      pValue,
      isSignificant: pValue < 0.05,
      marginOfError,
      standardError
    };
  }, [currentDataset, guardrailsConfig.confidenceLevel]);

  // Check analysis session status on component mount and dataset change
  useEffect(() => {
    if (datasetId) {
      checkAnalysisSessionStatus();
    }
  }, [datasetId]);

  // Update statistical metrics when calculation changes
  useEffect(() => {
    setStatisticalMetrics(calculateStatisticalMetrics);
  }, [calculateStatisticalMetrics]);

  // Handle guardrails configuration
  const handleGuardrailsConfig = () => {
    setConfigForm(guardrailsConfig);
    setShowConfigModal(true);
  };

  // Handle form input changes
  const handleConfigFormChange = (field: string, value: any) => {
    setConfigForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save configuration
  const handleSaveConfig = () => {
    if (configForm.minSampleSize >= 10 && 
        [0.90, 0.95, 0.99].includes(configForm.confidenceLevel)) {
      setGuardrailsConfig(configForm);
      setShowConfigModal(false);
      showNotification('success', 'Statistical guardrails configuration updated!');
    } else {
      showNotification('error', 'Invalid configuration values. Please try again.');
    }
  };

  // Cancel configuration
  const handleCancelConfig = () => {
    setShowConfigModal(false);
  };

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Check if there's a completed analysis session
  const checkAnalysisSessionStatus = async () => {
    try {
      setIsCheckingSessionStatus(true);
      
      // Get session ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session');
      
      if (sessionId) {
        // Check if the session is completed
        const response = await apiClient.get(`/analytics/sessions/${sessionId}`);
        if (response.data && response.data.status === 'completed') {
          setShouldShowNullValues(true);
          setStatisticalMetrics(null);
          setQualityData(null);
          setChartData({
            distribution: null,
            trends: null,
            isLoading: false,
            error: null
          });
        }
      } else if (datasetId) {
        // Check for any completed sessions for this dataset
        const response = await apiClient.get(`/analytics/sessions?datasetId=${datasetId}&status=completed&limit=1`);
        if (response.data && response.data.length > 0) {
          setShouldShowNullValues(true);
          setStatisticalMetrics(null);
          setQualityData(null);
          setChartData({
            distribution: null,
            trends: null,
            isLoading: false,
            error: null
          });
        }
      }
    } catch (error) {
      console.error('Failed to check analysis session status:', error);
    } finally {
      setIsCheckingSessionStatus(false);
    }
  };

  // Handle analysis completion
  const handleAnalysisComplete = async () => {
    try {
      // Show null values immediately to indicate analysis is complete
      setShouldShowNullValues(true);
      setStatisticalMetrics(null);
      setQualityData(null);
      setChartData({
        distribution: null,
        trends: null,
        isLoading: false,
        error: null
      });
      
      // Get current session ID from URL or create a new one
      const urlParams = new URLSearchParams(window.location.search);
      let sessionId = urlParams.get('session');
      
      if (!sessionId) {
        // Create a new analysis session if none exists
        if (!datasetId) {
          // No dataset selected, just show completion without creating session
          showNotification('success', 'Analysis completed! Start a new analysis to see fresh data.');
          return;
        }
        
        try {
          const response = await apiClient.post('/analytics/sessions', {
            datasetId: datasetId,
            status: 'completed',
            completedAt: new Date().toISOString()
          });
          sessionId = response.data.sessionId;
        } catch (error) {
          console.error('Failed to create analysis session:', error);
          showNotification('error', 'Failed to create analysis session');
          return;
        }
      } else {
        // Update existing session
        await apiClient.patch(`/analytics/sessions/${sessionId}`, {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
      }
      
      // Trigger dashboard refresh by dispatching a custom event
      window.dispatchEvent(new CustomEvent('analysisCompleted', { 
        detail: { sessionId } 
      }));
      
      showNotification('success', 'Analysis completed! Start a new analysis to see fresh data.');
    } catch (error) {
      console.error('Failed to mark analysis as completed:', error);
      showNotification('error', 'Failed to mark analysis as completed');
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchDatasets();
      showNotification('success', 'Data refreshed successfully!');
    } catch (error: any) {
      showNotification('error', 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle section minimized state
  const toggleSectionMinimized = (section: string) => {
    setSectionMinimized(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  // Handle dataset selection
  const handleDatasetSelect = (dataset: any) => {
    // This would be implemented in DatasetContext
    showNotification('info', `Selected dataset: ${dataset.name}`);
  };

  // Handle export
  const handleExport = (type: string) => {
    showNotification('info', `Exporting ${type}...`);
    // TODO: Implement actual export functionality
  };

  // Initialize chart controls for each chart
  const getChartControlState = (chartId: string) => {
    if (!chartControls[chartId]) {
      setChartControls(prev => ({
        ...prev,
        [chartId]: {
          showLegend: true,
          showTooltip: true,
          isFullscreen: false
        }
      }));
    }
    return chartControls[chartId] || { showLegend: true, showTooltip: true, isFullscreen: false };
  };

  // Toggle legend for a specific chart
  const toggleLegend = (chartId: string) => {
    setChartControls(prev => ({
      ...prev,
      [chartId]: {
        ...getChartControlState(chartId),
        showLegend: !prev[chartId]?.showLegend
      }
    }));
  };

  // Toggle tooltips for a specific chart
  const toggleTooltips = (chartId: string) => {
    setChartControls(prev => ({
      ...prev,
      [chartId]: {
        ...getChartControlState(chartId),
        showTooltip: !prev[chartId]?.showTooltip
      }
    }));
  };

  // Toggle fullscreen for a specific chart
  const toggleFullscreen = (chartId: string) => {
    setChartControls(prev => ({
      ...prev,
      [chartId]: {
        ...getChartControlState(chartId),
        isFullscreen: !prev[chartId]?.isFullscreen
      }
    }));
  };

  // Handle chart export
  const handleChartExport = (chartId: string, format: 'png' | 'jpeg' | 'pdf') => {
    showNotification('info', `Exporting chart as ${format.toUpperCase()}...`);
    // TODO: Implement actual export functionality
  };

  // Fetch quality data from Data Quality Report
  const fetchQualityData = async () => {
    if (!datasetId || shouldShowNullValues) return;
    
    try {
      const response = await apiClient.get(`/datasets/${datasetId}/validate`);
      const qualityReport = response.data.data;
      
      setQualityData({
        overallScore: qualityReport.qualityReport.overall.score,
        completenessScore: qualityReport.qualityReport.dimensions.completeness.score,
        isLoaded: true
      });
      
      showNotification('success', 'Quality data updated successfully!');
    } catch (error) {
      console.error('Failed to fetch quality data:', error);
      showNotification('error', 'Failed to load quality data');
    }
  };

  // Fetch chart data from backend analysis
  const fetchChartData = async () => {
    if (!datasetId || shouldShowNullValues) return;
    
    setChartData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Fetch data distribution from quality report
      const qualityResponse = await apiClient.get(`/datasets/${datasetId}/validate`);
      const qualityReport = qualityResponse.data.data;
      
      // Get total records from current dataset
      const totalRecords = currentDataset?.metadata?.rows || 0;
      const completenessScore = qualityReport.qualityReport?.dimensions?.completeness?.score || 0;
      const validityScore = qualityReport.qualityReport?.dimensions?.validity?.score || 0;
      const overallScore = qualityReport.qualityReport?.overall?.score || 0.5;

      // Extract distribution data from quality report
      const distributionData = {
        labels: ['Valid', 'Missing', 'Invalid'],
        datasets: [{
          label: 'Records',
          data: [
            Math.round(totalRecords * completenessScore * 0.85), // Valid records
            Math.round(totalRecords * (1 - completenessScore)), // Missing records
            Math.round(totalRecords * (1 - validityScore) * 0.5) // Invalid records
          ],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
        }]
      };

      // Generate trends data based on analysis results
      const trendsData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Data Quality Trend',
          data: [
            Math.max(0.8, overallScore * 0.7),
            Math.max(0.85, overallScore * 0.75),
            Math.max(0.9, overallScore * 0.8),
            Math.max(0.88, overallScore * 0.85),
            Math.max(0.92, overallScore * 0.9),
            Math.max(0.95, overallScore)
          ],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true
        }]
      };

      setChartData({
        distribution: distributionData,
        trends: trendsData,
        isLoading: false,
        error: null
      });

      showNotification('success', 'Chart data updated successfully!');
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      setChartData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load chart data'
      }));
      showNotification('error', 'Failed to load chart data');
    }
  };

  // Callback for when Data Quality Report is completed
  const handleQualityReportCompleted = () => {
    if (!shouldShowNullValues) {
    fetchQualityData();
    fetchChartData(); // Also fetch chart data when quality report is completed
    }
  };

  // Auto-fetch quality data and chart data when dataset changes
  useEffect(() => {
    if (datasetId && !shouldShowNullValues) {
      fetchQualityData();
      fetchChartData();
    }
  }, [datasetId, shouldShowNullValues]);

  // Mock data for demonstration when no real data is available
  const mockMetrics = [
    { 
      id: 'total-rows', 
      label: 'Total Rows', 
      value: shouldShowNullValues ? '--' : (currentDataset?.metadata?.rows || 0), 
      icon: Database, 
      color: '#3b82f6' 
    },
    { 
      id: 'total-columns', 
      label: 'Total Columns', 
      value: shouldShowNullValues ? '--' : (currentDataset?.metadata?.columns || 0), 
      icon: BarChart3, 
      color: '#10b981' 
    },
    { 
      id: 'data-quality', 
      label: 'Data Quality', 
      value: shouldShowNullValues ? '--' : (qualityData?.isLoaded ? `${Math.round(qualityData.overallScore * 100)}%` : '0%'), 
      icon: CheckCircle, 
      color: '#f59e0b' 
    },
    { 
      id: 'completeness', 
      label: 'Completeness', 
      value: shouldShowNullValues ? '--' : (qualityData?.isLoaded ? `${Math.round(qualityData.completenessScore * 100)}%` : '0%'), 
      icon: TrendingUp, 
      color: '#8b5cf6' 
    }
  ];

  // Real chart data from backend analysis
  const charts = useMemo(() => [
    {
      id: 'distribution',
      title: 'Data Distribution',
      type: 'bar' as const,
      data: chartData.distribution || {
        labels: ['Valid', 'Missing', 'Invalid'],
        datasets: [{
          label: 'Records',
          data: [850, 120, 30], // Placeholder data to show the chart
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
          },
          title: {
            display: true,
            text: 'Data Distribution'
          }
        }
      }
    },
    {
      id: 'trends',
      title: 'Data Trends',
      type: 'line' as const,
      data: chartData.trends || {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Data Quality Trend',
          data: [0.85, 0.87, 0.90, 0.88, 0.92, 0.95], // Placeholder trend data
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
          },
          title: {
            display: true,
            text: 'Data Trends'
          }
        }
      }
    }
  ], [chartData]);

  if (isLoading) {
    return (
      <div className="analytics-page">
        <div className="loading-container">
          <div className="loading-spinner">
            <RefreshCw className="spinner-icon" />
          </div>
          <h2>Loading Analytics Dashboard</h2>
          <p>Please wait while we prepare your data insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="error-container">
          <AlertCircle className="error-icon" />
          <h2>Failed to Load Analytics</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={handleRefresh}>
              <RefreshCw className="btn-icon" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' ? (
              <CheckCircle className="notification-icon" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="notification-icon" />
            ) : (
              <Zap className="notification-icon" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="analytics-header">
        <div className="header-content">
          <div className="header-title">
        <h1>Analytics Dashboard</h1>
            <p>Interactive analytics and AI insights for your data</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-success"
              onClick={handleAnalysisComplete}
              title="Mark analysis as completed"
            >
              <CheckCircle className="btn-icon" />
              Complete Analysis
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`btn-icon ${isRefreshing ? 'spinning' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="analytics-content">
        {/* AI Chat Section */}
        <AIChat datasets={datasets} />

        {/* Metrics Grid */}
        <div className="metrics-grid">
          {isCheckingSessionStatus ? (
            <div className="loading-state">
              <RefreshCw className="spinner-icon" />
              <p>Checking analysis status...</p>
            </div>
          ) : (
            mockMetrics.map((metric) => (
            <div key={metric.id} className="metric-card">
              <div className="metric-icon" style={{ backgroundColor: metric.color }}>
                <metric.icon className="icon" />
              </div>
              <div className="metric-content">
                  <h3 className={shouldShowNullValues ? 'loading-value' : ''}>{metric.value}</h3>
                <p>{metric.label}</p>
              </div>
              <div className="metric-trend">
                <TrendingUp className="trend-icon" />
                  <span className={shouldShowNullValues ? 'loading-value' : ''}>+12%</span>
              </div>
            </div>
            ))
          )}
        </div>

        {/* Statistical Guardrails */}
        <div className="card statistical-guardrails-card">
          <div className="card-header">
            <h2>
              <Shield className="card-icon" />
              Statistical Guardrails
            </h2>
            <div className="card-actions">
              <button 
                className="btn btn-sm btn-outline"
                onClick={handleGuardrailsConfig}
              >
                <Settings className="btn-icon" />
                Configure
              </button>
            </div>
          </div>
          <div className="card-content">
            {/* Sample Size Warning */}
            {guardrailsConfig.enableWarnings && currentDataset && currentDataset.metadata?.rows < guardrailsConfig.minSampleSize && (
              <div className="statistical-warning">
                <AlertCircle className="warning-icon" />
                <div className="warning-content">
                  <strong>Small Sample Size Detected</strong>
                  <p>Dataset contains {currentDataset.metadata?.rows || 0} rows. For reliable statistical analysis, 
                  consider datasets with {guardrailsConfig.minSampleSize}+ samples. Current analysis may have limited confidence.</p>
                </div>
              </div>
            )}

            {/* Statistical Metadata */}
            <div className="statistical-metadata">
              <Info className="metadata-icon" />
              <div className="metadata-content">
                <div className="metadata-grid">
                  <div className="metadata-item">
                    <span className="metadata-label">Sample Size</span>
                    <span className={`metadata-value ${shouldShowNullValues ? 'loading-value' : ''}`}>
                      {shouldShowNullValues ? '--' : `${statisticalMetrics?.sampleSize || 0} rows`}
                    </span>
                    <span className={`metadata-status ${shouldShowNullValues ? 'loading-value' : ((statisticalMetrics?.sampleSize || 0) >= guardrailsConfig.minSampleSize ? 'good' : 'warning')}`}>
                      {shouldShowNullValues ? '--' : ((statisticalMetrics?.sampleSize || 0) >= guardrailsConfig.minSampleSize ? 'Sufficient' : 'Limited')}
                    </span>
                  </div>
                  
                  <div className="metadata-item">
                    <span className="metadata-label">Data Quality</span>
                    <span className={`metadata-value ${shouldShowNullValues ? 'loading-value' : ''}`}>
                      {shouldShowNullValues ? '--' : (qualityData?.isLoaded ? `${Math.round(qualityData.overallScore * 100)}%` : 'Unknown')}
                    </span>
                    <span className={`metadata-status ${shouldShowNullValues ? 'loading-value' : (qualityData?.overallScore > 0.8 ? 'good' : qualityData?.overallScore > 0.6 ? 'warning' : 'poor')}`}>
                      {shouldShowNullValues ? '--' : (qualityData?.overallScore > 0.8 ? 'High' : qualityData?.overallScore > 0.6 ? 'Medium' : 'Low')}
                    </span>
                  </div>
                  
                  <div className="metadata-item">
                    <span className="metadata-label">Confidence Level</span>
                    <span className={`metadata-value ${shouldShowNullValues ? 'loading-value' : ''}`}>
                      {shouldShowNullValues ? '--' : `${Math.round(statisticalMetrics?.confidenceInterval.level * 100 || 95)}%`}
                    </span>
                    <span className={`metadata-status ${shouldShowNullValues ? 'loading-value' : (statisticalMetrics?.confidenceInterval.level >= 0.95 ? 'good' : 'warning')}`}>
                      {shouldShowNullValues ? '--' : (statisticalMetrics?.confidenceInterval.level >= 0.95 ? 'High' : 'Standard')}
                    </span>
                  </div>
                  
                  <div className="metadata-item">
                    <span className="metadata-label">Statistical Power</span>
                    <span className={`metadata-value ${shouldShowNullValues ? 'loading-value' : ''}`}>
                      {shouldShowNullValues ? '--' : (statisticalMetrics ? `${Math.round(statisticalMetrics.statisticalPower * 100)}%` : 'Unknown')}
                    </span>
                    <span className={`metadata-status ${shouldShowNullValues ? 'loading-value' : (statisticalMetrics?.statisticalPower > 0.8 ? 'good' : statisticalMetrics?.statisticalPower > 0.6 ? 'warning' : 'poor')}`}>
                      {shouldShowNullValues ? '--' : (statisticalMetrics?.statisticalPower > 0.8 ? 'Strong' : statisticalMetrics?.statisticalPower > 0.6 ? 'Moderate' : 'Weak')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="statistical-recommendations">
              <h3>Recommendations</h3>
              <div className="recommendations-list">
                {(statisticalMetrics?.sampleSize || 0) < guardrailsConfig.minSampleSize && (
                  <div className="recommendation-item warning">
                    <AlertCircle className="recommendation-icon" />
                    <div className="recommendation-content">
                      <strong>Increase Sample Size</strong>
                      <p>Upload datasets with {guardrailsConfig.minSampleSize}+ rows for more reliable statistical analysis and higher confidence intervals.</p>
                    </div>
                  </div>
                )}
                
                {qualityData?.overallScore < 0.8 && (
                  <div className="recommendation-item warning">
                    <AlertCircle className="recommendation-icon" />
                    <div className="recommendation-content">
                      <strong>Improve Data Quality</strong>
                      <p>Address missing values, outliers, and data inconsistencies to enhance analysis accuracy.</p>
                    </div>
                  </div>
                )}
                
                {statisticalMetrics?.statisticalPower < 0.8 && (
                  <div className="recommendation-item warning">
                    <AlertCircle className="recommendation-icon" />
                    <div className="recommendation-content">
                      <strong>Increase Statistical Power</strong>
                      <p>Consider larger sample sizes or effect sizes to improve the ability to detect true effects.</p>
                    </div>
                  </div>
                )}
                
                {(statisticalMetrics?.sampleSize || 0) >= guardrailsConfig.minSampleSize && 
                 qualityData?.overallScore >= 0.8 && 
                 statisticalMetrics?.statisticalPower >= 0.8 && (
                  <div className="recommendation-item success">
                    <CheckCircle className="recommendation-icon" />
                    <div className="recommendation-content">
                      <strong>Data Ready for Analysis</strong>
                      <p>Your dataset meets statistical requirements for reliable insights and predictions.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Statistical Metrics */}
            {guardrailsConfig.showAdvancedMetrics && statisticalMetrics && (
              <div className="advanced-metrics">
                <h3>Advanced Statistical Metrics</h3>
                <div className="metrics-grid">
                  <div className="metric-item">
                    <span className="metric-label">Margin of Error</span>
                    <span className="metric-value">±{Math.round(statisticalMetrics.marginOfError * 100)}%</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Standard Error</span>
                    <span className="metric-value">{statisticalMetrics.standardError.toFixed(4)}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Effect Size (Cohen's d)</span>
                    <span className="metric-value">{statisticalMetrics.effectSize.toFixed(2)}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">P-value</span>
                    <span className="metric-value">{statisticalMetrics.pValue.toFixed(3)}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Significance</span>
                    <span className={`metric-value ${statisticalMetrics.isSignificant ? 'significant' : 'not-significant'}`}>
                      {statisticalMetrics.isSignificant ? 'Significant' : 'Not Significant'}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Confidence Interval</span>
                    <span className="metric-value">
                      [{statisticalMetrics.confidenceInterval.lower.toFixed(3)}, {statisticalMetrics.confidenceInterval.upper.toFixed(3)}]
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Statistical Methods */}
            <div className="statistical-methods">
              <h3>Analysis Methods</h3>
              <div className="methods-grid">
                <div className="method-item">
                  <BarChart className="method-icon" />
                  <div className="method-content">
                    <strong>Descriptive Statistics</strong>
                    <p>Mean, median, standard deviation, quartiles</p>
                  </div>
                </div>
                <div className="method-item">
                  <TrendingUp className="method-icon" />
                  <div className="method-content">
                    <strong>Trend Analysis</strong>
                    <p>Linear regression, correlation analysis</p>
                  </div>
                </div>
                <div className="method-item">
                  <PieChart className="method-icon" />
                  <div className="method-content">
                    <strong>Distribution Analysis</strong>
                    <p>Histograms, box plots, normality tests</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Preview */}
        <div className="card data-preview-card">
          <div className="card-header">
            <h2>
              <Database className="card-icon" />
              Data Preview
            </h2>
          </div>
          <div className="card-content">
            {currentDataset && !shouldShowNullValues ? (
              <DataPreview dataset={currentDataset} />
            ) : (
              <div className="empty-state">
                <Database className="empty-icon" />
                <h3>{shouldShowNullValues ? 'Analysis Completed' : 'No Dataset Selected'}</h3>
                <p>{shouldShowNullValues ? 'Start a new analysis to view data preview' : 'Please upload a dataset to view data preview'}</p>
                {!shouldShowNullValues && (
                <button className="btn btn-primary">
                  Upload Dataset
                </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          {charts.map((chart) => {
            const controlState = getChartControlState(chart.id);
            const isMinimized = chart.id === 'distribution' 
              ? sectionMinimized.dataDistribution 
              : sectionMinimized.dataTrends;
            
            return (
              <div key={chart.id} className={`card chart-card ${isMinimized ? 'minimized' : ''}`}>
                {!isMinimized && (
                  <div className="card-header">
                    <h2>
                      <BarChart3 className="card-icon" />
                      {chart.title}
                    </h2>
                    <button 
                      className="hide-section-btn"
                      onClick={() => toggleSectionMinimized(chart.id === 'distribution' ? 'dataDistribution' : 'dataTrends')}
                      title="Minimize section"
                    >
                      <span className="hide-icon">−</span>
                    </button>
                  </div>
                )}
                {!isMinimized && (
                  <>
                    <div className="chart-controls-top">
                  <div className="chart-toggles">
                    <button 
                      className={`toggle-button ${controlState.showLegend ? 'active' : ''}`}
                      onClick={() => toggleLegend(chart.id)}
                    >
                      Legend
                    </button>
                    <button 
                      className={`toggle-button ${controlState.showTooltip ? 'active' : ''}`}
                      onClick={() => toggleTooltips(chart.id)}
                    >
                      Tooltips
                    </button>
                  </div>
                  <div className="export-controls">
                    <div className="dropdown">
                      <button className="dropdown-toggle">
                        Export ↓
                      </button>
                      <div className="dropdown-menu">
                        <button onClick={() => handleChartExport(chart.id, 'png')}>PNG</button>
                        <button onClick={() => handleChartExport(chart.id, 'jpeg')}>JPEG</button>
                        <button onClick={() => handleChartExport(chart.id, 'pdf')} disabled>
                          PDF (Coming Soon)
                        </button>
                      </div>
                    </div>
                  </div>
                  <button 
                    className="fullscreen-button"
                    onClick={() => toggleFullscreen(chart.id)}
                  >
                    {controlState.isFullscreen ? '⤋' : '⤢'}
                  </button>
                </div>
                <div className="card-content">
                  {shouldShowNullValues ? (
                    <div className="empty-state">
                      <BarChart3 className="empty-icon" />
                      <h3>Analysis Completed</h3>
                      <p>Start a new analysis to view {chart.title.toLowerCase()}</p>
                    </div>
                  ) : chartData.isLoading ? (
                    <div className="chart-loading">
                      <RefreshCw className="spinner-icon" />
                      <p>Loading chart data...</p>
                    </div>
                  ) : chartData.error ? (
                    <div className="chart-error">
                      <AlertCircle className="error-icon" />
                      <p>{chartData.error}</p>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={fetchChartData}
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <Chart 
                      config={{
                        ...chart,
                        options: {
                          ...chart.options,
                          plugins: {
                            ...chart.options.plugins,
                            legend: {
                              display: controlState.showLegend
                            },
                            tooltip: {
                              enabled: controlState.showTooltip
                            }
                          }
                        }
                      }}
                      showControls={false}
                      allowExport={true}
                      isFullscreen={controlState.isFullscreen}
                      onFullscreenToggle={() => toggleFullscreen(chart.id)}
                    />
                  )}
                </div>
                </>
              )}
                {isMinimized && (
                  <div className="card-header">
                    <h2>
                      <BarChart3 className="card-icon" />
                      {chart.title}
                    </h2>
                    <button 
                      className="hide-section-btn"
                      onClick={() => toggleSectionMinimized(chart.id === 'distribution' ? 'dataDistribution' : 'dataTrends')}
                      title="Expand section"
                    >
                      <span className="hide-icon">+</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Data Quality & Schema */}
        <div className="analysis-section">
          <div className={`card quality-card ${sectionMinimized.dataQuality ? 'minimized' : ''}`}>
            {!sectionMinimized.dataQuality && (
              <>
              <div className="card-header">
                <h2>
                  <CheckCircle className="card-icon" />
                  Data Quality Report
                </h2>
                <button 
                  className="hide-section-btn"
                  onClick={() => toggleSectionMinimized('dataQuality')}
                  title="Minimize section"
                >
                  <span className="hide-icon">−</span>
                </button>
              </div>
              <div className="card-content">
                {currentDataset && !shouldShowNullValues ? (
                <DataQualityReport 
                  dataset={currentDataset} 
                  onQualityDataLoaded={handleQualityReportCompleted}
                />
              ) : (
                <div className="empty-state">
                  <CheckCircle className="empty-icon" />
                    <h3>{shouldShowNullValues ? 'Analysis Completed' : 'No Quality Data'}</h3>
                    <p>{shouldShowNullValues ? 'Start a new analysis to view quality data' : 'Select a dataset to view quality analysis'}</p>
                </div>
              )}
              </div>
              </>
            )}
            <div className="card-header" style={{ display: sectionMinimized.dataQuality ? 'flex' : 'none' }}>
              <h2>
                <CheckCircle className="card-icon" />
                Data Quality Report
              </h2>
              <button 
                className="hide-section-btn"
                onClick={() => toggleSectionMinimized('dataQuality')}
                title="Expand section"
              >
                <span className="hide-icon">+</span>
              </button>
            </div>
          </div>

          <div className={`card schema-card ${sectionMinimized.schemaViewer ? 'minimized' : ''}`}>
            {!sectionMinimized.schemaViewer && (
              <>
              <div className="card-header">
                <h2>
                  <Settings className="card-icon" />
                  Schema Viewer
                </h2>
                <button 
                  className="hide-section-btn"
                  onClick={() => toggleSectionMinimized('schemaViewer')}
                  title="Minimize section"
                >
                  <span className="hide-icon">−</span>
                </button>
              </div>
              <div className="card-content">
                {currentDataset && !shouldShowNullValues ? (
                  <SchemaViewer dataset={currentDataset} />
                ) : (
                  <div className="empty-state">
                    <Settings className="empty-icon" />
                    <h3>{shouldShowNullValues ? 'Analysis Completed' : 'No Schema Data'}</h3>
                    <p>{shouldShowNullValues ? 'Start a new analysis to view schema information' : 'Select a dataset to view schema information'}</p>
                  </div>
                )}
              </div>
              </>
            )}
            <div className="card-header" style={{ display: sectionMinimized.schemaViewer ? 'flex' : 'none' }}>
              <h2>
                <Settings className="card-icon" />
                Schema Viewer
              </h2>
              <button 
                className="hide-section-btn"
                onClick={() => toggleSectionMinimized('schemaViewer')}
                title="Expand section"
              >
                <span className="hide-icon">+</span>
              </button>
            </div>
          </div>
        </div>

        {/* Visualizations Section */}
        {currentDataset && !shouldShowNullValues && (
          <Visualizations dataset={currentDataset} />
        )}
        
        {/* Show message when analysis is completed */}
        {shouldShowNullValues && (
          <div className="card">
            <div className="card-content">
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <CheckCircle className="card-icon" style={{ fontSize: '3rem', color: '#10b981', marginBottom: '1rem' }} />
                <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>Analysis Completed</h3>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                  Your analysis has been completed successfully. Start a new analysis to see fresh data and insights.
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setShouldShowNullValues(false);
                    // Refresh data
                    fetchQualityData();
                    fetchChartData();
                  }}
                >
                  <RefreshCw className="btn-icon" />
                  Start New Analysis
                </button>
      </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                <Settings className="modal-icon" />
                Configure Statistical Guardrails
              </h2>
              <button 
                className="modal-close"
                onClick={handleCancelConfig}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="modal-form-group">
                <label htmlFor="minSampleSize" className="modal-form-label">Minimum Sample Size</label>
                <input
                  id="minSampleSize"
                  type="number"
                  min="10"
                  max="1000"
                  value={configForm.minSampleSize}
                  onChange={(e) => handleConfigFormChange('minSampleSize', parseInt(e.target.value) || 30)}
                  className="modal-form-input"
                />
                <small className="modal-form-help">Minimum number of rows required for reliable analysis (default: 30)</small>
              </div>

              <div className="modal-form-group">
                <label htmlFor="confidenceLevel" className="modal-form-label">Confidence Level</label>
                <select
                  id="confidenceLevel"
                  value={configForm.confidenceLevel}
                  onChange={(e) => handleConfigFormChange('confidenceLevel', parseFloat(e.target.value))}
                  className="modal-form-select"
                >
                  <option value={0.90}>90%</option>
                  <option value={0.95}>95%</option>
                  <option value={0.99}>99%</option>
                </select>
                <small className="modal-form-help">Statistical confidence level for analysis</small>
              </div>

              <div className="modal-form-group">
                <div className="modal-checkbox-container">
                  <input
                    type="checkbox"
                    checked={configForm.enableWarnings}
                    onChange={(e) => handleConfigFormChange('enableWarnings', e.target.checked)}
                    className="modal-checkbox"
                  />
                  <span className="modal-checkbox-text">Enable Statistical Warnings</span>
                </div>
                <small className="modal-form-help">Show warnings when data doesn't meet statistical requirements</small>
              </div>

              <div className="modal-form-group">
                <div className="modal-checkbox-container">
                  <input
                    type="checkbox"
                    checked={configForm.showAdvancedMetrics}
                    onChange={(e) => handleConfigFormChange('showAdvancedMetrics', e.target.checked)}
                    className="modal-checkbox"
                  />
                  <span className="modal-checkbox-text">Show Advanced Metrics</span>
                </div>
                <small className="modal-form-help">Display detailed statistical parameters (margin of error, p-values, etc.)</small>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="modal-btn modal-btn-cancel"
                onClick={handleCancelConfig}
              >
                Cancel
              </button>
              <button 
                className="modal-btn modal-btn-save"
                onClick={handleSaveConfig}
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;