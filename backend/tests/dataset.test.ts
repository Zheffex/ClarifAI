import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/index';
import { User } from '../src/models/User';
import { Dataset } from '../src/models/Dataset';
import path from 'path';
import fs from 'fs';

describe('Dataset Controller', () => {
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

    // Create and login a test user
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'analyst'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.data.token;
    testUser = registerResponse.body.data.user;
  });

  describe('POST /api/datasets', () => {
    it('should create a new dataset successfully', async () => {
      const datasetData = {
        name: 'Test Dataset',
        description: 'A test dataset for unit testing',
        tags: ['test', 'sample']
      };

      const response = await request(app)
        .post('/api/datasets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(datasetData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataset.name).toBe(datasetData.name);
      expect(response.body.data.dataset.description).toBe(datasetData.description);
      expect(response.body.data.dataset.tags).toEqual(datasetData.tags);
      expect(response.body.data.dataset.createdBy).toBe(testUser._id);
    });

    it('should not create dataset without authentication', async () => {
      const datasetData = {
        name: 'Test Dataset',
        description: 'A test dataset'
      };

      const response = await request(app)
        .post('/api/datasets')
        .send(datasetData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not create dataset with invalid data', async () => {
      const datasetData = {
        description: 'Missing name field'
      };

      const response = await request(app)
        .post('/api/datasets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(datasetData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/datasets', () => {
    beforeEach(async () => {
      // Create test datasets
      testDataset = await Dataset.create({
        name: 'Test Dataset 1',
        description: 'First test dataset',
        createdBy: testUser._id,
        tags: ['test'],
        dataSchema: [],
        recordCount: 100,
        fileSize: 1024,
        status: 'ready'
      });

      await Dataset.create({
        name: 'Test Dataset 2',
        description: 'Second test dataset',
        createdBy: testUser._id,
        tags: ['test', 'sample'],
        dataSchema: [],
        recordCount: 50,
        fileSize: 512,
        status: 'processing'
      });
    });

    it('should get all datasets for authenticated user', async () => {
      const response = await request(app)
        .get('/api/datasets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.datasets).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should filter datasets by status', async () => {
      const response = await request(app)
        .get('/api/datasets?status=ready')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.datasets).toHaveLength(1);
      expect(response.body.data.datasets[0].status).toBe('ready');
    });

    it('should search datasets by name', async () => {
      const response = await request(app)
        .get('/api/datasets?search=Dataset 1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.datasets).toHaveLength(1);
      expect(response.body.data.datasets[0].name).toContain('Dataset 1');
    });

    it('should paginate datasets correctly', async () => {
      const response = await request(app)
        .get('/api/datasets?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.datasets).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.pages).toBe(2);
    });

    it('should not get datasets without authentication', async () => {
      const response = await request(app)
        .get('/api/datasets')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/datasets/:id', () => {
    beforeEach(async () => {
      testDataset = await Dataset.create({
        name: 'Test Dataset',
        description: 'A test dataset',
        createdBy: testUser._id,
        tags: ['test'],
        dataSchema: [
          { name: 'id', type: 'number', required: true },
          { name: 'name', type: 'string', required: true }
        ],
        recordCount: 100,
        fileSize: 1024,
        status: 'ready'
      });
    });

    it('should get dataset by ID', async () => {
      const response = await request(app)
        .get(`/api/datasets/${testDataset._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataset._id).toBe(testDataset._id.toString());
      expect(response.body.data.dataset.name).toBe(testDataset.name);
      expect(response.body.data.dataset.dataSchema).toHaveLength(2);
    });

    it('should not get dataset with invalid ID', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/datasets/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should not get dataset without authentication', async () => {
      const response = await request(app)
        .get(`/api/datasets/${testDataset._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/datasets/:id', () => {
    beforeEach(async () => {
      testDataset = await Dataset.create({
        name: 'Test Dataset',
        description: 'A test dataset',
        createdBy: testUser._id,
        tags: ['test'],
        dataSchema: [],
        recordCount: 100,
        fileSize: 1024,
        status: 'ready'
      });
    });

    it('should update dataset successfully', async () => {
      const updateData = {
        name: 'Updated Dataset',
        description: 'Updated description',
        tags: ['updated', 'test']
      };

      const response = await request(app)
        .put(`/api/datasets/${testDataset._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataset.name).toBe(updateData.name);
      expect(response.body.data.dataset.description).toBe(updateData.description);
      expect(response.body.data.dataset.tags).toEqual(updateData.tags);
    });

    it('should not update dataset with invalid ID', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const updateData = { name: 'Updated Dataset' };
      
      const response = await request(app)
        .put(`/api/datasets/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should not update dataset without authentication', async () => {
      const updateData = { name: 'Updated Dataset' };
      
      const response = await request(app)
        .put(`/api/datasets/${testDataset._id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/datasets/:id', () => {
    beforeEach(async () => {
      testDataset = await Dataset.create({
        name: 'Test Dataset',
        description: 'A test dataset',
        createdBy: testUser._id,
        tags: ['test'],
        dataSchema: [],
        recordCount: 100,
        fileSize: 1024,
        status: 'ready'
      });
    });

    it('should delete dataset successfully', async () => {
      const response = await request(app)
        .delete(`/api/datasets/${testDataset._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify dataset is deleted
      const deletedDataset = await Dataset.findById(testDataset._id);
      expect(deletedDataset).toBeNull();
    });

    it('should not delete dataset with invalid ID', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/datasets/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should not delete dataset without authentication', async () => {
      const response = await request(app)
        .delete(`/api/datasets/${testDataset._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/datasets/:id/preview', () => {
    beforeEach(async () => {
      testDataset = await Dataset.create({
        name: 'Test Dataset',
        description: 'A test dataset',
        createdBy: testUser._id,
        tags: ['test'],
        dataSchema: [
          { name: 'id', type: 'number', required: true },
          { name: 'name', type: 'string', required: true }
        ],
        recordCount: 100,
        fileSize: 1024,
        status: 'ready'
      });
    });

    it('should get dataset preview', async () => {
      const response = await request(app)
        .get(`/api/datasets/${testDataset._id}/preview`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('preview');
      expect(response.body.data).toHaveProperty('metadata');
    });

    it('should not get preview without authentication', async () => {
      const response = await request(app)
        .get(`/api/datasets/${testDataset._id}/preview`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/datasets/:id/analyze', () => {
    beforeEach(async () => {
      testDataset = await Dataset.create({
        name: 'Test Dataset',
        description: 'A test dataset',
        createdBy: testUser._id,
        tags: ['test'],
        dataSchema: [
          { name: 'value', type: 'number', required: true },
          { name: 'category', type: 'string', required: true }
        ],
        recordCount: 100,
        fileSize: 1024,
        status: 'ready'
      });
    });

    it('should analyze dataset successfully', async () => {
      const analysisConfig = {
        analysisType: 'descriptive',
        fields: ['value', 'category'],
        operations: ['mean', 'count']
      };

      const response = await request(app)
        .post(`/api/datasets/${testDataset._id}/analyze`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(analysisConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('analysis');
    });

    it('should not analyze dataset without authentication', async () => {
      const analysisConfig = {
        analysisType: 'descriptive',
        fields: ['value']
      };

      const response = await request(app)
        .post(`/api/datasets/${testDataset._id}/analyze`)
        .send(analysisConfig)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/datasets/stats', () => {
    beforeEach(async () => {
      // Create multiple test datasets
      await Dataset.create({
        name: 'Dataset 1',
        createdBy: testUser._id,
        recordCount: 100,
        fileSize: 1024,
        status: 'ready'
      });

      await Dataset.create({
        name: 'Dataset 2',
        createdBy: testUser._id,
        recordCount: 200,
        fileSize: 2048,
        status: 'processing'
      });
    });

    it('should get dataset statistics', async () => {
      const response = await request(app)
        .get('/api/datasets/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toHaveProperty('total');
      expect(response.body.data.stats).toHaveProperty('byStatus');
      expect(response.body.data.stats).toHaveProperty('totalRecords');
      expect(response.body.data.stats).toHaveProperty('totalSize');
      expect(response.body.data.stats.total).toBe(2);
    });

    it('should not get stats without authentication', async () => {
      const response = await request(app)
        .get('/api/datasets/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});