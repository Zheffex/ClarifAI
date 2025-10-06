import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/index';
import { User } from '../../src/models/User';
import { Dataset } from '../../src/models/Dataset';
import { Notification } from '../../src/models/Notification';
import { notificationService } from '../../src/services/notificationService';
import { anomalyDetectionService } from '../../src/services/anomalyDetectionService';

// Mock the services
jest.mock('../../src/services/notificationService');
jest.mock('../../src/services/anomalyDetectionService');

const mockedNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockedAnomalyDetectionService = anomalyDetectionService as jest.Mocked<typeof anomalyDetectionService>;

describe('Notification Controller', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testUser: any;
  let testDataset: any;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Cleanup
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean database before each test
    await User.deleteMany({});
    await Dataset.deleteMany({});
    await Notification.deleteMany({});

    // Create test user directly (bypassing email verification for testing)
    testUser = await User.create({
      email: 'test@example.com',
      passwordHash: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'analyst',
      isEmailVerified: true,
      isActive: true
    });

    // Generate token manually for testing
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET || 'test-secret');

    // Create test dataset
    testDataset = await Dataset.create({
      name: 'Test Dataset',
      description: 'A test dataset for notifications',
      fileId: new mongoose.Types.ObjectId(),
      uploadedBy: testUser._id,
      organizationId: new mongoose.Types.ObjectId(),
      dataSchema: [],
      metadata: {
        size: 1024,
        type: 'csv',
        rows: 100,
        columns: 5,
        headers: ['id', 'name', 'value', 'category', 'date']
      },
      processingStatus: 'ready',
      tags: ['test'],
      isPublic: false,
      accessPermissions: []
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('should get user notifications', async () => {
      const mockNotifications = [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: testUser._id,
          type: 'data_change' as const,
          title: 'Data Updated',
          message: 'Your dataset has been updated',
          metadata: {
            severity: 'low' as const
          },
          priority: 'normal' as const,
          status: 'sent' as const,
          channels: {
            email: { sent: false },
            push: { sent: false },
            inApp: { sent: true, read: false }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          markAsRead: jest.fn(),
          markChannelAsSent: jest.fn(),
          markChannelAsFailed: jest.fn(),
          isExpired: jest.fn().mockReturnValue(false),
          canSendToChannel: jest.fn().mockReturnValue(true)
        }
      ];

      mockedNotificationService.getUserNotifications.mockResolvedValue({
        notifications: mockNotifications as any,
        total: 1,
        unreadCount: 1
      });

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toHaveLength(1);
      expect(response.body.data.unreadCount).toBe(1);
      expect(mockedNotificationService.getUserNotifications).toHaveBeenCalledWith(
        testUser._id.toString(),
        expect.objectContaining({
          page: 1,
          limit: 20,
          unreadOnly: false
        })
      );
    });

    it('should filter by unread only', async () => {
      mockedNotificationService.getUserNotifications.mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0
      });

      const response = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedNotificationService.getUserNotifications).toHaveBeenCalledWith(
        testUser._id.toString(),
        expect.objectContaining({
          unreadOnly: true
        })
      );
    });

    it('should filter by notification type', async () => {
      mockedNotificationService.getUserNotifications.mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0
      });

      const response = await request(app)
        .get('/api/notifications?type=data_change')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedNotificationService.getUserNotifications).toHaveBeenCalledWith(
        testUser._id.toString(),
        expect.objectContaining({
          type: 'data_change'
        })
      );
    });

    it('should paginate notifications', async () => {
      mockedNotificationService.getUserNotifications.mockResolvedValue({
        notifications: [],
        total: 25,
        unreadCount: 5
      });

      const response = await request(app)
        .get('/api/notifications?page=2&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.total).toBe(25);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.pages).toBe(3);
    });
  });

  describe('GET /api/notifications/:notificationId', () => {
    it('should get notification by ID', async () => {
      const notification = await Notification.create({
        userId: testUser._id,
        type: 'data_change',
        title: 'Test Notification',
        message: 'This is a test notification',
        metadata: {},
        priority: 'normal',
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: true, read: false }
        }
      });

      const response = await request(app)
        .get(`/api/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notification._id).toBe(notification._id.toString());
    });

    it('should not get notification for different user', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hashed',
        firstName: 'Other',
        lastName: 'User',
        role: 'analyst',
        isActive: true
      });

      const notification = await Notification.create({
        userId: otherUser._id,
        type: 'data_change',
        title: 'Other User Notification',
        message: 'This is not for the test user',
        metadata: {},
        priority: 'normal',
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: true, read: false }
        }
      });

      const response = await request(app)
        .get(`/api/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/notifications/:notificationId/read', () => {
    it('should mark notification as read', async () => {
      mockedNotificationService.markAsRead.mockResolvedValue();

      const notificationId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedNotificationService.markAsRead).toHaveBeenCalledWith(
        notificationId.toString(),
        testUser._id.toString()
      );
    });

    it('should require notification ID', async () => {
      const response = await request(app)
        .post('/api/notifications//read')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      mockedNotificationService.markAllAsReadForUser.mockResolvedValue();

      const response = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedNotificationService.markAllAsReadForUser).toHaveBeenCalledWith(
        testUser._id.toString()
      );
    });
  });

  describe('POST /api/notifications/test', () => {
    it('should create test notification', async () => {
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        userId: testUser._id,
        type: 'system_alert' as const,
        title: 'Test Notification',
        message: 'This is a test notification',
        metadata: { test: true },
        priority: 'normal' as const,
        status: 'sent' as const,
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: true, read: false }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        markAsRead: jest.fn(),
        markChannelAsSent: jest.fn(),
        markChannelAsFailed: jest.fn(),
        isExpired: jest.fn().mockReturnValue(false),
        canSendToChannel: jest.fn().mockReturnValue(true)
      };

      mockedNotificationService.createNotification.mockResolvedValue(mockNotification as any);

      const testData = {
        type: 'system_alert',
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'normal',
        channels: ['inApp']
      };

      const response = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notification).toBeDefined();
      expect(mockedNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser._id.toString(),
          type: 'system_alert',
          title: 'Test Notification',
          message: 'This is a test notification',
          priority: 'normal',
          channels: ['inApp']
        })
      );
    });

    it('should use default values when not provided', async () => {
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        userId: testUser._id,
        type: 'system_alert' as const,
        title: 'Test Notification',
        message: 'This is a test notification from ClarifAI.',
        metadata: { test: true },
        priority: 'normal' as const,
        status: 'sent' as const,
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: true, read: false }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        markAsRead: jest.fn(),
        markChannelAsSent: jest.fn(),
        markChannelAsFailed: jest.fn(),
        isExpired: jest.fn().mockReturnValue(false),
        canSendToChannel: jest.fn().mockReturnValue(true)
      };

      mockedNotificationService.createNotification.mockResolvedValue(mockNotification as any);

      const response = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser._id.toString(),
          type: 'system_alert',
          title: 'Test Notification',
          message: 'This is a test notification from ClarifAI.',
          priority: 'normal',
          channels: ['inApp']
        })
      );
    });

    it('should validate notification type', async () => {
      const testData = {
        type: 'invalid_type',
        title: 'Test',
        message: 'Test message'
      };

      const response = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate priority', async () => {
      const testData = {
        title: 'Test',
        message: 'Test message',
        priority: 'invalid_priority'
      };

      const response = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/notifications/preferences', () => {
    it('should get notification preferences', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences).toBeDefined();
      expect(response.body.data.preferences.email).toBe(true);
      expect(response.body.data.preferences.push).toBe(true);
      expect(response.body.data.preferences.inApp).toBe(true);
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    it('should update notification preferences', async () => {
      const preferences = {
        email: false,
        push: true,
        inApp: true,
        anomalyDetection: false,
        dataChanges: true,
        collaborationUpdates: false,
        systemAlerts: true,
        frequency: 'daily'
      };

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferences)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences.email).toBe(false);
      expect(response.body.data.preferences.frequency).toBe('daily');
    });

    it('should validate frequency values', async () => {
      const preferences = {
        frequency: 'invalid_frequency'
      };

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferences)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate boolean preferences', async () => {
      const preferences = {
        email: 'not_a_boolean'
      };

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferences)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/notifications/service-status', () => {
    it('should get service status', async () => {
      mockedNotificationService.getServiceStatus.mockReturnValue({
        email: true,
        push: false,
        inApp: true
      });

      mockedAnomalyDetectionService.getServiceStatus.mockReturnValue({
        isRunning: true,
        rulesCount: 5
      });

      const response = await request(app)
        .get('/api/notifications/service-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notificationService.email).toBe(true);
      expect(response.body.data.notificationService.push).toBe(false);
      expect(response.body.data.anomalyDetection.isRunning).toBe(true);
      expect(response.body.data.timestamp).toBeDefined();
    });
  });

  describe('POST /api/notifications/anomaly-detection/:datasetId', () => {
    it('should trigger anomaly detection', async () => {
      const mockAnomalies = [
        {
          isAnomaly: true,
          confidence: 0.95,
          severity: 'high' as const,
          description: 'Unusual value detected',
          affectedRows: [1, 2, 3],
          affectedColumns: ['value'],
          suggestedActions: ['Review data quality', 'Check data source'],
          metadata: { type: 'outlier', value: 1000, expected: 100 }
        }
      ];

      mockedAnomalyDetectionService.analyzeDatasetAnomalies.mockResolvedValue(mockAnomalies);
      mockedNotificationService.createNotification.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        userId: testUser._id,
        type: 'anomaly_detected',
        title: 'Anomalies Detected',
        message: 'Found 1 anomalies in your dataset',
        metadata: {},
        priority: 'high',
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: true, read: false }
        },
        createdAt: new Date()
      } as any);

      const response = await request(app)
        .post(`/api/notifications/anomaly-detection/${testDataset._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.anomalies).toHaveLength(1);
      expect(response.body.data.summary.total).toBe(1);
      expect(response.body.data.summary.high).toBe(1);
      expect(mockedAnomalyDetectionService.analyzeDatasetAnomalies).toHaveBeenCalledWith(
        testDataset._id.toString(),
        testUser._id.toString()
      );
    });

    it('should create notification for critical anomalies', async () => {
      const mockAnomalies = [
        {
          isAnomaly: true,
          confidence: 0.99,
          severity: 'critical' as const,
          description: 'Critical anomaly detected',
          affectedRows: [1, 2, 3],
          affectedColumns: ['value'],
          suggestedActions: ['Immediate review required', 'Check data source'],
          metadata: { type: 'outlier', value: 1000, expected: 100 }
        }
      ];

      mockedAnomalyDetectionService.analyzeDatasetAnomalies.mockResolvedValue(mockAnomalies);
      mockedNotificationService.createNotification.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        userId: testUser._id,
        type: 'anomaly_detected',
        title: 'Critical Anomalies Detected',
        message: 'Found 1 critical anomalies in your dataset',
        metadata: {},
        priority: 'high',
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: true, read: false }
        },
        createdAt: new Date()
      } as any);

      await request(app)
        .post(`/api/notifications/anomaly-detection/${testDataset._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockedNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser._id.toString(),
          type: 'anomaly_detected',
          title: expect.stringContaining(testDataset.name),
          priority: 'high',
          channels: ['inApp', 'email']
        })
      );
    });

    it('should validate dataset access', async () => {
      const response = await request(app)
        .post(`/api/notifications/anomaly-detection/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require dataset ID', async () => {
      const response = await request(app)
        .post('/api/notifications/anomaly-detection/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/notifications/anomalies/:datasetId', () => {
    it('should get dataset anomalies', async () => {
      const mockAnomalies = [
        {
          isAnomaly: true,
          confidence: 0.8,
          severity: 'medium' as const,
          description: 'Medium severity anomaly',
          affectedRows: [1, 2],
          affectedColumns: ['value'],
          suggestedActions: ['Review data quality'],
          metadata: { type: 'outlier', value: 500, expected: 200 }
        }
      ];

      mockedAnomalyDetectionService.analyzeDatasetAnomalies.mockResolvedValue(mockAnomalies);

      const response = await request(app)
        .get(`/api/notifications/anomalies/${testDataset._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.anomalies).toHaveLength(1);
      expect(response.body.data.datasetId).toBe(testDataset._id.toString());
      expect(response.body.data.datasetName).toBe(testDataset.name);
    });

    it('should validate dataset access for anomalies', async () => {
      const response = await request(app)
        .get(`/api/notifications/anomalies/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/notifications/monitoring-rules/:datasetId', () => {
    it('should add monitoring rule', async () => {
      const mockRule = {
        id: 'rule-1',
        datasetId: testDataset._id.toString(),
        name: 'Sales Threshold',
        type: 'threshold' as const,
        config: { 
          column: 'sales', 
          threshold: 1000,
          operator: '>' as const,
          frequency: 'realtime' as const,
          sensitivity: 'medium' as const
        },
        isActive: true,
        createdAt: new Date()
      };

      mockedAnomalyDetectionService.addMonitoringRule.mockResolvedValue(mockRule);

      const ruleData = {
        name: 'Sales Threshold',
        type: 'threshold',
        config: { field: 'sales', threshold: 1000 }
      };

      const response = await request(app)
        .post(`/api/notifications/monitoring-rules/${testDataset._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(ruleData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rule).toEqual(expect.objectContaining({
        id: mockRule.id,
        datasetId: mockRule.datasetId,
        name: mockRule.name,
        type: mockRule.type,
        config: mockRule.config,
        isActive: mockRule.isActive,
        createdAt: expect.any(String)
      }));
      expect(mockedAnomalyDetectionService.addMonitoringRule).toHaveBeenCalledWith(
        testDataset._id.toString(),
        expect.objectContaining({
          name: 'Sales Threshold',
          type: 'threshold',
          config: { field: 'sales', threshold: 1000 },
          isActive: true
        })
      );
    });

    it('should validate rule type', async () => {
      const ruleData = {
        name: 'Invalid Rule',
        type: 'invalid_type',
        config: {}
      };

      const response = await request(app)
        .post(`/api/notifications/monitoring-rules/${testDataset._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(ruleData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate rule name length', async () => {
      const ruleData = {
        name: 'a'.repeat(101), // Too long
        type: 'threshold',
        config: {}
      };

      const response = await request(app)
        .post(`/api/notifications/monitoring-rules/${testDataset._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(ruleData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/notifications/monitoring-rules/:datasetId', () => {
    it('should get monitoring rules', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          datasetId: testDataset._id.toString(),
          name: 'Sales Threshold',
          type: 'threshold' as const,
          config: { 
            column: 'sales', 
            threshold: 1000,
            operator: '>' as const,
            frequency: 'realtime' as const,
            sensitivity: 'medium' as const
          },
          isActive: true,
          createdAt: new Date()
        }
      ];

      mockedAnomalyDetectionService.getMonitoringRules.mockReturnValue(mockRules);

      const response = await request(app)
        .get(`/api/notifications/monitoring-rules/${testDataset._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rules).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: mockRules[0]?.id,
          datasetId: mockRules[0]?.datasetId,
          name: mockRules[0]?.name,
          type: mockRules[0]?.type,
          config: mockRules[0]?.config,
          isActive: mockRules[0]?.isActive,
          createdAt: expect.any(String)
        })
      ]));
    });
  });

  describe('DELETE /api/notifications/:notificationId', () => {
    it('should delete notification', async () => {
      const notification = await Notification.create({
        userId: testUser._id,
        type: 'data_change',
        title: 'Test Notification',
        message: 'This is a test notification',
        metadata: {},
        priority: 'normal',
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: true, read: false }
        }
      });

      const response = await request(app)
        .delete(`/api/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify notification was deleted
      const deletedNotification = await Notification.findById(notification._id);
      expect(deletedNotification).toBeNull();
    });

    it('should not delete notification for different user', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hashed',
        firstName: 'Other',
        lastName: 'User',
        role: 'analyst',
        isActive: true
      });

      const notification = await Notification.create({
        userId: otherUser._id,
        type: 'data_change',
        title: 'Other User Notification',
        message: 'This is not for the test user',
        metadata: {},
        priority: 'normal',
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: true, read: false }
        }
      });

      const response = await request(app)
        .delete(`/api/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/notifications/stats', () => {
    it('should get notification statistics', async () => {
      // Create test notifications
      await Notification.create({
        userId: testUser._id,
        type: 'data_change',
        title: 'Data Change 1',
        message: 'Dataset updated',
        metadata: {},
        priority: 'normal',
        channels: { inApp: { sent: true, read: true } },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      });

      await Notification.create({
        userId: testUser._id,
        type: 'anomaly_detected',
        title: 'Anomaly Detected',
        message: 'Anomaly found in dataset',
        metadata: {},
        priority: 'high',
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: true, read: false }
        },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      });

      const response = await request(app)
        .get('/api/notifications/stats?timeRange=7d')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.unread).toBe(1);
      expect(response.body.data.recent).toBe(2);
      expect(response.body.data.byType).toBeDefined();
      expect(response.body.data.timeRange).toBe('7d');
    });

    it('should handle different time ranges', async () => {
      const testCases = [
        { timeRange: '1d', expectedDays: 1 },
        { timeRange: '7d', expectedDays: 7 },
        { timeRange: '30d', expectedDays: 30 }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .get(`/api/notifications/stats?timeRange=${testCase.timeRange}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.timeRange).toBe(testCase.timeRange);
        expect(response.body.data.period).toBeDefined();
      }
    });
  });
});
