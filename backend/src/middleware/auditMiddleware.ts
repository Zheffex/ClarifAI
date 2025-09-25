import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';
import { IUser } from '../models/User';
import { logger } from '../config/logger';

interface AuditOptions {
  action?: string;
  category?: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_config' | 'user_management' | 'file_operation' | 'security';
  resourceType?: 'user' | 'dataset' | 'analysis' | 'collaboration' | 'notification' | 'system';
  sensitive?: boolean;
  skipSuccessful?: boolean;
  extractResourceId?: (req: Request) => string | undefined;
  extractDetails?: (req: Request, res: Response) => Record<string, any>;
}

class AuditMiddleware {
  // Main audit logging middleware
  static auditLog(options: AuditOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const startTime = Date.now();
      const user = req.user as IUser;
      
      // Create audit log entry
      try {
        const auditLog = new AuditLog({
          action: options.action || `${req.method.toLowerCase()}_${req.path.split('/')[1] || 'unknown'}`,
          category: options.category || 'data_access',
          userId: user?._id?.toString(),
          userEmail: user?.email,
          userRole: user?.role,
          targetType: options.resourceType,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          method: req.method,
          endpoint: req.originalUrl || req.url,
          statusCode: 200, // Will be updated on response
          details: {
            requestSize: parseInt(req.headers['content-length'] || '0'),
            query: req.query,
            bodyKeys: req.body ? Object.keys(req.body) : [],
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer')
          },
          metadata: {
            duration: 0, // Will be updated on response
            riskLevel: options.sensitive ? 'high' : 'low',
            compliance: ['GDPR']
          },
          timestamp: new Date()
        });

        // Update on response finish
        res.on('finish', async () => {
          try {
            auditLog.statusCode = res.statusCode;
            auditLog.metadata.duration = Date.now() - startTime;
            await auditLog.save();
          } catch (error) {
            logger.error('Failed to save audit log:', error);
          }
        });
      } catch (error) {
        logger.error('Failed to create audit log:', error);
      }

      next();
    };
  }
}

export default AuditMiddleware;

// Export commonly used audit middlewares
export const auditLog = AuditMiddleware.auditLog;