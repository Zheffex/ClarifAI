import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { AnalysisSession, IAnalysisSession } from '../models/AnalysisSession';
import { Dataset } from '../models/Dataset';
import { IUser } from '../models/User';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { fileUploadService } from '../services/fileUploadService';
import { openRouterService } from '../services/openRouterService';
import { notificationService } from '../services/notificationService';
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

  // Process query using AI
  const startTime = Date.now();
  
  try {
    // Get dataset sample for context
    const dataPreview = await fileUploadService.getFilePreview(dataset.fileId, 10);
    
    // Create AI prompt with dataset context
    const aiPrompt = `You are analyzing a dataset with the following structure and sample data:

Dataset: ${dataset.name}
Description: ${dataset.description || 'No description provided'}
Columns: ${dataset.metadata.headers?.join(', ') || 'Unknown structure'}
Total rows: ${dataset.metadata.rows || 'Unknown'}

Sample data (first few rows):
${JSON.stringify(dataPreview.rows, null, 2)}

User query: "${query}"

Please analyze this query in the context of the dataset and provide:
1. A clear, actionable answer
2. Insights or patterns you can identify
3. Suggested next steps for analysis
4. Any data quality observations

Respond in a structured, professional manner.`;

    const aiResponse = await openRouterService.analyzeText(aiPrompt, 'data-analysis');
    
    const processingTime = Date.now() - startTime;

    // Add query to session
    await session.addQuery(query, aiResponse, processingTime);

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        response: {
          answer: aiResponse,
          processingTime,
          datasetContext: {
            name: dataset.name,
            rows: dataset.metadata.rows,
            columns: dataset.metadata.columns
          }
        }
      },
      message: 'Query processed successfully'
    });
  } catch (aiError: any) {
    logger.error('AI processing failed, falling back to basic response:', aiError);
    
    // Fallback response if AI fails
    const fallbackResponse = `I encountered an issue processing your query "${query}" with AI analysis. However, I can confirm that your dataset "${dataset.name}" is available for analysis with ${dataset.metadata.rows || 'unknown'} rows and ${dataset.metadata.columns || 'unknown'} columns. Please try rephrasing your question or check your AI service configuration.`;
    
    const processingTime = Date.now() - startTime;
    await session.addQuery(query, fallbackResponse, processingTime);

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        response: {
          answer: fallbackResponse,
          processingTime,
          warning: 'AI analysis temporarily unavailable'
        }
      },
      message: 'Query processed with fallback response'
    });
  }

  logger.info(`Query processed for user ${user.email}: ${query}`);
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

  try {
    // Get dataset sample for AI analysis
    const dataPreview = await fileUploadService.getFilePreview(dataset.fileId, 20);
    
    if (!targetColumn || !dataPreview || dataPreview.rows.length === 0) {
      throw new AppError('Unable to analyze dataset for predictions. Please check target column and data availability.', 400);
    }

    // Prepare AI prompt for prediction analysis
    const aiPrompt = `You are a data scientist analyzing a dataset for predictive modeling.

Dataset: ${dataset.name}
Target Column: ${targetColumn}
Prediction Type: ${predictionType}
Forecast Horizon: ${horizon || 10} periods

Sample data:
${JSON.stringify(dataPreview.rows.slice(0, 10), null, 2)}

Please analyze this data and provide realistic predictions in the following JSON format:
{
  "type": "${predictionType}",
  "target": "${targetColumn}",
  "predictions": [
    {"period": 1, "value": <predicted_value>, "confidence": <0.0-1.0>},
    // ... continue for ${horizon || 10} periods
  ],
  "analysis": "Your analysis of the data patterns and prediction methodology",
  "confidence": <overall_confidence_0.0-1.0>,
  "methodology": "Brief description of the prediction approach used",
  "factors": ["key factors influencing predictions"],
  "recommendations": ["actionable recommendations based on predictions"]
}

Base your predictions on actual data patterns, trends, and seasonality you observe. Be realistic and provide genuine confidence scores.`;

    const aiResponse = await openRouterService.analyzeText(aiPrompt, 'data-analysis');
    
    // Try to parse AI response as JSON, fallback to structured response
    let predictionData;
    try {
      // Extract JSON from AI response if it contains code blocks
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : aiResponse;
      if (jsonText) {
        predictionData = JSON.parse(jsonText);
      } else {
        throw new Error('No valid JSON found in AI response');
      }
    } catch (parseError) {
      // If AI doesn't return valid JSON, create structured response
      predictionData = {
        type: predictionType,
        target: targetColumn,
        predictions: Array.from({ length: horizon || 10 }, (_, i) => ({
          period: i + 1,
          value: null,
          confidence: 0.5
        })),
        analysis: aiResponse,
        confidence: 0.7,
        methodology: "AI-based pattern analysis",
        factors: ["Data availability", "Historical patterns"],
        recommendations: ["Review data quality", "Consider additional features"]
      };
    }

    // Add to session if provided
    if (sessionId) {
      const session = await AnalysisSession.findById(sessionId);
      if (session && session.hasAccess(user._id.toString())) {
        await session.addPrediction(predictionData);
      }
    }

    logger.info(`AI prediction generated for user ${user.email}: ${targetColumn}`);

    // Send notification for successful prediction
    try {
      await notificationService.createNotification({
        userId: user._id.toString(),
        type: 'prediction_ready',
        title: `Prediction completed for ${dataset.name}`,
        message: `AI prediction for "${targetColumn}" has been generated with ${(predictionData.confidence * 100).toFixed(0)}% confidence.`,
        metadata: {
          datasetId: dataset._id,
          actionUrl: `/datasets/${dataset._id}/predictions`,
          relatedData: {
            datasetName: dataset.name,
            targetColumn,
            confidence: predictionData.confidence
          }
        },
        priority: 'normal',
        channels: ['inApp']
      });
    } catch (notificationError) {
      logger.error('Failed to send prediction notification:', notificationError);
    }

    res.json({
      success: true,
      data: { prediction: predictionData },
      message: 'AI-powered prediction generated successfully'
    });

  } catch (aiError: any) {
    logger.error('AI prediction failed:', aiError);
    
    // Fallback: provide basic trend analysis
    const fallbackPrediction = {
      type: predictionType,
      target: targetColumn,
      predictions: Array.from({ length: horizon || 10 }, (_, i) => ({
        period: i + 1,
        value: null,
        confidence: 0.3
      })),
      analysis: `Unable to generate AI predictions for ${targetColumn}. Please check your AI service configuration and data quality.`,
      confidence: 0.3,
      methodology: "Fallback analysis",
      factors: ["Limited AI analysis"],
      recommendations: ["Check AI service status", "Verify data format"],
      error: "AI prediction service unavailable"
    };

    res.json({
      success: true,
      data: { prediction: fallbackPrediction },
      message: 'Prediction generated with limited analysis'
    });
  }
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

  try {
    // Get dataset preview for AI analysis
    const dataPreview = await fileUploadService.getFilePreview(dataset.fileId, 50);
    
    if (!dataPreview || dataPreview.rows.length === 0) {
      throw new AppError('Unable to analyze dataset for insights. No data available.', 400);
    }

    // Prepare AI prompt for insights generation
    const aiPrompt = `You are a data analyst examining a dataset for insights and patterns.

Dataset: ${dataset.name}
Description: ${dataset.description || 'No description provided'}
Columns: ${dataPreview.headers.join(', ')}
Total rows: ${dataPreview.totalRows}

Sample data (first 20 rows):
${JSON.stringify(dataPreview.rows.slice(0, 20), null, 2)}

Please analyze this dataset and identify key insights in the following JSON format:
{
  "insights": [
    {
      "type": "trend|anomaly|correlation|pattern|distribution",
      "title": "Brief descriptive title",
      "description": "Detailed explanation of the insight",
      "confidence": <0.0-1.0>,
      "supporting_data": {
        "specific details about the finding"
      },
      "importance": "high|medium|low"
    }
  ],
  "summary": "Overall summary of the dataset",
  "data_quality": {
    "completeness": <0.0-1.0>,
    "issues": ["list of data quality issues found"],
    "recommendations": ["suggested improvements"]
  },
  "next_steps": ["recommended analysis steps"]
}

Focus on:
1. Identifying trends and patterns
2. Detecting potential anomalies or outliers
3. Finding correlations between variables
4. Assessing data quality
5. Suggesting actionable insights

Be specific and provide confidence scores based on the strength of evidence in the data.`;

    const aiResponse = await openRouterService.analyzeText(aiPrompt, 'data-analysis');
    
    // Try to parse AI response as JSON, fallback to structured response
    let insightsData;
    try {
      // Extract JSON from AI response if it contains code blocks
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch && jsonMatch[1] ? jsonMatch[1].trim() : aiResponse.trim();
      
      if (jsonText && jsonText.startsWith('{')) {
        insightsData = JSON.parse(jsonText);
      } else {
        throw new Error('No valid JSON found in AI response');
      }
    } catch (parseError) {
      // If AI doesn't return valid JSON, create structured response
      insightsData = {
        insights: [
          {
            type: 'analysis',
            title: 'AI Analysis Complete',
            description: aiResponse,
            confidence: 0.7,
            supporting_data: {
              dataset_name: dataset.name,
              rows: dataPreview.totalRows,
              columns: dataPreview.headers.length
            },
            importance: 'medium'
          }
        ],
        summary: `Analysis completed for dataset "${dataset.name}" with ${dataPreview.totalRows} rows and ${dataPreview.headers.length} columns.`,
        data_quality: {
          completeness: 0.8,
          issues: ['Unable to parse structured insights from AI'],
          recommendations: ['Check AI service configuration', 'Review data format']
        },
        next_steps: ['Review AI analysis', 'Generate visualizations', 'Apply filters']
      };
    }

    logger.info(`AI insights generated for user ${user.email}: dataset ${datasetId}`);

    // Send notification for insights completion
    try {
      await notificationService.createNotification({
        userId: user._id.toString(),
        type: 'analysis_complete',
        title: `Insights generated for ${dataset.name}`,
        message: `AI analysis found ${insightsData.insights?.length || 0} key insights for your dataset.`,
        metadata: {
          datasetId: dataset._id,
          actionUrl: `/datasets/${dataset._id}/insights`,
          relatedData: {
            datasetName: dataset.name,
            insightCount: insightsData.insights?.length || 0
          }
        },
        priority: 'normal',
        channels: ['inApp']
      });
    } catch (notificationError) {
      logger.error('Failed to send insights notification:', notificationError);
    }

    res.json({
      success: true,
      data: insightsData,
      message: 'AI-powered insights generated successfully'
    });

  } catch (aiError: any) {
    logger.error('AI insights generation failed:', aiError);
    
    // Fallback insights
    const fallbackInsights = {
      insights: [
        {
          type: 'system',
          title: 'Analysis Unavailable',
          description: `Unable to generate AI insights for dataset "${dataset.name}". The AI service may be temporarily unavailable.`,
          confidence: 0.1,
          supporting_data: {
            error: 'AI service unavailable',
            dataset_id: datasetId
          },
          importance: 'low'
        }
      ],
      summary: 'AI analysis could not be completed at this time.',
      data_quality: {
        completeness: 0.0,
        issues: ['AI service unavailable'],
        recommendations: ['Check service status', 'Try again later']
      },
      next_steps: ['Verify AI configuration', 'Retry analysis', 'Use manual analysis']
    };

    res.json({
      success: true,
      data: fallbackInsights,
      message: 'Insights generated with limited analysis'
    });
  }
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

  try {
    // Get dataset preview for AI-powered recommendations
    const dataPreview = await fileUploadService.getFilePreview(dataset.fileId, 30);
    
    if (!dataPreview || dataPreview.rows.length === 0) {
      throw new AppError('Unable to generate recommendations. No data available.', 400);
    }

    // Prepare AI prompt for recommendations
    const aiPrompt = `You are an expert data analyst providing actionable recommendations for a dataset analysis.

Dataset: ${dataset.name}
Description: ${dataset.description || 'No description provided'}
Columns: ${dataPreview.headers.join(', ')}
Total rows: ${dataPreview.totalRows}
User Context: ${context || 'General analysis'}
User Goals: ${goals || 'Understand data and find insights'}

Sample data (first 15 rows):
${JSON.stringify(dataPreview.rows.slice(0, 15), null, 2)}

Please analyze this dataset and provide actionable recommendations in the following JSON format:
{
  "recommendations": [
    {
      "title": "Clear, actionable recommendation title",
      "description": "Detailed explanation of what to do and why",
      "priority": "high|medium|low",
      "category": "visualization|analysis|data_cleaning|modeling|monitoring",
      "reasoning": "Why this recommendation is relevant for this dataset",
      "actions": ["step 1", "step 2", "step 3"],
      "expected_outcome": "What the user can expect to achieve",
      "difficulty": "easy|medium|hard",
      "estimated_time": "time estimate to complete"
    }
  ],
  "analysis_strategy": "Overall approach recommended for this dataset",
  "data_quality_notes": ["observations about data quality"],
  "visualization_suggestions": ["specific chart types that would work well"],
  "next_immediate_steps": ["first 3 things the user should do"]
}

Focus on:
1. Practical, actionable recommendations
2. Visualization suggestions appropriate for the data
3. Data quality improvements
4. Analysis techniques suited to this dataset
5. Business/research value that can be extracted

Make recommendations specific to the actual data structure and content you observe.`;

    const aiResponse = await openRouterService.analyzeText(aiPrompt, 'data-analysis');
    
    // Try to parse AI response as JSON, fallback to structured response
    let recommendationsData;
    try {
      // Extract JSON from AI response if it contains code blocks
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch && jsonMatch[1] ? jsonMatch[1].trim() : aiResponse.trim();
      
      if (jsonText && jsonText.startsWith('{')) {
        recommendationsData = JSON.parse(jsonText);
      } else {
        throw new Error('No valid JSON found in AI response');
      }
    } catch (parseError) {
      // If AI doesn't return valid JSON, create structured response
      recommendationsData = {
        recommendations: [
          {
            title: 'AI Analysis and Exploration',
            description: aiResponse,
            priority: 'medium',
            category: 'analysis',
            reasoning: `Based on analysis of dataset "${dataset.name}" with ${dataPreview.totalRows} rows and ${dataPreview.headers.length} columns`,
            actions: [
              'Review the AI analysis above',
              'Identify key columns for analysis',
              'Create appropriate visualizations',
              'Apply data cleaning if needed'
            ],
            expected_outcome: 'Better understanding of data patterns and structure',
            difficulty: 'medium',
            estimated_time: '30-60 minutes'
          }
        ],
        analysis_strategy: 'AI-guided exploratory data analysis',
        data_quality_notes: ['AI analysis completed but structured output parsing failed'],
        visualization_suggestions: ['Start with basic charts to understand data distribution'],
        next_immediate_steps: [
          'Review columns and data types',
          'Check for missing values',
          'Create summary statistics'
        ]
      };
    }

    logger.info(`AI recommendations generated for user ${user.email}: dataset ${datasetId}`);

    res.json({
      success: true,
      data: recommendationsData,
      message: 'AI-powered recommendations generated successfully'
    });

  } catch (aiError: any) {
    logger.error('AI recommendations generation failed:', aiError);
    
    // Fallback recommendations
    const fallbackRecommendations = {
      recommendations: [
        {
          title: 'Basic Data Exploration',
          description: `Start with basic exploration of your dataset "${dataset.name}". AI recommendations are temporarily unavailable.`,
          priority: 'high',
          category: 'analysis',
          reasoning: 'Essential first step for any data analysis project',
          actions: [
            'Review column names and types',
            'Check data completeness',
            'Generate summary statistics',
            'Identify potential issues'
          ],
          expected_outcome: 'Understanding of data structure and quality',
          difficulty: 'easy',
          estimated_time: '15-30 minutes'
        },
        {
          title: 'Create Initial Visualizations',
          description: 'Generate basic charts to understand data distribution and patterns.',
          priority: 'medium',
          category: 'visualization',
          reasoning: 'Visual exploration helps identify patterns quickly',
          actions: [
            'Create histograms for numeric columns',
            'Generate bar charts for categorical data',
            'Plot correlation matrices if applicable'
          ],
          expected_outcome: 'Visual insights into data patterns',
          difficulty: 'easy',
          estimated_time: '20-40 minutes'
        }
      ],
      analysis_strategy: 'Start with basic exploration and visualization',
      data_quality_notes: ['AI service temporarily unavailable'],
      visualization_suggestions: ['Histograms', 'Bar charts', 'Scatter plots'],
      next_immediate_steps: [
        'Check AI service configuration',
        'Begin manual exploration',
        'Create basic visualizations'
      ]
    };

    res.json({
      success: true,
      data: fallbackRecommendations,
      message: 'Recommendations generated with basic analysis'
    });
  }
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
    const insights = await generateDataInsights(parsedData.rows, fields);

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
    logger.error('Error generating insights:', error);
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
      const field1 = fields[i];
      const field2 = fields[j];
      if (field1 && field2) {
        const corr = calculateCorrelation(data, field1, field2);
        if (Math.abs(corr) > 0.5) {
          correlations.push({
            field1,
            field2,
            correlation: corr
          });
        }
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
  const pairs: number[][] = [];
  
  for (const row of data) {
    const x = Number(row[field1]);
    const y = Number(row[field2]);
    if (!isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y)) {
      pairs.push([x, y]);
    }
  }
  
  if (pairs.length < 3) return 0;
  
  const n = pairs.length;
  const sumX = pairs.reduce((sum, pair) => sum + pair[0]!, 0);
  const sumY = pairs.reduce((sum, pair) => sum + pair[1]!, 0);
  const sumXY = pairs.reduce((sum, pair) => sum + pair[0]! * pair[1]!, 0);
  const sumX2 = pairs.reduce((sum, pair) => sum + pair[0]! * pair[0]!, 0);
  const sumY2 = pairs.reduce((sum, pair) => sum + pair[1]! * pair[1]!, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

function analyzeDistribution(data: any[], field: string): AIInsight | null {
  const values = data.map(row => Number(row[field])).filter(val => !isNaN(val) && isFinite(val));
  if (values.length < 10) return null;
  
  values.sort((a, b) => a - b);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const median = values[Math.floor(values.length / 2)] || 0;
  const q1 = values[Math.floor(values.length * 0.25)] || 0;
  const q3 = values[Math.floor(values.length * 0.75)] || 0;
  
  // Check for skewness
  const skewness = q3 - q1 > 0 ? (mean - median) / (q3 - q1) : 0;
  
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