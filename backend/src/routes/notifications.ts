import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
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
  validateCreateTestNotification,
  validateUpdatePreferences,
  validateAddMonitoringRule
} from '../controllers/notificationController';

const router = Router();

// Apply authentication to all notification routes
router.use(authenticate);

// Notification CRUD operations
router.get('/', getNotifications);
router.get('/stats', getNotificationStats);
router.get('/status', getServiceStatus);
router.get('/preferences', getNotificationPreferences);
router.put('/preferences', validateUpdatePreferences, updateNotificationPreferences);
router.post('/test', validateCreateTestNotification, createTestNotification);
router.put('/mark-all-read', markAllAsRead);

// Individual notification operations
router.get('/:notificationId', getNotificationById);
router.put('/:notificationId/read', markAsRead);
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

export default router;