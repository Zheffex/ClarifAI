import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

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

// Global MongoDB Memory Server instance
let mongoServer: MongoMemoryServer;

// Setup MongoDB Memory Server
beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'test-db',
        ip: '127.0.0.1', // Use localhost instead of 0.0.0.0
      },
      binary: {
        version: '6.0.0',
      },
    });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error('Failed to start MongoDB Memory Server:', error);
    throw error;
  }
});

// Cleanup MongoDB Memory Server
afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});

// Increase timeout for tests
jest.setTimeout(120000);