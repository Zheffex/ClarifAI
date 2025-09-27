# ClarifAI Backend API - Postman Testing Commands

This document contains all the API endpoints and example Postman commands for testing the ClarifAI backend API.

## Base Configuration

- **Base URL**: `http://localhost:5000/api`
- **Authentication**: Bearer Token (JWT)
- **Content-Type**: `application/json` (for most requests)

## Environment Variables (Setup in Postman)

Create these environment variables in Postman:

- `baseUrl`: `http://localhost:5000/api`
- `authToken`: (will be set after login)

## 🔐 Authentication Routes (`/api/auth`)

### 1. Register User
**Description**: Create a new user account with email, password, and basic profile information.
```http
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

### 2. Login User
**Description**: Authenticate user credentials and receive JWT token for API access.
```http
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123!"
}
```

**Response**: Save the `token` from response to `authToken` environment variable.

### Verify Email OTP
Description: Verify the 6-digit OTP sent to the user's email to activate the account.
```http
POST {{baseUrl}}/auth/verify-otp
Content-Type: application/json

{
  "email": "test@example.com",
  "otp": "123456"
}
```

Response: On success, returns a user object and a JWT token. Use the token to authenticate subsequent requests.

### Resend Verification OTP
Description: Resend a new 6-digit OTP to the user's email. Subject to cooldown limits.
```http
POST {{baseUrl}}/auth/resend-otp
Content-Type: application/json

{
  "email": "test@example.com"
}
```

Notes:
- OTP is valid for 10 minutes.
- You can request a new OTP every 2 minutes (cooldown).
- Maximum of 5 verification attempts per OTP.
- Login will fail if the email is not yet verified and will automatically trigger a resend of the OTP.

### 3. Logout User
**Description**: Invalidate the current JWT token and end user session.
```http
POST {{baseUrl}}/auth/logout
Authorization: Bearer {{authToken}}
```

### 4. Get User Profile
**Description**: Retrieve current authenticated user's profile information.
```http
GET {{baseUrl}}/auth/me
Authorization: Bearer {{authToken}}
```

### 5. Update Profile
**Description**: Update user profile information including name and email.
```http
PUT {{baseUrl}}/auth/profile
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "email": "updated@example.com"
}
```

### 6. Change Password
**Description**: Update user password by providing current password and new password.
```http
POST {{baseUrl}}/auth/change-password
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword123!"
}
```

### 7. Search Users
**Description**: Search for users by name or email with pagination support.
```http
GET {{baseUrl}}/auth/search?q=john&limit=10&page=1
Authorization: Bearer {{authToken}}
```

## 📊 Dataset Routes (`/api/datasets`)

### 1. Upload Dataset
**Description**: Upload CSV or Excel file as a new dataset with metadata and tags.
```http
POST {{baseUrl}}/datasets/upload
Authorization: Bearer {{authToken}}
Content-Type: multipart/form-data

# Form data:
# file: [select your CSV/Excel file]
# name: "My Dataset"
# description: "Test dataset description"
# tags: ["tag1", "tag2"]
```

### 2. Get All Datasets
**Description**: Retrieve all datasets accessible to the user with pagination and sorting options.
```http
GET {{baseUrl}}/datasets?page=1&limit=10&sortBy=createdAt&sortOrder=desc
Authorization: Bearer {{authToken}}
```

### 3. Get Dataset by ID
**Description**: Retrieve detailed information about a specific dataset including metadata and schema.
```http
GET {{baseUrl}}/datasets/[DATASET_ID]
Authorization: Bearer {{authToken}}
```

### 4. Update Dataset
**Description**: Update dataset metadata including name, description, and tags.
```http
PUT {{baseUrl}}/datasets/[DATASET_ID]
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "name": "Updated Dataset Name",
  "description": "Updated description",
  "tags": ["updated", "tags"]
}
```

### 5. Delete Dataset
**Description**: Permanently delete a dataset and all associated data.
```http
DELETE {{baseUrl}}/datasets/[DATASET_ID]
Authorization: Bearer {{authToken}}
```

### 6. Get Dataset Preview
**Description**: Get a limited preview of dataset rows for quick inspection.
```http
GET {{baseUrl}}/datasets/[DATASET_ID]/preview?limit=5
Authorization: Bearer {{authToken}}
```

### 7. Share Dataset
**Description**: Grant access to a dataset for another user with specified permissions.
**Available Permissions:**
- `"read"` - View dataset and basic information
- `"write"` - View and modify dataset metadata
- `"admin"` - Full control including sharing and deletion
```http
POST {{baseUrl}}/datasets/[DATASET_ID]/share
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "userEmail": "collaborator@example.com",
  "permission": "read"
}
```

### 8. Remove Dataset Access
**Description**: Revoke a user's access to a shared dataset.
```http
DELETE {{baseUrl}}/datasets/[DATASET_ID]/access/[USER_ID]
Authorization: Bearer {{authToken}}
```

## 🧠 AI Routes (`/api/ai`)

### 1. Chat Completion
**Description**: Generate AI responses using chat completion models for conversational AI interactions.
```http
POST {{baseUrl}}/ai/chat-completion
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "messages": [
    {
      "role": "user",
      "content": "Explain data analysis techniques"
    }
  ],
  "model": "x-ai/grok-4-fast:free",
  "maxTokens": 1000
}
```

### 2. Analyze Text
**Description**: Perform text analysis including sentiment analysis, keyword extraction, and content classification.
```http
POST {{baseUrl}}/ai/analyze-text
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "text": "This is a sample text for sentiment analysis and key extraction.",
  "analysisType": "sentiment",
  "options": {
    "includeKeywords": true,
    "includeSentiment": true
  }
}
```

### 3. Analyze Image
**Description**: Analyze uploaded images for classification, object detection, and visual content description.
```http
POST {{baseUrl}}/ai/analyze-image
Content-Type: multipart/form-data
Authorization: Bearer {{authToken}}

# Form data:
# image: [select your image file]
# analysisType: "classification"
# prompt: "Describe what you see in this image"
```

### 4. Generate Data Insights
**Description**: Generate AI-powered insights and analysis for dataset columns including correlations and patterns.
```http
POST {{baseUrl}}/ai/generate-insights
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "datasetId": "[DATASET_ID]",
  "analysisType": "statistical",
  "columns": ["column1", "column2"],
  "options": {
    "includeCorrelations": true,
    "includeOutliers": true,
    "includePatterns": true
  }
}
```

### 5. Get AI Status
**Description**: Check the current status and availability of AI services and models.
```http
GET {{baseUrl}}/ai/status
```

## 📈 Analytics Routes (`/api/analytics`)

### 1. Process Natural Language Query
**Description**: Convert natural language questions into data queries and execute them against datasets.
```http
POST {{baseUrl}}/analytics/query
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "query": "What is the average age of users in the dataset?",
  "datasetId": "[DATASET_ID]",
  "context": "demographic analysis"
}
```

### 2. Generate Predictions
**Description**: Create machine learning predictions using various algorithms on dataset features.
```http
POST {{baseUrl}}/analytics/predict
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "datasetId": "[DATASET_ID]",
  "targetColumn": "outcome",
  "features": ["age", "income", "education"],
  "predictionType": "classification",
  "algorithm": "random_forest"
}
```

### 3. Get Dataset Insights
**Description**: Retrieve comprehensive statistical insights and analysis results for a specific dataset.
```http
GET {{baseUrl}}/analytics/insights/[DATASET_ID]
Authorization: Bearer {{authToken}}
```

### 4. Get Recommendations
**Description**: Get AI-powered recommendations for next analysis steps based on dataset and user preferences.
```http
POST {{baseUrl}}/analytics/recommend
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "datasetId": "[DATASET_ID]",
  "analysisHistory": ["correlation", "regression"],
  "userPreferences": {
    "analysisType": "predictive",
    "complexity": "intermediate"
  }
}
```

### 5. Get Analysis Sessions
**Description**: Retrieve all analysis sessions with pagination for tracking analysis history.
```http
GET {{baseUrl}}/analytics/sessions?page=1&limit=10
Authorization: Bearer {{authToken}}
```

### 6. Create Analysis Session
**Description**: Start a new analysis session to track and organize related analytical work.
```http
POST {{baseUrl}}/analytics/sessions
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "name": "Customer Analysis Session",
  "description": "Analyzing customer behavior patterns",
  "datasetId": "[DATASET_ID]",
  "analysisType": "exploratory"
}
```

### 7. Get Analysis Session by ID
**Description**: Retrieve detailed information about a specific analysis session including results and history.
```http
GET {{baseUrl}}/analytics/sessions/[SESSION_ID]
Authorization: Bearer {{authToken}}
```

## 🎛️ Dashboard Routes (`/api/dashboard`)

### 1. Get Dashboard Statistics
**Description**: Retrieve key dashboard metrics including dataset counts, user activity, and system overview.
```http
GET {{baseUrl}}/dashboard/stats
Authorization: Bearer {{authToken}}
```

### 2. Get Recent Activity
**Description**: Fetch recent user activities and system events with configurable limit.
```http
GET {{baseUrl}}/dashboard/activity?limit=20
Authorization: Bearer {{authToken}}
```

### 3. Get Dashboard Overview
**Description**: Get comprehensive dashboard overview with all key metrics and summaries.
```http
GET {{baseUrl}}/dashboard/overview
Authorization: Bearer {{authToken}}
```

## 🤝 Collaboration Routes (`/api/collaboration`)

### 1. Share Resource
**Description**: Create a new collaboration session for sharing datasets or analyses with other users.
```http
POST {{baseUrl}}/collaboration/share
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "resourceType": "dataset",
  "resourceId": "[DATASET_ID]",
  "collaborators": [
    {
      "userId": "[USER_ID]",
      "permission": "edit"
    }
  ],
  "settings": {
    "allowComments": true,
    "allowAnnotations": true,
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

### 2. Get Collaboration Details
**Description**: Retrieve detailed information about a specific collaboration session including participants and settings.
```http
GET {{baseUrl}}/collaboration/[COLLABORATION_ID]
Authorization: Bearer {{authToken}}
```

### 3. Add Comment
**Description**: Add a comment to a collaboration session with optional user mentions.
```http
POST {{baseUrl}}/collaboration/[COLLABORATION_ID]/comment
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "content": "This is a comment on the collaboration",
  "mentions": ["[USER_ID]"]
}
```

### 4. Add Annotation
**Description**: Add visual annotations to charts, tables, or data visualizations within a collaboration.
```http
PUT {{baseUrl}}/collaboration/[COLLABORATION_ID]/annotation
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "chartId": "data-table-main",
  "type": "highlight",
  "content": "Important insight here",
  "position": {
    "row": 5,
    "column": "age"
  },
  "metadata": {
    "color": "yellow",
    "priority": "high"
  }
}
```

**Alternative with chart coordinates:**
**Description**: Add annotations using X/Y coordinates for charts and visualizations.
```http
PUT {{baseUrl}}/collaboration/[COLLABORATION_ID]/annotation
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "chartId": "scatter-plot-1",
  "type": "note",
  "content": "Outlier detected",
  "position": {
    "x": 150,
    "y": 200,
    "width": 50,
    "height": 30
  }
}
```

### 5. Update Collaboration
**Description**: Update collaboration settings such as permissions, expiration, and feature toggles.
```http
PUT {{baseUrl}}/collaboration/[COLLABORATION_ID]
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "settings": {
    "allowComments": false,
    "allowAnnotations": true
  }
}
```

### 6. End Collaboration
**Description**: Terminate a collaboration session and remove access for all participants.
```http
DELETE {{baseUrl}}/collaboration/[COLLABORATION_ID]
Authorization: Bearer {{authToken}}
```

### 7. Get User Collaborations
**Description**: Retrieve all collaborations for the current user with filtering and pagination options.
```http
GET {{baseUrl}}/collaboration?status=active&page=1&limit=10
Authorization: Bearer {{authToken}}
```

### 8. Get Public Collaborations
**Description**: Browse publicly available collaboration sessions that can be joined.
```http
GET {{baseUrl}}/collaboration/public/list?limit=10
```

### 9. Get Room Participants
**Description**: List all active participants in a specific collaboration room.
```http
GET {{baseUrl}}/collaboration/room/[ROOM_ID]/participants
Authorization: Bearer {{authToken}}
```

### 10. Update User Permissions
**Description**: Modify permissions for a specific user within a collaboration session.
```http
PUT {{baseUrl}}/collaboration/permissions
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "collaborationId": "[COLLABORATION_ID]",
  "userId": "[USER_ID]",
  "permissions": ["read", "comment", "annotate"]
}
```

### 11. Get Collaboration Status
**Description**: Check the current status of collaboration for a specific dataset or analysis.
```http
GET {{baseUrl}}/collaboration/status/dataset/[DATASET_ID]
Authorization: Bearer {{authToken}}
```

### 12. Kick User
**Description**: Remove a user from a collaboration session with optional reason.
```http
POST {{baseUrl}}/collaboration/kick
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "collaborationId": "[COLLABORATION_ID]",
  "userId": "[USER_ID]",
  "reason": "Inappropriate behavior"
}
```

### 13. Send Notification
**Description**: Send notifications to specific participants within a collaboration session.
```http
POST {{baseUrl}}/collaboration/notify
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "collaborationId": "[COLLABORATION_ID]",
  "message": "New data has been uploaded",
  "type": "info",
  "recipients": ["[USER_ID1]", "[USER_ID2]"]
}
```

## 🔔 Notification Routes (`/api/notifications`)

### 1. Get User Notifications
**Description**: Retrieve notifications for the current user with filtering options for read/unread status.
```http
GET {{baseUrl}}/notifications?page=1&limit=10&unreadOnly=true
Authorization: Bearer {{authToken}}
```

### 2. Get Notification by ID
**Description**: Retrieve detailed information about a specific notification.
```http
GET {{baseUrl}}/notifications/[NOTIFICATION_ID]
Authorization: Bearer {{authToken}}
```

### 3. Mark Notification as Read
**Description**: Mark a specific notification as read to update its status.
```http
PUT {{baseUrl}}/notifications/[NOTIFICATION_ID]/read
Authorization: Bearer {{authToken}}
```

### 4. Mark All Notifications as Read
**Description**: Mark all user notifications as read in a single operation.
```http
PUT {{baseUrl}}/notifications/mark-all-read
Authorization: Bearer {{authToken}}
```

### 5. Delete Notification
**Description**: Permanently delete a specific notification from the user's list.
```http
DELETE {{baseUrl}}/notifications/[NOTIFICATION_ID]
Authorization: Bearer {{authToken}}
```

### 6. Get Notification Statistics
**Description**: Retrieve statistics about user notifications including read/unread counts and types.
```http
GET {{baseUrl}}/notifications/stats
Authorization: Bearer {{authToken}}
```

### 7. Get Service Status
**Description**: Check the current status and health of the notification service.
```http
GET {{baseUrl}}/notifications/status
Authorization: Bearer {{authToken}}
```

### 8. Get Notification Preferences
**Description**: Retrieve user's notification preferences and subscription settings.
```http
GET {{baseUrl}}/notifications/preferences
Authorization: Bearer {{authToken}}
```

### 9. Update Notification Preferences
**Description**: Update user's notification preferences for different types and delivery methods.
```http
PUT {{baseUrl}}/notifications/preferences
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "email": true,
  "push": false,
  "types": {
    "system": true,
    "collaboration": true,
    "dataset": false,
    "anomaly": true
  }
}
```

### 10. Create Test Notification
**Description**: Create a test notification for development and debugging purposes.
notification types: data_change, anomaly_detected, collaboration_update, system_alert, analysis_complete, prediction_ready
```http
POST {{baseUrl}}/notifications/test
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "type": "info",
  "title": "Test Notification",
  "message": "This is a test notification"
}
```

### 11. Trigger Anomaly Detection
**Description**: Manually trigger anomaly detection on a dataset with customizable threshold and column selection.
```http
POST {{baseUrl}}/notifications/anomalies/datasets/[DATASET_ID]/detect
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "threshold": 0.05,
  "columns": ["column1", "column2"]
}
```

### 12. Get Dataset Anomalies
**Description**: Retrieve detected anomalies for a specific dataset.
```http
GET {{baseUrl}}/notifications/anomalies/datasets/[DATASET_ID]
Authorization: Bearer {{authToken}}
```

### 13. Add Monitoring Rule
**Description**: Create automated monitoring rules for datasets to trigger notifications based on conditions.
```http
POST {{baseUrl}}/notifications/monitoring/datasets/[DATASET_ID]/rules
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
    "name": "High Value Alert",
    "type": "threshold",
    "config": {
        "column": "Year",
        "operator": ">",
        "value": 10000,
        "action": "notify",
        "enabled": true
    }
}
```

### 14. Get Monitoring Rules
**Description**: Retrieve all monitoring rules configured for a specific dataset.
```http
GET {{baseUrl}}/notifications/monitoring/datasets/[DATASET_ID]/rules
Authorization: Bearer {{authToken}}
```

### 15. Test Web Push Notification
**Description**: Test web push notification functionality to verify VAPID keys and push service configuration.
```http
POST {{baseUrl}}/notifications/test-webpush
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "title": "Test Web Push",
  "message": "This is a test web push notification",
  "url": "http://localhost:3000/dashboard",
  "icon": "http://localhost:3000/icon.png",
  "badge": "http://localhost:3000/badge.png"
}
```

### 16. Subscribe to Push Notifications
**Description**: Subscribe a client device to receive push notifications using browser service worker.
```http
POST {{baseUrl}}/notifications/push/subscribe
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint",
    "keys": {
      "p256dh": "example-p256dh-key",
      "auth": "example-auth-key"
    }
  },
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

### 17. Unsubscribe from Push Notifications
**Description**: Remove a push notification subscription for the current user.
```http
DELETE {{baseUrl}}/notifications/push/unsubscribe
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint"
}
```

### 18. Get Push Subscription Status
**Description**: Check the current push notification subscription status for the authenticated user.
```http
GET {{baseUrl}}/notifications/push/status
Authorization: Bearer {{authToken}}
```

### 19. Send Test Push to User
**Description**: Send a test push notification to a specific user (admin only).
```http
POST {{baseUrl}}/notifications/push/send-test/[USER_ID]
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "title": "Admin Test Push",
  "message": "This is an admin test push notification",
  "data": {
    "url": "/dashboard",
    "action": "view"
  }
}
```

### 20. Get VAPID Public Key
**Description**: Retrieve the VAPID public key needed for client-side push subscription.
```http
GET {{baseUrl}}/notifications/push/vapid-key
```

## 🔒 Security Routes (`/api/security`)

### 1. Get Audit Logs
**Description**: Retrieve system audit logs with filtering options for security monitoring and compliance.
```http
GET {{baseUrl}}/security/audit-logs?page=1&limit=50&category=security&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer {{authToken}}
```

### 2. Get Audit Statistics
**Description**: Retrieve statistical summary of audit logs including counts by category and time period.
```http
GET {{baseUrl}}/security/audit-stats
Authorization: Bearer {{authToken}}
```

### 3. Get Compliance Report
**Description**: Generate comprehensive compliance report for security auditing and regulatory requirements.
```http
GET {{baseUrl}}/security/compliance-report
Authorization: Bearer {{authToken}}
```

### 4. Get Encryption Status
**Description**: Check current status of encryption system including key information and health metrics.
```http
GET {{baseUrl}}/security/encryption/status
Authorization: Bearer {{authToken}}
```

### 5. Rotate Encryption Keys
**Description**: Manually trigger encryption key rotation for enhanced security.
```http
POST {{baseUrl}}/security/encryption/rotate-keys
Authorization: Bearer {{authToken}}
```

### 6. Cleanup Old Keys
**Description**: Remove old encryption keys that are past the retention period.
```http
POST {{baseUrl}}/security/encryption/cleanup-keys
Authorization: Bearer {{authToken}}

{
  "retainDays": 30
}
```

### 7. Test Encryption
**Description**: Test encryption and decryption functionality with sample data for system validation.
```http
POST {{baseUrl}}/security/encryption/test
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "testData": "Sample data to encrypt and decrypt"
}
```

## 🔍 Health Check

### Health Check
**Description**: Check the overall health and status of the API server and its dependencies.
```http
GET http://localhost:5000/health
```

**Response**:
```json
{
  "status": "OK",
  "timestamp": "2024-12-07T10:30:00.000Z",
  "environment": "development",
  "version": "1.0.0"
}
```

## 📝 Testing Workflow

### Complete Testing Sequence:

1. **Start the server**: `npm run dev`

2. **Test Health Check**:
   ```http
   GET http://localhost:5000/health
   ```

3. **Register a user**:
   ```http
   POST {{baseUrl}}/auth/register
   ```

4. **Login and get token**:
   ```http
   POST {{baseUrl}}/auth/login
   ```
   Save the token to `authToken` environment variable.

5. **Test protected routes**:
   - Get profile: `GET {{baseUrl}}/auth/me`
   - Get dashboard: `GET {{baseUrl}}/dashboard/overview`

6. **Upload a dataset**:
   ```http
   POST {{baseUrl}}/datasets/upload
   ```

7. **Test AI features**:
   ```http
   POST {{baseUrl}}/ai/chat-completion
   ```

8. **Test analytics**:
   ```http
   POST {{baseUrl}}/analytics/query
   ```

9. **Test collaboration**:
   ```http
   POST {{baseUrl}}/collaboration/share
   ```

10. **Test notifications**:
    ```http
    GET {{baseUrl}}/notifications
    ```

11. **Test security (admin only)**:
    ```http
    GET {{baseUrl}}/security/audit-logs
    ```

## 🚨 Common Response Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

## 📋 Notes

1. Replace `[DATASET_ID]`, `[USER_ID]`, `[COLLABORATION_ID]`, `[NOTIFICATION_ID]`, etc. with actual IDs from your responses.

2. For file uploads, use `form-data` in Postman and select files from your system.

3. Some endpoints require specific RBAC permissions. Make sure your user has the appropriate role:
   - **User**: Basic read access to own resources
   - **Analyst**: Full access to datasets and analytics
   - **Admin**: Full system access including security features

4. The AI endpoints may require valid OpenRouter API configuration.

5. Socket.IO endpoints are real-time and work differently from REST APIs.

6. Rate limiting is applied: 500 requests per minute in development, 100 per 15 minutes in production.

7. Notification endpoints include real-time anomaly detection and monitoring capabilities.

8. Security endpoints are audit-logged and require appropriate permissions.

9. All collaboration endpoints support real-time updates via Socket.IO.

10. Authentication tokens expire and need to be refreshed periodically.

## 🔧 Environment Setup

Make sure you have these environment variables in your `.env` file:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/clarifai

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# AI Service
OPENROUTER_API_KEY=your-openrouter-api-key

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=50MB

# Security
ENCRYPTION_KEY=your-encryption-key
AUDIT_LOG_RETENTION_DAYS=90

# Notifications
EMAIL_SERVICE_API_KEY=your-email-service-key
PUSH_NOTIFICATION_KEY=your-push-notification-key
```

## 🔌 WebSocket Events

The application also supports real-time communication via Socket.IO:

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events
- `collaboration:join` - Join a collaboration room
- `collaboration:leave` - Leave a collaboration room
- `collaboration:comment` - Real-time comments
- `collaboration:annotation` - Real-time annotations
- `collaboration:cursor` - Real-time cursor positions
- `notification:new` - Real-time notifications
- `dataset:update` - Dataset changes
- `analysis:progress` - Analysis progress updates