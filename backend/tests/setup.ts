import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-do-not-use-in-production-256-bits';
process.env.PORT = '5001';
process.env.LOG_LEVEL = 'error';
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.OPENROUTER_MODEL = 'test-model';
process.env.FRONTEND_URL = 'http://localhost:3001';
process.env.SITE_URL = 'http://localhost:3001';
process.env.SITE_NAME = 'ClarifAI Test';
process.env.MAX_FILE_SIZE = '52428800';
process.env.UPLOAD_PATH = './test-uploads';

// Increase timeout for tests
jest.setTimeout(30000);