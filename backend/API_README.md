# ClarifAI Backend API Documentation

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [WebSocket Events](#websocket-events)
- [SDK Examples](#sdk-examples)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## 🚀 Overview

The ClarifAI Backend API is a comprehensive TypeScript-based Node.js service that provides:

- **Data Analysis**: Upload, process, and analyze datasets with AI-powered insights
- **Real-time Collaboration**: Share resources and collaborate in real-time
- **AI Integration**: Chat completion, text analysis, and automated insights
- **Security**: JWT authentication, RBAC, audit logging, and encryption
- **Scalability**: Circuit breakers, graceful degradation, and rate limiting

### Key Features

- 🔐 **JWT Authentication** with role-based access control
- 📊 **Dataset Management** with file upload and processing
- 🤖 **AI-Powered Analysis** using OpenRouter integration
- 🔄 **Real-time Collaboration** via Socket.IO
- 📈 **Analytics Engine** with natural language queries
- 🛡️ **Enterprise Security** with audit trails and encryption
- ⚡ **High Performance** with circuit breakers and caching

## 🏃‍♂️ Quick Start

### 1. Base URL
```
Development: http://localhost:5000
Production: https://api.clarifai.com
```

### 2. Authentication
All API calls (except registration/login) require a JWT token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://api.clarifai.com/api/datasets
```

### 3. Content Type
All requests should use `application/json` except file uploads which use `multipart/form-data`.

## 🔑 Authentication

### Registration Flow

1. **Register** → User account created (inactive)
2. **Verify OTP** → Email verification via OTP
3. **Login** → Receive JWT token
4. **Access API** → Use token for authenticated requests

### Token Format
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "role": "analyst",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Role Permissions

| Role | Permissions |
|------|-------------|
| **Viewer** | Read datasets, view analytics, basic collaboration |
| **Analyst** | Create/update datasets, run analyses, full collaboration |
| **Admin** | All permissions, user management, system administration |

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Create new user account | ❌ |
| POST | `/verify-otp` | Verify email with OTP | ❌ |
| POST | `/login` | Authenticate user | ❌ |
| POST | `/logout` | Logout user | ✅ |
| GET | `/me` | Get user profile | ✅ |
| PUT | `/profile` | Update user profile | ✅ |
| POST | `/change-password` | Change password | ✅ |
| GET | `/search` | Search users | ✅ |

### Datasets (`/api/datasets`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/upload` | Upload new dataset | ✅ |
| GET | `/` | List user datasets | ✅ |
| GET | `/:id` | Get dataset details | ✅ |
| PUT | `/:id` | Update dataset | ✅ |
| DELETE | `/:id` | Delete dataset | ✅ |
| GET | `/:id/preview` | Preview dataset data | ✅ |
| POST | `/:id/share` | Share dataset | ✅ |
| DELETE | `/:id/access/:userId` | Remove access | ✅ |

### AI Analysis (`/api/ai`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/chat-completion` | AI chat interface | ✅ |
| POST | `/analyze-text` | Text analysis | ✅ |
| POST | `/analyze-image` | Image analysis | ✅ |
| POST | `/generate-insights` | Generate data insights | ✅ |
| GET | `/status` | AI service status | ❌ |

### Analytics (`/api/analytics`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/query` | Process natural language query | ✅ |
| POST | `/predict` | Generate predictions | ✅ |
| GET | `/insights/:datasetId` | Get dataset insights | ✅ |
| POST | `/recommend` | Get recommendations | ✅ |
| GET | `/sessions` | List analysis sessions | ✅ |
| POST | `/sessions` | Create analysis session | ✅ |
| GET | `/sessions/:sessionId` | Get session details | ✅ |

### Collaboration (`/api/collaboration`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List user collaborations | ✅ |
| POST | `/share` | Share resource | ✅ |
| GET | `/:id` | Get collaboration details | ✅ |
| PUT | `/:id` | Update collaboration | ✅ |
| DELETE | `/:id` | End collaboration | ✅ |
| POST | `/:id/comment` | Add comment | ✅ |
| PUT | `/:id/annotation` | Add annotation | ✅ |

### Dashboard (`/api/dashboard`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/stats` | Get dashboard statistics | ✅ |
| GET | `/activity` | Get recent activity | ✅ |
| GET | `/overview` | Get complete overview | ✅ |

### Notifications (`/api/notifications`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List notifications | ✅ |
| GET | `/:id` | Get notification details | ✅ |
| PUT | `/:id/read` | Mark as read | ✅ |
| PUT | `/mark-all-read` | Mark all as read | ✅ |
| DELETE | `/:id` | Delete notification | ✅ |
| GET | `/preferences` | Get preferences | ✅ |
| PUT | `/preferences` | Update preferences | ✅ |

### Security (`/api/security`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/audit-logs` | Get audit logs | ✅ (Admin) |
| GET | `/audit-stats` | Get audit statistics | ✅ (Admin) |
| GET | `/compliance-report` | Get compliance report | ✅ (Admin) |
| GET | `/encryption/status` | Get encryption status | ✅ (Admin) |
| POST | `/encryption/rotate-keys` | Rotate encryption keys | ✅ (Admin) |

## 📊 Data Models

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

## ❌ Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": "Email is required",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req_1234567890_abc123"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## 🚦 Rate Limiting

### Limits
- **Development**: 500 requests per minute
- **Production**: 100 requests per 15 minutes

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Handling Rate Limits
```javascript
if (response.status === 429) {
  const resetTime = response.headers['X-RateLimit-Reset'];
  const waitTime = resetTime - Date.now();
  await new Promise(resolve => setTimeout(resolve, waitTime));
}
```

## 🔌 WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Collaboration Events
- `collaboration:join` - Join collaboration room
- `collaboration:leave` - Leave collaboration room
- `collaboration:update` - Collaboration data updated
- `collaboration:comment` - New comment added
- `collaboration:annotation` - New annotation added

#### Notification Events
- `notification:new` - New notification received
- `notification:read` - Notification marked as read

#### Dataset Events
- `dataset:processing` - Dataset processing status update
- `dataset:ready` - Dataset processing complete
- `dataset:error` - Dataset processing failed

## 💻 SDK Examples

### JavaScript/TypeScript
```typescript
class ClarifAIClient {
  constructor(private baseUrl: string, private token: string) {}
  
  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  async uploadDataset(file: File, metadata: any) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', metadata.name);
    formData.append('description', metadata.description);
    formData.append('tags', JSON.stringify(metadata.tags));
    
    return this.request('/api/datasets/upload', {
      method: 'POST',
      body: formData,
      headers: {} // Override Content-Type for FormData
    });
  }
  
  async getDatasets(page = 1, limit = 10) {
    return this.request(`/api/datasets?page=${page}&limit=${limit}`);
  }
  
  async analyzeData(query: string, datasetId: string) {
    return this.request('/api/analytics/query', {
      method: 'POST',
      body: JSON.stringify({ query, datasetId })
    });
  }
}

// Usage
const client = new ClarifAIClient('http://localhost:5000', 'your-jwt-token');
const datasets = await client.getDatasets();
```

### Python
```python
import requests
import json

class ClarifAIClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def upload_dataset(self, file_path, name, description=None, tags=None):
        url = f"{self.base_url}/api/datasets/upload"
        
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {
                'name': name,
                'description': description or '',
                'tags': json.dumps(tags or [])
            }
            
            response = requests.post(url, files=files, data=data, 
                                   headers={'Authorization': self.headers['Authorization']})
        
        response.raise_for_status()
        return response.json()
    
    def get_datasets(self, page=1, limit=10):
        url = f"{self.base_url}/api/datasets"
        params = {'page': page, 'limit': limit}
        
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()
    
    def analyze_data(self, query, dataset_id):
        url = f"{self.base_url}/api/analytics/query"
        data = {'query': query, 'datasetId': dataset_id}
        
        response = requests.post(url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()

# Usage
client = ClarifAIClient('http://localhost:5000', 'your-jwt-token')
datasets = client.get_datasets()
```

## 🛡️ Security

### Authentication
- JWT tokens with configurable expiration
- Password hashing using bcrypt with salt rounds
- Email verification required for account activation

### Authorization
- Role-based access control (RBAC)
- Granular permissions per resource type
- Organization-based access control

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection via content sanitization
- File upload validation and virus scanning

### Audit & Compliance
- Comprehensive audit logging
- Security event tracking
- Compliance reporting
- Data encryption at rest and in transit

### Rate Limiting
- IP-based rate limiting
- User-based rate limiting
- Endpoint-specific limits
- Graceful degradation under load

## 🔧 Troubleshooting

### Common Issues

#### 1. Authentication Errors
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token is required"
  }
}
```
**Solution**: Include valid JWT token in Authorization header

#### 2. Rate Limit Exceeded
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests from this IP"
  }
}
```
**Solution**: Implement exponential backoff or wait for rate limit reset

#### 3. File Upload Errors
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "File type not supported"
  }
}
```
**Solution**: Ensure file is CSV, JSON, or Excel format and under size limit

#### 4. Dataset Processing Errors
```json
{
  "success": false,
  "error": {
    "code": "PROCESSING_ERROR",
    "message": "Failed to parse dataset"
  }
}
```
**Solution**: Check file format and data integrity

### Debug Headers
Include these headers for debugging:
```
X-Request-ID: req_1234567890_abc123
X-Debug-Mode: true
```

### Logs
Check server logs for detailed error information:
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`

## 📞 Support

- **Documentation**: This file and inline code comments
- **Issues**: GitHub Issues for bug reports
- **Email**: support@clarifai.com
- **Status Page**: https://status.clarifai.com

---

*Last updated: January 2024*  
*API Version: 1.0.0*  
*Documentation Version: 1.0.0*
