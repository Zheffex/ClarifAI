# ClarifAI Backend API Documentation

## API Overview

The ClarifAI Backend is a comprehensive TypeScript-based Node.js API server that provides data analysis, collaboration, and AI-powered insights. Built with Express.js, MongoDB, and Socket.IO, it offers real-time capabilities and robust security features.

### Service Information
- **Base URL**: `http://localhost:5000` (development) / `https://api.clarifai.com` (production)
- **API Version**: 1.0.0
- **Protocol**: HTTP/HTTPS
- **Content Type**: `application/json`
- **Character Encoding**: UTF-8

### Authentication
The API uses JWT (JSON Web Token) based authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Rate Limiting
- **Development**: 500 requests per minute
- **Production**: 100 requests per 15 minutes
- **Headers**: Rate limit information is included in response headers

### Error Handling
All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req_1234567890_abc123"
  }
}
```

## API Endpoints

### Authentication Endpoints (`/api/auth`)

#### Register User
**POST** `/api/auth/register`

Creates a new user account. User remains inactive until email verification.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "viewer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "emailSent": true,
    "canResend": false,
    "nextResendTime": null
  },
  "message": "Registration successful. Please check your email for verification code."
}
```

#### Verify OTP
**POST** `/api/auth/verify-otp`

Verifies email address using OTP code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "viewer",
      "isEmailVerified": true,
      "preferences": {}
    }
  },
  "message": "Email verified successfully"
}
```

#### Login
**POST** `/api/auth/login`

Authenticates user and returns JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "viewer",
      "isEmailVerified": true,
      "preferences": {}
    }
  },
  "message": "Login successful"
}
```

#### Get Profile
**GET** `/api/auth/me`

Retrieves current user's profile information.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "viewer",
    "organizationId": "507f1f77bcf86cd799439012",
    "preferences": {},
    "isActive": true,
    "isEmailVerified": true,
    "lastLogin": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### Dataset Management (`/api/datasets`)

#### Upload Dataset
**POST** `/api/datasets/upload`

Uploads a new dataset file for analysis.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body (Form Data):**
- `file`: Dataset file (CSV, JSON, XLSX)
- `name`: Dataset name
- `description`: Optional description
- `tags`: JSON array of tags

**Response:**
```json
{
  "success": true,
  "data": {
    "dataset": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Sales Data",
      "description": "Monthly sales data",
      "metadata": {
        "size": 1024000,
        "type": "csv",
        "rows": 1000,
        "columns": 5,
        "headers": ["date", "product", "quantity", "price", "revenue"]
      },
      "processingStatus": "processing",
      "tags": ["sales", "monthly"],
      "createdAt": "2024-01-01T12:00:00.000Z"
    },
    "qualityReport": {
      "overall": {
        "score": 85,
        "issues": 3
      },
      "fields": [
        {
          "name": "date",
          "type": "date",
          "completeness": 100,
          "validity": 95
        }
      ]
    }
  },
  "message": "Dataset uploaded successfully"
}
```

#### Get Datasets
**GET** `/api/datasets`

Retrieves user's datasets with pagination.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search term
- `status`: Filter by processing status
- `tags`: Filter by tags

**Response:**
```json
{
  "success": true,
  "data": {
    "datasets": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Sales Data",
        "description": "Monthly sales data",
        "metadata": {
          "size": 1024000,
          "type": "csv",
          "rows": 1000,
          "columns": 5
        },
        "processingStatus": "ready",
        "tags": ["sales", "monthly"],
        "createdAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

#### Get Dataset by ID
**GET** `/api/datasets/:id`

Retrieves specific dataset details.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "dataset": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Sales Data",
      "description": "Monthly sales data",
      "metadata": {
        "size": 1024000,
        "type": "csv",
        "rows": 1000,
        "columns": 5,
        "headers": ["date", "product", "quantity", "price", "revenue"]
      },
      "dataSchema": {
        "fields": [
          {
            "name": "date",
            "type": "date",
            "format": "YYYY-MM-DD"
          }
        ]
      },
      "processingStatus": "ready",
      "tags": ["sales", "monthly"],
      "isPublic": false,
      "accessPermissions": [],
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

### AI Analysis (`/api/ai`)

#### Chat Completion
**POST** `/api/ai/chat-completion`

Sends a message to the AI chat interface.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "message": "Analyze the sales trends in my dataset",
  "context": {
    "datasetId": "507f1f77bcf86cd799439013",
    "sessionId": "session_123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Based on your sales data, I can see a clear upward trend...",
    "sessionId": "session_123",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Analyze Text
**POST** `/api/ai/analyze-text`

Performs text analysis using AI.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "text": "Customer feedback text to analyze",
  "analysisType": "sentiment"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "sentiment": "positive",
      "confidence": 0.85,
      "keywords": ["excellent", "satisfied", "recommend"],
      "summary": "Overall positive sentiment with high satisfaction"
    }
  }
}
```

### Analytics (`/api/analytics`)

#### Process Query
**POST** `/api/analytics/query`

Processes natural language queries against datasets.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "query": "What are the top selling products this month?",
  "datasetId": "507f1f77bcf86cd799439013"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "product": "Product A",
        "sales": 15000,
        "percentage": 35.2
      }
    ],
    "query": "What are the top selling products this month?",
    "executionTime": 1.2
  }
}
```

#### Generate Insights
**POST** `/api/analytics/insights`

Generates automated insights from dataset.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "datasetId": "507f1f77bcf86cd799439013",
  "insightTypes": ["trends", "anomalies", "correlations"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "trend",
        "title": "Sales Growth Trend",
        "description": "Sales have increased by 15% over the last quarter",
        "confidence": 0.92,
        "data": {
          "trend": "increasing",
          "percentage": 15
        }
      }
    ]
  }
}
```

### Collaboration (`/api/collaboration`)

#### Share Resource
**POST** `/api/collaboration/share`

Shares a resource with other users.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "resourceType": "dataset",
  "resourceId": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439014",
  "permission": "read"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "collaboration": {
      "_id": "507f1f77bcf86cd799439015",
      "resourceType": "dataset",
      "resourceId": "507f1f77bcf86cd799439013",
      "ownerId": "507f1f77bcf86cd799439011",
      "participants": [
        {
          "userId": "507f1f77bcf86cd799439014",
          "permission": "read",
          "joinedAt": "2024-01-01T12:00:00.000Z"
        }
      ],
      "status": "active",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

### Dashboard (`/api/dashboard`)

#### Get Dashboard Overview
**GET** `/api/dashboard/overview`

Retrieves complete dashboard overview.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalDatasets": 15,
      "activeCollaborations": 3,
      "totalAnalyses": 45,
      "storageUsed": "2.5 GB"
    },
    "recentActivity": [
      {
        "type": "dataset_upload",
        "description": "Uploaded 'Sales Data' dataset",
        "timestamp": "2024-01-01T12:00:00.000Z"
      }
    ],
    "recentDatasets": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Sales Data",
        "status": "ready",
        "createdAt": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

### Notifications (`/api/notifications`)

#### Get Notifications
**GET** `/api/notifications`

Retrieves user notifications.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `unreadOnly`: Filter unread notifications

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "507f1f77bcf86cd799439016",
        "title": "Dataset Processing Complete",
        "message": "Your 'Sales Data' dataset has been processed successfully",
        "type": "success",
        "isRead": false,
        "createdAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 15
    }
  }
}
```

### Security (`/api/security`)

#### Get Audit Logs
**GET** `/api/security/audit-logs`

Retrieves security audit logs (admin only).

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "507f1f77bcf86cd799439017",
        "action": "user_login",
        "userId": "507f1f77bcf86cd799439011",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "success": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 100
    }
  }
}
```

## Data Models

### User
```typescript
interface User {
  _id: ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'analyst' | 'viewer';
  organizationId?: ObjectId;
  preferences: Record<string, any>;
  lastLogin?: Date;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Dataset
```typescript
interface Dataset {
  _id: ObjectId;
  name: string;
  description?: string;
  fileId: ObjectId;
  uploadedBy: ObjectId;
  organizationId: ObjectId;
  dataSchema: Record<string, any>;
  metadata: {
    size: number;
    type: 'csv' | 'json' | 'xlsx' | 'tsv' | 'parquet';
    rows?: number;
    columns?: number;
    encoding?: string;
    delimiter?: string;
    headers?: string[];
  };
  processingStatus: 'pending' | 'processing' | 'ready' | 'error';
  processingError?: string;
  tags: string[];
  isPublic: boolean;
  accessPermissions: AccessPermission[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Collaboration
```typescript
interface Collaboration {
  _id: ObjectId;
  resourceType: 'dataset' | 'analysis' | 'dashboard';
  resourceId: ObjectId;
  ownerId: ObjectId;
  participants: Participant[];
  status: 'active' | 'ended';
  settings: CollaborationSettings;
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Service temporarily unavailable |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Development**: 500 requests per minute per IP
- **Production**: 100 requests per 15 minutes per IP
- **Headers**: Rate limit information is included in response headers:
  - `X-RateLimit-Limit`: Request limit per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets

## WebSocket Events

The API supports real-time features via Socket.IO:

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events
- `collaboration:join` - Join collaboration room
- `collaboration:leave` - Leave collaboration room
- `collaboration:update` - Collaboration data updated
- `notification:new` - New notification received
- `dataset:processing` - Dataset processing status update

## SDK Examples

### JavaScript/TypeScript
```typescript
class ClarifAIClient {
  constructor(private baseUrl: string, private token: string) {}
  
  async uploadDataset(file: File, metadata: any) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', metadata.name);
    
    const response = await fetch(`${this.baseUrl}/api/datasets/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });
    
    return response.json();
  }
}
```

### cURL Examples

#### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### Upload Dataset
```bash
curl -X POST http://localhost:5000/api/datasets/upload \
  -H "Authorization: Bearer your-jwt-token" \
  -F "file=@data.csv" \
  -F "name=Sales Data" \
  -F "description=Monthly sales data"
```

#### Analyze Data
```bash
curl -X POST http://localhost:5000/api/analytics/query \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the top selling products?",
    "datasetId": "507f1f77bcf86cd799439013"
  }'
```

## Security Considerations

1. **Authentication**: All endpoints (except registration/login) require valid JWT tokens
2. **Authorization**: Role-based access control (RBAC) with granular permissions
3. **Input Validation**: All inputs are validated and sanitized
4. **Rate Limiting**: Prevents abuse and ensures fair usage
5. **CORS**: Configured for specific frontend origins
6. **Helmet**: Security headers for protection against common attacks
7. **Audit Logging**: All security-relevant actions are logged
8. **Data Encryption**: Sensitive data is encrypted at rest and in transit

## Support

For API support and questions:
- **Documentation**: This file and inline code comments
- **Issues**: GitHub Issues for bug reports
- **Email**: support@clarifai.com

---

*Last updated: January 2024*
*API Version: 1.0.0*
