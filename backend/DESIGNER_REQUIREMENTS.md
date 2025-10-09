# ClarifAI Design Requirements Documentation
## For UI/UX Designers

This document outlines the complete design requirements for the ClarifAI platform frontend based on the actual backend implementation. Designers should use this as a comprehensive guide to create all necessary UI components, screens, and user experiences.

---

## 🎯 Project Overview

**ClarifAI** is a comprehensive data analytics platform built with TypeScript, Node.js, Express, MongoDB, and Socket.IO. The platform combines AI-powered insights, real-time collaboration, and advanced data management capabilities. The platform serves data analysts, researchers, and teams who need to:
- Upload, manage, and analyze datasets (CSV, JSON, Excel)
- Collaborate in real-time on data projects with comments and annotations
- Generate AI-powered insights and predictions using OpenRouter API
- Monitor data quality and anomalies with automated detection
- Manage user permissions and security with role-based access control
- Receive real-time notifications via email, push, and in-app channels

---

## 🏗️ System Architecture Requirements

### Core Platform Features
1. **Authentication System** - JWT-based auth with OTP email verification, role-based access (admin/analyst/viewer)
2. **Dataset Management** - File upload (CSV/JSON/Excel), processing, GridFS storage, quality validation
3. **Analytics Engine** - Natural language queries, AI-powered insights via OpenRouter API
4. **Collaboration Tools** - Real-time Socket.IO collaboration with comments, annotations, and permissions
5. **AI Integration** - Chat completion, text analysis, automated insights generation
6. **Dashboard System** - Statistics, activity feeds, and overviews with real-time updates
7. **Notification System** - Multi-channel notifications (email, push, in-app) with user preferences
8. **Security Management** - Audit logs, encryption, circuit breakers, graceful degradation

---

## 📱 Required UI Screens & Components

### 1. 🔐 Authentication Module

#### **Login/Registration Flow**
- **Login Screen**
  - Email/password input fields
  - "Remember me" checkbox
  - "Forgot password" link
  - Clean, professional design with ClarifAI branding
  - Real-time validation feedback
  - Error handling for unverified accounts

- **Registration Screen**
  - Single-step registration form:
    - Basic info (firstName, lastName, email, password)
    - Role selection (viewer/analyst - admin cannot be self-assigned)
    - Terms & conditions checkbox
  - Input validation with real-time feedback
  - Password strength indicator
  - Email format validation

- **OTP Verification Screen**
  - 6-digit OTP input field (large, centered)
  - Email address display
  - "Resend OTP" button with countdown timer (10-minute expiry)
  - Clear success/error messaging
  - Automatic redirect after verification
  - Welcome email sent after successful verification

- **Profile Management**
  - View/edit profile information (firstName, lastName, preferences)
  - Change password form with current password verification
  - Account settings and preferences
  - Last login display

- **User Search Interface**
  - Search bar with autocomplete (searches firstName, lastName, email)
  - User cards with basic info
  - Pagination support (10-50 results per page)
  - Filter by active users only

### 2. 📊 Dataset Management Module

#### **File Upload Interface**
- **Drag & Drop Upload Area**
  - Large, prominent drop zone
  - Support for CSV, JSON, Excel files (validated by MIME type and extension)
  - File size indicator (configurable max size via environment)
  - Progress bar with percentage
  - Single file upload per request
  - Real-time file type validation
  - Error handling for unsupported formats

- **Dataset Library**
  - Grid/list view toggle
  - Pagination controls (10-50 items per page)
  - Search functionality (name, description, tags)
  - Filter by processing status (pending, processing, ready, error)
  - Sort options (name, date, size, type)
  - Dataset cards showing:
    - File name and type
    - Upload date and size
    - Processing status with indicators
    - Owner information
    - Quick action buttons (view, edit, delete, share)
    - Tags display

- **Dataset Preview Modal**
  - Tabular data display with pagination
  - Column headers with sorting
  - Data type indicators
  - Sample rows view (first 100 rows)
  - Basic statistics panel
  - Data quality report display
  - Export options

- **Dataset Sharing Interface**
  - User selection dropdown/search (searches active users)
  - Permission level settings (read/write/admin)
  - Access management table with granted by information
  - Remove access functionality
  - Owner has full access, others require explicit permissions

### 3. 📈 Analytics Dashboard Module

#### **Main Dashboard**
- **Overview Cards**
  - Total datasets count
  - Active collaborations
  - Recent analyses
  - System usage metrics

- **Recent Activity Feed**
  - Chronological list of user actions
  - Activity type icons
  - Timestamps and user attribution
  - "Load more" or pagination

- **Quick Actions Panel**
  - "Upload Dataset" button
  - "Start New Analysis" button
  - "Join Collaboration" button
  - "View Reports" button

#### **Analytics Workbench**
- **Natural Language Query Interface**
  - Large text input for questions
  - Query suggestions/examples
  - Voice input option (if supported)
  - Query history dropdown

- **Results Display Area**
  - Dynamic chart rendering (bar, line, pie, scatter plots)
  - Data table views
  - Export options (PDF, PNG, CSV)
  - Full-screen mode toggle

- **Prediction Interface**
  - Model selection dropdown
  - Parameter configuration panel
  - Results confidence indicators
  - Prediction comparison charts

- **Insights Panel**
  - Auto-generated insights cards
  - Insight categories/tags
  - Save/bookmark functionality
  - Share insights button

- **Analysis Sessions**
  - Session management interface
  - Save/load session functionality
  - Session history browser
  - Collaborative session indicators

### 4. 🤝 Collaboration Module

#### **Real-time Collaboration Interface**
- **Active Participants Panel**
  - Live participant list with avatars
  - Online/offline status indicators
  - Permission badges (read, comment, annotate, edit, admin)
  - User activity tracking
  - Participant status (active, inactive, banned)

- **Resource Collaboration**
  - Collaborate on datasets, analyses, or dashboards
  - Resource-specific collaboration settings
  - Public/private collaboration options
  - Expiration date settings
  - Version tracking with increment

- **Collaborative Canvas**
  - Shared workspace for data analysis
  - Real-time updates via Socket.IO
  - Conflict resolution indicators
  - Version history timeline
  - Last modified tracking

- **Comments & Annotations**
  - Inline comments on data points with threading
  - Annotation tools (notes, highlights, questions, suggestions)
  - Chart and table position-based annotations
  - Comment reactions (like, dislike, love, laugh, angry)
  - @mention functionality with user search
  - Edit/delete comment capabilities

- **Permission Management**
  - Granular permission assignment (read, comment, annotate, edit, admin)
  - Permission matrix display
  - Remove participant functionality
  - Owner has all permissions by default

### 5. 🤖 AI Integration Module

#### **AI Chat Interface**
- **Chat Window**
  - Conversation history display
  - Message bubbles (user vs AI)
  - Typing indicators
  - Message timestamps
  - Session management

- **Input Controls**
  - Text input with send button
  - Context selection (datasetId, sessionId)
  - Suggested prompts
  - Send on Enter key

- **AI Analysis Tools**
- **Text Analysis Interface**
  - Text input area
  - Analysis type selection (sentiment, entities, summary)
  - Results display with highlighting
  - Confidence scores display
  - Export analysis results

- **Chat Completion**
  - Natural language queries about datasets
  - Context-aware responses
  - Session-based conversations
  - Integration with dataset analysis

- **Insights Generation**
  - Dataset selection dropdown
  - Insight type preferences (trends, anomalies, correlations)
  - Generated insights display with confidence scores
  - Regenerate button
  - Save/bookmark insights

### 6. 🔔 Notification System


#### **Notification Center**
- **Notification List**
  - Chronological notification feed with pagination
  - Read/unread status indicators
  - Notification type icons (data_change, anomaly_detected, collaboration_update, system_alert, analysis_complete, prediction_ready, info)
  - Timestamp display
  - Mark as read/unread buttons
  - Priority indicators (low, normal, high, urgent)
  - Severity indicators for anomalies (low, medium, high, critical)

- **Notification Preferences**
  - Notification type toggles (anomalyDetection, dataChanges, collaborationUpdates, systemAlerts)
  - Channel preferences (email, push, inApp)
  - Frequency settings (instant, hourly, daily, weekly)
  - Do not disturb mode
  - Enable/disable browser push notifications
  - Permission prompt UI for browser notifications

- **Web Push Notification Support**
  - Real-time push notifications delivered via browser using VAPID keys
  - Permission request and fallback for unsupported browsers
  - Cross-device notification delivery (desktop/mobile)
  - Push notification settings panel
  - Push notification opt-in/out flow
  - UI for denied/blocked permission states
  - VAPID public key display for frontend integration

- **Real-time Notification Toast**
  - Pop-up notifications (top-right corner)
  - Auto-dismiss timer
  - Action buttons (dismiss, view)
  - Different styles for different types and priorities
  - Support for browser push notification appearance
  - Socket.IO real-time delivery

#### **Monitoring & Anomaly Detection**
- **Anomaly Detection Dashboard**
  - Dataset anomaly overview with severity indicators
  - Timeline of detected anomalies
  - Investigation tools
  - Anomaly details with metadata
  - Action URLs for direct navigation

- **Monitoring Rules Management**
  - Create/edit monitoring rules for datasets
  - Rule condition builder
  - Alert threshold settings
  - Rule activation toggles
  - Dataset-specific monitoring rules
  - Rule validation and testing

### 7. 🔒 Security Management Module

#### **Audit Log Viewer**
- **Log Table Interface**
  - Filterable/sortable table with pagination
  - Search functionality
  - Date range picker
  - Export options
  - Action type filtering (user_login, data_access, etc.)
  - Success/failure status filtering

- **Audit Statistics**
  - Security metrics dashboard
  - Chart visualizations
  - Trend analysis
  - Alert indicators
  - Request ID tracking

- **Compliance Reports**
  - Report generation interface
  - Template selection
  - Date range selection
  - Download/share options
  - Admin-only access

- **Security Status**
  - Circuit breaker health indicators
  - Graceful degradation status
  - Service availability monitoring
  - Error rate tracking
  - Performance metrics

---

## 🎨 Design System Requirements

### Visual Design Principles
- **Modern & Professional**: Clean, minimalist interface with data-focused design
- **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support
- **Responsive**: Mobile-first design, tablet and desktop optimizations
- **Data-Dense**: Efficient information display, scannable layouts
- **Trust & Security**: Visual indicators for security features, clear permission states

### Color Palette Guidelines
- **Primary Colors**: Professional blues/teals for data analysis theme
- **Secondary Colors**: Complementary colors for categories and status indicators
- **Semantic Colors**: 
  - Success: Green (#10B981)
  - Warning: Amber (#F59E0B)
  - Error: Red (#EF4444)
  - Info: Blue (#3B82F6)
- **Neutral Colors**: Grays for backgrounds, borders, and text hierarchy

### Typography
- **Headings**: Clear hierarchy (H1-H6) with proper contrast
- **Body Text**: Highly readable fonts (16px minimum)
- **Code/Data**: Monospace fonts for technical content
- **UI Elements**: Consistent font weights and sizes

### Iconography
- **Consistent Icon Library**: Use single icon set (Heroicons, Feather, or custom)
- **Functional Icons**: Clear meaning without labels
- **Status Indicators**: Consistent symbols for different states
- **Action Icons**: Obvious interactive elements

---

## 🔄 User Experience Flows

### Primary User Journeys

#### 1. New User Onboarding
1. Landing page → Registration
2. Email verification (OTP)
3. Profile setup
4. Tour/tutorial of main features
5. First dataset upload
6. Basic analysis walkthrough

#### 2. Dataset Analysis Workflow
1. Upload dataset → Preview data
2. Run initial analysis → Review insights
3. Ask natural language questions
4. Generate visualizations
5. Share results with team
6. Save analysis session

#### 3. Team Collaboration Flow
1. Create/join collaboration room
2. Invite team members
3. Share datasets and permissions
4. Collaborative analysis session
5. Add comments and annotations
6. Export collaborative results

#### 4. AI-Powered Analysis
1. Select dataset for AI analysis
2. Choose analysis type
3. Configure parameters
4. Review AI-generated insights
5. Ask follow-up questions via chat
6. Export or save AI results

---

## 📐 Technical Design Specifications

### Layout & Grid System
- **Grid System**: 12-column responsive grid
- **Breakpoints**: 
  - Mobile: 320px - 767px
  - Tablet: 768px - 1023px  
  - Desktop: 1024px+
  - Large Desktop: 1440px+

### Component States
- **Default State**: Normal appearance
- **Hover State**: Subtle feedback on interactive elements
- **Active/Pressed State**: Clear indication of interaction
- **Disabled State**: Reduced opacity, no interaction
- **Loading State**: Skeleton screens or spinners
- **Error State**: Clear error indication with recovery options


### Animation & Micro-interactions
- **Page Transitions**: Smooth, fast transitions (200-300ms)
- **Loading States**: Progress indicators, skeleton screens
- **Hover Effects**: Subtle animations on interactive elements
- **Real-time Updates**: Smooth appearance of new content
- **Drag & Drop**: Visual feedback during file operations
- **Web Push Notification Interactions**: Animated permission prompts, notification arrival animations, feedback for permission changes

### Data Visualization Requirements
- **Chart Libraries**: Recommend Chart.js, D3.js, or Recharts
- **Chart Types**: Bar, line, pie, scatter, heatmaps, histograms
- **Interactive Features**: Zoom, pan, hover tooltips, drill-down
- **Responsive Charts**: Adapt to different screen sizes
- **Export Options**: PNG, PDF, SVG formats
- **Real-time Updates**: Socket.IO integration for live data updates
- **Annotation Support**: Position-based annotations (x,y coordinates or row,column)

---

## 📱 Mobile Considerations


### Mobile-Specific Features
- **Touch-Optimized**: Minimum 44px touch targets
- **Gesture Support**: Swipe navigation where appropriate
- **Mobile File Upload**: Camera integration for document capture
- **Offline Capability**: Basic functionality when offline
- **Progressive Web App**: Add to home screen functionality
- **Mobile Push Notification Support**: Push notification permission flow and delivery for mobile browsers and PWA

### Mobile Layout Adaptations
- **Collapsible Navigation**: Hamburger menu for small screens
- **Stacked Components**: Vertical layout for data tables
- **Simplified Charts**: Mobile-optimized visualizations
- **Touch-Friendly Forms**: Larger inputs, better spacing

---

## 🧪 Testing & Validation Requirements

### Usability Testing
- **User Testing**: Test with actual data analysts and researchers
- **A/B Testing**: Test different layouts and workflows
- **Accessibility Testing**: Keyboard navigation, screen readers
- **Performance Testing**: Load times, data rendering speed

### Cross-browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile
- **Progressive Enhancement**: Graceful degradation for older browsers

---

## 📦 Deliverables Required from Designers

### Design Assets
1. **UI Kit & Design System**
   - Component library with all states
   - Color palette and typography guidelines
   - Icon set and illustration style
   - Grid system and spacing rules

2. **High-Fidelity Mockups**
   - All screens and components designed
   - Desktop, tablet, and mobile versions
   - Light and dark mode variations (if applicable)
   - Interactive prototypes for complex flows

3. **User Flow Diagrams**
   - Complete user journey maps
   - Decision trees for complex processes
   - Error handling flows
   - Navigation structures

4. **Animation & Interaction Specs**
   - Micro-interaction specifications
   - Transition timing and easing
   - Loading state behaviors
   - Responsive behavior documentation

### Technical Documentation
1. **Design Tokens**
   - Colors, typography, spacing values
   - JSON/CSS format for development handoff
   - Component specifications

2. **Asset Exports**
   - SVG icons and illustrations
   - Image assets in multiple resolutions
   - Logo variations and brand assets

3. **Style Guide**
   - Usage guidelines for components
   - Do's and don'ts examples
   - Brand voice and tone guidelines

---

## 🔌 Backend API Integration

### Authentication Endpoints
- `POST /api/auth/register` - User registration with OTP
- `POST /api/auth/verify-otp` - Email verification
- `POST /api/auth/resend-otp` - Resend verification code
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/search` - Search users for collaboration

### Dataset Management Endpoints
- `POST /api/datasets/upload` - Upload dataset file
- `GET /api/datasets` - Get user datasets with pagination
- `GET /api/datasets/:id` - Get dataset details
- `PUT /api/datasets/:id` - Update dataset metadata
- `DELETE /api/datasets/:id` - Delete dataset
- `GET /api/datasets/:id/preview` - Get dataset preview
- `POST /api/datasets/:id/share` - Share dataset with user
- `DELETE /api/datasets/:id/access/:userId` - Remove dataset access

### AI & Analytics Endpoints
- `POST /api/ai/chat-completion` - AI chat with context
- `POST /api/ai/analyze-text` - Text analysis
- `POST /api/analytics/query` - Natural language queries
- `POST /api/analytics/insights` - Generate insights

### Collaboration Endpoints
- `POST /api/collaboration/share` - Share resource
- Real-time Socket.IO events for live collaboration

### Notification Endpoints
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read
- `GET /api/notifications/preferences` - Get preferences
- `PUT /api/notifications/preferences` - Update preferences
- `POST /api/notifications/push/subscribe` - Subscribe to push notifications
- `GET /api/notifications/push/vapid-key` - Get VAPID public key

### Security Endpoints
- `GET /api/security/audit-logs` - Get audit logs (admin only)
- `GET /health` - Health check
- `GET /health/detailed` - Detailed health status

---

## 🚀 Implementation Priority

### Phase 1: Core Features (MVP) - ✅ Backend Complete
1. Authentication system (login, register, OTP verification) - ✅ Implemented
2. Basic dataset upload and management (CSV/JSON/Excel) - ✅ Implemented
3. Simple dashboard with stats - ✅ Implemented
4. Basic user profile management - ✅ Implemented

### Phase 2: Analytics & Visualization - ✅ Backend Complete
1. Data visualization components - Ready for frontend
2. Natural language query interface - ✅ Backend API ready
3. AI chat integration (OpenRouter API) - ✅ Implemented
4. Basic collaboration features - ✅ Backend implemented

### Phase 3: Advanced Features - ✅ Backend Complete
1. Real-time collaboration tools (Socket.IO) - ✅ Implemented
2. Advanced analytics workbench - ✅ Backend ready
3. Comprehensive notification system (email/push/in-app) - ✅ Implemented
4. Security management interface - ✅ Implemented

### Phase 4: Frontend Implementation - 🎯 Current Focus
1. React/Next.js frontend development
2. Socket.IO client integration
3. Web Push notification implementation
4. Real-time collaboration UI
5. Mobile optimization
6. Advanced animations and micro-interactions
7. Accessibility improvements
8. Performance optimizations

---

## 📞 Next Steps for Designers

1. **Review this document** thoroughly - all backend APIs are implemented and ready
2. **Research similar platforms** (Tableau, Power BI, Jupyter) for inspiration
3. **Create user personas** based on target users (data analysts, researchers, teams)
4. **Develop initial wireframes** for core screens focusing on:
   - Authentication flow (register → OTP → login)
   - Dataset upload and management
   - Real-time collaboration interface
   - Notification center with push support
   - AI chat and analytics interface
5. **Design Socket.IO integration** for real-time features
6. **Design Web Push notification UI** including permission prompts
7. **Present design concepts** for feedback and iteration
8. **Collaborate closely** with development team - backend is complete and ready for frontend integration

---

## 💡 Additional Considerations


### Performance Optimization
- **Lazy Loading**: Load components and data as needed
- **Image Optimization**: Proper image formats and compression
- **Code Splitting**: Separate bundles for different features
- **Caching Strategy**: Optimize data and asset caching
- **Efficient Push Delivery**: Minimize payload size and optimize push notification delivery for speed and reliability
- **Socket.IO Optimization**: Efficient real-time updates with connection management
- **File Upload Optimization**: Progress tracking and chunked uploads for large files
- **Database Query Optimization**: Backend uses MongoDB with proper indexing

### Internationalization
- **Text Externalization**: Prepare for multiple languages
- **RTL Support**: Consider right-to-left language support
- **Cultural Considerations**: Adapt UI patterns for different regions


### Data Privacy & Compliance
- **GDPR Compliance**: Data handling and user consent interfaces
- **Privacy Controls**: User data management interfaces
- **Audit Trail**: Clear logging and tracking interfaces (backend implements comprehensive audit logging)
- **Push Notification Consent**: Explicit opt-in for web push, clear permission management, and privacy documentation for notification data
- **Role-Based Access Control**: Backend implements granular permissions (admin/analyst/viewer)
- **Data Encryption**: Backend uses encryption for sensitive data
- **Circuit Breakers**: Backend implements fault tolerance and graceful degradation

---

**This document serves as the comprehensive guide for designing the ClarifAI platform frontend. The backend is fully implemented with all APIs ready for integration. Designers should refer to this document throughout the design process and collaborate with the development team to ensure seamless frontend-backend integration.**

---

## 📋 Backend Implementation Status

✅ **Complete Backend Features:**
- JWT Authentication with OTP verification
- Dataset management with file upload (CSV/JSON/Excel)
- AI integration via OpenRouter API
- Real-time collaboration with Socket.IO
- Multi-channel notification system (email/push/in-app)
- Role-based access control
- Security audit logging
- Circuit breakers and graceful degradation
- MongoDB with proper indexing
- Comprehensive API documentation

🎯 **Ready for Frontend Development:**
- All API endpoints documented and tested
- Socket.IO events defined
- Web Push notification infrastructure ready
- Real-time collaboration backend complete
- Security and authentication systems operational