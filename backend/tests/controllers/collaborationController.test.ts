import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/index';
import { User } from '../../src/models/User';
import { Dataset } from '../../src/models/Dataset';
import { AnalysisSession } from '../../src/models/AnalysisSession';
import { Collaboration } from '../../src/models/Collaboration';

describe('Collaboration Controller', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testUser: any;
  let testDataset: any;
  let testAnalysis: any;

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

    // Create test dataset
    testDataset = await Dataset.create({
      name: 'Test Dataset',
      description: 'A test dataset for collaboration',
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

    // Create test analysis session
    testAnalysis = await AnalysisSession.create({
      datasetId: testDataset._id,
      userId: testUser._id,
      title: 'Test Analysis',
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
  });

  describe('GET /api/collaboration/share-info', () => {
    it('should get user share information', async () => {
      // Create a collaboration
      await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [{
          userId: testUser._id,
          permissions: ['read'],
          joinedAt: new Date(),
          lastActivity: new Date(),
          status: 'active'
        }],
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
        .get('/api/collaboration/share')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborations).toHaveLength(1);
      expect(response.body.data.pagination.total).toBe(1);
    });

    it('should filter by resource type', async () => {
      // Create collaborations of different types
      await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [],
        comments: [],
        annotations: [],
        settings: { allowComments: true, allowAnnotations: false, allowEditing: false, requireApproval: false, isPublic: false },
        version: 1
      });

      await Collaboration.create({
        resourceType: 'analysis',
        resourceId: testAnalysis._id,
        ownerId: testUser._id,
        participants: [],
        comments: [],
        annotations: [],
        settings: { allowComments: true, allowAnnotations: false, allowEditing: false, requireApproval: false, isPublic: false },
        version: 1
      });

      const response = await request(app)
        .get('/api/collaboration/share?type=dataset')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborations).toHaveLength(1);
      expect(response.body.data.collaborations[0].resourceType).toBe('dataset');
    });

    it('should paginate results', async () => {
      // Create multiple collaborations
      for (let i = 0; i < 5; i++) {
        await Collaboration.create({
          resourceType: 'dataset',
          resourceId: testDataset._id,
          ownerId: testUser._id,
          participants: [],
          comments: [],
          annotations: [],
          settings: { allowComments: true, allowAnnotations: false, allowEditing: false, requireApproval: false, isPublic: false },
          version: 1
        });
      }

      const response = await request(app)
        .get('/api/collaboration/share?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborations).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(5);
      expect(response.body.data.pagination.pages).toBe(3);
    });
  });

  describe('POST /api/collaboration/share', () => {
    it('should share dataset successfully', async () => {
      const shareData = {
        resourceType: 'dataset',
        resourceId: testDataset._id,
        participants: [
          {
            userId: new mongoose.Types.ObjectId(),
            permissions: ['read']
          }
        ],
        settings: {
          allowComments: true,
          allowAnnotations: false,
          allowEditing: false,
          requireApproval: false,
          isPublic: false
        }
      };

      const response = await request(app)
        .post('/api/collaboration/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shareData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaboration.resourceType).toBe('dataset');
      expect(response.body.data.collaboration.participants).toHaveLength(1);
    });

    it('should share analysis session successfully', async () => {
      const shareData = {
        resourceType: 'analysis',
        resourceId: testAnalysis._id,
        collaborators: [
          {
            userId: new mongoose.Types.ObjectId(),
            permissions: ['read']
          }
        ],
        settings: {
          allowComments: true,
          allowAnnotations: true,
          allowEditing: false,
          requireApproval: false,
          isPublic: false
        }
      };

      const response = await request(app)
        .post('/api/collaboration/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shareData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaboration.resourceType).toBe('analysis');
    });

    it('should update existing collaboration', async () => {
      // Create existing collaboration
      const existingCollaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [],
        comments: [],
        annotations: [],
        settings: { allowComments: true, allowAnnotations: false, allowEditing: false, requireApproval: false, isPublic: false },
        version: 1
      });

      const shareData = {
        resourceType: 'dataset',
        resourceId: testDataset._id,
        participants: [
          {
            userId: new mongoose.Types.ObjectId(),
            permissions: ['write']
          }
        ]
      };

      const response = await request(app)
        .post('/api/collaboration/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shareData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaboration._id.toString()).toBe(existingCollaboration._id.toString());
    });

    it('should validate resource access', async () => {
      const shareData = {
        resourceType: 'dataset',
        resourceId: new mongoose.Types.ObjectId(), // Non-existent dataset
        participants: [
          {
            userId: new mongoose.Types.ObjectId(),
            permissions: ['read']
          }
        ]
      };

      const response = await request(app)
        .post('/api/collaboration/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shareData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should require at least one participant', async () => {
      const shareData = {
        resourceType: 'dataset',
        resourceId: testDataset._id,
        participants: []
      };

      const response = await request(app)
        .post('/api/collaboration/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shareData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('participant is required');
    });

    it('should validate resource type', async () => {
      const shareData = {
        resourceType: 'invalid',
        resourceId: testDataset._id,
        participants: [
          {
            userId: new mongoose.Types.ObjectId(),
            permissions: ['read']
          }
        ]
      };

      const response = await request(app)
        .post('/api/collaboration/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shareData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/collaboration/:id', () => {
    it('should get collaboration details', async () => {
      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [{
          userId: testUser._id,
          permissions: ['read'],
          joinedAt: new Date(),
          lastActivity: new Date(),
          status: 'active'
        }],
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
        .get(`/api/collaboration/${collaboration._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaboration._id).toBe(collaboration._id.toString());
    });

    it('should not get collaboration without access', async () => {
      // Create collaboration for different user
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hashed',
        firstName: 'Other',
        lastName: 'User',
        role: 'analyst',
        isActive: true
      });

      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: otherUser._id,
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
        .get(`/api/collaboration/${collaboration._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should handle expired collaboration', async () => {
      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [{
          userId: testUser._id,
          permissions: ['read'],
          joinedAt: new Date(),
          lastActivity: new Date(),
          status: 'active'
        }],
        comments: [],
        annotations: [],
        settings: {
          allowComments: true,
          allowAnnotations: false,
          allowEditing: false,
          requireApproval: false,
          isPublic: false,
          expiresAt: new Date(Date.now() - 1000) // Expired
        },
        version: 1
      });

      const response = await request(app)
        .get(`/api/collaboration/${collaboration._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isExpired).toBe(true);
    });
  });

  describe('POST /api/collaboration/:id/comment', () => {
    it('should add comment successfully', async () => {
      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [{
          userId: testUser._id,
          permissions: ['comment'],
          joinedAt: new Date(),
          lastActivity: new Date(),
          status: 'active'
        }],
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

      const commentData = {
        content: 'This is a test comment',
        threadId: 'thread-1',
        mentions: ['user1', 'user2']
      };

      const response = await request(app)
        .post(`/api/collaboration/${collaboration._id}/comment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comment.content).toBe(commentData.content);
    });

    it('should not add comment without permission', async () => {
      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [{
          userId: testUser._id,
          permissions: ['read'], // No comment permission
          joinedAt: new Date(),
          lastActivity: new Date(),
          status: 'active'
        }],
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

      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/collaboration/${collaboration._id}/comment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should not add comment when comments disabled', async () => {
      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [{
          userId: testUser._id,
          permissions: ['comment'],
          joinedAt: new Date(),
          lastActivity: new Date(),
          status: 'active'
        }],
        comments: [],
        annotations: [],
        settings: {
          allowComments: false, // Comments disabled
          allowAnnotations: false,
          allowEditing: false,
          requireApproval: false,
          isPublic: false
        },
        version: 1
      });

      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/collaboration/${collaboration._id}/comment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate comment content length', async () => {
      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [{
          userId: testUser._id,
          permissions: ['comment'],
          joinedAt: new Date(),
          lastActivity: new Date(),
          status: 'active'
        }],
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

      const commentData = {
        content: 'a'.repeat(2001) // Too long
      };

      const response = await request(app)
        .post(`/api/collaboration/${collaboration._id}/comment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/collaboration/:id/annotation', () => {
    it('should add annotation successfully', async () => {
      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [{
          userId: testUser._id,
          permissions: ['annotate'],
          joinedAt: new Date(),
          lastActivity: new Date(),
          status: 'active'
        }],
        comments: [],
        annotations: [],
        settings: {
          allowComments: true,
          allowAnnotations: true,
          allowEditing: false,
          requireApproval: false,
          isPublic: false
        },
        version: 1
      });

      const annotationData = {
        chartId: 'chart-1',
        position: { x: 100, y: 200 },
        content: 'This is an annotation',
        type: 'note'
      };

      const response = await request(app)
        .post(`/api/collaboration/${collaboration._id}/annotation`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(annotationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.annotation.content).toBe(annotationData.content);
    });

    it('should validate position coordinates', async () => {
      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [{
          userId: testUser._id,
          permissions: ['annotate'],
          joinedAt: new Date(),
          lastActivity: new Date(),
          status: 'active'
        }],
        comments: [],
        annotations: [],
        settings: {
          allowComments: true,
          allowAnnotations: true,
          allowEditing: false,
          requireApproval: false,
          isPublic: false
        },
        version: 1
      });

      const annotationData = {
        chartId: 'chart-1',
        position: { x: -100, y: 200 }, // Negative x coordinate
        content: 'This is an annotation',
        type: 'note'
      };

      const response = await request(app)
        .post(`/api/collaboration/${collaboration._id}/annotation`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(annotationData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should support table coordinates', async () => {
      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [{
          userId: testUser._id,
          permissions: ['annotate'],
          joinedAt: new Date(),
          lastActivity: new Date(),
          status: 'active'
        }],
        comments: [],
        annotations: [],
        settings: {
          allowComments: true,
          allowAnnotations: true,
          allowEditing: false,
          requireApproval: false,
          isPublic: false
        },
        version: 1
      });

      const annotationData = {
        chartId: 'table-1',
        position: { row: 5, column: 'A' },
        content: 'This is a table annotation',
        type: 'highlight'
      };

      const response = await request(app)
        .post(`/api/collaboration/${collaboration._id}/annotation`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(annotationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.annotation.content).toBe(annotationData.content);
    });
  });

  describe('PUT /api/collaboration/:id', () => {
    it('should update collaboration settings', async () => {
      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
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

      const updateData = {
        settings: {
          allowComments: false,
          allowAnnotations: true,
          allowEditing: true,
          requireApproval: true,
          isPublic: true
        }
      };

      const response = await request(app)
        .put(`/api/collaboration/${collaboration._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaboration.settings.allowComments).toBe(false);
      expect(response.body.data.collaboration.settings.allowAnnotations).toBe(true);
    });

    it('should update participants', async () => {
      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
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

      const newUserId = new mongoose.Types.ObjectId();
      const updateData = {
        participants: [
          {
            action: 'add',
            userId: newUserId,
            permissions: ['read', 'write']
          }
        ]
      };

      const response = await request(app)
        .put(`/api/collaboration/${collaboration._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not update without admin permission', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hashed',
        firstName: 'Other',
        lastName: 'User',
        role: 'analyst',
        isActive: true
      });

      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: otherUser._id,
        participants: [{
          userId: testUser._id,
          permissions: ['read'], // No admin permission
          joinedAt: new Date(),
          lastActivity: new Date(),
          status: 'active'
        }],
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

      const updateData = {
        settings: {
          allowComments: false
        }
      };

      const response = await request(app)
        .put(`/api/collaboration/${collaboration._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/collaboration/:id/end', () => {
    it('should end collaboration successfully', async () => {
      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
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
        .delete(`/api/collaboration/${collaboration._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify collaboration was ended
      const updatedCollaboration = await Collaboration.findById(collaboration._id);
      expect(updatedCollaboration?.settings.allowComments).toBe(false);
      expect(updatedCollaboration?.settings.allowAnnotations).toBe(false);
      expect(updatedCollaboration?.settings.allowEditing).toBe(false);
    });

    it('should not end collaboration without owner permission', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hashed',
        firstName: 'Other',
        lastName: 'User',
        role: 'analyst',
        isActive: true
      });

      const collaboration = await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: otherUser._id,
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
        .delete(`/api/collaboration/${collaboration._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/collaboration/user/sessions', () => {
    it('should get user collaborations', async () => {
      // Create collaborations where user is owner
      await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
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
        .get('/api/collaboration/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborations).toHaveLength(1);
    });

    it('should filter by resource type', async () => {
      // Create collaborations of different types
      await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
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

      await Collaboration.create({
        resourceType: 'analysis',
        resourceId: testAnalysis._id,
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
        .get('/api/collaboration/?type=dataset')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborations).toHaveLength(1);
      expect(response.body.data.collaborations[0].resourceType).toBe('dataset');
    });
  });

  describe('GET /api/collaboration/public', () => {
    it('should get public collaborations', async () => {
      // Create public collaboration
      await Collaboration.create({
        resourceType: 'dataset',
        resourceId: testDataset._id,
        ownerId: testUser._id,
        participants: [],
        comments: [],
        annotations: [],
        settings: {
          allowComments: true,
          allowAnnotations: false,
          allowEditing: false,
          requireApproval: false,
          isPublic: true
        },
        version: 1
      });

      const response = await request(app)
        .get('/api/collaboration/public/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborations).toHaveLength(1);
      expect(response.body.data.collaborations[0].settings.isPublic).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent collaboration', async () => {
      const response = await request(app)
        .get('/api/collaboration/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid collaboration ID format', async () => {
      const response = await request(app)
        .get('/api/collaboration/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
