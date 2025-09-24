#!/usr/bin/env node

import { env } from './src/config/environment.js';
import { logger } from './src/config/logger.js';

/**
 * Environment Validation Script
 * Run this script to validate your environment configuration
 */

function validateEnvironment() {
  try {
    logger.info('🔍 Validating environment configuration...');

    // Test database connection string format
    const dbUri = env.database.uri;
    if (!dbUri.includes('mongodb://') && !dbUri.includes('mongodb+srv://')) {
      throw new Error('MONGODB_URI must be a valid MongoDB connection string');
    }

    // Test JWT secret strength
    if (env.jwt.secret.length < 32) {
      logger.warn('⚠️  JWT_SECRET should be at least 32 characters long for security');
    }

    // Test OpenRouter API key format
    if (!env.openRouter.apiKey || env.openRouter.apiKey === 'your-openrouter-api-key-here') {
      logger.warn('⚠️  OPENROUTER_API_KEY is not configured - AI features will not work');
    }

    // Test file upload settings
    if (env.fileUpload.maxSize > 100 * 1024 * 1024) { // 100MB
      logger.warn('⚠️  MAX_FILE_SIZE is quite large, consider if this is intentional');
    }

    // Environment-specific validations
    if (env.server.isProduction) {
      validateProductionEnvironment();
    } else if (env.server.isDevelopment) {
      validateDevelopmentEnvironment();
    }

    logger.info('✅ Environment configuration is valid!');
    
    // Print configuration summary (without sensitive data)
    const config = env.getConfig(false);
    logger.info('📋 Configuration summary:', config);

    return true;
  } catch (error) {
    logger.error('❌ Environment validation failed:', error);
    return false;
  }
}

function validateProductionEnvironment() {
  logger.info('🚀 Validating production environment...');

  // Check for secure JWT secret
  if (env.jwt.secret.includes('development') || env.jwt.secret.includes('example')) {
    throw new Error('JWT_SECRET must not contain development/example values in production');
  }

  // Check HTTPS URLs
  if (!env.cors.frontendUrl.startsWith('https://')) {
    logger.warn('⚠️  FRONTEND_URL should use HTTPS in production');
  }

  if (!env.openRouter.siteUrl.startsWith('https://')) {
    logger.warn('⚠️  SITE_URL should use HTTPS in production');
  }

  // Check log level
  if (env.logging.level === 'debug') {
    logger.warn('⚠️  LOG_LEVEL should not be debug in production for performance');
  }

  logger.info('✅ Production environment validation completed');
}

function validateDevelopmentEnvironment() {
  logger.info('🛠️  Validating development environment...');

  // Check for localhost URLs
  if (!env.cors.frontendUrl.includes('localhost') && !env.cors.frontendUrl.includes('127.0.0.1')) {
    logger.warn('⚠️  FRONTEND_URL might want to use localhost in development');
  }

  logger.info('✅ Development environment validation completed');
}

// Run validation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const isValid = validateEnvironment();
  process.exit(isValid ? 0 : 1);
}

export { validateEnvironment };