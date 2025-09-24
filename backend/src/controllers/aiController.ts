import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { openRouterService } from '../services/openRouterService';
import { IUser } from '../models/User';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';

// Chat completion endpoint
export const chatCompletion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { messages } = req.body;

  if (!user) {
    throw new AppError('Authentication required', 401);
  }

  if (!openRouterService.isConfigured()) {
    throw new AppError('AI service is not configured', 503);
  }

  try {
    const response = await openRouterService.chatCompletion(messages);
    
    logger.info(`AI chat completion requested by user ${user.email}`);

    res.json({
      success: true,
      data: { response },
      message: 'Chat completion generated successfully'
    });
  } catch (error: any) {
    logger.error('Chat completion error:', error);
    throw new AppError(
      error.message || 'Failed to generate chat completion',
      500
    );
  }
});

// Analyze text endpoint
export const analyzeText = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { text, analysisType } = req.body;

  if (!user) {
    throw new AppError('Authentication required', 401);
  }

  if (!openRouterService.isConfigured()) {
    throw new AppError('AI service is not configured', 503);
  }

  try {
    const analysis = await openRouterService.analyzeText(text, analysisType);
    
    logger.info(`Text analysis requested by user ${user.email}`, {
      textLength: text.length,
      analysisType
    });

    res.json({
      success: true,
      data: { 
        analysis,
        originalText: text,
        analysisType: analysisType || 'general'
      },
      message: 'Text analysis completed successfully'
    });
  } catch (error: any) {
    logger.error('Text analysis error:', error);
    throw new AppError(
      error.message || 'Failed to analyze text',
      500
    );
  }
});

// Helper function to get appropriate prompt based on analysis type
const getImageAnalysisPrompt = (analysisType: string): string => {
  const prompts = {
    'classification': 'Classify what you see in this image and provide the main category or type of object/scene.',
    'description': 'Describe what you see in this image in detail.',
    'medical': 'Analyze this medical image and describe any notable findings or observations.',
    'text-extraction': 'Extract and transcribe any text you can see in this image.'
  };
  
  return prompts[analysisType as keyof typeof prompts] || 'Describe what you see in this image';
};

// Configure multer for image uploads
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export const uploadImage = imageUpload.single('image');

// Analyze image endpoint
export const analyzeImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { analysisType, prompt } = req.body;
  const file = req.file;

  if (!user) {
    throw new AppError('Authentication required', 401);
  }

  if (!openRouterService.isConfigured()) {
    throw new AppError('AI service is not configured', 503);
  }

  // Check if we have either a file upload or imageUrl
  let imageUrl: string;
  if (file) {
    // Convert uploaded file to base64 data URL
    const base64 = file.buffer.toString('base64');
    imageUrl = `data:${file.mimetype};base64,${base64}`;
  } else if (req.body.imageUrl) {
    imageUrl = req.body.imageUrl;
  } else {
    throw new AppError('Either image file or imageUrl is required', 400);
  }

  const defaultPrompt = getImageAnalysisPrompt(analysisType || 'description');
  const question = prompt || defaultPrompt;

  try {
    const analysis = await openRouterService.analyzeImage(imageUrl, question);
    
    logger.info(`Image analysis requested by user ${user.email}`, {
      hasFile: !!file,
      hasUrl: !!req.body.imageUrl,
      analysisType,
      question
    });

    res.json({
      success: true,
      data: { 
        analysis,
        analysisType: analysisType || 'classification',
        question
      },
      message: 'Image analysis completed successfully'
    });
  } catch (error: any) {
    logger.error('Image analysis error:', error);
    throw new AppError(
      error.message || 'Failed to analyze image',
      500
    );
  }
});

// Generate data insights endpoint
export const generateInsights = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { datasetId, analysisType, columns, options } = req.body;

  if (!user) {
    throw new AppError('Authentication required', 401);
  }

  if (!openRouterService.isConfigured()) {
    throw new AppError('AI service is not configured', 503);
  }

  // Import Dataset model
  const { Dataset } = await import('../models/Dataset');
  const { fileUploadService } = await import('../services/fileUploadService');

  // Find and validate dataset
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  // Check user access to dataset
  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied to dataset', 403);
  }

  // Check if dataset is ready
  if (dataset.processingStatus !== 'ready') {
    throw new AppError('Dataset is not ready for analysis', 400);
  }

  try {
    // Get dataset preview (limit to reasonable size for insights)
    const preview = await fileUploadService.getFilePreview(
      dataset.fileId,
      1000 // Limit to 1000 rows for performance
    );

    let dataToAnalyze = preview.rows;

    // Filter columns if specified
    if (columns && Array.isArray(columns) && columns.length > 0) {
      dataToAnalyze = preview.rows.map((row: any) => {
        const filteredRow: any = {};
        columns.forEach(col => {
          if (row.hasOwnProperty(col)) {
            filteredRow[col] = row[col];
          }
        });
        return filteredRow;
      });
    }

    // Prepare context for AI analysis
    const contextString = [
      `Dataset: ${dataset.name}`,
      dataset.description ? `Description: ${dataset.description}` : '',
      `Analysis Type: ${analysisType || 'general'}`,
      `Total Rows: ${dataset.metadata.rows}`,
      `Total Columns: ${dataset.metadata.columns}`,
      `Headers: ${dataset.metadata.headers?.join(', ')}`,
      `File Type: ${dataset.metadata.type}`,
      options ? `Options: ${JSON.stringify(options)}` : ''
    ].filter(Boolean).join('\n');

    const insights = await openRouterService.generateDataInsights(dataToAnalyze, contextString);
    
    logger.info(`Data insights generation requested by user ${user.email}`, {
      datasetId,
      datasetName: dataset.name,
      analysisType,
      dataRows: dataToAnalyze.length,
      columnsAnalyzed: columns || 'all'
    });

    res.json({
      success: true,
      data: { 
        insights,
        dataset: {
          id: dataset._id,
          name: dataset.name,
          description: dataset.description
        },
        analysisType: analysisType || 'general',
        dataRows: dataToAnalyze.length,
        columnsAnalyzed: columns || dataset.metadata.headers,
        analysisContext: {
          datasetName: dataset.name,
          analysisType: analysisType || 'general',
          totalRows: dataset.metadata.rows,
          options: options || {}
        }
      },
      message: 'Data insights generated successfully'
    });
  } catch (error: any) {
    logger.error('Data insights generation error:', error);
    throw new AppError(
      error.message || 'Failed to generate data insights',
      500
    );
  }
});

// Get AI service status
export const getAIStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const modelInfo = openRouterService.getModelInfo();
  
  res.json({
    success: true,
    data: {
      configured: modelInfo.configured,
      model: modelInfo.model,
      status: modelInfo.configured ? 'active' : 'not configured'
    }
  });
});

// Validation rules
export const validateChatCompletion = [
  body('messages')
    .isArray({ min: 1 })
    .withMessage('Messages array is required with at least one message'),
  body('messages.*.role')
    .isIn(['user', 'assistant', 'system'])
    .withMessage('Message role must be user, assistant, or system'),
  body('messages.*.content')
    .notEmpty()
    .withMessage('Message content is required')
];

export const validateTextAnalysis = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Text is required and must be between 1 and 10000 characters'),
  body('analysisType')
    .optional()
    .isIn(['general', 'data-analysis', 'text-analysis', 'sentiment'])
    .withMessage('Analysis type must be general, data-analysis, text-analysis, or sentiment')
];

export const validateImageAnalysis = [
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be valid if provided'),
  body('prompt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Prompt cannot exceed 500 characters'),
  body('analysisType')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Analysis type cannot be empty if provided')
];

export const validateDataInsights = [
  body('datasetId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid dataset ID is required'),
  body('analysisType')
    .optional()
    .isIn(['statistical', 'exploratory', 'predictive', 'pattern-analysis', 'correlation'])
    .withMessage('Analysis type must be one of: statistical, exploratory, predictive, pattern-analysis, correlation'),
  body('columns')
    .optional()
    .isArray()
    .withMessage('Columns must be an array'),
  body('columns.*')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Column names cannot be empty'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  body('options.includeCorrelations')
    .optional()
    .isBoolean()
    .withMessage('includeCorrelations must be boolean'),
  body('options.includeOutliers')
    .optional()
    .isBoolean()
    .withMessage('includeOutliers must be boolean'),
  body('options.includePatterns')
    .optional()
    .isBoolean()
    .withMessage('includePatterns must be boolean')
];

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: Function): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    next(new AppError(errorMessages.join('. '), 400));
    return;
  }
  next();
};

// Handle multer errors
export const handleMulterError = (error: any, req: Request, res: Response, next: Function): void => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError('File size too large. Maximum size is 10MB', 400));
      return;
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      next(new AppError('Unexpected file field. Use "image" field name', 400));
      return;
    }
  }
  if (error.message === 'Only image files are allowed') {
    next(new AppError(error.message, 400));
    return;
  }
  next(error);
};