# ClarifAI Collaboration Frontend

This document describes the collaboration frontend implementation for ClarifAI, built according to the backend documentation and design requirements.

## 🎯 Overview

The collaboration frontend provides a comprehensive real-time collaboration system for data analysis, allowing teams to work together on datasets, analyses, and dashboards with features like comments, annotations, and real-time updates.

## 🏗️ Architecture

### Components Structure

```
frontend/src/
├── pages/
│   └── Collaboration Page/
│       ├── CollaborationPage.tsx      # Main collaboration hub
│       └── CollaborationPage.css     # Styling for collaboration page
├── components/
│   ├── CollaborationWorkspace.tsx    # Active collaboration workspace
│   ├── CollaborationWorkspace.css    # Workspace styling
│   ├── ShareDialog.tsx               # Resource sharing dialog
│   ├── ShareDialog.css              # Share dialog styling
│   ├── CollaborationChat.tsx        # Real-time chat component
│   ├── CollaborationChat.css        # Chat styling
│   ├── CollaborativeCursors.tsx      # Real-time cursor tracking
│   └── CollaborativeCursors.css     # Cursor styling
├── services/
│   └── collaboration.ts              # API service for collaboration
└── contexts/
    └── CollaborationContext.tsx      # Real-time collaboration state
```

## 🚀 Features Implemented

### 1. Collaboration Hub (`CollaborationPage.tsx`)
- **My Collaborations**: View all user's active collaborations
- **Public Collaborations**: Browse public collaboration sessions
- **Share Resource**: Create new collaboration sessions
- **Search & Filter**: Find collaborations by type and content
- **Real-time Updates**: Live participant and activity updates

### 2. Collaboration Workspace (`CollaborationWorkspace.tsx`)
- **Real-time Chat**: Live messaging with participants
- **Comments System**: Threaded comments with reactions
- **Annotations**: Position-based annotations on charts/tables
- **Participant Management**: View online/offline status
- **Permission Control**: Role-based access management

### 3. Resource Sharing (`ShareDialog.tsx`)
- **User Search**: Find users by name or email
- **Permission Assignment**: Granular permission control
- **Collaboration Settings**: Configure session parameters
- **Public/Private Options**: Control visibility settings

### 4. Real-time Features
- **Socket.IO Integration**: Live updates via WebSocket
- **Collaborative Cursors**: See other users' mouse positions
- **Live Chat**: Real-time messaging
- **Activity Notifications**: Instant updates on changes

## 🔌 API Integration

### Backend Endpoints Used

```typescript
// Collaboration Management
GET    /api/collaboration                    # Get user collaborations
GET    /api/collaboration/public/list        # Get public collaborations
GET    /api/collaboration/share              # Get sharing information
POST   /api/collaboration/share              # Share a resource
GET    /api/collaboration/:id                # Get collaboration details
PUT    /api/collaboration/:id                # Update collaboration
DELETE /api/collaboration/:id                # End collaboration

// Comments & Annotations
POST   /api/collaboration/:id/comment        # Add comment
PUT    /api/collaboration/:id/annotation     # Add annotation

// Real-time Features
GET    /api/collaboration/room/:roomId/participants  # Get room participants
PUT    /api/collaboration/permissions        # Update user permissions
GET    /api/collaboration/status/:resourceType/:resourceId  # Get collaboration status
POST   /api/collaboration/kick               # Kick user from collaboration
POST   /api/collaboration/notify             # Send notification
```

### Data Models

```typescript
interface Collaboration {
  _id: string;
  resourceType: 'dataset' | 'analysis' | 'dashboard';
  resourceId: string;
  ownerId: string;
  participants: CollaborationParticipant[];
  comments: CollaborationComment[];
  annotations: CollaborationAnnotation[];
  settings: CollaborationSettings;
  version: number;
  lastModified: string;
  createdAt: string;
  updatedAt: string;
}

interface CollaborationParticipant {
  userId: string;
  permissions: string[];
  joinedAt: string;
  lastActivity: string;
  status: 'active' | 'inactive' | 'banned';
}

interface CollaborationComment {
  _id: string;
  userId: string;
  content: string;
  threadId?: string;
  mentions: string[];
  reactions: Reaction[];
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CollaborationAnnotation {
  _id: string;
  userId: string;
  chartId: string;
  position: {
    x?: number;
    y?: number;
    row?: number;
    column?: string | number;
    width?: number;
    height?: number;
  };
  content: string;
  type: 'note' | 'highlight' | 'question' | 'suggestion';
  status: 'active' | 'resolved' | 'archived';
  replies: AnnotationReply[];
  createdAt: string;
}
```

## 🎨 Design System

### Color Palette
- **Primary**: `#3b82f6` (Blue)
- **Success**: `#059669` (Green)
- **Warning**: `#d97706` (Amber)
- **Error**: `#dc2626` (Red)
- **Info**: `#7c3aed` (Purple)

### Permission Badges
- **Read**: Green background (`#d1fae5`)
- **Comment**: Amber background (`#fef3c7`)
- **Annotate**: Purple background (`#e9d5ff`)
- **Edit**: Red background (`#fee2e2`)
- **Admin**: Gray background (`#f3f4f6`)

### Typography
- **Headings**: 1.5rem, font-weight: 600
- **Body**: 0.875rem, line-height: 1.5
- **Captions**: 0.75rem, color: #6b7280

## 🔄 Real-time Features

### Socket.IO Events

```typescript
// Client Events (Emitted)
'join-room'     // Join collaboration room
'leave-room'    // Leave collaboration room
'chat-message'  // Send chat message
'cursor-move'   // Update cursor position
'document-edit' // Send document edit

// Server Events (Received)
'room-joined'   // Successfully joined room
'user-joined'   // User joined collaboration
'user-left'     // User left collaboration
'chat-message'  // New chat message
'cursor-update' // Cursor position update
'document-edit' // Document edit received
'room-state'    // Room state update
'resource-updated' // Resource update
'permission-updated' // Permission change
'error'         // Error occurred
```

### Connection Management

```typescript
// Connection with JWT authentication
const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
  auth: {
    token: userToken
  },
  transports: ['websocket', 'polling']
});
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Adaptations
- Collapsible sidebar navigation
- Stacked layout for collaboration panels
- Touch-friendly interface elements
- Optimized modal dialogs

## 🔒 Security Features

### Authentication
- JWT token-based authentication
- Automatic token refresh
- Secure WebSocket connections

### Authorization
- Role-based access control (RBAC)
- Granular permission system
- Resource ownership validation

### Data Protection
- Input validation and sanitization
- XSS prevention
- CSRF protection via same-origin policy

## 🚀 Usage Examples

### Creating a Collaboration

```typescript
const shareData: ShareResourceRequest = {
  resourceType: 'dataset',
  resourceId: 'dataset-123',
  participants: [
    {
      userId: 'user-456',
      permissions: ['read', 'comment']
    }
  ],
  settings: {
    allowComments: true,
    allowAnnotations: true,
    allowEditing: false,
    isPublic: false
  }
};

await collaborationService.shareResource(shareData);
```

### Adding a Comment

```typescript
await collaborationService.addComment('collab-789', {
  content: 'This data looks interesting!',
  mentions: ['user-456']
});
```

### Adding an Annotation

```typescript
await collaborationService.addAnnotation('collab-789', {
  chartId: 'main-chart',
  position: { x: 100, y: 200 },
  content: 'Peak value here',
  type: 'highlight'
});
```

## 🧪 Testing

### Component Testing
- Unit tests for individual components
- Integration tests for collaboration flows
- Mock Socket.IO for real-time testing

### API Testing
- Service layer tests with mocked API calls
- Error handling validation
- Permission boundary testing

## 🔧 Configuration

### Environment Variables

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Socket.IO Configuration

```typescript
// Connection options
const socketOptions = {
  auth: { token: userToken },
  transports: ['websocket', 'polling'],
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
};
```

## 📈 Performance Considerations

### Optimization Strategies
- **Lazy Loading**: Components loaded on demand
- **Virtual Scrolling**: For large comment/annotation lists
- **Debounced Updates**: Reduce API calls for real-time features
- **Connection Pooling**: Efficient Socket.IO connection management

### Memory Management
- Cleanup Socket.IO listeners on unmount
- Clear collaboration state on navigation
- Optimize re-renders with React.memo

## 🐛 Error Handling

### Error Types
- **Network Errors**: Connection failures, timeouts
- **Authentication Errors**: Invalid tokens, expired sessions
- **Permission Errors**: Insufficient access rights
- **Validation Errors**: Invalid input data

### Error Recovery
- Automatic reconnection for Socket.IO
- Graceful degradation for offline mode
- User-friendly error messages
- Retry mechanisms for failed operations

## 🔮 Future Enhancements

### Planned Features
- **Video Conferencing**: Integrated video calls
- **Screen Sharing**: Share analysis screens
- **Version Control**: Track collaboration history
- **Advanced Permissions**: Time-based access, IP restrictions
- **Mobile App**: Native mobile collaboration
- **Offline Support**: Work without internet connection

### Technical Improvements
- **WebRTC Integration**: Direct peer-to-peer communication
- **Conflict Resolution**: Handle simultaneous edits
- **Performance Monitoring**: Real-time performance metrics
- **Accessibility**: WCAG 2.1 AA compliance

---

## 📞 Support

For questions or issues with the collaboration frontend:

1. Check the backend API documentation
2. Review the Socket.IO event documentation
3. Test with the provided examples
4. Contact the development team

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintainer**: ClarifAI Development Team
