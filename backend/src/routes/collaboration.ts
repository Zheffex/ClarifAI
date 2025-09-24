import { Router, Request, Response, NextFunction } from 'express';
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
  getShareInfo,
  validateShareResource,
  validateAddComment,
  validateAddAnnotation,
  handleValidationErrors
} from '../controllers/collaborationController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// Get user's collaborations - must come before /:id to avoid conflicts
router.get('/',
  authenticate,
  requirePermission('collaboration:read'),
  getUserCollaborations
);

// Get public collaborations - specific route before /:id
router.get('/public/list',
  optionalAuth,
  getPublicCollaborations
);

// Get sharing options/status - must come before /:id
router.get('/share',
  authenticate,
  requirePermission('collaboration:read'),
  getShareInfo  // Use the dedicated function without validation
);

// Share a resource
router.post('/share',
  authenticate,
  requirePermission('collaboration:create'),
  validateShareResource,
  handleValidationErrors,
  shareResource
);

// Real-time collaboration endpoints - must come before /:id

// Get active room participants
router.get('/room/:roomId/participants',
  authenticate,
  requirePermission('collaboration:read'),
  getRoomParticipants
);

// Update user permissions in real-time
router.put('/permissions',
  authenticate,
  // Custom authorization: check collaboration ownership or admin permissions
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const { collaborationId } = req.body;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      if (!collaborationId) {
        throw new Error('Collaboration ID is required');
      }
      
      // Import modules inside the middleware to avoid circular dependencies
      const { Collaboration } = await import('../models/Collaboration');
      const { hasPermission } = await import('../middleware/rbac');
      
      const collaboration = await Collaboration.findById(collaborationId);
      if (!collaboration) {
        throw new Error('Collaboration not found');
      }
      
      // Check if user is owner (owners have all permissions)
      if (collaboration.ownerId.equals(user._id)) {
        return next();
      }
      
      // Check if user has the global update permission (analysts have this)
      if (hasPermission(user, 'collaboration:update')) {
        return next();
      }
      
      // Check if user has the global admin permission
      if (hasPermission(user, 'collaboration:admin')) {
        return next();
      }
      
      // Check if user has collaboration-specific admin permission
      if (collaboration.hasPermission(user._id.toString(), 'admin')) {
        return next();
      }
      
      throw new Error('Access denied. Required permission: collaboration ownership, collaboration:update, collaboration:admin, or collaboration admin role');
    } catch (error: any) {
      const { AppError } = await import('../middleware/errorHandler');
      next(new AppError(error.message, 403));
    }
  },
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
  // Custom authorization: check collaboration ownership or admin permissions
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const { collaborationId } = req.body;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      if (!collaborationId) {
        throw new Error('Collaboration ID is required');
      }
      
      // Import modules inside the middleware to avoid circular dependencies
      const { Collaboration } = await import('../models/Collaboration');
      const { hasPermission } = await import('../middleware/rbac');
      
      const collaboration = await Collaboration.findById(collaborationId);
      if (!collaboration) {
        throw new Error('Collaboration not found');
      }
      
      // Check if user is owner (owners have all permissions)
      if (collaboration.ownerId.equals(user._id)) {
        return next();
      }
      
      // Check if user has the global update permission (analysts have this)
      if (hasPermission(user, 'collaboration:update')) {
        return next();
      }
      
      // Check if user has the global admin permission
      if (hasPermission(user, 'collaboration:admin')) {
        return next();
      }
      
      // Check if user has collaboration-specific admin permission
      if (collaboration.hasPermission(user._id.toString(), 'admin')) {
        return next();
      }
      
      throw new Error('Access denied. Required permission: collaboration ownership, collaboration:update, collaboration:admin, or collaboration admin role');
    } catch (error: any) {
      const { AppError } = await import('../middleware/errorHandler');
      next(new AppError(error.message, 403));
    }
  },
  kickUser
);

// Send real-time notification
router.post('/notify',
  authenticate,
  requirePermission('collaboration:comment'),
  sendNotification
);

// Get collaboration details - must come after more specific routes
router.get('/:id',
  authenticate,
  requirePermission('collaboration:read'),
  getCollaboration
);

// Add comment to collaboration
router.post('/:id/comment',
  authenticate,
  // Custom authorization: check collaboration ownership or user permissions
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const collaborationId = req.params.id;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      // Import modules inside the middleware to avoid circular dependencies
      const { Collaboration } = await import('../models/Collaboration');
      const { hasPermission } = await import('../middleware/rbac');
      
      const collaboration = await Collaboration.findById(collaborationId);
      if (!collaboration) {
        throw new Error('Collaboration not found');
      }
      
      // Check if user is owner (owners have all permissions)
      if (collaboration.ownerId.equals(user._id)) {
        return next();
      }
      
      // Check if user has the general permission
      if (hasPermission(user, 'collaboration:comment')) {
        return next();
      }
      
      // Check if user has collaboration-specific permission
      if (collaboration.hasPermission(user._id.toString(), 'comment')) {
        return next();
      }
      
      throw new Error('Access denied. Required permission: collaboration:comment');
    } catch (error: any) {
      const { AppError } = await import('../middleware/errorHandler');
      next(new AppError(error.message, 403));
    }
  },
  validateAddComment,
  handleValidationErrors,
  addComment
);

// Add annotation to collaboration
router.put('/:id/annotation',
  authenticate,
  // Custom authorization: check collaboration ownership or user permissions
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const collaborationId = req.params.id;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      // Import modules inside the middleware to avoid circular dependencies
      const { Collaboration } = await import('../models/Collaboration');
      const { hasPermission } = await import('../middleware/rbac');
      
      const collaboration = await Collaboration.findById(collaborationId);
      if (!collaboration) {
        throw new Error('Collaboration not found');
      }
      
      // Check if user is owner (owners have all permissions)
      if (collaboration.ownerId.equals(user._id)) {
        return next();
      }
      
      // Check if user has the general permission
      if (hasPermission(user, 'collaboration:annotate')) {
        return next();
      }
      
      // Check if user has collaboration-specific permission
      if (collaboration.hasPermission(user._id.toString(), 'annotate')) {
        return next();
      }
      
      throw new Error('Access denied. Required permission: collaboration:annotate');
    } catch (error: any) {
      const { AppError } = await import('../middleware/errorHandler');
      next(new AppError(error.message, 403));
    }
  },
  validateAddAnnotation,
  handleValidationErrors,
  addAnnotation
);

// Update collaboration settings
router.put('/:id',
  authenticate,
  // Custom authorization: check collaboration ownership or user permissions
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const collaborationId = req.params.id;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      // Import modules inside the middleware to avoid circular dependencies
      const { Collaboration } = await import('../models/Collaboration');
      const { hasPermission } = await import('../middleware/rbac');
      
      const collaboration = await Collaboration.findById(collaborationId);
      if (!collaboration) {
        throw new Error('Collaboration not found');
      }
      
      // Check if user is owner (owners have all permissions)
      if (collaboration.ownerId.equals(user._id)) {
        return next();
      }
      
      // Check if user has the general permission
      if (hasPermission(user, 'collaboration:update')) {
        return next();
      }
      
      // Check if user has collaboration-specific admin permission
      if (collaboration.hasPermission(user._id.toString(), 'admin')) {
        return next();
      }
      
      throw new Error('Access denied. Required permission: collaboration:update or ownership');
    } catch (error: any) {
      const { AppError } = await import('../middleware/errorHandler');
      next(new AppError(error.message, 403));
    }
  },
  updateCollaboration
);

// End collaboration
router.delete('/:id',
  authenticate,
  // Custom authorization: check collaboration ownership or user permissions
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const collaborationId = req.params.id;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      // Import modules inside the middleware to avoid circular dependencies
      const { Collaboration } = await import('../models/Collaboration');
      const { hasPermission } = await import('../middleware/rbac');
      
      const collaboration = await Collaboration.findById(collaborationId);
      if (!collaboration) {
        throw new Error('Collaboration not found');
      }
      
      // Check if user is owner (owners have all permissions)
      if (collaboration.ownerId.equals(user._id)) {
        return next();
      }
      
      // Check if user has the general permission
      if (hasPermission(user, 'collaboration:delete')) {
        return next();
      }
      
      // Check if user has collaboration-specific admin permission
      if (collaboration.hasPermission(user._id.toString(), 'admin')) {
        return next();
      }
      
      throw new Error('Access denied. Required permission: collaboration:delete or ownership');
    } catch (error: any) {
      const { AppError } = await import('../middleware/errorHandler');
      next(new AppError(error.message, 403));
    }
  },
  endCollaboration
);



export default router;