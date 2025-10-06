import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../src/index';
import { User } from '../../src/models/User';
import { Dataset } from '../../src/models/Dataset';
import { AnalysisSession } from '../../src/models/AnalysisSession';
import { Collaboration } from '../../src/models/Collaboration';

describe('Dashboard Controller', () => {
  let authToken: string;
  let testUser: any;

  beforeEach(async () => {
    // Clean database before each test
    await User.deleteMany({});
    await Dataset.deleteMany({});
    await AnalysisSession.deleteMany({});
    await Collaboration.deleteMany({});

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
  });

  describe('GET /api/dashboard/stats', () => {
    it('should get dashboard statistics', async () => {
      // Create test datasets
      await Dataset.create({
        name: 'Dataset 1',
        description: 'First dataset',
        fileId: new mongoose.Types.ObjectId(),
        uploadedBy: testUser._id,
        organizationId: new mongoose.Types.ObjectId(),
        dataSchema: [],
        metadata: {
          size: 1024,
          type: 'csv',
          rows: 100,
          columns: 5,
          headers: ['id', 'name', 'value']
        },
        processingStatus: 'ready',
        tags: ['test'],
        isPublic: false,
        accessPermissions: []
      });

      await Dataset.create({
        name: 'Dataset 2',
        description: 'Second dataset',
        fileId: new mongoose.Types.ObjectId(),
        uploadedBy: testUser._id,
        organizationId: new mongoose.Types.ObjectId(),
        dataSchema: [],
        metadata: {
          size: 2048,
          type: 'csv',
          rows: 200,
          columns: 3,
          headers: ['id', 'value', 'category']
        },
        processingStatus: 'ready',
        tags: ['test'],
        isPublic: false,
        accessPermissions: []
      });

      // Create test analysis sessions
      await AnalysisSession.create({
        datasetId: new mongoose.Types.ObjectId(),
        userId: testUser._id,
        title: 'Analysis 1',
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

      // Create test collaboration
      await Collaboration.create({
        resourceType: 'dataset',
        resourceId: new mongoose.Types.ObjectId(),
        ownerId: testUser._id,
        participants: [],
        comments: [],
        annotations: [],
        settings: {
          allowComments: true,
          allowAnnotations: false,
          allowEditing: false,
          requireApproval: false,
          isPublic: false
        },
        version: 1
      });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalDatasets).toBe(2);
      expect(response.body.data.totalAnalyses).toBe(1);
      expect(response.body.data.collaborations).toBe(1);
      expect(response.body.data.dataQualityScore).toBeDefined();
      expect(response.body.data.storageUsed).toBeDefined();
    });

    it('should calculate data quality score correctly', async () => {
      // Create datasets with different processing statuses
      await Dataset.create({
        name: 'Ready Dataset',
        fileId: new mongoose.Types.ObjectId(),
        uploadedBy: testUser._id,
        organizationId: new mongoose.Types.ObjectId(),
        dataSchema: [],
        metadata: { size: 1024, type: 'csv' },
        processingStatus: 'ready',
        tags: [],
        isPublic: false,
        accessPermissions: []
      });

      await Dataset.create({
        name: 'Processing Dataset',
        fileId: new mongoose.Types.ObjectId(),
        uploadedBy: testUser._id,
        organizationId: new mongoose.Types.ObjectId(),
        dataSchema: [],
        metadata: { size: 2048, type: 'csv' },
        processingStatus: 'processing',
        tags: [],
        isPublic: false,
        accessPermissions: []
      });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataQualityScore).toBe(50); // 1 out of 2 datasets ready = 50%
    });

    it('should calculate storage used correctly', async () => {
      await Dataset.create({
        name: 'Small Dataset',
        fileId: new mongoose.Types.ObjectId(),
        uploadedBy: testUser._id,
        organizationId: new mongoose.Types.ObjectId(),
        dataSchema: [],
        metadata: { size: 1024, type: 'csv' },
        processingStatus: 'ready',
        tags: [],
        isPublic: false,
        accessPermissions: []
      });

      await Dataset.create({
        name: 'Large Dataset',
        fileId: new mongoose.Types.ObjectId(),
        uploadedBy: testUser._id,
        organizationId: new mongoose.Types.ObjectId(),
        dataSchema: [],
        metadata: { size: 2048, type: 'csv' },
        processingStatus: 'ready',
        tags: [],
        isPublic: false,
        accessPermissions: []
      });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.storageUsed).toBe('3 KB'); // 1024 + 2048 = 3072 bytes = 3 KB
    });

    it('should handle user with no data', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalDatasets).toBe(0);
      expect(response.body.data.totalAnalyses).toBe(0);
      expect(response.body.data.collaborations).toBe(0);
      expect(response.body.data.dataQualityScore).toBe(0);
      expect(response.body.data.storageUsed).toBe('0 Bytes');
    });
  });

  describe('GET /api/dashboard/activity', () => {
    it('should get recent activity', async () => {
      // Create recent datasets
      const recentDataset = await Dataset.create({
        name: 'Recent Dataset',
        description: 'A recently created dataset',
        fileId: new mongoose.Types.ObjectId(),
        uploadedBy: testUser._id,
        organizationId: new mongoose.Types.ObjectId(),
        dataSchema: [],
        metadata: { size: 1024, type: 'csv' },
        processingStatus: 'ready',
        tags: [],
        isPublic: false,
        accessPermissions: []
      });

      // Create recent analysis session
      const recentSession = await AnalysisSession.create({
        datasetId: recentDataset._id,
        userId: testUser._id,
        title: 'Recent Analysis',
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

      const response = await request(app)
        .get('/api/dashboard/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      
      // Check that activities are sorted by timestamp (most recent first)
      const activities = response.body.data;
      expect(activities[0].type).toBe('analysis_created');
      expect(activities[1].type).toBe('dataset_uploaded');
    });

    it('should limit activity results', async () => {
      // Create multiple datasets to test pagination
      for (let i = 0; i < 5; i++) {
        await Dataset.create({
          name: `Dataset ${i + 1}`,
          description: `Dataset number ${i + 1}`,
          fileId: new mongoose.Types.ObjectId(),
          uploadedBy: testUser._id,
          organizationId: new mongoose.Types.ObjectId(),
          dataSchema: [],
          metadata: { size: 1024, type: 'csv' },
          processingStatus: 'ready',
          tags: [],
          isPublic: false,
          accessPermissions: []
        });
      }

      const response = await request(app)
        .get('/api/dashboard/activity?limit=3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });

    it('should handle user with no activity', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/dashboard/overview', () => {
    it('should get dashboard overview with stats and recent items', async () => {
      // Create test data
      const dataset = await Dataset.create({
        name: 'Test Dataset',
        description: 'A test dataset',
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

      await AnalysisSession.create({
        datasetId: dataset._id,
        userId: testUser._id,
        title: 'Test Analysis',
        queries: [
          {
            query: 'What are the trends?',
            response: 'Trends show upward movement',
            timestamp: new Date(),
            processingTime: 1500
          }
        ],
        visualizations: [
          {
            type: 'bar',
            title: 'Sales Chart',
            data: {},
            timestamp: new Date()
          }
        ],
        insights: [],
        predictions: [],
        collaborators: [],
        isShared: false,
        shareSettings: {
          allowComments: true,
          allowEditing: false
        }
      });

      const response = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.recentDatasets).toBeDefined();
      expect(response.body.data.recentSessions).toBeDefined();
      
      // Check stats
      expect(response.body.data.stats.totalDatasets).toBe(1);
      expect(response.body.data.stats.totalAnalyses).toBe(1);
      
      // Check recent datasets
      expect(response.body.data.recentDatasets).toHaveLength(1);
      expect(response.body.data.recentDatasets[0].name).toBe('Test Dataset');
      
      // Check recent sessions
      expect(response.body.data.recentSessions).toHaveLength(1);
      expect(response.body.data.recentSessions[0].title).toBe('Test Analysis');
    });

    it('should limit recent items correctly', async () => {
      // Create multiple datasets and sessions
      for (let i = 0; i < 7; i++) {
        const dataset = await Dataset.create({
          name: `Dataset ${i + 1}`,
          description: `Dataset ${i + 1}`,
          fileId: new mongoose.Types.ObjectId(),
          uploadedBy: testUser._id,
          organizationId: new mongoose.Types.ObjectId(),
          dataSchema: [],
          metadata: { size: 1024, type: 'csv' },
          processingStatus: 'ready',
          tags: [],
          isPublic: false,
          accessPermissions: []
        });

        await AnalysisSession.create({
          datasetId: dataset._id,
          userId: testUser._id,
          title: `Analysis ${i + 1}`,
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
      }

      const response = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recentDatasets).toHaveLength(5); // Limited to 5
      expect(response.body.data.recentSessions).toHaveLength(5); // Limited to 5
    });

    it('should handle empty dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats.totalDatasets).toBe(0);
      expect(response.body.data.stats.totalAnalyses).toBe(0);
      expect(response.body.data.recentDatasets).toHaveLength(0);
      expect(response.body.data.recentSessions).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error by disconnecting
      await mongoose.disconnect();

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing user ID', async () => {
      // Create a request without proper authentication
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Data Formatting', () => {
    it('should format storage sizes correctly', async () => {
      // Test different file sizes
      const testCases = [
        { size: 0, expected: '0 Bytes' },
        { size: 1024, expected: '1 KB' },
        { size: 1024 * 1024, expected: '1 MB' },
        { size: 1024 * 1024 * 1024, expected: '1 GB' }
      ];

      for (const testCase of testCases) {
        await Dataset.deleteMany({});
        
        await Dataset.create({
          name: 'Test Dataset',
          fileId: new mongoose.Types.ObjectId(),
          uploadedBy: testUser._id,
          organizationId: new mongoose.Types.ObjectId(),
          dataSchema: [],
          metadata: { size: testCase.size, type: 'csv' },
          processingStatus: 'ready',
          tags: [],
          isPublic: false,
          accessPermissions: []
        });

        const response = await request(app)
          .get('/api/dashboard/stats')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.storageUsed).toBe(testCase.expected);
      }
    });

    it('should calculate data quality score with decimal precision', async () => {
      // Create 3 datasets: 2 ready, 1 processing (66.7% quality)
      await Dataset.create({
        name: 'Ready 1',
        fileId: new mongoose.Types.ObjectId(),
        uploadedBy: testUser._id,
        organizationId: new mongoose.Types.ObjectId(),
        dataSchema: [],
        metadata: { size: 1024, type: 'csv' },
        processingStatus: 'ready',
        tags: [],
        isPublic: false,
        accessPermissions: []
      });

      await Dataset.create({
        name: 'Ready 2',
        fileId: new mongoose.Types.ObjectId(),
        uploadedBy: testUser._id,
        organizationId: new mongoose.Types.ObjectId(),
        dataSchema: [],
        metadata: { size: 1024, type: 'csv' },
        processingStatus: 'ready',
        tags: [],
        isPublic: false,
        accessPermissions: []
      });

      await Dataset.create({
        name: 'Processing',
        fileId: new mongoose.Types.ObjectId(),
        uploadedBy: testUser._id,
        organizationId: new mongoose.Types.ObjectId(),
        dataSchema: [],
        metadata: { size: 1024, type: 'csv' },
        processingStatus: 'processing',
        tags: [],
        isPublic: false,
        accessPermissions: []
      });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataQualityScore).toBe(66.7); // 2/3 * 100 = 66.7
    });
  });
});
