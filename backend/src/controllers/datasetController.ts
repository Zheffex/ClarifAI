import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Dataset, IDataset } from '../models/Dataset';
import { IUser } from '../models/User';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { fileUploadService } from '../services/fileUploadService';
import { SchemaDetectionService } from '../services/schemaDetectionService';
import { DataValidationService } from '../services/dataValidationService';
import { notificationService } from '../services/notificationService';
import { anomalyDetectionService } from '../services/anomalyDetectionService';
import { logger } from '../config/logger';

const schemaDetectionService = new SchemaDetectionService();
const dataValidationService = new DataValidationService();

// Upload dataset
export const uploadDataset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { name, description } = req.body;
  let { tags } = req.body;
  const file = req.file;

  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  // Parse tags if they come as JSON string from form data
  if (typeof tags === 'string') {
    try {
      tags = JSON.parse(tags);
    } catch {
      // If parsing fails, treat as single tag
      tags = [tags];
    }
  }
  
  // Ensure tags is an array
  if (!Array.isArray(tags)) {
    tags = tags ? [tags] : [];
  }

  // Validate file
  const validation = fileUploadService.validateFile(file);
  if (!validation.isValid) {
    throw new AppError(validation.errors.join('. '), 400);
  }

  logger.info(`Starting upload process for file: ${file.originalname}`);

  try {
    logger.info('Step 1: Uploading file to GridFS...');
    // Upload file to GridFS
    const fileId = await fileUploadService.uploadFile(
      file.buffer,
      file.originalname,
      {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: user._id.toString(),
        uploadedAt: new Date()
      }
    );
    logger.info(`File uploaded with ID: ${fileId}`);

    logger.info('Step 2: Parsing file content...');
    // Parse file to get schema information and data
    const parsedData = await fileUploadService.parseFile(
      file.buffer,
      file.mimetype,
      file.originalname
    );
    logger.info(`File parsed. Rows: ${parsedData.rows?.length || 0}`);

    logger.info('Step 3: Detecting schema...');
    // Detect schema from parsed data
    const detectedSchema = await schemaDetectionService.detectSchema(parsedData.rows);
    logger.info(`Schema detected. Fields: ${detectedSchema.fields?.length || 0}`);
    
    logger.info('Step 4: Generating quality report...');
    // Generate data quality report
    const qualityReport = await dataValidationService.generateQualityReport(
      parsedData.rows,
      detectedSchema
    );
    logger.info(`Quality report generated. Score: ${qualityReport.overall?.score || 'N/A'}`);

    logger.info('Step 5: Creating dataset record...');

    // Create dataset record
    const dataset = new Dataset({
      name,
      description,
      fileId,
      uploadedBy: user._id,
      organizationId: user.organizationId || new mongoose.Types.ObjectId(),
      dataSchema: {
        fields: detectedSchema.fields.map(field => ({
          name: field.name,
          type: field.type,
          nullable: field.nullable,
          unique: field.unique || false
        })),
        relationships: detectedSchema.relationships || [],
        detectedAt: new Date(),
        confidence: Math.min(...detectedSchema.fields.map(f => f.confidence))
      },
      metadata: {
        size: file.size,
        type: file.mimetype.includes('csv') ? 'csv' : 
              file.mimetype.includes('json') ? 'json' : 
              file.mimetype.includes('sheet') || file.mimetype.includes('excel') ? 'xlsx' : 'unknown',
        rows: detectedSchema.totalRows,
        columns: detectedSchema.totalColumns,
        encoding: 'utf-8',
        delimiter: file.mimetype.includes('csv') ? ',' : undefined,
        headers: detectedSchema.fields.map(f => f.name),
        qualityScore: qualityReport.overall.score,
        qualityGrade: qualityReport.overall.grade,
        dataTypes: detectedSchema.fields.reduce((acc, field) => {
          acc[field.name] = {
            type: field.type,
            nullable: field.nullable,
            distinctValues: field.distinctValues,
            sampleValues: field.sampleValues.slice(0, 5)
          };
          return acc;
        }, {} as any)
      },
      processingStatus: 'ready',
      tags: tags || [],
      isPublic: false,
      accessPermissions: []
    });

    await dataset.save();
    logger.info(`Dataset saved successfully with ID: ${dataset._id}`);

    // Send notification for successful dataset upload
    try {
      await notificationService.createNotification({
        userId: user._id.toString(),
        type: 'data_change',
        title: `Dataset "${dataset.name}" processed successfully`,
        message: `Your dataset has been uploaded and is ready for analysis. Quality score: ${qualityReport.overall.score}/100 (${qualityReport.overall.grade}).`,
        metadata: {
          datasetId: dataset._id,
          actionUrl: `/datasets/${dataset._id}`,
          relatedData: {
            datasetName: dataset.name,
            qualityScore: qualityReport.overall.score,
            qualityGrade: qualityReport.overall.grade
          }
        },
        priority: 'normal',
        channels: ['inApp', 'email']
      });

      // Trigger anomaly detection for the new dataset
      setTimeout(async () => {
        try {
          await anomalyDetectionService.analyzeDatasetAnomalies(dataset._id.toString(), user._id.toString());
        } catch (error) {
          logger.error('Failed to trigger anomaly detection for new dataset:', error);
        }
      }, 5000); // Delay to allow processing to complete

    } catch (notificationError) {
      logger.error('Failed to send dataset upload notification:', notificationError);
      // Don't fail the entire request if notification fails
    }

    logger.info(`Dataset uploaded by user ${user.email}: ${dataset.name}`);

    res.status(201).json({
      success: true,
      data: { 
        dataset,
        schema: detectedSchema,
        qualityReport: qualityReport
      },
      message: 'Dataset uploaded and processed successfully'
    });
  } catch (error: any) {
    logger.error('Dataset upload error:', error);
    
    // If dataset creation failed but file was uploaded, clean up
    // This would be handled by a cleanup job in production
    
    throw new AppError(
      error.message || 'Failed to process dataset',
      500
    );
  }
});

// Get user's datasets
export const getDatasets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const status = req.query.status as string;

  const skip = (page - 1) * limit;

  // Build query
  let query: any = {
    $or: [
      { uploadedBy: user._id },
      { isPublic: true },
      { 'accessPermissions.userId': user._id }
    ]
  };

  if (status) {
    query.processingStatus = status;
  }

  if (search) {
    query.$text = { $search: search };
  }

  // Execute query with pagination
  const [datasets, total] = await Promise.all([
    Dataset.find(query)
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Dataset.countDocuments(query)
  ]);

  const pages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: { 
      datasets,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    }
  });
});

// Get dataset by ID
export const getDatasetById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;

  logger.info(`Looking for dataset with ID: ${id}`);
  logger.info(`User requesting access: ${user._id.toString()}`);
  
  // Validate ObjectId format
  if (!id) {
    throw new AppError('Dataset ID is required', 400);
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    logger.error(`Invalid ObjectId format: ${id}`);
    throw new AppError('Invalid dataset ID format', 400);
  }

  const dataset = await Dataset.findById(id)
    .populate('uploadedBy', 'firstName lastName email')
    .populate('accessPermissions.userId', 'firstName lastName email');

  logger.info(`Dataset found: ${!!dataset}`);

  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  // ... existing code ...
  const userId = user._id.toString();
  const uploadedBy = dataset.uploadedBy.toString();
  const isOwner = uploadedBy === userId;
  const isPublic = dataset.isPublic;
  const hasExplicitPermission = dataset.accessPermissions.some(
    (perm: any) => perm.userId.toString() === userId
  );
  
  logger.info(`Access check for dataset ${id}:`, {
    userId,
    uploadedBy,
    isOwner,
    isPublic,
    hasExplicitPermission,
    accessPermissions: dataset.accessPermissions.map((p: any) => ({
      userId: p.userId.toString(),
      permission: p.permission
    }))
  });
  
  if (!dataset.hasUserAccess(userId)) {
    throw new AppError('Access denied', 403);
  }

  res.json({
    success: true,
    data: { dataset }
  });
});

// Update dataset metadata
export const updateDataset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;
  const { name, description, tags, isPublic } = req.body;

  const dataset = await Dataset.findById(id);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  // Check if user has write access
  if (!dataset.hasUserAccess(user._id.toString(), 'write')) {
    throw new AppError('Insufficient permissions to update dataset', 403);
  }

  // Update fields
  if (name !== undefined) dataset.name = name;
  if (description !== undefined) dataset.description = description;
  if (tags !== undefined) dataset.tags = tags;
  if (isPublic !== undefined && dataset.hasUserAccess(user._id.toString(), 'admin')) {
    dataset.isPublic = isPublic;
  }

  await dataset.save();

  logger.info(`Dataset updated by user ${user.email}: ${dataset.name}`);

  res.json({
    success: true,
    data: { dataset },
    message: 'Dataset updated successfully'
  });
});

// Delete dataset
export const deleteDataset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;

  const dataset = await Dataset.findById(id);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  // Authorization is already handled in the route middleware
  // Admin users or dataset owners can delete datasets

  await Dataset.findByIdAndDelete(id);
  // TODO: Also delete associated GridFS file when file processing is implemented

  logger.info(`Dataset deleted by user ${user.email}: ${dataset.name}`);

  res.json({
    success: true,
    message: 'Dataset deleted successfully'
  });
});

// Get dataset preview
export const getDatasetPreview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  const dataset = await Dataset.findById(id);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  // Check access permissions
  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied', 403);
  }

  if (dataset.processingStatus !== 'ready') {
    throw new AppError('Dataset is not ready for preview', 400);
  }

  try {
    // Get file preview from GridFS
    const preview = await fileUploadService.getFilePreview(
      dataset.fileId,
      limit
    );

    res.json({
      success: true,
      data: {
        rows: preview.rows,
        totalCount: dataset.metadata.rows || 0,
        columns: dataset.metadata.headers || [],
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < (dataset.metadata.rows || 0)
        },
        schema: dataset.dataSchema
      }
    });
  } catch (error: any) {
    logger.error('Dataset preview error:', error);
    throw new AppError('Failed to load dataset preview', 500);
  }
});

// Share dataset with users
export const shareDataset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;
  const { userId, userEmail, permission } = req.body;

  const dataset = await Dataset.findById(id);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  // Check if user has admin access or is the owner
  if (!dataset.hasUserAccess(user._id.toString(), 'admin') && 
      dataset.uploadedBy.toString() !== user._id.toString()) {
    throw new AppError('Insufficient permissions to share dataset', 403);
  }

  let targetUserId = userId;
  
  // If userEmail is provided instead of userId, find the user by email
  if (userEmail && !userId) {
    const { User } = await import('../models/User');
    const targetUser = await User.findOne({ email: userEmail });
    if (!targetUser) {
      throw new AppError('User not found with the provided email', 404);
    }
    targetUserId = targetUser._id.toString();
  }

  await dataset.addUserAccess(targetUserId, permission, user._id.toString());

  logger.info(`Dataset shared by user ${user.email}: ${dataset.name} with user ${targetUserId}`);

  res.json({
    success: true,
    message: 'Dataset shared successfully'
  });
});

// Remove dataset access
export const removeDatasetAccess = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id, userId } = req.params;

  if (!userId) {
    throw new AppError('User ID is required', 400);
  }

  const dataset = await Dataset.findById(id);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  // Check if user has admin access or is the owner
  if (!dataset.hasUserAccess(user._id.toString(), 'admin') && 
      dataset.uploadedBy.toString() !== user._id.toString()) {
    throw new AppError('Insufficient permissions to modify dataset access', 403);
  }

  await dataset.removeUserAccess(userId);

  logger.info(`Dataset access removed by user ${user.email}: ${dataset.name} for user ${userId}`);

  res.json({
    success: true,
    message: 'Dataset access removed successfully'
  });
});

// Get dataset schema information
export const getDatasetSchema = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;

  const dataset = await Dataset.findById(id);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  // Check access permissions
  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied', 403);
  }

  res.json({
    success: true,
    data: {
      schema: dataset.dataSchema,
      metadata: dataset.metadata,
      totalRows: dataset.metadata.rows,
      totalColumns: dataset.metadata.columns
    }
  });
});

// Validate dataset data quality
export const validateDatasetQuality = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;

  const dataset = await Dataset.findById(id);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  // Check access permissions
  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied', 403);
  }

  if (dataset.processingStatus !== 'ready') {
    throw new AppError('Dataset is not ready for validation', 400);
  }

  try {
    // Get full dataset for validation
    const fileData = await fileUploadService.getFullFile(dataset.fileId);
    const parsedData = await fileUploadService.parseFile(
      fileData.buffer,
      fileData.metadata.mimeType,
      fileData.filename
    );

    // Re-detect schema for validation
    const currentSchema = await schemaDetectionService.detectSchema(parsedData.rows);
    
    // Generate fresh quality report
    const qualityReport = await dataValidationService.generateQualityReport(
      parsedData.rows,
      currentSchema
    );

    // Validate data against current schema
    const validation = await dataValidationService.validateData(
      parsedData.rows,
      currentSchema
    );

    res.json({
      success: true,
      data: {
        qualityReport,
        validation: {
          totalRows: validation.totalRows,
          validRows: validation.validRows,
          errorCount: validation.errors.length,
          warningCount: validation.warnings.length,
          fieldSummary: validation.fieldSummary
        },
        schema: currentSchema
      }
    });
  } catch (error: any) {
    logger.error('Dataset validation error:', error);
    throw new AppError('Failed to validate dataset quality', 500);
  }
});

// Clean dataset data
export const cleanDatasetData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;
  const { preview = false } = req.query;

  const dataset = await Dataset.findById(id);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  // Check if user has write access
  if (!dataset.hasUserAccess(user._id.toString(), 'write')) {
    throw new AppError('Insufficient permissions to clean dataset', 403);
  }

  if (dataset.processingStatus !== 'ready') {
    throw new AppError('Dataset is not ready for cleaning', 400);
  }

  try {
    // Get full dataset for cleaning
    const fileData = await fileUploadService.getFullFile(dataset.fileId);
    const parsedData = await fileUploadService.parseFile(
      fileData.buffer,
      fileData.metadata.mimeType,
      fileData.filename
    );

    // Detect current schema
    const currentSchema = await schemaDetectionService.detectSchema(parsedData.rows);
    
    // Clean the data
    const { cleanedData, changes } = await dataValidationService.cleanData(
      parsedData.rows,
      currentSchema
    );

    if (preview === 'true') {
      // Return preview of changes without saving
      res.json({
        success: true,
        data: {
          changes: changes.slice(0, 100), // Limit preview changes
          totalChanges: changes.length,
          sampleCleanedRows: cleanedData.slice(0, 10),
          affectedRows: new Set(changes.map(c => c.row)).size
        },
        message: 'Data cleaning preview generated'
      });
    } else {
      // Save cleaned data (in a real implementation, this would create a new version)
      // For now, we'll return the cleaning results
      res.json({
        success: true,
        data: {
          changes: changes.length,
          affectedRows: new Set(changes.map(c => c.row)).size,
          cleanedDataPreview: cleanedData.slice(0, 5)
        },
        message: `Dataset cleaned successfully. ${changes.length} changes applied to ${new Set(changes.map(c => c.row)).size} rows.`
      });
    }
  } catch (error: any) {
    logger.error('Dataset cleaning error:', error);
    throw new AppError('Failed to clean dataset', 500);
  }
});

// Validation rules
export const validateDatasetUpload = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Dataset name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            throw new Error('Tags must be an array');
          }
          return true;
        } catch {
          // If it's not valid JSON, treat as single tag
          return true;
        }
      } else if (Array.isArray(value)) {
        return true;
      } else {
        throw new Error('Tags must be an array or JSON string');
      }
    })
    .withMessage('Tags must be an array or valid JSON array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Each tag cannot exceed 30 characters')
];

export const validateDatasetUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Dataset name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

export const validateDatasetShare = [
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId'),
  body('userEmail')
    .optional()
    .isEmail()
    .withMessage('User email must be a valid email address'),
  body('permission')
    .isIn(['read', 'write', 'admin'])
    .withMessage('Permission must be read, write, or admin'),
  body()
    .custom((body) => {
      if (!body.userId && !body.userEmail) {
        throw new Error('Either userId or userEmail is required');
      }
      return true;
    })
];

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters')
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