import * as crypto from 'crypto';
import * as CryptoJS from 'crypto-js';
import * as forge from 'node-forge';
import { env } from '../config/environment';
import { logger } from '../config/logger';

interface EncryptionResult {
  encryptedData: string;
  iv?: string;
  salt?: string;
  keyId?: string;
  algorithm: string;
  timestamp: string;
}

interface DecryptionOptions {
  encryptedData: string;
  iv?: string;
  salt?: string;
  keyId?: string;
  algorithm: string;
}

class DataEncryption {
  private readonly algorithm = 'aes-256-cbc'; // Using CBC instead of GCM for better compatibility
  private readonly keyDerivationIterations = 100000;
  private readonly saltLength = 32;
  private readonly ivLength = 16;
  
  private masterKey: string;
  private keyRotationEnabled: boolean = true;
  private currentKeyId: string;
  private keyStore: Map<string, string> = new Map();

  constructor() {
    // Get encryption config from environment, or generate defaults
    const encryptionConfig = (env as any).encryption || {};
    this.masterKey = encryptionConfig.masterKey || this.generateMasterKey();
    this.currentKeyId = encryptionConfig.currentKeyId || 'default';
    this.initializeKeyStore();
  }

  // Initialize key store with current and rotated keys
  private initializeKeyStore(): void {
    this.keyStore.set(this.currentKeyId, this.masterKey);
    
    // Load additional keys from environment if available
    const encryptionConfig = (env as any).encryption || {};
    if (encryptionConfig.keys) {
      Object.entries(encryptionConfig.keys).forEach(([keyId, key]) => {
        this.keyStore.set(keyId, key as string);
      });
    }
  }

  // Generate a secure master key
  private generateMasterKey(): string {
    const key = crypto.randomBytes(32).toString('base64');
    logger.warn('Generated new master key - please save this securely:', key);
    return key;
  }

  // Derive encryption key from master key and salt
  private deriveKey(masterKey: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(masterKey, salt, this.keyDerivationIterations, 32, 'sha256');
  }

  // Encrypt sensitive data using AES-256-CBC
  async encryptData(data: string | object, fieldLevel: boolean = false): Promise<EncryptionResult> {
    try {
      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Generate salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Derive key
      const derivedKey = this.deriveKey(this.masterKey, salt);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);
      
      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      return {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        keyId: this.currentKeyId,
        algorithm: this.algorithm,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Data encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt sensitive data
  async decryptData(options: DecryptionOptions): Promise<string> {
    try {
      const { encryptedData, iv, salt, keyId = 'default', algorithm } = options;
      
      if (!iv || !salt) {
        throw new Error('Missing encryption parameters');
      }

      // Get the appropriate key
      const masterKey = this.keyStore.get(keyId);
      if (!masterKey) {
        throw new Error(`Encryption key not found for keyId: ${keyId}`);
      }

      // Convert base64 strings back to buffers
      const ivBuffer = Buffer.from(iv, 'base64');
      const saltBuffer = Buffer.from(salt, 'base64');
      
      // Derive key
      const derivedKey = this.deriveKey(masterKey, saltBuffer);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(algorithm, derivedKey, ivBuffer);
      
      // Decrypt data
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Data decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Encrypt specific fields in an object
  async encryptFields(data: Record<string, any>, fieldsToEncrypt: string[]): Promise<Record<string, any>> {
    const result = { ...data };
    
    for (const field of fieldsToEncrypt) {
      if (result[field] !== undefined && result[field] !== null) {
        const encrypted = await this.encryptData(result[field], true);
        result[field] = {
          __encrypted: true,
          ...encrypted
        };
      }
    }
    
    return result;
  }

  // Decrypt specific fields in an object
  async decryptFields(data: Record<string, any>, fieldsToDecrypt: string[]): Promise<Record<string, any>> {
    const result = { ...data };
    
    for (const field of fieldsToDecrypt) {
      if (result[field] && result[field].__encrypted) {
        const decrypted = await this.decryptData(result[field]);
        result[field] = decrypted;
      }
    }
    
    return result;
  }

  // Hash sensitive data (one-way)
  hashData(data: string, saltRounds: number = 12): string {
    const salt = crypto.randomBytes(16).toString('base64');
    const hash = crypto.pbkdf2Sync(data, salt, this.keyDerivationIterations, 64, 'sha256');
    return `${salt}:${hash.toString('base64')}`;
  }

  // Verify hashed data
  verifyHash(data: string, hash: string): boolean {
    try {
      const parts = hash.split(':');
      if (parts.length !== 2) {
        return false;
      }
      
      const [salt, hashedData] = parts;
      if (!salt || !hashedData) {
        return false;
      }
      
      const computedHash = crypto.pbkdf2Sync(data, salt, this.keyDerivationIterations, 64, 'sha256');
      return computedHash.toString('base64') === hashedData;
    } catch (error) {
      return false;
    }
  }

  // Generate secure tokens
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  // Generate cryptographically secure random numbers
  generateSecureRandom(min: number, max: number): number {
    const range = max - min + 1;
    const bitsNeeded = Math.ceil(Math.log2(range));
    const bytesNeeded = Math.ceil(bitsNeeded / 8);
    const maxValid = Math.floor(256 ** bytesNeeded / range) * range - 1;
    
    let randomBytes, randomValue;
    do {
      randomBytes = crypto.randomBytes(bytesNeeded);
      randomValue = randomBytes.readUIntBE(0, bytesNeeded);
    } while (randomValue > maxValid);
    
    return min + (randomValue % range);
  }

  // Key rotation functionality
  async rotateKeys(): Promise<string> {
    if (!this.keyRotationEnabled) {
      throw new Error('Key rotation is disabled');
    }

    const newKeyId = `key_${Date.now()}`;
    const newMasterKey = crypto.randomBytes(32).toString('base64');
    
    // Store old key for decryption
    this.keyStore.set(this.currentKeyId, this.masterKey);
    
    // Update to new key
    this.masterKey = newMasterKey;
    this.currentKeyId = newKeyId;
    this.keyStore.set(newKeyId, newMasterKey);
    
    logger.info(`Key rotated to keyId: ${newKeyId}`);
    return newKeyId;
  }

  // Encrypt file content
  async encryptFile(fileBuffer: Buffer): Promise<{
    encryptedBuffer: Buffer;
    metadata: EncryptionResult;
  }> {
    try {
      const base64Data = fileBuffer.toString('base64');
      const encrypted = await this.encryptData(base64Data);
      
      return {
        encryptedBuffer: Buffer.from(encrypted.encryptedData, 'base64'),
        metadata: encrypted
      };
    } catch (error) {
      logger.error('File encryption failed:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  // Decrypt file content
  async decryptFile(encryptedBuffer: Buffer, metadata: DecryptionOptions): Promise<Buffer> {
    try {
      const encryptedData = encryptedBuffer.toString('base64');
      const decrypted = await this.decryptData({
        ...metadata,
        encryptedData
      });
      
      return Buffer.from(decrypted, 'base64');
    } catch (error) {
      logger.error('File decryption failed:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  // Get encryption status
  getEncryptionStatus(): {
    algorithm: string;
    keyRotationEnabled: boolean;
    currentKeyId: string;
    availableKeys: number;
    isConfigured: boolean;
  } {
    return {
      algorithm: this.algorithm,
      keyRotationEnabled: this.keyRotationEnabled,
      currentKeyId: this.currentKeyId,
      availableKeys: this.keyStore.size,
      isConfigured: !!this.masterKey
    };
  }

  // Clean up old keys (use with caution)
  cleanupOldKeys(retainDays: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retainDays);
    
    let deletedCount = 0;
    for (const [keyId, key] of this.keyStore.entries()) {
      if (keyId !== this.currentKeyId && keyId.startsWith('key_')) {
        const keyParts = keyId.split('_');
        if (keyParts.length >= 2) {
          const timestampStr = keyParts[1];
          if (timestampStr) {
            const timestamp = parseInt(timestampStr, 10);
            if (!isNaN(timestamp) && timestamp < cutoffDate.getTime()) {
              this.keyStore.delete(keyId);
              deletedCount++;
            }
          }
        }
      }
    }
    
    logger.info(`Cleaned up ${deletedCount} old encryption keys`);
    return deletedCount;
  }
}

// PII (Personally Identifiable Information) encryption utility
class PIIEncryption extends DataEncryption {
  private readonly piiFields = [
    'email', 'phone', 'ssn', 'address', 'firstName', 'lastName',
    'birthDate', 'creditCard', 'bankAccount', 'passport'
  ];

  // Automatically encrypt PII fields in user data
  async encryptUserPII(userData: Record<string, any>): Promise<Record<string, any>> {
    const fieldsToEncrypt = this.piiFields.filter(field => 
      userData[field] !== undefined && userData[field] !== null
    );
    
    return await this.encryptFields(userData, fieldsToEncrypt);
  }

  // Automatically decrypt PII fields in user data
  async decryptUserPII(userData: Record<string, any>): Promise<Record<string, any>> {
    return await this.decryptFields(userData, this.piiFields);
  }

  // Check if field contains PII
  isPIIField(fieldName: string): boolean {
    return this.piiFields.includes(fieldName.toLowerCase());
  }
}

// Database field encryption utility
class DatabaseEncryption extends DataEncryption {
  // MongoDB schema transformation for encrypted fields
  createEncryptedSchema(fields: string[]): Record<string, any> {
    const schema: Record<string, any> = {};
    
    fields.forEach(field => {
      schema[field] = {
        type: {
          __encrypted: { type: Boolean, default: true },
          encryptedData: { type: String, required: true },
          iv: { type: String, required: true },
          salt: { type: String, required: true },
          keyId: { type: String, required: true },
          algorithm: { type: String, required: true },
          timestamp: { type: String, required: true }
        },
        select: false // Exclude from queries by default
      };
    });
    
    return schema;
  }
}

// Export instances
export const dataEncryption = new DataEncryption();
export const piiEncryption = new PIIEncryption();
export const databaseEncryption = new DatabaseEncryption();

// Export classes for custom implementations
export { DataEncryption, PIIEncryption, DatabaseEncryption };

// Export types
export type { EncryptionResult, DecryptionOptions };