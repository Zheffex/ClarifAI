import mongoose from 'mongoose';
import { NotificationService } from '../../src/services/notificationService';
import { User } from '../../src/models/User';
import { Notification, NotificationTemplate } from '../../src/models/Notification';

// Mock nodemailer and web-push
jest.mock('nodemailer');
jest.mock('web-push');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let testUser: any;

  beforeEach(async () => {
    // Clean database before each test
    await User.deleteMany({});
    await Notification.deleteMany({});
    await NotificationTemplate.deleteMany({});

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      role: 'analyst',
      isActive: true
    });

    // Create new service instance
    notificationService = new NotificationService();
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const notificationData = {
        userId: testUser._id.toString(),
        type: 'data_change' as const,
        title: 'Data Updated',
        message: 'Your dataset has been updated',
        metadata: { datasetId: new mongoose.Types.ObjectId() },
        priority: 'normal' as const,
        channels: ['inApp', 'email'] as ('email' | 'push' | 'inApp')[]
      };

      const notification = await notificationService.createNotification(notificationData);

      expect(notification).toBeDefined();
      expect(notification.userId.toString()).toBe(testUser._id.toString());
      expect(notification.type).toBe('data_change');
      expect(notification.title).toBe('Data Updated');
      expect(notification.message).toBe('Your dataset has been updated');
      expect(notification.priority).toBe('normal');
      expect(notification.channels.inApp.sent).toBe(true);
    });

    it('should skip notification if user preferences disable it', async () => {
      // Update user preferences to disable data change notifications
      testUser.preferences = {
        notifications: {
          email: true,
          push: true,
          inApp: true,
          anomalyDetection: true,
          dataChanges: false, // Disabled
          collaborationUpdates: true,
          systemAlerts: true,
          frequency: 'instant'
        }
      };
      await testUser.save();

      const notificationData = {
        userId: testUser._id.toString(),
        type: 'data_change' as const,
        title: 'Data Updated',
        message: 'Your dataset has been updated'
      };

      const notification = await notificationService.createNotification(notificationData);

      expect(notification).toBeNull();
    });

    it('should handle missing user', async () => {
      const notificationData = {
        userId: new mongoose.Types.ObjectId().toString(),
        type: 'data_change' as const,
        title: 'Data Updated',
        message: 'Your dataset has been updated'
      };

      await expect(notificationService.createNotification(notificationData))
        .rejects.toThrow('User not found');
    });

    it('should determine channels based on preferences and availability', async () => {
      const notificationData = {
        userId: testUser._id.toString(),
        type: 'system_alert' as const,
        title: 'System Alert',
        message: 'System maintenance scheduled',
        channels: ['email', 'push', 'inApp'] as ('email' | 'push' | 'inApp')[]
      };

      const notification = await notificationService.createNotification(notificationData);

      expect(notification).toBeDefined();
      // Should include inApp (always available) and others based on service configuration
      expect(notification.channels.inApp.sent).toBe(true);
    });

    it('should create scheduled notification', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      const notificationData = {
        userId: testUser._id.toString(),
        type: 'data_change' as const,
        title: 'Scheduled Notification',
        message: 'This is a scheduled notification',
        scheduledFor: futureDate
      };

      const notification = await notificationService.createNotification(notificationData);

      expect(notification).toBeDefined();
      expect(notification.scheduledFor).toEqual(futureDate);
      // Should not be sent immediately
      expect(notification.channels.inApp.sent).toBe(false);
    });
  });

  describe('sendNotification', () => {
    it('should send in-app notification', async () => {
      const notification = await Notification.create({
        userId: testUser._id,
        type: 'data_change',
        title: 'Test Notification',
        message: 'This is a test',
        metadata: {},
        priority: 'normal',
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: false, read: false }
        }
      });

      await notificationService.sendNotification(notification, ['inApp']);

      // Verify notification was marked as sent
      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification?.channels.inApp.sent).toBe(true);
    });

    it('should handle email notification when configured', async () => {
      // Mock email service as configured
      (notificationService as any).isEmailConfigured = true;
      (notificationService as any).emailTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-email-id' })
      };

      const notification = await Notification.create({
        userId: testUser._id,
        type: 'data_change',
        title: 'Test Notification',
        message: 'This is a test',
        metadata: {},
        priority: 'normal',
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: false, read: false }
        }
      });

      await notificationService.sendNotification(notification, ['email']);

      // Verify email was sent
      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification?.channels.email.sent).toBe(true);
    });

    it('should handle push notification when configured', async () => {
      // Mock push service as configured
      (notificationService as any).isPushConfigured = true;

      const notification = await Notification.create({
        userId: testUser._id,
        type: 'data_change',
        title: 'Test Notification',
        message: 'This is a test',
        metadata: {},
        priority: 'normal',
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: false, read: false }
        }
      });

      await notificationService.sendNotification(notification, ['push']);

      // Verify push was sent
      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification?.channels.push.sent).toBe(true);
    });

    it('should handle notification failures gracefully', async () => {
      const notification = await Notification.create({
        userId: testUser._id,
        type: 'data_change',
        title: 'Test Notification',
        message: 'This is a test',
        metadata: {},
        priority: 'normal',
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: false, read: false }
        }
      });

      // Mock socket service to throw error
      const mockEmitToUser = jest.fn().mockRejectedValue(new Error('Socket error'));
      global.socketService = {
        emitToUser: mockEmitToUser
      } as any;

      // The sendNotification should handle the error gracefully
      await expect(notificationService.sendNotification(notification, ['inApp']))
        .resolves.not.toThrow();

      // Verify error was handled - the notification should still be marked as sent
      // because the error handling in the service catches and logs the error
      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification?.channels.inApp.sent).toBe(true);
    });
  });

  describe('getUserNotifications', () => {
    beforeEach(async () => {
      // Create test notifications
      await Notification.create({
        userId: testUser._id,
        type: 'data_change',
        title: 'Data Change 1',
        message: 'Dataset updated',
        metadata: {},
        priority: 'normal',
        channels: { inApp: { sent: true, read: true } }
      });

      await Notification.create({
        userId: testUser._id,
        type: 'anomaly_detected',
        title: 'Anomaly Detected',
        message: 'Anomaly found',
        metadata: {},
        priority: 'high',
        channels: { inApp: { sent: true, read: false } }
      });

      await Notification.create({
        userId: testUser._id,
        type: 'system_alert',
        title: 'System Alert',
        message: 'System maintenance',
        metadata: {},
        priority: 'normal',
        channels: { inApp: { sent: true, read: false } }
      });
    });

    it('should get all notifications for user', async () => {
      const result = await notificationService.getUserNotifications(testUser._id.toString());

      expect(result.notifications).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.unreadCount).toBe(2);
    });

    it('should filter by unread only', async () => {
      const result = await notificationService.getUserNotifications(testUser._id.toString(), {
        unreadOnly: true
      });

      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.unreadCount).toBe(2);
    });

    it('should filter by notification type', async () => {
      const result = await notificationService.getUserNotifications(testUser._id.toString(), {
        type: 'anomaly_detected'
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0]?.type).toBe('anomaly_detected');
    });

    it('should paginate results', async () => {
      const result = await notificationService.getUserNotifications(testUser._id.toString(), {
        page: 1,
        limit: 2
      });

      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(3);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = await Notification.create({
        userId: testUser._id,
        type: 'data_change',
        title: 'Test Notification',
        message: 'This is a test',
        metadata: {},
        priority: 'normal',
        channels: { inApp: { sent: true, read: false } }
      });

      await notificationService.markAsRead(notification._id.toString(), testUser._id.toString());

      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification?.channels.inApp.read).toBe(true);
    });

    it('should handle non-existent notification', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await expect(notificationService.markAsRead(nonExistentId.toString(), testUser._id.toString()))
        .resolves.not.toThrow();
    });
  });

  describe('markAllAsReadForUser', () => {
    it('should mark all notifications as read for user', async () => {
      // Create unread notifications
      await Notification.create({
        userId: testUser._id,
        type: 'data_change',
        title: 'Notification 1',
        message: 'Test message 1',
        metadata: {},
        priority: 'normal',
        channels: { inApp: { sent: true, read: false } }
      });

      await Notification.create({
        userId: testUser._id,
        type: 'system_alert',
        title: 'Notification 2',
        message: 'Test message 2',
        metadata: {},
        priority: 'normal',
        channels: { inApp: { sent: true, read: false } }
      });

      await notificationService.markAllAsReadForUser(testUser._id.toString());

      const notifications = await Notification.find({ userId: testUser._id });
      notifications.forEach(notification => {
        expect(notification.channels.inApp.read).toBe(true);
      });
    });
  });

  describe('processPendingNotifications', () => {
    it('should process scheduled notifications', async () => {
      // Create a notification scheduled for the past
      const pastDate = new Date(Date.now() - 1000);
      const notification = await Notification.create({
        userId: testUser._id,
        type: 'data_change',
        title: 'Scheduled Notification',
        message: 'This was scheduled',
        metadata: {},
        priority: 'normal',
        scheduledFor: pastDate,
        channels: {
          email: { sent: false },
          push: { sent: false },
          inApp: { sent: false, read: false }
        }
      });

      // Mock the static method
      (Notification as any).findPendingNotifications = jest.fn().mockResolvedValue([notification]);

      await notificationService.processPendingNotifications();

      // Verify notification was processed
      expect((Notification as any).findPendingNotifications).toHaveBeenCalled();
    });

    it('should handle processing errors gracefully', async () => {
      // Mock the static method to throw error
      (Notification as any).findPendingNotifications = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(notificationService.processPendingNotifications())
        .resolves.not.toThrow();
    });
  });

  describe('getServiceStatus', () => {
    it('should return service status', () => {
      const status = notificationService.getServiceStatus();

      expect(status).toHaveProperty('email');
      expect(status).toHaveProperty('push');
      expect(status).toHaveProperty('inApp');
      expect(typeof status.email).toBe('boolean');
      expect(typeof status.push).toBe('boolean');
      expect(status.inApp).toBe(true); // Always available
    });
  });

  describe('Email Template Management', () => {
    it('should create default template for new notification type', async () => {
      const notificationData = {
        userId: testUser._id.toString(),
        type: 'info' as any,
        title: 'Custom Notification',
        message: 'This is a custom notification'
      };

      const notification = await notificationService.createNotification(notificationData);

      expect(notification).toBeDefined();
      
      // Verify template was created
      const template = await NotificationTemplate.findOne({ type: 'info' });
      expect(template).toBeDefined();
      expect(template?.isActive).toBe(true);
    });

    it('should use existing template when available', async () => {
      // Create existing template
      await NotificationTemplate.create({
        name: 'Data Change Alert',
        type: 'data_change',
        subject: 'Data Change Alert - {{datasetName}}',
        emailTemplate: '<div>{{title}}</div><p>{{message}}</p>',
        pushTemplate: '{{message}}',
        inAppTemplate: '{{message}}',
        variables: ['title', 'message', 'datasetName'],
        isActive: true
      });

      const notificationData = {
        userId: testUser._id.toString(),
        type: 'data_change' as const,
        title: 'Data Updated',
        message: 'Your dataset has been updated',
        metadata: { relatedData: { datasetName: 'Test Dataset' } }
      };

      const notification = await notificationService.createNotification(notificationData);

      expect(notification).toBeDefined();
    });
  });

  describe('Channel Determination', () => {
    it('should determine channels based on user preferences', async () => {
      // Update user preferences
      testUser.preferences = {
        notifications: {
          email: false,
          push: true,
          inApp: true,
          anomalyDetection: true,
          dataChanges: true,
          collaborationUpdates: true,
          systemAlerts: true,
          frequency: 'instant'
        }
      };
      await testUser.save();

      const notificationData = {
        userId: testUser._id.toString(),
        type: 'data_change' as const,
        title: 'Data Updated',
        message: 'Your dataset has been updated'
      };

      const notification = await notificationService.createNotification(notificationData);

      expect(notification).toBeDefined();
      // Should use inApp (always available) and push (enabled in preferences)
      expect(notification.channels.inApp.sent).toBe(true);
    });

    it('should fallback to inApp when other channels are unavailable', async () => {
      // Mock services as not configured
      (notificationService as any).isEmailConfigured = false;
      (notificationService as any).isPushConfigured = false;

      const notificationData = {
        userId: testUser._id.toString(),
        type: 'data_change' as const,
        title: 'Data Updated',
        message: 'Your dataset has been updated',
        channels: ['email', 'push', 'inApp'] as ('email' | 'push' | 'inApp')[]
      };

      const notification = await notificationService.createNotification(notificationData);

      expect(notification).toBeDefined();
      expect(notification.channels.inApp.sent).toBe(true);
      expect(notification.channels.email.sent).toBe(false);
      expect(notification.channels.push.sent).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle user not found error', async () => {
      // Mock User.findById to return null (user not found)
      const mockQuery = {
        select: jest.fn().mockResolvedValue(null)
      };
      jest.spyOn(User, 'findById').mockReturnValue(mockQuery as any);

      const notificationData = {
        userId: '507f1f77bcf86cd799439011', // Valid ObjectId format
        type: 'data_change' as const,
        title: 'Test',
        message: 'Test message'
      };

      await expect(notificationService.createNotification(notificationData))
        .rejects.toThrow('User not found');
    });

    it('should handle database errors during notification creation', async () => {
      // Mock User.findById to throw error
      const mockQuery = {
        select: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      jest.spyOn(User, 'findById').mockReturnValue(mockQuery as any);

      const notificationData = {
        userId: testUser._id.toString(),
        type: 'data_change' as const,
        title: 'Test',
        message: 'Test message'
      };

      await expect(notificationService.createNotification(notificationData))
        .rejects.toThrow('Database error');
    });

    it('should handle template creation errors', async () => {
      // Mock NotificationTemplate.create to throw error
      jest.spyOn(NotificationTemplate, 'create').mockRejectedValueOnce(new Error('Template creation failed'));

      const notificationData = {
        userId: testUser._id.toString(),
        type: 'new_type' as any,
        title: 'Test',
        message: 'Test message'
      };

      // Should still create notification with fallback template
      const notification = await notificationService.createNotification(notificationData);
      expect(notification).toBeDefined();
    });
  });
});
