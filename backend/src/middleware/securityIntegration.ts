// Security middleware integration for ClarifAI Backend
// This file consolidates all security features for easy application

import { Express } from 'express';
import { advancedRateLimitService } from './advancedRateLimit';
import { auditLog } from './auditMiddleware';
import { dataEncryption } from '../utils/encryption';
import { logger } from '../config/logger';
import { env } from '../config/environment';

export class SecurityIntegration {
  /**
   * Apply comprehensive security middleware to Express app
   */
  static applySecurityMiddleware(app: Express): void {
    logger.info('Applying advanced security middleware...');

    // 1. Advanced rate limiting per user/organization
    const userRateLimit = advancedRateLimitService.createUserRateLimiter(60 * 1000);
    app.use('/api', userRateLimit);
    
    // 2. Audit logging for sensitive operations
    app.use('/api/auth', auditLog({ category: 'authentication' }));
    app.use('/api/datasets', auditLog({ category: 'data_access' }));
    app.use('/api/analytics', auditLog({ category: 'data_access' }));
    app.use('/api/security', auditLog({ category: 'security', sensitive: true }));
    
    logger.info('✅ Advanced security middleware applied successfully');
  }

  /**
   * Initialize security services
   */
  static async initializeSecurityServices(): Promise<void> {
    try {
      logger.info('Initializing security services...');

      // Check encryption status
      const encryptionStatus = dataEncryption.getEncryptionStatus();
      if (encryptionStatus.isConfigured) {
        logger.info('✅ Data encryption service initialized');
        logger.info(`   Algorithm: ${encryptionStatus.algorithm}`);
        logger.info(`   Current Key ID: ${encryptionStatus.currentKeyId}`);
      } else {
        logger.warn('⚠️  Data encryption not fully configured');
      }

      // Test PII encryption
      try {
        const testData = { email: 'test@example.com', phone: '+1234567890' };
        const encrypted = await dataEncryption.encryptFields(testData, ['email', 'phone']);
        const decrypted = await dataEncryption.decryptFields(encrypted, ['email', 'phone']);
        
        if (decrypted.email === testData.email && decrypted.phone === testData.phone) {
          logger.info('✅ PII encryption service verified');
        } else {
          logger.error('❌ PII encryption verification failed');
        }
      } catch (error) {
        logger.error('❌ PII encryption test failed:', error);
      }

      logger.info('🔒 Security services initialization complete');
    } catch (error) {
      logger.error('Failed to initialize security services:', error);
      throw error;
    }
  }

  /**
   * Get security configuration summary
   */
  static getSecurityConfig(): {
    rateLimit: boolean;
    auditLogging: boolean;
    encryption: boolean;
    complianceReady: boolean;
  } {
    const encryptionStatus = dataEncryption.getEncryptionStatus();
    
    return {
      rateLimit: !!(env as any).security?.redisUrl,
      auditLogging: true, // Always enabled
      encryption: encryptionStatus.isConfigured,
      complianceReady: encryptionStatus.isConfigured && !!(env as any).security?.redisUrl
    };
  }

  /**
   * Encrypt sensitive user data before saving to database
   */
  static async encryptSensitiveData<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: string[] = ['email', 'phone', 'address', 'firstName', 'lastName']
  ): Promise<T> {
    try {
      return await dataEncryption.encryptFields(data, fieldsToEncrypt) as T;
    } catch (error) {
      logger.error('Failed to encrypt sensitive data:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive user data when retrieving from database
   */
  static async decryptSensitiveData<T extends Record<string, any>>(
    data: T,
    fieldsToDecrypt: string[] = ['email', 'phone', 'address', 'firstName', 'lastName']
  ): Promise<T> {
    try {
      return await dataEncryption.decryptFields(data, fieldsToDecrypt) as T;
    } catch (error) {
      logger.error('Failed to decrypt sensitive data:', error);
      throw error;
    }
  }

  /**
   * Generate secure random tokens for API keys, session tokens, etc.
   */
  static generateSecureToken(length: number = 32): string {
    return dataEncryption.generateSecureToken(length);
  }

  /**
   * Hash passwords or other sensitive data
   */
  static hashSensitiveData(data: string, saltRounds: number = 12): string {
    return dataEncryption.hashData(data, saltRounds);
  }

  /**
   * Verify hashed data
   */
  static verifySensitiveData(data: string, hash: string): boolean {
    return dataEncryption.verifyHash(data, hash);
  }
}

// Export utility functions for easy access
export const {
  encryptSensitiveData,
  decryptSensitiveData,
  generateSecureToken,
  hashSensitiveData,
  verifySensitiveData
} = SecurityIntegration;

// Export encryption instances for direct use
export { dataEncryption };