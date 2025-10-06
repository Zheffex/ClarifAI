import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import { connectDatabase } from './config/database';
import { 
  errorHandler, 
  notFoundHandler, 
  handleUnhandledRejection, 
  handleUncaughtException 
} from './middleware/errorHandler';
import { logger } from './config/logger';
import { env } from './config/environment';
import SocketService from './services/socketService';
import { 
  getCircuitBreakerHealth
} from './middleware/circuitBreaker';
import { 
  gracefulDegradationManager
} from './middleware/gracefulDegradation';

// Import routes
import authRoutes from './routes/auth';
import datasetRoutes from './routes/datasets';
import analyticsRoutes from './routes/analytics';
import collaborationRoutes from './routes/collaboration';
import aiRoutes from './routes/ai';
import dashboardRoutes from './routes/dashboard';
import notificationRoutes from './routes/notifications';
import { securityRoutes } from './routes/securityRoutes';

// Load environment variables
logger.info('Loading environment configuration...');
logger.debug('Environment config loaded:', env.getConfig(false));
import { EmailService } from './services/emailService';

const app = express();
const server = createServer(app);
let socketService: SocketService;

const PORT = env.server.port;

// Initialize Email Service
EmailService.initialize();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.server.isDevelopment ? 1000 : 100, // More lenient in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));
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
// Request ID middleware for security tracking
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  next();
});

app.use(express.json({ limit: `${Math.floor(env.fileUpload.maxSize / 1024 / 1024)}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${Math.floor(env.fileUpload.maxSize / 1024 / 1024)}mb` }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/security', securityRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: env.server.nodeEnv,
    version: '1.0.0'
  });
});

// Enhanced health check with service status
app.get('/health/detailed', async (req, res) => {
  try {
    const circuitBreakerHealth = getCircuitBreakerHealth();
    
    // Get graceful degradation health data directly
    const gracefulDegradationHealth = gracefulDegradationManager.getAllServiceStatuses();
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: env.server.nodeEnv,
      version: '1.0.0',
      services: {
        circuitBreakers: circuitBreakerHealth,
        gracefulDegradation: {
          services: gracefulDegradationHealth,
          degradedCount: Object.values(gracefulDegradationHealth).filter((s: any) => s.degraded).length,
          totalServices: Object.keys(gracefulDegradationHealth).length
        }
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Service health check failed'
    });
  }
});

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Store socket service instance globally for use in other modules
declare global {
  var socketService: SocketService;
}

// Initialize socket service after server creation
function initializeSocketService() {
  const socketSvc = new SocketService();
  // Initialize the socket service with the server
  (socketSvc as any).io = new (require('socket.io').Server)(server, {
    cors: {
      origin: env.cors.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  
  // Setup middleware and event handlers
  (socketSvc as any).setupMiddleware();
  (socketSvc as any).setupEventHandlers();
  
  global.socketService = socketSvc;
  return socketSvc;
}

// Set up global error handlers
process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);

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
      logger.info('🛡️ Enhanced error handling enabled');
      logger.info('🔄 Circuit breakers and retry logic active');
      logger.info('⚡ Graceful degradation configured');
      
      if (env.server.isDevelopment) {
        logger.debug('Development mode - additional debugging enabled');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, socketService };