# ClarifAI Backend

> **Express.js API Server** - RESTful API with TypeScript, MongoDB, and real-time capabilities for the ClarifAI analytics platform.

![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-5.0+-green)
![Express](https://img.shields.io/badge/Express-5.0+-orange)

## 🏗️ Architecture Overview

The backend follows a modular, service-oriented architecture with clear separation of concerns:

```
src/
├── config/          # Configuration files
│   ├── database.ts    # MongoDB connection setup
│   └── logger.ts      # Winston logging configuration
├── controllers/     # Request handlers
│   ├── authController.ts
│   ├── datasetController.ts
│   ├── analyticsController.ts
│   └── collaborationController.ts
├── middleware/      # Express middleware
│   ├── auth.ts        # JWT authentication
│   ├── rbac.ts        # Role-based access control
│   └── errorHandler.ts # Global error handling
├── models/          # MongoDB schemas
│   ├── User.ts
│   ├── Dataset.ts
│   ├── AnalysisSession.ts
│   └── Collaboration.ts
├── routes/          # Express route definitions
│   ├── auth.ts
│   ├── datasets.ts
│   ├── analytics.ts
│   └── collaboration.ts
├── services/        # Business logic layer
│   ├── dataValidationService.ts
│   ├── fileUploadService.ts
│   ├── schemaDetectionService.ts
│   └── socketService.ts
└── index.ts         # Application entry point
```

## ✨ Core Features

### 🔐 Authentication & Authorization
- **JWT-based authentication** with secure token management
- **Role-based access control (RBAC)** with three levels:
  - **Viewer**: Read-only access to datasets and analytics
  - **Analyst**: Full access to create and modify content
  - **Admin**: Complete system administration capabilities
- **Password security** with bcryptjs hashing
- **Session management** with configurable token expiration

### 📁 Data Management
- **Multi-format file upload** (CSV, Excel, JSON)
- **Schema auto-detection** with intelligent type inference
- **Data validation** and quality reporting
- **Metadata extraction** and storage
- **File processing** with streaming for large datasets

### 📊 Analytics Engine
- **Analysis session management** with persistent state
- **Query processing** and result caching
- **Visualization data preparation**
- **Statistical computations** and insights generation
- **Prediction pipeline** integration

### 🤝 Real-time Collaboration
- **WebSocket connections** via Socket.IO
- **Live cursor tracking** and user presence
- **Real-time comments** and annotations
- **Change synchronization** across clients
- **Notification system** for team updates

## 🚀 Getting Started

### Prerequisites
- **Node.js** v16 or higher
- **MongoDB** v5.0 or higher
- **npm** or **yarn** package manager

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/clarifai
   JWT_SECRET=your_super_secure_jwt_secret_key_here
   JWT_EXPIRES_IN=7d
   FILE_UPLOAD_LIMIT=10mb
   CORS_ORIGIN=http://localhost:3000
   LOG_LEVEL=info
   ```

3. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo service mongod start
   
   # Or start MongoDB manually
   mongod --dbpath /path/to/your/data/directory
   ```

4. **Run the application**
   ```bash
   # Development mode with hot reload
   npm run dev
   
   # Production build and start
   npm run build
   npm start
   ```

### 🧪 Development Scripts

```bash
# Development
npm run dev          # Start with nodemon hot reload
npm run build        # Compile TypeScript to JavaScript
npm start           # Run compiled JavaScript

# Testing
npm test            # Run test suite
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Generate coverage report

# Linting & Formatting
npm run lint        # Run ESLint
npm run lint:fix    # Auto-fix ESLint issues
npm run format      # Format code with Prettier
```

## 📡 API Documentation

### Authentication Endpoints

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "analyst"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Dataset Management

```http
# Upload dataset
POST /api/datasets/upload
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

file: <dataset_file>
name: "Sales Data Q4"
description: "Quarterly sales analysis data"
```

```http
# Get datasets
GET /api/datasets
Authorization: Bearer <jwt_token>
```

```http
# Get dataset details
GET /api/datasets/:id
Authorization: Bearer <jwt_token>
```

### Analytics Endpoints

```http
# Create analysis session
POST /api/analytics/sessions
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "datasetId": "64f8a1b2c3d4e5f6789012ab",
  "title": "Sales Trend Analysis",
  "description": "Analyzing Q4 sales patterns"
}
```

```http
# Process query
POST /api/analytics/sessions/:sessionId/query
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "query": "Show me sales trends by month",
  "context": {
    "chartType": "line",
    "timeRange": "last_quarter"
  }
}
```

### Collaboration Features

```http
# Share resource
POST /api/collaboration/share
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "resourceType": "analysis",
  "resourceId": "64f8a1b2c3d4e5f6789012ab",
  "participants": [
    {
      "userId": "64f8a1b2c3d4e5f6789012cd",
      "permissions": ["read", "comment"]
    }
  ]
}
```

## 🗺️ Database Schema

### User Model
```typescript
interface IUser {
  _id: ObjectId;
  email: string;
  password: string; // bcrypt hashed
  firstName: string;
  lastName: string;
  role: 'viewer' | 'analyst' | 'admin';
  avatar?: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    defaultChartType: string;
  };
  lastLogin?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Dataset Model
```typescript
interface IDataset {
  _id: ObjectId;
  name: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedBy: ObjectId; // User reference
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  metadata: {
    rows: number;
    columns: number;
    fileType: string;
    encoding: string;
  };
  schema: {
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    nullable: boolean;
    unique: boolean;
    sampleValues: any[];
  }[];
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Analysis Session Model
```typescript
interface IAnalysisSession {
  _id: ObjectId;
  title: string;
  description?: string;
  datasetId: ObjectId;
  userId: ObjectId;
  queries: {
    _id: ObjectId;
    query: string;
    nlpAnalysis: object;
    results: any;
    timestamp: Date;
    visualizations?: object[];
  }[];
  visualizations: object[];
  insights: object[];
  predictions: object[];
  collaborators: ObjectId[];
  isShared: boolean;
  lastActivity: Date;
  createdAt: Date;
}
```

## 🔒 Security Features

### Authentication Security
- **Password hashing** with bcryptjs (12 rounds)
- **JWT tokens** with configurable expiration
- **Secure HTTP headers** via Helmet.js
- **CORS protection** with configurable origins

### Input Validation
- **Express Validator** for request validation
- **File type validation** for uploads
- **Size limits** for uploaded files
- **SQL injection prevention** via parameterized queries

### Rate Limiting
```typescript
// Apply rate limiting to authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts'
});

// Apply to upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
});
```

### Authorization Middleware
```typescript
// Role-based access control
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Usage
router.delete('/datasets/:id', 
  authenticate, 
  requireRole(['admin']), 
  deleteDataset
);
```

## 📈 Performance Optimization

### Database Indexing
```typescript
// User indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Dataset indexes
datasetSchema.index({ uploadedBy: 1 });
datasetSchema.index({ processingStatus: 1 });
datasetSchema.index({ tags: 1 });
datasetSchema.index({ createdAt: -1 });

// Analysis session indexes
analysisSessionSchema.index({ datasetId: 1 });
analysisSessionSchema.index({ userId: 1 });
analysisSessionSchema.index({ lastActivity: -1 });
```

### Caching Strategy
- **In-memory caching** for frequently accessed data
- **Query result caching** for expensive operations
- **File metadata caching** to avoid repeated schema detection

### File Processing
- **Streaming uploads** for large files
- **Background processing** for dataset analysis
- **Progress tracking** for long-running operations

## 🧪 Testing

### Test Structure
```
tests/
├── setup.ts           # Test configuration
├── auth.test.ts        # Authentication tests
├── dataset.test.ts     # Dataset management tests
├── analytics.test.ts   # Analytics functionality tests
└── collaboration.test.ts # Collaboration features tests
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts

# Run in watch mode
npm run test:watch
```

### Test Configuration
```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## 🚢 Deployment

### Production Build
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Production Environment Variables
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://mongo-cluster:27017/clarifai_prod
JWT_SECRET=super_secure_production_secret
JWT_EXPIRES_IN=24h
FILE_UPLOAD_LIMIT=50mb
CORS_ORIGIN=https://clarifai.yourcompany.com
LOG_LEVEL=warn
REDIS_URL=redis://redis-cluster:6379
```

### Health Checks
```typescript
// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});
```

## 📄 API Response Format

### Success Response
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

### Error Response
```typescript
interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
    stack?: string; // Only in development
  };
}
```

## 🛠️ Monitoring & Logging

### Winston Logger Configuration
```typescript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Error Tracking
- **Global error handler** for unhandled exceptions
- **Request logging** middleware
- **Performance monitoring** for slow queries
- **Memory usage tracking**

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch
3. **Install** dependencies: `npm install`
4. **Run** tests: `npm test`
5. **Start** development server: `npm run dev`
6. **Make** your changes
7. **Test** your changes: `npm test`
8. **Commit** with conventional commit format
9. **Push** and create a Pull Request

### Code Style Guidelines
- **TypeScript** strict mode enabled
- **ESLint** configuration for consistent formatting
- **Prettier** for code formatting
- **Conventional commits** for commit messages
- **Unit tests** required for new features

---

**Built with ❤️ using Node.js, TypeScript, and MongoDB**