import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { notificationService } from '../services/notificationService';
import { anomalyDetectionService } from '../services/anomalyDetectionService';
import { User, IUser } from '../models/User';
import { Dataset } from '../models/Dataset';
import { Notification } from '../models/Notification';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';

// Get user notifications
export const getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const unreadOnly = req.query.unreadOnly === 'true';
  const type = req.query.type as string;

  const result = await notificationService.getUserNotifications(user._id.toString(), {
    page,
    limit,
    unreadOnly,
    type
  });

  const pages = Math.ceil(result.total / limit);

  res.json({
    success: true,
    data: {
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      pagination: {
        page,
        limit,
        total: result.total,
        pages
      }
    }
  });
});

// Get notification by ID
export const getNotificationById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { notificationId } = req.params;

  const notification = await Notification.findOne({
    _id: notificationId,
    userId: user._id
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  res.json({
    success: true,
    data: { notification }
  });
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { notificationId } = req.params;

  if (!notificationId) {
    throw new AppError('Notification ID is required', 400);
  }

  await notificationService.markAsRead(notificationId, user._id.toString());

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;

  await notificationService.markAllAsReadForUser(user._id.toString());

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// Create a test notification
export const createTestNotification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { type, title, message, priority, channels } = req.body;

  const notification = await notificationService.createNotification({
    userId: user._id.toString(),
    type: type || 'system_alert',
    title: title || 'Test Notification',
    message: message || 'This is a test notification from ClarifAI.',
    priority: priority || 'normal',
    channels: channels || ['inApp'],
    metadata: {
      actionUrl: '/dashboard',
      relatedData: { test: true }
    }
  });

  res.json({
    success: true,
    data: { notification },
    message: 'Test notification created successfully'
  });
});

// Get notification preferences
export const getNotificationPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;

  const preferences = user.preferences?.notifications || {
    email: true,
    push: true,
    inApp: true,
    anomalyDetection: true,
    dataChanges: true,
    collaborationUpdates: true,
    systemAlerts: true,
    frequency: 'instant'
  };

  res.json({
    success: true,
    data: { preferences }
  });
});

// Update notification preferences
export const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const preferences = req.body;

  // Update user preferences
  if (!user.preferences) {
    user.preferences = {};
  }
  user.preferences.notifications = {
    ...user.preferences.notifications,
    ...preferences
  };

  await user.save();

  res.json({
    success: true,
    data: { preferences: user.preferences.notifications },
    message: 'Notification preferences updated successfully'
  });
});

// Get notification service status
export const getServiceStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const notificationStatus = notificationService.getServiceStatus();
  const anomalyStatus = anomalyDetectionService.getServiceStatus();

  res.json({
    success: true,
    data: {
      notificationService: notificationStatus,
      anomalyDetection: anomalyStatus,
      timestamp: new Date().toISOString()
    }
  });
});

// Trigger anomaly detection for a dataset
export const triggerAnomalyDetection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { datasetId } = req.params;

  if (!datasetId) {
    throw new AppError('Dataset ID is required', 400);
  }

  // Verify dataset access
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied to dataset', 403);
  }

  // Run anomaly detection
  const anomalies = await anomalyDetectionService.analyzeDatasetAnomalies(datasetId, user._id.toString());

  // Create notification if anomalies found
  if (anomalies.length > 0) {
    const criticalCount = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').length;
    
    if (criticalCount > 0) {
      await notificationService.createNotification({
        userId: user._id.toString(),
        type: 'anomaly_detected',
        title: `Anomalies Detected in ${dataset.name}`,
        message: `Found ${anomalies.length} anomalies (${criticalCount} critical) in your dataset.`,
        metadata: {
          datasetId: dataset._id,
          severity: 'high',
          actionUrl: `/datasets/${dataset._id}/anomalies`,
          relatedData: {
            datasetName: dataset.name,
            anomalyCount: anomalies.length,
            criticalCount
          }
        },
        priority: criticalCount > 0 ? 'high' : 'normal',
        channels: ['inApp', 'email']
      });
    }
  }

  res.json({
    success: true,
    data: {
      anomalies,
      summary: {
        total: anomalies.length,
        critical: anomalies.filter(a => a.severity === 'critical').length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length
      }
    },
    message: 'Anomaly detection completed'
  });
});

// Get anomaly detection results for a dataset
export const getDatasetAnomalies = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { datasetId } = req.params;

  if (!datasetId) {
    throw new AppError('Dataset ID is required', 400);
  }

  // Verify dataset access
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied to dataset', 403);
  }

  // Get cached anomaly results (in a real implementation, you might store these in the database)
  const anomalies = await anomalyDetectionService.analyzeDatasetAnomalies(datasetId, user._id.toString());

  res.json({
    success: true,
    data: {
      datasetId,
      datasetName: dataset.name,
      anomalies,
      summary: {
        total: anomalies.length,
        critical: anomalies.filter(a => a.severity === 'critical').length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length
      },
      analyzedAt: new Date().toISOString()
    }
  });
});

// Add monitoring rule for dataset
export const addMonitoringRule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { datasetId } = req.params;
  const { name, type, config } = req.body;

  if (!datasetId) {
    throw new AppError('Dataset ID is required', 400);
  }

  // Verify dataset access
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  if (!dataset.hasUserAccess(user._id.toString(), 'write')) {
    throw new AppError('Write access required to add monitoring rules', 403);
  }

  const rule = await anomalyDetectionService.addMonitoringRule(datasetId, {
    name,
    type,
    config,
    isActive: true
  });

  res.json({
    success: true,
    data: { rule },
    message: 'Monitoring rule added successfully'
  });
});

// Get monitoring rules for dataset
export const getMonitoringRules = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { datasetId } = req.params;

  if (!datasetId) {
    throw new AppError('Dataset ID is required', 400);
  }

  // Verify dataset access
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  if (!dataset.hasUserAccess(user._id.toString())) {
    throw new AppError('Access denied to dataset', 403);
  }

  const rules = anomalyDetectionService.getMonitoringRules(datasetId);

  res.json({
    success: true,
    data: { rules }
  });
});

// Delete notification
export const deleteNotification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    userId: user._id
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
});

// Get notification statistics
export const getNotificationStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const timeRange = req.query.timeRange as string || '7d'; // 1d, 7d, 30d

  let startDate: Date;
  switch (timeRange) {
    case '1d':
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    default: // 7d
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }

  const [total, unread, byType, recent] = await Promise.all([
    Notification.countDocuments({ userId: user._id }),
    Notification.countDocuments({ userId: user._id, 'channels.inApp.read': false }),
    Notification.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    Notification.find({
      userId: user._id,
      createdAt: { $gte: startDate }
    }).countDocuments()
  ]);

  const typeStats = byType.reduce((acc: any, item: any) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      total,
      unread,
      recent,
      byType: typeStats,
      timeRange,
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString()
      }
    }
  });
});

// Web Push Notification endpoints
export const testWebPush = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { title, message, url, icon, badge } = req.body;

  try {
    // Create a test web push notification
    const notificationData = {
      userId: user._id.toString(),
      type: 'system_alert' as const,
      title: title || 'Test Web Push',
      message: message || 'This is a test web push notification',
      metadata: {
        url: url || 'http://localhost:3000/dashboard',
        icon: icon || 'http://localhost:3000/icon.png',
        badge: badge || 'http://localhost:3000/badge.png'
      },
      channels: ['push', 'inApp'] as ('email' | 'push' | 'inApp')[]
    };

    const notification = await notificationService.createNotification(notificationData);

    res.json({
      success: true,
      message: 'Test web push notification sent successfully',
      data: { notification }
    });
  } catch (error) {
    logger.error('Test web push failed:', error);
    throw new AppError('Failed to send test web push notification', 500);
  }
});

export const subscribeToPush = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { subscription, userAgent } = req.body;

  if (!subscription || !subscription.endpoint) {
    throw new AppError('Valid push subscription is required', 400);
  }

  try {
    // Save subscription to user profile
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          'pushSubscription': {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            userAgent: userAgent,
            subscribedAt: new Date()
          }
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Successfully subscribed to push notifications',
      data: { subscription: updatedUser?.pushSubscription }
    });
  } catch (error) {
    logger.error('Push subscription failed:', error);
    throw new AppError('Failed to subscribe to push notifications', 500);
  }
});

export const unsubscribeFromPush = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  
  // endpoint is optional since we're removing the entire subscription
  const { endpoint } = req.body || {};

  try {
    // Remove subscription from user profile
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $unset: { pushSubscription: 1 }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
      data: {
        unsubscribed: true,
        endpoint: endpoint || null
      }
    });
  } catch (error) {
    logger.error('Push unsubscription failed:', error);
    throw new AppError('Failed to unsubscribe from push notifications', 500);
  }
});

export const getPushStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;

  try {
    const userWithSubscription = await User.findById(user._id).select('pushSubscription preferences');

    const hasSubscription = !!userWithSubscription?.pushSubscription;
    const pushEnabled = userWithSubscription?.preferences?.notifications?.push ?? true;

    res.json({
      success: true,
      data: {
        subscribed: hasSubscription,
        enabled: pushEnabled,
        subscription: hasSubscription ? {
          endpoint: userWithSubscription.pushSubscription?.endpoint,
          subscribedAt: userWithSubscription.pushSubscription?.subscribedAt
        } : null
      }
    });
  } catch (error) {
    logger.error('Failed to get push status:', error);
    throw new AppError('Failed to get push notification status', 500);
  }
});

export const sendTestPushToUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;
  const { userId } = req.params;
  
  // Safely destructure with default values in case req.body is undefined
  const { title, message, data } = req.body || {};

  // Check if user has admin permissions (basic check)
  if (user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  try {
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new AppError('Target user not found', 404);
    }

    const notificationData = {
      userId: targetUser._id.toString(),
      type: 'system_alert' as const,
      title: title || 'Admin Test Push',
      message: message || 'This is an admin test push notification',
      metadata: data || {},
      channels: ['push', 'inApp'] as ('email' | 'push' | 'inApp')[]
    };

    const notification = await notificationService.createNotification(notificationData);

    res.json({
      success: true,
      message: 'Test push notification sent to user successfully',
      data: { notification }
    });
  } catch (error) {
    logger.error('Admin test push failed:', error);
    throw new AppError('Failed to send test push notification', 500);
  }
});

export const getVapidPublicKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { env } = await import('../config/environment');
    
    if (!env.webPush?.publicKey) {
      throw new AppError('VAPID public key not configured', 500);
    }

    res.json({
      success: true,
      data: {
        publicKey: env.webPush.publicKey
      }
    });
  } catch (error) {
    logger.error('Failed to get VAPID public key:', error);
    throw new AppError('Failed to get VAPID public key', 500);
  }
});

// Validation middleware
export const validateCreateTestNotification = [
  body('title').optional().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('message').optional().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
  body('type').optional().isIn(['data_change', 'anomaly_detected', 'collaboration_update', 'system_alert', 'analysis_complete', 'prediction_ready', 'info']).withMessage('Invalid notification type'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
  body('channels').optional().isArray().withMessage('Channels must be an array'),
  (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed: ' + errors.array().map(e => e.msg).join(', '), 400);
    }
    next();
  }
];

export const validateUpdatePreferences = [
  body('email').optional().isBoolean().withMessage('Email preference must be boolean'),
  body('push').optional().isBoolean().withMessage('Push preference must be boolean'),
  body('inApp').optional().isBoolean().withMessage('InApp preference must be boolean'),
  body('anomalyDetection').optional().isBoolean().withMessage('Anomaly detection preference must be boolean'),
  body('dataChanges').optional().isBoolean().withMessage('Data changes preference must be boolean'),
  body('collaborationUpdates').optional().isBoolean().withMessage('Collaboration updates preference must be boolean'),
  body('systemAlerts').optional().isBoolean().withMessage('System alerts preference must be boolean'),
  body('frequency').optional().isIn(['instant', 'hourly', 'daily', 'weekly']).withMessage('Invalid frequency'),
  (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed: ' + errors.array().map(e => e.msg).join(', '), 400);
    }
    next();
  }
];

export const validateAddMonitoringRule = [
  body('name').notEmpty().isLength({ min: 1, max: 100 }).withMessage('Rule name is required and must be 1-100 characters'),
  body('type').notEmpty().isIn(['threshold', 'pattern', 'statistical', 'ai_based']).withMessage('Invalid rule type'),
  body('config').isObject().withMessage('Config must be an object'),
  (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed: ' + errors.array().map(e => e.msg).join(', '), 400);
    }
    next();
  }
];