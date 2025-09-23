import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { AnalysisSession, IAnalysisSession } from '../models/AnalysisSession';
import { Dataset } from '../models/Dataset';
import { IUser } from '../models/User';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { fileUploadService } from '../services/fileUploadService';
import { logger } from '../config/logger';

interface AIInsight {
  type: 'trend' | 'anomaly' | 'correlation' | 'prediction' | 'summary';
  title: string;
  description: string;
  confidence: number;
  data?: any;
  visualization?: any;
  importance: 'high' | 'medium' | 'low';
}

// Process natural language query
export const processQuery = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { datasetId, query, sessionId } = req.body;

  // Validate dataset access
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied to dataset', 403);
  }

  if (!dataset.isReadyForAnalysis()) {
    throw new AppError('Dataset is not ready for analysis', 400);
  }

  // Find or create analysis session
  let session: IAnalysisSession;
  if (sessionId) {
    const existingSession = await AnalysisSession.findById(sessionId);
    if (!existingSession) {
      throw new AppError('Analysis session not found', 404);
    }
    if (!existingSession.hasAccess(user._id.toString())) {
      throw new AppError('Access denied to analysis session', 403);
    }
    session = existingSession;
  } else {
    // Create new session
    session = new AnalysisSession({
      datasetId,
      userId: user._id,
      title: `Analysis - ${new Date().toISOString().split('T')[0]}`,
      queries: [],
      visualizations: [],
      insights: [],
      predictions: [],
      collaborators: [],
      isShared: false,
      shareSettings: {
        allowComments: true,
        allowEditing: false
      }
    });
    await session.save();
  }

  // Process query (placeholder implementation)
  const startTime = Date.now();
  
  // Mock AI processing response
  const mockResponse = {
    answer: `Based on your query "${query}", I found relevant patterns in the dataset. This is a placeholder response that will be replaced with actual AI processing.`,
    confidence: 0.85,
    suggestedActions: [
      'Create a visualization to better understand the data',
      'Apply filters to focus on specific segments',
      'Generate predictive models for forecasting'
    ]
  };

  const processingTime = Date.now() - startTime;

  // Add query to session
  await session.addQuery(query, mockResponse.answer, processingTime);

  logger.info(`Query processed for user ${user.email}: ${query}`);

  res.json({
    success: true,
    data: {
      sessionId: session._id,
      response: mockResponse,
      processingTime
    },
    message: 'Query processed successfully'
  });
});

// Generate predictions
export const generatePrediction = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { datasetId, targetColumn, predictionType, horizon, sessionId } = req.body;

  // Validate dataset access
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied to dataset', 403);
  }

  if (!dataset.isReadyForAnalysis()) {
    throw new AppError('Dataset is not ready for analysis', 400);
  }

  // Mock prediction generation
  const mockPrediction = {
    type: predictionType,
    target: targetColumn,
    predictions: Array.from({ length: horizon || 10 }, (_, i) => ({
      period: i + 1,
      value: Math.random() * 100,
      confidence: 0.8 + Math.random() * 0.15
    })),
    confidence: 0.82,
    metrics: {
      mse: Math.random() * 10,
      mae: Math.random() * 5,
      r_squared: 0.7 + Math.random() * 0.25
    },
    horizon: horizon || 10
  };

  // Add to session if provided
  if (sessionId) {
    const session = await AnalysisSession.findById(sessionId);
    if (session && session.hasAccess(user._id.toString())) {
      await session.addPrediction(mockPrediction);
    }
  }

  logger.info(`Prediction generated for user ${user.email}: ${targetColumn}`);

  res.json({
    success: true,
    data: { prediction: mockPrediction },
    message: 'Prediction generated successfully'
  });
});

// Get auto-generated insights for dataset
export const getInsights = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { datasetId } = req.params;

  // Validate dataset access
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied to dataset', 403);
  }

  if (!dataset.isReadyForAnalysis()) {
    throw new AppError('Dataset is not ready for analysis', 400);
  }

  // Mock insights generation
  const mockInsights = [
    {
      type: 'trend',
      title: 'Upward Trend Detected',
      description: 'The data shows a consistent upward trend over the past 6 months with a 15% increase.',
      confidence: 0.89,
      supporting_data: {
        trend_direction: 'up',
        growth_rate: 0.15,
        significance: 'high'
      }
    },
    {
      type: 'anomaly',
      title: 'Unusual Spike in March',
      description: 'March data shows values 3 standard deviations above the mean, indicating a potential anomaly.',
      confidence: 0.92,
      supporting_data: {
        deviation: 3.2,
        affected_period: 'March 2024',
        impact: 'high'
      }
    },
    {
      type: 'correlation',
      title: 'Strong Correlation Found',
      description: 'Variables A and B show a strong positive correlation (r=0.84), suggesting a relationship.',
      confidence: 0.84,
      supporting_data: {
        correlation_coefficient: 0.84,
        variables: ['A', 'B'],
        relationship: 'positive'
      }
    }
  ];

  logger.info(`Insights generated for user ${user.email}: dataset ${datasetId}`);

  res.json({
    success: true,
    data: { insights: mockInsights },
    message: 'Insights generated successfully'
  });
});

// Get recommendations based on analysis
export const getRecommendations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { datasetId, context, goals } = req.body;

  // Validate dataset access
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied to dataset', 403);
  }

  // Mock recommendations generation
  const mockRecommendations = [
    {
      title: 'Create Time Series Visualization',
      description: 'Based on your temporal data, a time series chart would help identify patterns and trends.',
      priority: 'high',
      category: 'visualization',
      reasoning: 'Your dataset contains date columns with regular intervals, perfect for time series analysis.',
      actions: [
        'Select date column as X-axis',
        'Choose numeric columns for Y-axis',
        'Apply smoothing if needed'
      ]
    },
    {
      title: 'Apply Seasonal Decomposition',
      description: 'Your data shows seasonal patterns that could be analyzed separately.',
      priority: 'medium',
      category: 'analysis',
      reasoning: 'Seasonal patterns detected in the data suggest decomposition could reveal underlying trends.',
      actions: [
        'Identify seasonal period',
        'Decompose into trend, season, and residual',
        'Analyze each component separately'
      ]
    },
    {
      title: 'Set Up Anomaly Detection',
      description: 'Implement automated anomaly detection to catch unusual patterns.',
      priority: 'medium',
      category: 'monitoring',
      reasoning: 'Historical data shows occasional outliers that would benefit from automated detection.',
      actions: [
        'Define normal behavior baseline',
        'Set threshold levels',
        'Configure alert mechanisms'
      ]
    }
  ];

  logger.info(`Recommendations generated for user ${user.email}: dataset ${datasetId}`);

  res.json({
    success: true,
    data: { recommendations: mockRecommendations },
    message: 'Recommendations generated successfully'
  });
});

// Get user's analysis sessions
export const getSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    AnalysisSession.find({
      $or: [
        { userId: user._id },
        { collaborators: user._id },
        { isShared: true }
      ]
    })
    .populate('datasetId', 'name description')
    .populate('userId', 'firstName lastName email')
    .sort({ lastActivity: -1 })
    .skip(skip)
    .limit(limit),
    AnalysisSession.countDocuments({
      $or: [
        { userId: user._id },
        { collaborators: user._id },
        { isShared: true }
      ]
    })
  ]);

  const pages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    }
  });
});

// Get analysis session by ID
export const getSessionById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { sessionId } = req.params;

  const session = await AnalysisSession.findById(sessionId)
    .populate('datasetId', 'name description')
    .populate('userId', 'firstName lastName email')
    .populate('collaborators', 'firstName lastName email');

  if (!session) {
    throw new AppError('Analysis session not found', 404);
  }

  if (!session.hasAccess(user._id.toString())) {
    throw new AppError('Access denied to analysis session', 403);
  }

  res.json({
    success: true,
    data: { session }
  });
});

// Create new analysis session
export const createSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { datasetId, title } = req.body;

  // Validate dataset access
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied to dataset', 403);
  }

  const session = new AnalysisSession({
    datasetId,
    userId: user._id,
    title: title || `Analysis - ${new Date().toISOString().split('T')[0]}`,
    queries: [],
    visualizations: [],
    insights: [],
    predictions: [],
    collaborators: [],
    isShared: false,
    shareSettings: {
      allowComments: true,
      allowEditing: false
    }
  });

  await session.save();

  logger.info(`Analysis session created by user ${user.email}: ${session.title}`);

  res.status(201).json({
    success: true,
    data: { session },
    message: 'Analysis session created successfully'
  });
});

// Generate AI insights for a dataset
export const generateInsights = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { datasetId } = req.params;
  const { fields } = req.body;

  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  // Check access permissions
  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied', 403);
  }

  try {
    // Load dataset data for analysis
    const fileData = await fileUploadService.getFullFile(dataset.fileId);
    const parsedData = await fileUploadService.parseFile(
      fileData.buffer,
      fileData.metadata.mimeType,
      fileData.filename
    );

    // Generate insights based on data analysis
    const insights = await generateDataInsights(parsedData.data, fields);

    res.json({
      success: true,
      data: { insights }
    });
  } catch (error: any) {
    logger.error('Generate insights error:', error);
    throw new AppError(
      error.message || 'Failed to generate insights',
      500
    );
  }
});

// Helper function to generate data insights
async function generateDataInsights(data: any[], fields?: string[]): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];
  
  try {
    // Get numeric fields for analysis
    const numericFields = getNumericFields(data, fields);
    
    // Generate trend insights
    for (const field of numericFields.slice(0, 3)) {
      const trendInsight = analyzeTrend(data, field);
      if (trendInsight) insights.push(trendInsight);
    }
    
    // Generate correlation insights
    if (numericFields.length >= 2) {
      const correlationInsight = analyzeCorrelations(data, numericFields.slice(0, 5));
      if (correlationInsight) insights.push(correlationInsight);
    }
    
    // Generate distribution insights
    for (const field of numericFields.slice(0, 2)) {
      const distributionInsight = analyzeDistribution(data, field);
      if (distributionInsight) insights.push(distributionInsight);
    }
    
    // Generate summary insights
    const summaryInsight = generateSummaryInsight(data, numericFields);
    if (summaryInsight) insights.push(summaryInsight);
    
  } catch (error) {
    console.error('Error generating insights:', error);
  }
  
  return insights.sort((a, b) => {
    const importanceOrder = { high: 3, medium: 2, low: 1 };
    return importanceOrder[b.importance] - importanceOrder[a.importance];
  });
}

// Helper functions for insight generation
function getNumericFields(data: any[], fields?: string[]): string[] {
  if (!data.length) return [];
  
  const sampleRow = data[0];
  const allFields = fields || Object.keys(sampleRow);
  
  return allFields.filter(field => {
    const values = data.slice(0, 10).map(row => row[field]);
    return values.some(val => !isNaN(Number(val)) && val !== null && val !== '');
  });
}

function analyzeTrend(data: any[], field: string): AIInsight | null {
  const values = data.map(row => Number(row[field])).filter(val => !isNaN(val));
  if (values.length < 5) return null;
  
  // Simple trend analysis
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (Math.abs(changePercent) < 5) return null;
  
  const direction = changePercent > 0 ? 'increasing' : 'decreasing';
  const magnitude = Math.abs(changePercent);
  
  return {
    type: 'trend',
    title: `${direction.charAt(0).toUpperCase() + direction.slice(1)} Trend in ${field}`,
    description: `${field} shows a ${direction} trend with a ${magnitude.toFixed(1)}% change over the data period.`,
    confidence: Math.min(0.95, 0.6 + magnitude / 100),
    importance: magnitude > 20 ? 'high' : magnitude > 10 ? 'medium' : 'low',
    data: { field, changePercent, direction, firstAvg, secondAvg }
  };
}

function analyzeCorrelations(data: any[], fields: string[]): AIInsight | null {
  if (fields.length < 2) return null;
  
  const correlations = [];
  
  for (let i = 0; i < fields.length; i++) {
    for (let j = i + 1; j < fields.length; j++) {
      const corr = calculateCorrelation(data, fields[i], fields[j]);
      if (Math.abs(corr) > 0.5) {
        correlations.push({
          field1: fields[i],
          field2: fields[j],
          correlation: corr
        });
      }
    }
  }
  
  if (correlations.length === 0) return null;
  
  const strongest = correlations.reduce((max, curr) => 
    Math.abs(curr.correlation) > Math.abs(max.correlation) ? curr : max
  );
  
  const strength = Math.abs(strongest.correlation) > 0.8 ? 'strong' : 'moderate';
  const direction = strongest.correlation > 0 ? 'positive' : 'negative';
  
  return {
    type: 'correlation',
    title: `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation found`,
    description: `${strongest.field1} and ${strongest.field2} show a ${strength} ${direction} correlation (r=${strongest.correlation.toFixed(2)}).`,
    confidence: Math.abs(strongest.correlation),
    importance: Math.abs(strongest.correlation) > 0.8 ? 'high' : 'medium',
    data: { correlations, strongest }
  };
}

function calculateCorrelation(data: any[], field1: string, field2: string): number {
  const pairs = data.map(row => [Number(row[field1]), Number(row[field2])])
    .filter(([x, y]) => !isNaN(x) && !isNaN(y));
  
  if (pairs.length < 3) return 0;
  
  const n = pairs.length;
  const sumX = pairs.reduce((sum, [x]) => sum + x, 0);
  const sumY = pairs.reduce((sum, [, y]) => sum + y, 0);
  const sumXY = pairs.reduce((sum, [x, y]) => sum + x * y, 0);
  const sumX2 = pairs.reduce((sum, [x]) => sum + x * x, 0);
  const sumY2 = pairs.reduce((sum, [, y]) => sum + y * y, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

function analyzeDistribution(data: any[], field: string): AIInsight | null {
  const values = data.map(row => Number(row[field])).filter(val => !isNaN(val));
  if (values.length < 10) return null;
  
  values.sort((a, b) => a - b);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const median = values[Math.floor(values.length / 2)];
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  
  // Check for skewness
  const skewness = (mean - median) / (q3 - q1);
  
  if (Math.abs(skewness) < 0.2) return null;
  
  const skewDirection = skewness > 0 ? 'right' : 'left';
  
  return {
    type: 'summary',
    title: `${field} distribution is ${skewDirection}-skewed`,
    description: `The distribution of ${field} shows ${skewDirection} skewness with mean ${mean.toFixed(2)} and median ${median.toFixed(2)}.`,
    confidence: Math.min(0.9, Math.abs(skewness) + 0.5),
    importance: Math.abs(skewness) > 0.5 ? 'medium' : 'low',
    data: { field, mean, median, q1, q3, skewness }
  };
}

function generateSummaryInsight(data: any[], numericFields: string[]): AIInsight | null {
  if (numericFields.length === 0) return null;
  
  const fieldStats = numericFields.map(field => {
    const values = data.map(row => Number(row[field])).filter(val => !isNaN(val));
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    const cv = std / mean; // Coefficient of variation
    
    return { field, mean, std, cv, count: values.length };
  });
  
  const totalRecords = data.length;
  const avgCompleteness = fieldStats.reduce((sum, stat) => sum + stat.count / totalRecords, 0) / fieldStats.length;
  
  return {
    type: 'summary',
    title: 'Dataset Overview',
    description: `Dataset contains ${totalRecords} records with ${numericFields.length} numeric fields. Average data completeness is ${(avgCompleteness * 100).toFixed(1)}%.`,
    confidence: 0.95,
    importance: 'medium',
    data: { totalRecords, numericFields: fieldStats, avgCompleteness }
  };
}

// Validation rules
export const validateQuery = [
  body('datasetId')
    .isMongoId()
    .withMessage('Valid dataset ID is required'),
  body('query')
    .trim()
    .isLength({ min: 3, max: 2000 })
    .withMessage('Query must be between 3 and 2000 characters'),
  body('sessionId')
    .optional()
    .isMongoId()
    .withMessage('Session ID must be valid if provided')
];

export const validatePrediction = [
  body('datasetId')
    .isMongoId()
    .withMessage('Valid dataset ID is required'),
  body('targetColumn')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Target column is required'),
  body('predictionType')
    .isIn(['forecast', 'classification', 'regression'])
    .withMessage('Prediction type must be forecast, classification, or regression'),
  body('horizon')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Horizon must be between 1 and 365')
];

export const validateRecommendations = [
  body('datasetId')
    .isMongoId()
    .withMessage('Valid dataset ID is required'),
  body('context')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Context cannot exceed 500 characters'),
  body('goals')
    .optional()
    .isArray()
    .withMessage('Goals must be an array')
];

export const validateCreateSession = [
  body('datasetId')
    .isMongoId()
    .withMessage('Valid dataset ID is required'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters')
];

export const handleValidationErrors = (req: Request, res: Response, next: Function): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    next(new AppError(errorMessages.join('. '), 400));
    return;
  }
  next();
};