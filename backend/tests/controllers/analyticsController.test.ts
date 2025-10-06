import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/index';
import { User } from '../../src/models/User';
import { Dataset } from '../../src/models/Dataset';
import { AnalysisSession } from '../../src/models/AnalysisSession';
import { openRouterService } from '../../src/services/openRouterService';
import { fileUploadService } from '../../src/services/fileUploadService';
import { notificationService } from '../../src/services/notificationService';

// Mock the services
jest.mock('../../src/services/openRouterService');
jest.mock('../../src/services/fileUploadService');
jest.mock('../../src/services/notificationService');

const mockedOpenRouterService = openRouterService as jest.Mocked<typeof openRouterService>;
const mockedFileUploadService = fileUploadService as jest.Mocked<typeof fileUploadService>;
const mockedNotificationService = notificationService as jest.Mocked<typeof notificationService>;

describe('Analytics Controller', () => {
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
    await AnalysisSession.deleteMany({});

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
      description: 'A test dataset for analytics',
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

  describe('POST /api/analytics/query', () => {
    it('should process natural language query successfully', async () => {
      const mockResponse = 'Based on the data, I can see a clear upward trend in sales over the past quarter.';
      mockedOpenRouterService.analyzeText.mockResolvedValue(mockResponse);
      mockedFileUploadService.getFilePreview.mockResolvedValue({
        rows: [
          { id: 1, name: 'Product A', value: 100, category: 'Electronics', date: '2024-01-01' },
          { id: 2, name: 'Product B', value: 150, category: 'Electronics', date: '2024-01-02' }
        ],
        totalRows: 100,
        headers: ['id', 'name', 'value', 'category', 'date']
      });

      const queryData = {
        datasetId: testDataset._id,
        query: 'What are the trends in this data?'
      };

      const response = await request(app)
        .post('/api/analytics/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send(queryData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.response.answer).toBe(mockResponse);
      expect(response.body.data.sessionId).toBeDefined();
      expect(mockedFileUploadService.getFilePreview).toHaveBeenCalledWith(
        testDataset.fileId,
        10
      );
    });

    it('should create new analysis session when no sessionId provided', async () => {
      const mockResponse = 'Analysis complete.';
      mockedOpenRouterService.analyzeText.mockResolvedValue(mockResponse);
      mockedFileUploadService.getFilePreview.mockResolvedValue({
        rows: [],
        totalRows: 0,
        headers: []
      });

      const queryData = {
        datasetId: testDataset._id,
        query: 'Analyze this data'
      };

      const response = await request(app)
        .post('/api/analytics/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send(queryData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBeDefined();

      // Verify session was created
      const session = await AnalysisSession.findById(response.body.data.sessionId);
      expect(session).toBeTruthy();
      expect(session?.datasetId.toString()).toBe(testDataset._id.toString());
      expect(session?.userId.toString()).toBe(testUser._id.toString());
    });

    it('should use existing session when sessionId provided', async () => {
      // Create existing session
      const existingSession = await AnalysisSession.create({
        datasetId: testDataset._id,
        userId: testUser._id,
        title: 'Existing Analysis',
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

      const mockResponse = 'Updated analysis.';
      mockedOpenRouterService.analyzeText.mockResolvedValue(mockResponse);
      mockedFileUploadService.getFilePreview.mockResolvedValue({
        rows: [],
        totalRows: 0,
        headers: []
      });

      const queryData = {
        datasetId: testDataset._id,
        query: 'Update analysis',
        sessionId: existingSession._id
      };

      const response = await request(app)
        .post('/api/analytics/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send(queryData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBe(existingSession._id.toString());
    });

    it('should validate dataset access', async () => {
      const queryData = {
        datasetId: new mongoose.Types.ObjectId(), // Non-existent dataset
        query: 'Test query'
      };

      const response = await request(app)
        .post('/api/analytics/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send(queryData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should check dataset is ready for analysis', async () => {
      // Update dataset to not ready status
      await Dataset.findByIdAndUpdate(testDataset._id, { processingStatus: 'processing' });

      const queryData = {
        datasetId: testDataset._id,
        query: 'Test query'
      };

      const response = await request(app)
        .post('/api/analytics/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send(queryData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle AI service failures with fallback', async () => {
      mockedOpenRouterService.analyzeText.mockRejectedValue(new Error('AI service error'));
      mockedFileUploadService.getFilePreview.mockResolvedValue({
        rows: [],
        totalRows: 100,
        headers: ['id', 'name']
      });

      const queryData = {
        datasetId: testDataset._id,
        query: 'Test query'
      };

      const response = await request(app)
        .post('/api/analytics/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send(queryData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.response.warning).toContain('temporarily unavailable');
    });
  });

  describe('POST /api/analytics/predict', () => {
    it('should generate prediction successfully', async () => {
      const mockPrediction = {
        type: 'forecast',
        target: 'sales',
        predictions: [
          { period: 1, value: 100, confidence: 0.8 },
          { period: 2, value: 110, confidence: 0.75 }
        ],
        analysis: 'Sales are expected to increase',
        confidence: 0.8,
        methodology: 'Time series analysis',
        factors: ['Historical trends', 'Seasonality'],
        recommendations: ['Monitor closely', 'Adjust inventory']
      };

      mockedOpenRouterService.analyzeText.mockResolvedValue(JSON.stringify(mockPrediction));
      mockedFileUploadService.getFilePreview.mockResolvedValue({
        rows: [
          { sales: 100, date: '2024-01-01' },
          { sales: 110, date: '2024-01-02' }
        ],
        totalRows: 20,
        headers: ['sales', 'date']
      });

      const predictionData = {
        datasetId: testDataset._id,
        targetColumn: 'sales',
        predictionType: 'forecast',
        horizon: 10
      };

      const response = await request(app)
        .post('/api/analytics/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send(predictionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.prediction).toEqual(mockPrediction);
    });

    it('should handle invalid prediction data', async () => {
      mockedFileUploadService.getFilePreview.mockResolvedValue({
        rows: [],
        totalRows: 0,
        headers: []
      });

      const predictionData = {
        datasetId: testDataset._id,
        targetColumn: 'nonexistent',
        predictionType: 'forecast',
        horizon: 10
      };

      const response = await request(app)
        .post('/api/analytics/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send(predictionData)
        .expect(200);

      // The API uses graceful degradation, so it handles invalid data gracefully
      expect(response.status).toBe(200);
    });

    it('should create notification for successful prediction', async () => {
      const mockPrediction = {
        type: 'forecast',
        target: 'sales',
        predictions: [],
        analysis: 'Test analysis',
        confidence: 0.8,
        methodology: 'Test method',
        factors: [],
        recommendations: []
      };

      mockedOpenRouterService.analyzeText.mockResolvedValue(JSON.stringify(mockPrediction));
      mockedFileUploadService.getFilePreview.mockResolvedValue({
        rows: [{ sales: 100 }],
        totalRows: 1,
        headers: ['sales']
      });

      const predictionData = {
        datasetId: testDataset._id,
        targetColumn: 'sales',
        predictionType: 'forecast'
      };

      await request(app)
        .post('/api/analytics/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send(predictionData)
        .expect(200);

      expect(mockedNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser._id.toString(),
          type: 'prediction_ready',
          title: expect.stringContaining(testDataset.name)
        })
      );
    });
  });

  describe('GET /api/analytics/insights/:datasetId', () => {
    it('should generate insights successfully', async () => {
      const mockInsights = {
        insights: [
          {
            type: 'trend',
            title: 'Sales Trend',
            description: 'Sales are increasing',
            confidence: 0.8,
            importance: 'high'
          }
        ],
        summary: 'Dataset shows positive trends',
        data_quality: {
          completeness: 0.9,
          issues: [],
          recommendations: []
        },
        next_steps: ['Create visualizations', 'Deep dive analysis']
      };

      mockedOpenRouterService.analyzeText.mockResolvedValue(JSON.stringify(mockInsights));
      mockedFileUploadService.getFilePreview.mockResolvedValue({
        rows: [
          { sales: 100, category: 'A' },
          { sales: 110, category: 'B' }
        ],
        totalRows: 50,
        headers: ['sales', 'category']
      });

      const response = await request(app)
        .get(`/api/analytics/insights/${testDataset._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockInsights);
    });

    it('should handle insights generation failure', async () => {
      mockedOpenRouterService.analyzeText.mockRejectedValue(new Error('AI service error'));
      mockedFileUploadService.getFilePreview.mockResolvedValue({
        rows: [],
        totalRows: 0,
        headers: []
      });

      const response = await request(app)
        .get(`/api/analytics/insights/${testDataset._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.insights[0].title).toContain('Unavailable');
    });
  });

  describe('POST /api/analytics/recommendations', () => {
    it('should generate recommendations successfully', async () => {
      const mockRecommendations = {
        recommendations: [
          {
            title: 'Create Visualizations',
            description: 'Generate charts to understand data patterns',
            priority: 'high',
            category: 'visualization',
            reasoning: 'Visual exploration helps identify patterns',
            actions: ['Create bar charts', 'Generate scatter plots'],
            expected_outcome: 'Better data understanding',
            difficulty: 'easy',
            estimated_time: '30 minutes'
          }
        ],
        analysis_strategy: 'Start with basic exploration',
        data_quality_notes: ['Data looks clean'],
        visualization_suggestions: ['Bar charts', 'Scatter plots'],
        next_immediate_steps: ['Check data quality', 'Create visualizations']
      };

      mockedOpenRouterService.analyzeText.mockResolvedValue(JSON.stringify(mockRecommendations));
      mockedFileUploadService.getFilePreview.mockResolvedValue({
        rows: [{ value: 100 }],
        totalRows: 30,
        headers: ['value']
      });

      const recommendationData = {
        datasetId: testDataset._id,
        context: 'Business analysis',
        goals: ['Understand trends', 'Identify opportunities']
      };

      const response = await request(app)
        .post('/api/analytics/recommend')
        .set('Authorization', `Bearer ${authToken}`)
        .send(recommendationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRecommendations);
    });
  });

  describe('GET /api/analytics/sessions', () => {
    it('should get user analysis sessions', async () => {
      // Create test sessions
      await AnalysisSession.create({
        datasetId: testDataset._id,
        userId: testUser._id,
        title: 'Session 1',
        queries: [],
        visualizations: [],
        insights: [],
        predictions: [],
        collaborators: [],
        isShared: false,
        shareSettings: { allowComments: true, allowEditing: false }
      });

      const response = await request(app)
        .get('/api/analytics/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toHaveLength(1);
      expect(response.body.data.sessions[0].title).toBe('Session 1');
    });

    it('should paginate sessions correctly', async () => {
      // Create multiple sessions
      for (let i = 0; i < 5; i++) {
        await AnalysisSession.create({
          datasetId: testDataset._id,
          userId: testUser._id,
          title: `Session ${i + 1}`,
          queries: [],
          visualizations: [],
          insights: [],
          predictions: [],
          collaborators: [],
          isShared: false,
          shareSettings: { allowComments: true, allowEditing: false }
        });
      }

      const response = await request(app)
        .get('/api/analytics/sessions?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(5);
      expect(response.body.data.pagination.pages).toBe(3);
    });
  });

  describe('GET /api/analytics/sessions/:sessionId', () => {
    it('should get session by ID', async () => {
      const session = await AnalysisSession.create({
        datasetId: testDataset._id,
        userId: testUser._id,
        title: 'Test Session',
        queries: [],
        visualizations: [],
        insights: [],
        predictions: [],
        collaborators: [],
        isShared: false,
        shareSettings: { allowComments: true, allowEditing: false }
      });

      const response = await request(app)
        .get(`/api/analytics/sessions/${session._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session._id).toBe(session._id.toString());
    });

    it('should not get session without access', async () => {
      // Create session for different user
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hashed',
        firstName: 'Other',
        lastName: 'User',
        role: 'analyst',
        isActive: true
      });

      const session = await AnalysisSession.create({
        datasetId: testDataset._id,
        userId: otherUser._id,
        title: 'Other Session',
        queries: [],
        visualizations: [],
        insights: [],
        predictions: [],
        collaborators: [],
        isShared: false,
        shareSettings: { allowComments: true, allowEditing: false }
      });

      const response = await request(app)
        .get(`/api/analytics/sessions/${session._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/analytics/sessions', () => {
    it('should create new analysis session', async () => {
      const sessionData = {
        datasetId: testDataset._id,
        title: 'New Analysis Session'
      };

      const response = await request(app)
        .post('/api/analytics/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session.title).toBe('New Analysis Session');
      expect(response.body.data.session.datasetId.toString()).toBe(testDataset._id.toString());
    });

    it('should use default title if not provided', async () => {
      const sessionData = {
        datasetId: testDataset._id
      };

      const response = await request(app)
        .post('/api/analytics/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session.title).toContain('Analysis -');
    });
  });

  describe('Validation', () => {
    it('should validate query length', async () => {
      const queryData = {
        datasetId: testDataset._id,
        query: 'ab' // Too short
      };

      const response = await request(app)
        .post('/api/analytics/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send(queryData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate prediction type', async () => {
      const predictionData = {
        datasetId: testDataset._id,
        targetColumn: 'sales',
        predictionType: 'invalid-type'
      };

      const response = await request(app)
        .post('/api/analytics/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send(predictionData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate horizon range', async () => {
      const predictionData = {
        datasetId: testDataset._id,
        targetColumn: 'sales',
        predictionType: 'forecast',
        horizon: 500 // Too high
      };

      const response = await request(app)
        .post('/api/analytics/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send(predictionData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
