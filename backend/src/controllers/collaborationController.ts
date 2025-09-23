import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Collaboration, ICollaboration } from '../models/Collaboration';
import { Dataset } from '../models/Dataset';
import { AnalysisSession } from '../models/AnalysisSession';
import { IUser } from '../models/User';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';

// Share a resource (dataset, analysis, dashboard)
export const shareResource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { resourceType, resourceId, participants, permissions, settings } = req.body;

  // Validate resource exists and user has access
  let resource: any;
  switch (resourceType) {
    case 'dataset':
      resource = await Dataset.findById(resourceId);
      if (!resource || !resource.hasUserAccess(user._id.toString(), 'admin')) {
        throw new AppError('Dataset not found or insufficient permissions', 403);
      }
      break;
    case 'analysis':
      resource = await AnalysisSession.findById(resourceId);
      if (!resource || (!resource.hasAccess(user._id.toString()) && resource.userId.toString() !== user._id.toString())) {
        throw new AppError('Analysis session not found or insufficient permissions', 403);
      }
      break;
    default:
      throw new AppError('Invalid resource type', 400);
  }

  // Check if collaboration already exists
  let collaboration = await Collaboration.findOne({ resourceType, resourceId });
  
  if (collaboration) {
    // Update existing collaboration
    for (const participant of participants) {
      await collaboration.addParticipant(participant.userId, participant.permissions || ['read']);
    }
  } else {
    // Create new collaboration
    collaboration = new Collaboration({
      resourceType,
      resourceId: new mongoose.Types.ObjectId(resourceId),
      ownerId: user._id,
      participants: participants.map((p: any) => ({
        userId: new mongoose.Types.ObjectId(p.userId),
        permissions: p.permissions || ['read'],
        joinedAt: new Date(),
        lastActivity: new Date(),
        status: 'active'
      })),
      comments: [],
      annotations: [],
      settings: {
        allowComments: settings?.allowComments !== false,
        allowAnnotations: settings?.allowAnnotations !== false,
        allowEditing: settings?.allowEditing || false,
        requireApproval: settings?.requireApproval || false,
        isPublic: settings?.isPublic || false,
        expiresAt: settings?.expiresAt ? new Date(settings.expiresAt) : undefined
      },
      version: 1
    });

    await collaboration.save();
  }

  logger.info(`Resource shared by user ${user.email}: ${resourceType} ${resourceId}`);

  res.status(201).json({
    success: true,
    data: { collaboration },
    message: 'Resource shared successfully'
  });
});

// Get collaboration details
export const getCollaboration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;

  const collaboration = await Collaboration.findById(id)
    .populate('ownerId', 'firstName lastName email')
    .populate('participants.userId', 'firstName lastName email')
    .populate('comments.userId', 'firstName lastName email')
    .populate('annotations.userId', 'firstName lastName email');

  if (!collaboration) {
    throw new AppError('Collaboration not found', 404);
  }

  // Check if user has access
  const hasAccess = collaboration.ownerId._id.equals(user._id) ||
                   collaboration.participants.some(p => p.userId._id.equals(user._id)) ||
                   collaboration.settings.isPublic;

  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  // Check if collaboration is still active
  if (!collaboration.isActive()) {
    throw new AppError('Collaboration has expired', 410);
  }

  res.json({
    success: true,
    data: { collaboration }
  });
});

// Add comment to collaboration
export const addComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;
  const { content, threadId, mentions } = req.body;

  const collaboration = await Collaboration.findById(id);
  if (!collaboration) {
    throw new AppError('Collaboration not found', 404);
  }

  // Check permissions
  if (!collaboration.hasPermission(user._id.toString(), 'comment')) {
    throw new AppError('Insufficient permissions to comment', 403);
  }

  if (!collaboration.settings.allowComments) {
    throw new AppError('Comments are not allowed for this collaboration', 403);
  }

  if (!collaboration.isActive()) {
    throw new AppError('Collaboration has expired', 410);
  }

  const comment = await collaboration.addComment(
    user._id.toString(),
    content,
    threadId,
    mentions
  );

  // Emit real-time update
  if (global.socketService && id) {
    global.socketService.notifyResourceUpdate(resourceId, resourceType, {
      type: 'comment_added',
      comment,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  }

  logger.info(`Comment added by user ${user.email} to collaboration ${id}`);

  res.status(201).json({
    success: true,
    data: { comment },
    message: 'Comment added successfully'
  });
});

// Add annotation to collaboration
export const addAnnotation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;
  const { chartId, position, content, type } = req.body;

  const collaboration = await Collaboration.findById(id);
  if (!collaboration) {
    throw new AppError('Collaboration not found', 404);
  }

  // Check permissions
  if (!collaboration.hasPermission(user._id.toString(), 'annotate')) {
    throw new AppError('Insufficient permissions to annotate', 403);
  }

  if (!collaboration.settings.allowAnnotations) {
    throw new AppError('Annotations are not allowed for this collaboration', 403);
  }

  if (!collaboration.isActive()) {
    throw new AppError('Collaboration has expired', 410);
  }

  const annotation = await collaboration.addAnnotation(user._id.toString(), {
    chartId,
    position,
    content,
    type: type || 'note',
    status: 'active',
    replies: []
  });

  // Emit real-time update
  if (global.socketService && id) {
    global.socketService.notifyResourceUpdate(collaboration.resourceId.toString(), collaboration.resourceType, {
      type: 'annotation_added',
      annotation,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  }

  logger.info(`Annotation added by user ${user.email} to collaboration ${id}`);

  res.status(201).json({
    success: true,
    data: { annotation },
    message: 'Annotation added successfully'
  });
});

// Update collaboration settings
export const updateCollaboration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;
  const { settings, participants } = req.body;

  const collaboration = await Collaboration.findById(id);
  if (!collaboration) {
    throw new AppError('Collaboration not found', 404);
  }

  // Check if user is owner or has admin permissions
  if (!collaboration.ownerId.equals(user._id) && !collaboration.hasPermission(user._id.toString(), 'admin')) {
    throw new AppError('Insufficient permissions to update collaboration', 403);
  }

  // Update settings
  if (settings) {
    collaboration.settings = { ...collaboration.settings, ...settings };
  }

  // Update participants
  if (participants) {
    for (const participant of participants) {
      if (participant.action === 'add') {
        await collaboration.addParticipant(participant.userId, participant.permissions);
      } else if (participant.action === 'remove') {
        await collaboration.removeParticipant(participant.userId);
      } else if (participant.action === 'update') {
        await collaboration.updateParticipantPermissions(participant.userId, participant.permissions);
      }
    }
  }

  await collaboration.save();

  logger.info(`Collaboration updated by user ${user.email}: ${id}`);

  res.json({
    success: true,
    data: { collaboration },
    message: 'Collaboration updated successfully'
  });
});

// End collaboration
export const endCollaboration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { id } = req.params;

  const collaboration = await Collaboration.findById(id);
  if (!collaboration) {
    throw new AppError('Collaboration not found', 404);
  }

  // Check if user is owner
  if (!collaboration.ownerId.equals(user._id)) {
    throw new AppError('Only the owner can end the collaboration', 403);
  }

  // Set expiration to now
  collaboration.settings.expiresAt = new Date();
  collaboration.settings.allowComments = false;
  collaboration.settings.allowAnnotations = false;
  collaboration.settings.allowEditing = false;

  await collaboration.save();

  // Emit real-time update
  if (global.socketService && id) {
    global.socketService.notifyResourceUpdate(collaboration.resourceId.toString(), collaboration.resourceType, {
      type: 'collaboration_ended',
      message: 'Collaboration has been ended by the owner'
    });
  }

  logger.info(`Collaboration ended by user ${user.email}: ${id}`);

  res.json({
    success: true,
    message: 'Collaboration ended successfully'
  });
});

// Get user's collaborations
export const getUserCollaborations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const type = req.query.type as string;

  const skip = (page - 1) * limit;

  let query: any = {
    $or: [
      { ownerId: user._id },
      { 'participants.userId': user._id }
    ]
  };

  if (type) {
    query.resourceType = type;
  }

  const [collaborations, total] = await Promise.all([
    Collaboration.find(query)
      .populate('ownerId', 'firstName lastName email')
      .populate('resourceId')
      .sort({ lastModified: -1 })
      .skip(skip)
      .limit(limit),
    Collaboration.countDocuments(query)
  ]);

  const pages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      collaborations,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    }
  });
});

// Get public collaborations
export const getPublicCollaborations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const skip = (page - 1) * limit;

  const [collaborations, total] = await Promise.all([
    Collaboration.find({ 'settings.isPublic': true })
      .populate('ownerId', 'firstName lastName email')
      .populate('resourceId')
      .sort({ lastModified: -1 })
      .skip(skip)
      .limit(limit),
    Collaboration.countDocuments({ 'settings.isPublic': true })
  ]);

  const pages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      collaborations,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    }
  });
});

// Get active room participants
export const getRoomParticipants = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { roomId } = req.params;
  
  if (!global.socketService) {
    throw new AppError('Real-time service not available', 503);
  }

  const participants = global.socketService.getRoomParticipants(roomId);
  
  res.json({
    success: true,
    data: { participants }
  });
});

// Update user permissions in real-time
export const updateUserPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { collaborationId, userId, permissions } = req.body;

  const collaboration = await Collaboration.findById(collaborationId);
  if (!collaboration) {
    throw new AppError('Collaboration not found', 404);
  }

  // Check if user is owner or has admin permissions
  if (!collaboration.ownerId.equals(user._id) && !collaboration.hasPermission(user._id.toString(), 'admin')) {
    throw new AppError('Insufficient permissions to update user permissions', 403);
  }

  // Update permissions in collaboration
  await collaboration.updateParticipantPermissions(userId, permissions);
  await collaboration.save();

  // Notify via WebSocket
  if (global.socketService) {
    global.socketService.notifyUserPermissionChange(
      userId,
      collaboration.resourceId.toString(),
      collaboration.resourceType,
      permissions
    );
  }

  logger.info(`User permissions updated by ${user.email} for user ${userId} in collaboration ${collaborationId}`);

  res.json({
    success: true,
    message: 'User permissions updated successfully'
  });
});

// Get real-time collaboration status
export const getCollaborationStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { resourceType, resourceId } = req.params;
  
  if (!global.socketService) {
    throw new AppError('Real-time service not available', 503);
  }

  const roomId = `${resourceType}-${resourceId}`;
  const participants = global.socketService.getRoomParticipants(roomId);
  const activeRooms = global.socketService.getActiveRooms();
  
  res.json({
    success: true,
    data: {
      roomId,
      participants,
      isActive: activeRooms.includes(roomId),
      participantCount: participants.length
    }
  });
});

// Kick user from collaboration
export const kickUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { collaborationId, userId } = req.body;

  const collaboration = await Collaboration.findById(collaborationId);
  if (!collaboration) {
    throw new AppError('Collaboration not found', 404);
  }

  // Check if user is owner or has admin permissions
  if (!collaboration.ownerId.equals(user._id) && !collaboration.hasPermission(user._id.toString(), 'admin')) {
    throw new AppError('Insufficient permissions to kick users', 403);
  }

  // Remove participant from collaboration
  await collaboration.removeParticipant(userId);
  await collaboration.save();

  // Notify via WebSocket
  if (global.socketService) {
    const roomId = `${collaboration.resourceType}-${collaboration.resourceId}`;
    global.socketService.notifyResourceUpdate(collaboration.resourceId.toString(), collaboration.resourceType, {
      type: 'user_kicked',
      userId,
      message: 'You have been removed from this collaboration'
    });
  }

  logger.info(`User ${userId} kicked from collaboration ${collaborationId} by ${user.email}`);

  res.json({
    success: true,
    message: 'User removed from collaboration successfully'
  });
});

// Send real-time notification to collaboration
export const sendNotification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { collaborationId, message, type, targetUsers } = req.body;

  const collaboration = await Collaboration.findById(collaborationId);
  if (!collaboration) {
    throw new AppError('Collaboration not found', 404);
  }

  // Check if user has permission to send notifications
  if (!collaboration.hasPermission(user._id.toString(), 'comment')) {
    throw new AppError('Insufficient permissions to send notifications', 403);
  }

  // Send notification via WebSocket
  if (global.socketService) {
    global.socketService.notifyResourceUpdate(collaboration.resourceId.toString(), collaboration.resourceType, {
      type: 'notification',
      notificationType: type || 'info',
      message,
      sender: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName
      },
      targetUsers,
      timestamp: new Date()
    });
  }

  logger.info(`Notification sent by ${user.email} to collaboration ${collaborationId}`);

  res.json({
    success: true,
    message: 'Notification sent successfully'
  });
});

// Validation rules
export const validateShareResource = [
  body('resourceType')
    .isIn(['dataset', 'analysis', 'dashboard'])
    .withMessage('Resource type must be dataset, analysis, or dashboard'),
  body('resourceId')
    .isMongoId()
    .withMessage('Valid resource ID is required'),
  body('participants')
    .isArray({ min: 1 })
    .withMessage('At least one participant is required'),
  body('participants.*.userId')
    .isMongoId()
    .withMessage('Valid participant user ID is required'),
  body('participants.*.permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
];

export const validateAddComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment content must be between 1 and 2000 characters'),
  body('threadId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Thread ID cannot exceed 50 characters'),
  body('mentions')
    .optional()
    .isArray()
    .withMessage('Mentions must be an array')
];

export const validateAddAnnotation = [
  body('chartId')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Chart ID is required and cannot exceed 100 characters'),
  body('position.x')
    .isNumeric()
    .withMessage('X position must be a number'),
  body('position.y')
    .isNumeric()
    .withMessage('Y position must be a number'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Annotation content must be between 1 and 1000 characters'),
  body('type')
    .optional()
    .isIn(['note', 'highlight', 'question', 'suggestion'])
    .withMessage('Annotation type must be note, highlight, question, or suggestion')
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