import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import dotenv from 'dotenv';

import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './config/logger';
import SocketService from './services/socketService';

// Import routes
import authRoutes from './routes/auth';
import datasetRoutes from './routes/datasets';
import analyticsRoutes from './routes/analytics';
import collaborationRoutes from './routes/collaboration';
import aiRoutes from './routes/ai';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
let socketService: SocketService;

const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
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
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Socket.IO service initialized');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, socketService };