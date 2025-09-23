import { Router } from 'express';
import {
  processQuery,
  generatePrediction,
  getInsights,
  getRecommendations,
  getSessions,
  getSessionById,
  createSession,
  validateQuery,
  validatePrediction,
  validateRecommendations,
  validateCreateSession,
  handleValidationErrors
} from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Process natural language query
router.post('/query',
  requirePermission('analytics:create'),
  validateQuery,
  handleValidationErrors,
  processQuery
);

// Generate predictions
router.post('/predict',
  requirePermission('analytics:create'),
  validatePrediction,
  handleValidationErrors,
  generatePrediction
);

// Get auto-generated insights for dataset
router.get('/insights/:datasetId',
  requirePermission('analytics:read'),
  getInsights
);

// Get recommendations based on analysis
router.post('/recommend',
  requirePermission('analytics:read'),
  validateRecommendations,
  handleValidationErrors,
  getRecommendations
);

// Get user's analysis sessions
router.get('/sessions',
  requirePermission('analytics:read'),
  getSessions
);

// Create new analysis session
router.post('/sessions',
  requirePermission('analytics:create'),
  validateCreateSession,
  handleValidationErrors,
  createSession
);

// Get analysis session by ID
router.get('/sessions/:sessionId',
  requirePermission('analytics:read'),
  getSessionById
);

export default router;