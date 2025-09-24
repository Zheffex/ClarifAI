import dotenv from 'dotenv';
import { logger } from './logger';

// Load environment variables from .env file
dotenv.config();

interface EnvironmentConfig {
  // Database
  MONGODB_URI: string;
  
  // Server
  PORT: number;
  NODE_ENV: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  
  // CORS
  FRONTEND_URL: string;
  
  // File Upload
  MAX_FILE_SIZE: number;
  UPLOAD_PATH: string;
  
  // Logging
  LOG_LEVEL: string;
  
  // OpenRouter API
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL: string;
  SITE_URL: string;
  SITE_NAME: string;
}

class Environment {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.validateAndLoadConfig();
  }

  private validateAndLoadConfig(): EnvironmentConfig {
    const requiredVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'OPENROUTER_API_KEY'
    ];

    // Check for required environment variables
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const error = `Missing required environment variables: ${missingVars.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }

    // Validate and parse environment variables
    try {
      return {
        // Database
        MONGODB_URI: this.getString('MONGODB_URI'),
        
        // Server
        PORT: this.getNumber('PORT', 5000),
        NODE_ENV: this.getString('NODE_ENV', 'development'),
        
        // JWT
        JWT_SECRET: this.getString('JWT_SECRET'),
        JWT_EXPIRES_IN: this.getString('JWT_EXPIRES_IN', '24h'),
        
        // CORS
        FRONTEND_URL: this.getString('FRONTEND_URL', 'http://localhost:3000'),
        
        // File Upload
        MAX_FILE_SIZE: this.getNumber('MAX_FILE_SIZE', 52428800), // 50MB in bytes
        UPLOAD_PATH: this.getString('UPLOAD_PATH', './uploads'),
        
        // Logging
        LOG_LEVEL: this.getString('LOG_LEVEL', 'info'),
        
        // OpenRouter API
        OPENROUTER_API_KEY: this.getString('OPENROUTER_API_KEY'),
        OPENROUTER_MODEL: this.getString('OPENROUTER_MODEL', 'x-ai/grok-4-fast:free'),
        SITE_URL: this.getString('SITE_URL', 'http://localhost:3000'),
        SITE_NAME: this.getString('SITE_NAME', 'ClarifAI'),
      };
    } catch (error) {
      logger.error('Failed to load environment configuration:', error);
      throw error;
    }
  }

  private getString(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is required`);
    }
    return value;
  }

  private getNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is required`);
    }
    
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      throw new Error(`Environment variable ${key} must be a valid number`);
    }
    return numValue;
  }

  private getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is required`);
    }
    
    return value.toLowerCase() === 'true';
  }

  // Getter methods for accessing configuration
  get database() {
    return {
      uri: this.config.MONGODB_URI,
    };
  }

  get server() {
    return {
      port: this.config.PORT,
      nodeEnv: this.config.NODE_ENV,
      isProduction: this.config.NODE_ENV === 'production',
      isDevelopment: this.config.NODE_ENV === 'development',
      isTest: this.config.NODE_ENV === 'test',
    };
  }

  get jwt() {
    return {
      secret: this.config.JWT_SECRET,
      expiresIn: this.config.JWT_EXPIRES_IN,
    };
  }

  get cors() {
    return {
      frontendUrl: this.config.FRONTEND_URL,
    };
  }

  get fileUpload() {
    return {
      maxSize: this.config.MAX_FILE_SIZE,
      uploadPath: this.config.UPLOAD_PATH,
    };
  }

  get logging() {
    return {
      level: this.config.LOG_LEVEL,
    };
  }

  get openRouter() {
    return {
      apiKey: this.config.OPENROUTER_API_KEY,
      model: this.config.OPENROUTER_MODEL,
      siteUrl: this.config.SITE_URL,
      siteName: this.config.SITE_NAME,
    };
  }

  // Method to get all config (for debugging - be careful not to log sensitive data)
  getConfig(includeSensitive: boolean = false): Partial<EnvironmentConfig> {
    const config = { ...this.config };
    
    if (!includeSensitive) {
      // Remove sensitive data
      delete (config as any).JWT_SECRET;
      delete (config as any).OPENROUTER_API_KEY;
      delete (config as any).MONGODB_URI;
    }
    
    return config;
  }
}

// Create singleton instance
export const env = new Environment();
export default env;