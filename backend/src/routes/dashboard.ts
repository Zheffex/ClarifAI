import { Router } from 'express';
import {
  getDashboardStats,
  getRecentActivity,
  getDashboardOverview
} from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get dashboard statistics
router.get('/stats', getDashboardStats);

// Get recent activity feed
router.get('/activity', getRecentActivity);

// Get complete dashboard overview (stats + recent items)
router.get('/overview', getDashboardOverview);

export default router;