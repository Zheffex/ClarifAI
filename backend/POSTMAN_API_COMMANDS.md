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
```http
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123!"
}
```

**Response**: Save the `token` from response to `authToken` environment variable.

### 3. Logout User
```http
POST {{baseUrl}}/auth/logout
Authorization: Bearer {{authToken}}
```

### 4. Get User Profile
```http
GET {{baseUrl}}/auth/me
Authorization: Bearer {{authToken}}
```

### 5. Update Profile
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
```http
GET {{baseUrl}}/auth/search?q=john&limit=10&page=1
Authorization: Bearer {{authToken}}
```

## 📊 Dataset Routes (`/api/datasets`)

### 1. Upload Dataset
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
```http
GET {{baseUrl}}/datasets?page=1&limit=10&sortBy=createdAt&sortOrder=desc
Authorization: Bearer {{authToken}}
```

### 3. Get Dataset by ID
```http
GET {{baseUrl}}/datasets/[DATASET_ID]
Authorization: Bearer {{authToken}}
```

### 4. Update Dataset
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
```http
DELETE {{baseUrl}}/datasets/[DATASET_ID]
Authorization: Bearer {{authToken}}
```

### 6. Get Dataset Preview
```http
GET {{baseUrl}}/datasets/[DATASET_ID]/preview?limit=5
Authorization: Bearer {{authToken}}
```

### 7. Share Dataset
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
```http
DELETE {{baseUrl}}/datasets/[DATASET_ID]/access/[USER_ID]
Authorization: Bearer {{authToken}}
```

## 🧠 AI Routes (`/api/ai`)

### 1. Chat Completion
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
```http
GET {{baseUrl}}/ai/status
```

## 📈 Analytics Routes (`/api/analytics`)

### 1. Process Natural Language Query
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
```http
GET {{baseUrl}}/analytics/insights/[DATASET_ID]
Authorization: Bearer {{authToken}}
```

### 4. Get Recommendations
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
```http
GET {{baseUrl}}/analytics/sessions?page=1&limit=10
Authorization: Bearer {{authToken}}
```

### 6. Create Analysis Session
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
```http
GET {{baseUrl}}/analytics/sessions/[SESSION_ID]
Authorization: Bearer {{authToken}}
```

## 🎛️ Dashboard Routes (`/api/dashboard`)

### 1. Get Dashboard Statistics
```http
GET {{baseUrl}}/dashboard/stats
Authorization: Bearer {{authToken}}
```

### 2. Get Recent Activity
```http
GET {{baseUrl}}/dashboard/activity?limit=20
Authorization: Bearer {{authToken}}
```

### 3. Get Dashboard Overview
```http
GET {{baseUrl}}/dashboard/overview
Authorization: Bearer {{authToken}}
```

## 🤝 Collaboration Routes (`/api/collaboration`)

### 1. Share Resource
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
```http
GET {{baseUrl}}/collaboration/[COLLABORATION_ID]
Authorization: Bearer {{authToken}}
```

### 3. Add Comment
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
```http
DELETE {{baseUrl}}/collaboration/[COLLABORATION_ID]
Authorization: Bearer {{authToken}}
```

### 7. Get User Collaborations
```http
GET {{baseUrl}}/collaboration?status=active&page=1&limit=10
Authorization: Bearer {{authToken}}
```

### 8. Get Public Collaborations
```http
GET {{baseUrl}}/collaboration/public/list?limit=10
```

### 9. Get Room Participants
```http
GET {{baseUrl}}/collaboration/room/[ROOM_ID]/participants
Authorization: Bearer {{authToken}}
```

### 10. Update User Permissions
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
```http
GET {{baseUrl}}/collaboration/status/dataset/[DATASET_ID]
Authorization: Bearer {{authToken}}
```

### 12. Kick User
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

## 🔍 Health Check

### Health Check
```http
GET http://localhost:5000/health
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

1. Replace `[DATASET_ID]`, `[USER_ID]`, `[COLLABORATION_ID]`, etc. with actual IDs from your responses.

2. For file uploads, use `form-data` in Postman and select files from your system.

3. Some endpoints require specific RBAC permissions. Make sure your user has the appropriate role.

4. The AI endpoints may require valid OpenRouter API configuration.

5. Socket.IO endpoints are real-time and work differently from REST APIs.

6. Rate limiting is applied: 500 requests per minute in development, 100 per 15 minutes in production.

## 🔧 Environment Setup

Make sure you have these environment variables in your `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/clarifai
JWT_SECRET=your-super-secret-jwt-key
OPENROUTER_API_KEY=your-openrouter-api-key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```