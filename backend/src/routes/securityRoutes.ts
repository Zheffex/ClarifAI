import { Router } from 'express';
import { SecurityController } from '../controllers/securityController';
import { auditLog } from '../middleware/auditMiddleware';

const router = Router();

// Apply audit middleware to all security routes
router.use(auditLog({ category: 'security', sensitive: true }));

// Audit log management routes
router.get('/audit-logs', SecurityController.getAuditLogs);
router.get('/audit-stats', SecurityController.getAuditStats);
router.get('/compliance-report', SecurityController.getComplianceReport);

// Encryption management routes
router.get('/encryption/status', SecurityController.getEncryptionStatus);
router.post('/encryption/rotate-keys', SecurityController.rotateEncryptionKeys);
router.post('/encryption/cleanup-keys', SecurityController.cleanupOldKeys);
router.post('/encryption/test', SecurityController.testEncryption);

export { router as securityRoutes };