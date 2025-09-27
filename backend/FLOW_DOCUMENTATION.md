# ClarifAI Backend - Flow Documentation
## Comprehensive System Flows for Classroom Presentation

### Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Application Startup Flow](#application-startup-flow)
3. [User Authentication Flow](#user-authentication-flow)
4. [API Request Lifecycle](#api-request-lifecycle)
5. [Dataset Management Flow](#dataset-management-flow)
6. [AI Analysis Processing Flow](#ai-analysis-processing-flow)
7. [Real-time Collaboration Flow](#real-time-collaboration-flow)
8. [Security & Audit Flow](#security--audit-flow)
9. [Error Handling Flow](#error-handling-flow)
10. [Deployment Flow](#deployment-flow)

---

## System Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   ClarifAI       │    │   External      │
│   (React App)   │◄──►│   Backend API    │◄──►│   Services      │
│                 │    │   (Express.js)   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │    MongoDB      │    │  OpenRouter AI  │
                       │   Database      │    │     Redis       │
                       │                 │    │     SMTP        │
                       └─────────────────┘    └─────────────────┘
```

**Core Components:**
- **Express.js Server**: REST API endpoints with middleware pipeline
- **MongoDB**: Document database with Mongoose ODM
- **Socket.IO**: Real-time bidirectional communication
- **JWT Authentication**: Secure token-based auth with RBAC
- **OpenRouter AI**: External AI service integration
- **Winston Logging**: Centralized logging system

---

## Application Startup Flow

```
START
  │
  ├── Load Environment Variables (.env)
  │   └── Validate required config (JWT_SECRET, MONGODB_URI, etc.)
  │
  ├── Initialize Logger (Winston)
  │   └── Configure file & console outputs
  │
  ├── Connect to MongoDB
  │   └── Mongoose connection with retry logic
  │
  ├── Setup Express Application
  │   ├── Security Middleware (Helmet, CORS)
  │   ├── Rate Limiting
  │   ├── Request Parsing (JSON, URL-encoded)
  │   └── File Upload (Multer)
  │
  ├── Initialize Socket.IO Server
  │   └── Attach to HTTP server
  │
  ├── Mount API Routes
  │   ├── /api/auth
  │   ├── /api/datasets
  │   ├── /api/analytics
  │   ├── /api/collaboration
  │   ├── /api/ai
  │   ├── /api/dashboard
  │   ├── /api/notifications
  │   └── /api/security
  │
  ├── Error Handling Middleware
  │   └── Centralized error processing
  │
  └── Start HTTP Server
      └── Listen on configured PORT (default: 5000)
```

**Key Files:**
- `src/index.ts` - Main application entry point
- `src/config/environment.ts` - Environment validation
- `src/config/database.ts` - MongoDB connection

---

## User Authentication Flow

### Registration Flow
```
User Registration Request
  │
  ├── POST /api/auth/register
  │   └── Body: { email, password, name, role? }
  │
  ├── Input Validation
  │   ├── Email format check
  │   ├── Password strength validation
  │   └── Required fields verification
  │
  ├── Check User Exists
  │   └── Query MongoDB for existing email
  │
  ├── Hash Password
  │   └── bcrypt with salt rounds
  │
  ├── Create User Document
  │   └── Save to MongoDB with default role
  │
  ├── Generate JWT Token
  │   └── Sign with JWT_SECRET
  │
  └── Response
      ├── Success: { user, token, expiresIn }
      └── Error: { message, statusCode }
```

### Login Flow
```
User Login Request
  │
  ├── POST /api/auth/login
  │   └── Body: { email, password }
  │
  ├── Input Validation
  │   └── Required fields check
  │
  ├── Find User
  │   └── Query by email
  │
  ├── Verify Password
  │   └── Compare with bcrypt
  │
  ├── Generate JWT Token
  │   └── Include user ID and role
  │
  ├── Update Last Login
  │   └── Timestamp in user document
  │
  └── Response
      ├── Success: { user, token, expiresIn }
      └── Error: { message: "Invalid credentials" }
```

### Protected Route Flow
```
Protected API Request
  │
  ├── Extract JWT from Authorization Header
  │   └── Format: "Bearer <token>"
  │
  ├── Verify JWT Token
  │   ├── Check signature with JWT_SECRET
  │   ├── Validate expiration
  │   └── Extract user payload
  │
  ├── Load User from Database
  │   └── Find by ID from token
  │
  ├── Role-Based Access Control (RBAC)
  │   └── Check user permissions for resource
  │
  ├── Attach User to Request
  │   └── req.user = userDocument
  │
  └── Continue to Route Handler
```

**Key Files:**
- `src/controllers/authController.ts`
- `src/middleware/auth.ts`
- `src/middleware/rbac.ts`
- `src/models/User.ts`

---

## API Request Lifecycle

```
Incoming HTTP Request
  │
  ├── Security Middleware
  │   ├── Helmet (Security headers)
  │   ├── CORS (Cross-origin policy)
  │   └── Rate Limiting (Prevent abuse)
  │
  ├── Request Processing
  │   ├── JSON/URL parsing
  │   ├── File upload handling
  │   └── Request logging
  │
  ├── Authentication (if required)
  │   ├── JWT validation
  │   └── User loading
  │
  ├── Authorization (RBAC)
  │   └── Permission checking
  │
  ├── Input Validation
  │   ├── express-validator rules
  │   └── Custom validation logic
  │
  ├── Controller Logic
  │   ├── Business logic execution
  │   ├── Service layer calls
  │   └── Database operations
  │
  ├── Response Generation
  │   ├── Success: JSON response
  │   └── Error: Structured error format
  │
  ├── Audit Logging (if enabled)
  │   └── Log user actions
  │
  └── Socket.IO Events (if needed)
      └── Emit real-time updates
```

**Middleware Pipeline Order:**
1. Security headers (Helmet)
2. CORS handling
3. Rate limiting
4. Request parsing
5. Authentication
6. Authorization (RBAC)
7. Input validation
8. Route handler
9. Error handling

---

## Dataset Management Flow

### Dataset Upload Flow
```
Dataset Upload Request
  │
  ├── POST /api/datasets/upload
  │   └── Multipart form with file + metadata
  │
  ├── Authentication & Authorization
  │   └── Check user permissions
  │
  ├── File Validation
  │   ├── File size check (MAX_FILE_SIZE)
  │   ├── File type validation (CSV, JSON, etc.)
  │   └── Malware scanning (if configured)
  │
  ├── File Processing
  │   ├── Save to uploads directory
  │   ├── Generate unique filename
  │   └── Extract file metadata
  │
  ├── Schema Detection
  │   ├── Analyze file structure
  │   ├── Detect data types
  │   └── Identify columns/fields
  │
  ├── Data Validation
  │   ├── Check data integrity
  │   ├── Validate format consistency
  │   └── Detect anomalies
  │
  ├── Create Dataset Record
  │   ├── Save metadata to MongoDB
  │   ├── Link to user account
  │   └── Set initial status
  │
  ├── Background Processing
  │   ├── Queue analysis tasks
  │   └── Generate preview data
  │
  └── Response
      └── Dataset ID and status
```

### Dataset Analysis Flow
```
Analysis Request
  │
  ├── POST /api/datasets/:id/analyze
  │   └── Analysis configuration
  │
  ├── Load Dataset
  │   └── Fetch from MongoDB
  │
  ├── Validate Permissions
  │   └── Check user access
  │
  ├── Create Analysis Session
  │   └── Track analysis state
  │
  ├── Data Processing Pipeline
  │   ├── Data cleaning
  │   ├── Statistical analysis
  │   ├── Pattern detection
  │   └── Visualization generation
  │
  ├── AI Integration (if enabled)
  │   ├── Call OpenRouter API
  │   ├── Process AI insights
  │   └── Generate recommendations
  │
  ├── Save Results
  │   └── Store analysis in MongoDB
  │
  ├── Real-time Updates
  │   └── Emit progress via Socket.IO
  │
  └── Generate Report
      └── Formatted analysis results
```

**Key Files:**
- `src/controllers/datasetController.ts`
- `src/services/schemaDetectionService.ts`
- `src/services/dataValidationService.ts`
- `src/models/Dataset.ts`

---

## AI Analysis Processing Flow

```
AI Analysis Request
  │
  ├── POST /api/ai/analyze
  │   └── { datasetId, analysisType, parameters }
  │
  ├── Authentication & Rate Limiting
  │   └── Check API quotas
  │
  ├── Load Dataset & Validate
  │   ├── Fetch dataset from MongoDB
  │   └── Check user permissions
  │
  ├── Prepare AI Request
  │   ├── Format data for OpenRouter
  │   ├── Select appropriate model
  │   └── Configure parameters
  │
  ├── Call OpenRouter API
  │   ├── HTTP request to OpenRouter
  │   ├── Handle API rate limits
  │   └── Process streaming responses
  │
  ├── Parse AI Response
  │   ├── Extract insights
  │   ├── Validate response format
  │   └── Error handling
  │
  ├── Post-process Results
  │   ├── Apply business logic
  │   ├── Generate visualizations
  │   └── Format for frontend
  │
  ├── Save Analysis Results
  │   ├── Store in MongoDB
  │   └── Link to dataset
  │
  ├── Real-time Updates
  │   └── Emit via Socket.IO
  │
  └── Response
      └── Analysis results and metadata
```

**AI Integration Points:**
- **OpenRouter Service**: External AI API calls
- **Model Selection**: Based on analysis type
- **Error Handling**: API failures and rate limits
- **Caching**: Results for similar queries

**Key Files:**
- `src/controllers/aiController.ts`
- `src/services/openRouterService.ts`

---

## Real-time Collaboration Flow

### Socket.IO Connection Flow
```
Client Connection
  │
  ├── WebSocket Handshake
  │   └── Establish connection
  │
  ├── Authentication
  │   ├── JWT token validation
  │   └── User session creation
  │
  ├── Join Collaboration Rooms
  │   ├── Dataset-specific rooms
  │   └── User notification rooms
  │
  ├── Event Registration
  │   ├── Listen for client events
  │   └── Setup event handlers
  │
  └── Connection Management
      ├── Handle disconnections
      └── Cleanup resources
```

### Real-time Data Updates
```
Data Change Event
  │
  ├── Database Operation
  │   └── MongoDB document updated
  │
  ├── Identify Affected Users
  │   └── Query collaboration permissions
  │
  ├── Format Update Message
  │   ├── Change type
  │   ├── Updated data
  │   └── Timestamp
  │
  ├── Emit to Socket Rooms
  │   ├── Dataset collaborators
  │   └── Interested parties
  │
  └── Client Updates
      └── Real-time UI refresh
```

**Socket.IO Events:**
- `dataset:updated` - Dataset modifications
- `analysis:progress` - Analysis status updates
- `collaboration:invite` - New collaboration invites
- `notification:new` - System notifications

**Key Files:**
- `src/services/socketService.ts`
- `src/controllers/collaborationController.ts`

---

## Security & Audit Flow

### Security Middleware Pipeline
```
Request Security Processing
  │
  ├── Rate Limiting
  │   ├── IP-based limiting
  │   ├── User-based quotas
  │   └── Endpoint-specific limits
  │
  ├── Input Sanitization
  │   ├── XSS prevention
  │   ├── SQL injection protection
  │   └── File upload validation
  │
  ├── Authentication Verification
  │   ├── JWT validation
  │   ├── Token expiry check
  │   └── User status verification
  │
  ├── Authorization Check
  │   ├── Role-based permissions
  │   ├── Resource ownership
  │   └── Feature access control
  │
  └── Audit Logging
      ├── Log user actions
      ├── Track data access
      └── Security event recording
```

### Audit Trail Flow
```
User Action
  │
  ├── Action Detection
  │   └── Middleware intercepts
  │
  ├── Audit Data Collection
  │   ├── User ID and role
  │   ├── Action type
  │   ├── Resource accessed
  │   ├── IP address
  │   ├── User agent
  │   └── Timestamp
  │
  ├── Security Analysis
  │   ├── Anomaly detection
  │   ├── Suspicious pattern check
  │   └── Risk assessment
  │
  ├── Store Audit Log
  │   └── MongoDB AuditLog collection
  │
  ├── Real-time Alerts (if triggered)
  │   └── Security team notification
  │
  └── Compliance Reporting
      └── Audit trail generation
```

**Security Features:**
- **Encryption**: Data at rest and in transit
- **Rate Limiting**: Prevent abuse and DoS
- **Input Validation**: Prevent injection attacks
- **RBAC**: Granular permission control
- **Audit Logging**: Complete action tracking

**Key Files:**
- `src/middleware/auditMiddleware.ts`
- `src/middleware/securityIntegration.ts`
- `src/controllers/securityController.ts`
- `src/models/AuditLog.ts`

---

## Error Handling Flow

```
Error Occurrence
  │
  ├── Error Source
  │   ├── Validation errors
  │   ├── Database errors
  │   ├── Authentication failures
  │   ├── Authorization denials
  │   ├── External API failures
  │   └── Unexpected exceptions
  │
  ├── Error Catching
  │   ├── Try-catch blocks
  │   ├── Promise rejections
  │   └── Express error middleware
  │
  ├── Error Classification
  │   ├── Client errors (4xx)
  │   ├── Server errors (5xx)
  │   └── Security violations
  │
  ├── Error Logging
  │   ├── Winston logger
  │   ├── Error details
  │   ├── Stack traces
  │   └── Context information
  │
  ├── Response Generation
  │   ├── Standardized format
  │   ├── Appropriate status codes
  │   ├── Safe error messages
  │   └── Debug info (dev only)
  │
  └── Client Notification
      ├── HTTP response
      └── Socket.IO error events
```

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "message": "User-friendly error message",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "details": {
      "field": "validation error details"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "unique-request-id"
}
```

**Key Files:**
- `src/middleware/errorHandler.ts`
- `src/config/logger.ts`

---

## Deployment Flow

### Development Setup
```
Developer Onboarding
  │
  ├── Prerequisites Check
  │   ├── Node.js LTS (>=18)
  │   ├── npm package manager
  │   └── MongoDB instance
  │
  ├── Repository Setup
  │   ├── Clone repository
  │   ├── Install dependencies: npm install
  │   └── Setup environment: .env file
  │
  ├── Environment Validation
  │   └── npm run validate-env
  │
  ├── Database Setup
  │   ├── Start MongoDB
  │   └── Initialize collections
  │
  ├── Development Server
  │   ├── npm run dev (with nodemon)
  │   └── Health check: GET /health
  │
  └── Testing
      ├── Unit tests: npm test
      └── Integration tests with in-memory DB
```

### Production Deployment
```
Production Deployment
  │
  ├── Build Process
  │   ├── TypeScript compilation: npm run build
  │   ├── Generate dist/ directory
  │   └── Asset optimization
  │
  ├── Environment Configuration
  │   ├── Production .env file
  │   ├── Security keys and secrets
  │   └── Database connection strings
  │
  ├── Infrastructure Setup
  │   ├── Server provisioning
  │   ├── Database cluster
  │   ├── Load balancer
  │   └── SSL certificates
  │
  ├── Application Deployment
  │   ├── Code deployment
  │   ├── Dependency installation
  │   ├── Environment validation
  │   └── Service startup: npm start
  │
  ├── Health Checks
  │   ├── Application health: /health
  │   ├── Database connectivity
  │   └── External service availability
  │
  ├── Monitoring Setup
  │   ├── Application logs
  │   ├── Performance metrics
  │   ├── Error tracking
  │   └── Uptime monitoring
  │
  └── Backup Strategy
      ├── Database backups
      ├── File uploads backup
      └── Configuration backup
```

**Environment Configurations:**
- **Development**: Debug logging, relaxed rate limits
- **Production**: Optimized settings, strict security
- **Testing**: In-memory database, mock services

---

## Key Technologies & Dependencies

### Core Stack
- **Runtime**: Node.js (>=18 LTS)
- **Language**: TypeScript 5
- **Framework**: Express.js 5
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO
- **Authentication**: JWT + bcrypt

### Middleware & Security
- **Security**: Helmet, CORS
- **Rate Limiting**: express-rate-limit
- **Validation**: express-validator
- **File Upload**: Multer
- **Logging**: Winston

### External Integrations
- **AI Services**: OpenRouter API
- **Caching**: Redis (optional)
- **Email**: SMTP integration
- **Push Notifications**: Web Push API

### Development & Testing
- **Testing**: Jest + Supertest + mongodb-memory-server
- **Build**: TypeScript compiler
- **Development**: nodemon for hot reload

---

## Performance Considerations

### Database Optimization
- **Indexing**: Strategic MongoDB indexes
- **Connection Pooling**: Mongoose connection management
- **Query Optimization**: Efficient aggregation pipelines

### Caching Strategy
- **Redis Integration**: Optional caching layer
- **In-Memory Caching**: Frequently accessed data
- **API Response Caching**: Reduce external API calls

### Scalability
- **Horizontal Scaling**: Stateless application design
- **Load Balancing**: Multiple server instances
- **Microservices Ready**: Modular architecture

### Security Performance
- **Rate Limiting**: Prevent abuse and ensure fair usage
- **Authentication Caching**: Reduce database lookups
- **Input Validation**: Efficient validation rules

---

## Monitoring & Observability

### Logging Strategy
- **Structured Logging**: JSON format with Winston
- **Log Levels**: Debug, Info, Warn, Error
- **Log Rotation**: Automatic file rotation
- **Centralized Logging**: Aggregation for production

### Metrics & Analytics
- **Application Metrics**: Response times, error rates
- **Business Metrics**: User actions, data processing
- **System Metrics**: CPU, memory, disk usage
- **Database Metrics**: Query performance, connection pool

### Health Monitoring
- **Health Endpoint**: `/health` for system status
- **Dependency Checks**: Database, external services
- **Graceful Degradation**: Service availability handling

---

## Common Use Cases & Workflows

### Data Scientist Workflow
1. **Upload Dataset** → File validation → Schema detection
2. **Explore Data** → Statistical analysis → Visualization
3. **AI Analysis** → OpenRouter integration → Insights generation
4. **Collaborate** → Share findings → Real-time updates
5. **Export Results** → Download reports → API integration

### System Administrator Workflow
1. **Monitor System** → Health checks → Performance metrics
2. **Manage Users** → RBAC → Audit trails
3. **Security Review** → Access logs → Anomaly detection
4. **Backup Management** → Data protection → Recovery procedures

### Developer Integration Workflow
1. **API Authentication** → JWT tokens → Permission verification
2. **Data Access** → REST endpoints → Real-time updates
3. **Error Handling** → Structured responses → Logging
4. **Testing** → Mock services → Integration tests

---

*This documentation serves as a comprehensive guide for understanding the ClarifAI backend system flows. Each section provides detailed insights into how different components interact and process data through the system.*

**For Classroom Presentation:**
- Use this as a reference for explaining system architecture
- Focus on specific flows based on audience interest
- Highlight security and scalability considerations
- Demonstrate real-world applications and use cases

**Version**: 1.0  
**Date**: September 27, 2024  
**Maintainer**: ClarifAI Development Team