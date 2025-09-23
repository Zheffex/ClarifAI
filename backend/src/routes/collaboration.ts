import { Router } from 'express';
import {
  shareResource,
  getCollaboration,
  addComment,
  addAnnotation,
  updateCollaboration,
  endCollaboration,
  getUserCollaborations,
  getPublicCollaborations,
  getRoomParticipants,
  updateUserPermissions,
  getCollaborationStatus,
  kickUser,
  sendNotification,
  validateShareResource,
  validateAddComment,
  validateAddAnnotation,
  handleValidationErrors
} from '../controllers/collaborationController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// Share a resource
router.post('/share',
  authenticate,
  requirePermission('collaboration:create'),
  validateShareResource,
  handleValidationErrors,
  shareResource
);

// Get collaboration details
router.get('/:id',
  authenticate,
  requirePermission('collaboration:read'),
  getCollaboration
);

// Add comment to collaboration
router.post('/:id/comment',
  authenticate,
  requirePermission('collaboration:comment'),
  validateAddComment,
  handleValidationErrors,
  addComment
);

// Add annotation to collaboration
router.put('/:id/annotation',
  authenticate,
  requirePermission('collaboration:annotate'),
  validateAddAnnotation,
  handleValidationErrors,
  addAnnotation
);

// Update collaboration settings
router.put('/:id',
  authenticate,
  requirePermission('collaboration:update'),
  updateCollaboration
);

// End collaboration
router.delete('/:id',
  authenticate,
  requirePermission('collaboration:delete'),
  endCollaboration
);

// Get user's collaborations
router.get('/',
  authenticate,
  requirePermission('collaboration:read'),
  getUserCollaborations
);

// Get public collaborations
router.get('/public/list',
  optionalAuth,
  getPublicCollaborations
);

// Real-time collaboration endpoints

// Get active room participants
router.get('/room/:roomId/participants',
  authenticate,
  requirePermission('collaboration:read'),
  getRoomParticipants
);

// Update user permissions in real-time
router.put('/permissions',
  authenticate,
  requirePermission('collaboration:admin'),
  updateUserPermissions
);

// Get real-time collaboration status
router.get('/status/:resourceType/:resourceId',
  authenticate,
  requirePermission('collaboration:read'),
  getCollaborationStatus
);

// Kick user from collaboration
router.post('/kick',
  authenticate,
  requirePermission('collaboration:admin'),
  kickUser
);

// Send real-time notification
router.post('/notify',
  authenticate,
  requirePermission('collaboration:comment'),
  sendNotification
);

export default router;