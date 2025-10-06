import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireRole } from '../middleware/rbac';
import {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  createTestNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  getServiceStatus,
  triggerAnomalyDetection,
  getDatasetAnomalies,
  addMonitoringRule,
  getMonitoringRules,
  deleteNotification,
  getNotificationStats,
  testWebPush,
  subscribeToPush,
  unsubscribeFromPush,
  getPushStatus,
  sendTestPushToUser,
  getVapidPublicKey,
  validateCreateTestNotification,
  validateUpdatePreferences,
  validateAddMonitoringRule
} from '../controllers/notificationController';

const router = Router();

// Apply authentication to all notification routes
router.use(authenticate);

// Web Push Notification routes
router.post('/test-webpush', testWebPush);
router.post('/push/subscribe', subscribeToPush);
router.delete('/push/unsubscribe', unsubscribeFromPush);
router.get('/push/status', getPushStatus);
router.post('/push/send-test/:userId', requireRole('admin'), sendTestPushToUser);
router.get('/push/vapid-key', getVapidPublicKey);

// Notification CRUD operations
router.get('/', getNotifications);
router.get('/stats', getNotificationStats);
router.get('/status', getServiceStatus);
router.get('/service-status', getServiceStatus); // Alternative route for tests
router.get('/preferences', getNotificationPreferences);
router.put('/preferences', validateUpdatePreferences, updateNotificationPreferences);
router.post('/test', validateCreateTestNotification, createTestNotification);
router.put('/mark-all-read', markAllAsRead);
router.post('/read-all', markAllAsRead); // Alternative POST route for tests

// Individual notification operations
router.get('/:notificationId', getNotificationById);
router.put('/:notificationId/read', markAsRead);
router.post('/:notificationId/read', markAsRead); // Alternative POST route for tests
router.delete('/:notificationId', deleteNotification);

// Anomaly detection routes
router.post('/anomalies/datasets/:datasetId/detect', 
  requirePermission('datasets:read'), 
  triggerAnomalyDetection
);

router.get('/anomalies/datasets/:datasetId', 
  requirePermission('datasets:read'), 
  getDatasetAnomalies
);

// Alternative routes for tests
router.post('/anomaly-detection/:datasetId', 
  requirePermission('datasets:read'), 
  triggerAnomalyDetection
);

router.get('/anomalies/:datasetId', 
  requirePermission('datasets:read'), 
  getDatasetAnomalies
);

// Monitoring rules routes
router.post('/monitoring/datasets/:datasetId/rules', 
  requirePermission('datasets:update'), 
  validateAddMonitoringRule,
  addMonitoringRule
);

router.get('/monitoring/datasets/:datasetId/rules', 
  requirePermission('datasets:read'), 
  getMonitoringRules
);

// Alternative routes for tests
router.post('/monitoring-rules/:datasetId', 
  requirePermission('datasets:update'), 
  validateAddMonitoringRule,
  addMonitoringRule
);

router.get('/monitoring-rules/:datasetId', 
  requirePermission('datasets:read'), 
  getMonitoringRules
);

export default router;