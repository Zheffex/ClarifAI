import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { openRouterService } from '../services/openRouterService';
import { IUser } from '../models/User';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';

// Chat completion endpoint
export const chatCompletion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { messages } = req.body;

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

// Analyze image endpoint
export const analyzeImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { imageUrl, question } = req.body;

  if (!openRouterService.isConfigured()) {
    throw new AppError('AI service is not configured', 503);
  }

  try {
    const analysis = await openRouterService.analyzeImage(imageUrl, question);
    
    logger.info(`Image analysis requested by user ${user.email}`, {
      imageUrl,
      question
    });

    res.json({
      success: true,
      data: { 
        analysis,
        imageUrl,
        question: question || 'What is in this image?'
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
  const { data, context } = req.body;

  if (!openRouterService.isConfigured()) {
    throw new AppError('AI service is not configured', 503);
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new AppError('Valid data array is required', 400);
  }

  try {
    const insights = await openRouterService.generateDataInsights(data, context);
    
    logger.info(`Data insights generation requested by user ${user.email}`, {
      dataRows: data.length,
      hasContext: !!context
    });

    res.json({
      success: true,
      data: { 
        insights,
        dataRows: data.length,
        context
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
    .isURL()
    .withMessage('Valid image URL is required'),
  body('question')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Question cannot exceed 500 characters')
];

export const validateDataInsights = [
  body('data')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Data array is required with 1-1000 items'),
  body('context')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Context cannot exceed 1000 characters')
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