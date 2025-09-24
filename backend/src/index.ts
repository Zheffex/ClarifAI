import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './config/logger';
import { env } from './config/environment';
import SocketService from './services/socketService';

// Import routes
import authRoutes from './routes/auth';
import datasetRoutes from './routes/datasets';
import analyticsRoutes from './routes/analytics';
import collaborationRoutes from './routes/collaboration';
import aiRoutes from './routes/ai';
import dashboardRoutes from './routes/dashboard';

// Load environment variables
logger.info('Loading environment configuration...');
logger.debug('Environment config loaded:', env.getConfig(false));

const app = express();
const server = createServer(app);
let socketService: SocketService;

const PORT = env.server.port;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.server.isDevelopment ? 1000 : 100, // More lenient in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: env.cors.frontendUrl,
  credentials: true
}));
// Apply rate limiting only to API routes in production
if (env.server.isProduction) {
  app.use('/api', limiter);
} else {
  // More lenient rate limiting for development
  app.use('/api', rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 500, // 500 requests per minute in development
    message: 'Too many requests, please slow down.',
  }));
}
app.use(express.json({ limit: `${Math.floor(env.fileUpload.maxSize / 1024 / 1024)}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${Math.floor(env.fileUpload.maxSize / 1024 / 1024)}mb` }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: env.server.nodeEnv,
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(errorHandler);

// Store socket service instance globally for use in other modules
declare global {
  var socketService: SocketService;
}

// Initialize socket service after server creation
function initializeSocketService() {
  socketService = new SocketService(server);
  global.socketService = socketService;
  return socketService;
}

// Start server
async function startServer() {
  try {
    await connectDatabase();
    
    // Initialize socket service
    const socketSvc = initializeSocketService();
    
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${env.server.nodeEnv}`);
      logger.info(`🔗 Frontend URL: ${env.cors.frontendUrl}`);
      logger.info('🔌 Socket.IO service initialized');
      
      if (env.server.isDevelopment) {
        logger.debug('Development mode - additional debugging enabled');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, socketService };