import { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog';
import { dataEncryption } from '../utils/encryption';
import { logger } from '../config/logger';
import { body, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

export class SecurityController {
  // Get audit logs (admin only)
  static getAuditLogs = [
    authenticate,
    requireRole('admin'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('action').optional().isString(),
    query('userId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('riskLevel').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('complianceRequirement').optional().isIn(['GDPR', 'SOX', 'HIPAA', 'ISO27001']),
    
    async (req: Request, res: Response): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({
            success: false,
            errors: errors.array()
          });
          return;
        }

        const {
          page = 1,
          limit = 20,
          action,
          userId,
          startDate,
          endDate,
          riskLevel,
          complianceRequirement
        } = req.query;

        // Build filter query
        const filter: any = {};
        
        if (action) filter.action = { $regex: action, $options: 'i' };
        if (userId) filter.userId = userId;
        if (riskLevel) filter.riskLevel = riskLevel;
        if (complianceRequirement) {
          filter.complianceRequirements = complianceRequirement;
        }
        
        if (startDate || endDate) {
          filter.timestamp = {};
          if (startDate) filter.timestamp.$gte = new Date(startDate as string);
          if (endDate) filter.timestamp.$lte = new Date(endDate as string);
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [auditLogs, total] = await Promise.all([
          AuditLog.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('userId', 'name email role')
            .lean(),
          AuditLog.countDocuments(filter)
        ]);

        // Log this audit query
        await (AuditLog as any).logSecurityEvent(
          'audit_logs_accessed',
          {
            filters: filter,
            resultCount: auditLogs.length,
            page: Number(page),
            limit: Number(limit),
            userId: req.user?.id
          },
          req
        );

        res.json({
          success: true,
          data: {
            auditLogs,
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total,
              pages: Math.ceil(total / Number(limit))
            }
          }
        });
      } catch (error) {
        logger.error('Failed to fetch audit logs:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch audit logs'
        });
      }
    }
  ];

  // Get audit log statistics (admin only)
  static getAuditStats = [
    authenticate,
    requireRole('admin'),
    query('timeRange').optional().isIn(['24h', '7d', '30d', '90d']),
    
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { timeRange = '24h' } = req.query;
        
        // Calculate date range
        const now = new Date();
        const ranges: { [key: string]: Date } = {
          '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
          '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        };
        
        const startDate = ranges[timeRange as string];

        const [
          totalEvents,
          riskDistribution,
          actionDistribution,
          complianceStats,
          recentHighRisk
        ] = await Promise.all([
          // Total events in time range
          AuditLog.countDocuments({
            timestamp: { $gte: startDate }
          }),
          
          // Risk level distribution
          AuditLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
          ]),
          
          // Action distribution
          AuditLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ]),
          
          // Compliance requirements stats
          AuditLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            { $unwind: '$complianceRequirements' },
            { $group: { _id: '$complianceRequirements', count: { $sum: 1 } } }
          ]),
          
          // Recent high-risk events
          AuditLog.find({
            timestamp: { $gte: startDate },
            riskLevel: { $in: ['high', 'critical'] }
          })
            .sort({ timestamp: -1 })
            .limit(5)
            .populate('userId', 'name email')
            .lean()
        ]);

        res.json({
          success: true,
          data: {
            timeRange,
            totalEvents,
            riskDistribution,
            actionDistribution,
            complianceStats,
            recentHighRisk
          }
        });
      } catch (error) {
        logger.error('Failed to fetch audit statistics:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch audit statistics'
        });
      }
    }
  ];

  // Get encryption status (admin only)
  static getEncryptionStatus = [
    authenticate,
    requireRole('admin'),
    
    async (req: Request, res: Response): Promise<void> => {
      try {
        const status = dataEncryption.getEncryptionStatus();
        
        // Log encryption status check
        await (AuditLog as any).logSecurityEvent(
          'encryption_status_checked',
          { 
            status,
            userId: req.user?.id
          },
          req
        );

        res.json({
          success: true,
          data: status
        });
      } catch (error) {
        logger.error('Failed to get encryption status:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get encryption status'
        });
      }
    }
  ];

  // Rotate encryption keys (admin only)
  static rotateEncryptionKeys = [
    authenticate,
    requireRole('admin'),
    
    async (req: Request, res: Response): Promise<void> => {
      try {
        const newKeyId = await dataEncryption.rotateKeys();
        
        // Log key rotation
        await (AuditLog as any).logSecurityEvent(
          'encryption_keys_rotated',
          { 
            newKeyId,
            userId: req.user?.id
          },
          req
        );

        res.json({
          success: true,
          message: 'Encryption keys rotated successfully',
          data: { newKeyId }
        });
      } catch (error) {
        logger.error('Failed to rotate encryption keys:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to rotate encryption keys'
        });
      }
    }
  ];

  // Clean up old encryption keys (admin only)
  static cleanupOldKeys = [
    authenticate,
    requireRole('admin'),
    body('retainDays').optional().isInt({ min: 1, max: 365 }).toInt(),
    
    async (req: Request, res: Response): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          logger.error('Validation errors in cleanupOldKeys:', errors.array());
          res.status(400).json({
            success: false,
            errors: errors.array()
          });
          return;
        }

        const { retainDays = 30 } = req.body;
        logger.info(`Attempting to cleanup old keys with retainDays: ${retainDays}`);
        
        const deletedCount = dataEncryption.cleanupOldKeys(retainDays);
        logger.info(`Successfully cleaned up ${deletedCount} old encryption keys`);
        
        // Log key cleanup
        await (AuditLog as any).logSecurityEvent(
          'encryption_keys_cleaned',
          { 
            retainDays, 
            deletedCount,
            userId: req.user?.id
          },
          req
        );

        res.json({
          success: true,
          message: `Cleaned up ${deletedCount} old encryption keys`,
          data: { deletedCount, retainDays }
        });
      } catch (error) {
        logger.error('Failed to cleanup old keys:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to cleanup old keys',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  ];

  // Test encryption (admin only - for testing purposes)
  static testEncryption = [
    authenticate,
    requireRole('admin'),
    body('testData').isString().notEmpty(),
    
    async (req: Request, res: Response): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({
            success: false,
            errors: errors.array()
          });
          return;
        }

        const { testData } = req.body;
        
        // Encrypt test data
        const encrypted = await dataEncryption.encryptData(testData);
        
        // Decrypt test data
        const decrypted = await dataEncryption.decryptData(encrypted);
        
        const success = decrypted === testData;
        
        // Log encryption test
        await (AuditLog as any).logSecurityEvent(
          'encryption_test_performed',
          { 
            success, 
            algorithm: encrypted.algorithm,
            userId: req.user?.id
          },
          req
        );

        res.json({
          success: true,
          data: {
            testPassed: success,
            encryptionDetails: {
              algorithm: encrypted.algorithm,
              keyId: encrypted.keyId,
              timestamp: encrypted.timestamp
            }
          }
        });
      } catch (error) {
        logger.error('Encryption test failed:', error);
        res.status(500).json({
          success: false,
          message: 'Encryption test failed'
        });
      }
    }
  ];

  // Get security compliance report (admin only)
  static getComplianceReport = [
    authenticate,
    requireRole('admin'),
    query('standard').optional().isIn(['GDPR', 'SOX', 'HIPAA', 'ISO27001']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { standard, startDate, endDate } = req.query;
        
        // Build date filter
        const dateFilter: any = {};
        if (startDate || endDate) {
          dateFilter.timestamp = {};
          if (startDate) dateFilter.timestamp.$gte = new Date(startDate as string);
          if (endDate) dateFilter.timestamp.$lte = new Date(endDate as string);
        }

        // Build compliance filter
        const complianceFilter = {
          ...dateFilter,
          ...(standard && { complianceRequirements: standard })
        };

        const [
          complianceEvents,
          riskBreakdown,
          actionSummary
        ] = await Promise.all([
          AuditLog.find(complianceFilter)
            .sort({ timestamp: -1 })
            .populate('userId', 'name email role')
            .lean(),
            
          AuditLog.aggregate([
            { $match: complianceFilter },
            { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
          ]),
          
          AuditLog.aggregate([
            { $match: complianceFilter },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ])
        ]);

        // Log compliance report generation
        await (AuditLog as any).logSecurityEvent(
          'compliance_report_generated',
          { 
            standard, 
            eventCount: complianceEvents.length,
            userId: req.user?.id
          },
          req
        );

        res.json({
          success: true,
          data: {
            standard,
            period: { startDate, endDate },
            totalEvents: complianceEvents.length,
            events: complianceEvents,
            riskBreakdown,
            actionSummary
          }
        });
      } catch (error) {
        logger.error('Failed to generate compliance report:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to generate compliance report'
        });
      }
    }
  ];
}