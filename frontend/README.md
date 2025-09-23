# ClarifAI Frontend

> **React TypeScript SPA** - Modern, responsive user interface for the ClarifAI analytics platform with real-time collaboration features.

![React](https://img.shields.io/badge/React-19+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![Chart.js](https://img.shields.io/badge/Chart.js-4.0+-orange)
![D3.js](https://img.shields.io/badge/D3.js-7.0+-green)

## 🏗️ Architecture Overview

The frontend follows a component-based architecture with clear separation of concerns, context-driven state management, and responsive design patterns:

```
src/
├── components/          # Reusable UI components
│   ├── AIChat.tsx        # Natural language query interface
│   ├── Chart.tsx         # Chart visualization wrapper
│   ├── ChartBuilder.tsx  # Interactive chart creation
│   ├── ChartWidget.tsx   # Dashboard chart widgets
│   ├── CollaborationChat.tsx # Real-time team chat
│   ├── CollaborativeCursors.tsx # Live cursor tracking
│   ├── D3Heatmap.tsx     # Custom D3.js heatmap
│   ├── Dashboard.tsx     # Main dashboard layout
│   ├── DataPreview.tsx   # Dataset preview component
│   ├── DataQualityReport.tsx # Data validation results
│   ├── Layout.tsx        # Application shell layout
│   ├── MetricWidget.tsx  # KPI display widgets
│   ├── ProtectedRoute.tsx # Authentication guard
│   ├── SchemaViewer.tsx  # Dataset schema explorer
│   ├── ShareDialog.tsx   # Collaboration sharing modal
│   └── Widget.tsx        # Base widget component
├── contexts/            # React Context providers
│   ├── AnalyticsContext.tsx   # Analytics state management
│   ├── AuthContext.tsx        # User authentication state
│   ├── CollaborationContext.tsx # Real-time collaboration
│   ├── DatasetContext.tsx     # Dataset management state
│   └── NotificationContext.tsx # Toast notifications
├── pages/               # Route-level page components
│   ├── AnalyticsPage.tsx     # Analytics workspace
│   ├── CollaborationPage.tsx # Team collaboration hub
│   ├── DashboardPage.tsx     # Main dashboard
│   ├── DatasetsPage.tsx      # Dataset management
│   ├── LoginPage.tsx         # User authentication
│   └── RegisterPage.tsx      # User registration
├── services/            # API and business logic
│   ├── authService.ts        # Authentication API calls
│   ├── chartService.ts       # Chart generation logic
│   ├── nlpService.ts         # Natural language processing
│   └── predictionEngine.ts   # ML prediction pipeline
├── types/               # TypeScript type definitions
│   └── index.ts              # Shared interfaces and types
├── App.tsx              # Main application component
└── index.tsx            # Application entry point
```

## ✨ Core Features

### 🤖 AI-Powered Analytics
- **Natural Language Queries**: "Show me sales trends for the last quarter"
- **Smart Chart Suggestions**: Automatic visualization recommendations
- **Contextual Insights**: AI-generated explanations and recommendations
- **Query History**: Track and replay previous analysis queries

### 📊 Interactive Visualizations
- **Chart.js Integration**: Bar, line, pie, scatter, and radar charts
- **D3.js Custom Charts**: Advanced heatmaps and custom visualizations
- **Real-time Updates**: Live data refresh and chart animations
- **Interactive Drill-down**: Click to explore data in detail

### 🤝 Real-time Collaboration
- **Live Cursors**: See where team members are working
- **Instant Chat**: Contextual discussions within dashboards
- **Shared Annotations**: Collaborative notes on charts and data
- **Presence Indicators**: Real-time user activity status

### 📡 Responsive Design
- **Mobile-first Approach**: Optimized for all screen sizes
- **Touch-friendly Interface**: Gesture support for mobile devices
- **Adaptive Layouts**: Dynamic grid systems and flexible components
- **Dark/Light Theme**: User preference-based theming

## 🚀 Getting Started

### Prerequisites
- **Node.js** v16 or higher
- **npm** or **yarn** package manager
- **ClarifAI Backend** running on http://localhost:5000

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your `.env.local` file:
   ```env
   REACT_APP_API_URL=http://localhost:5000
   REACT_APP_WS_URL=http://localhost:5000
   REACT_APP_ENVIRONMENT=development
   REACT_APP_VERSION=1.0.0
   ```

3. **Start the development server**
   ```bash
   npm start
   ```
   
   The application will open at http://localhost:3000

### 🧪 Development Scripts

```bash
# Development
npm start           # Start development server with hot reload
npm run build       # Create production build
npm run build:analyze # Analyze bundle size

# Testing
npm test            # Run test suite in watch mode
npm run test:coverage # Generate test coverage report
npm run test:ci     # Run tests in CI mode (single run)

# Code Quality
npm run lint        # Run ESLint
npm run lint:fix    # Auto-fix linting issues
npm run format      # Format code with Prettier
npm run type-check  # TypeScript type checking
```

## 📈 State Management

### Context Architecture
The application uses React Context for state management, providing clean separation of concerns:

#### AuthContext
```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

// Usage in components
const { user, login, logout, isAuthenticated } = useAuth();
```

#### DatasetContext
```typescript
interface DatasetContextType {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  isLoading: boolean;
  fetchDatasets: () => Promise<void>;
  uploadDataset: (file: File, metadata: DatasetMetadata) => Promise<Dataset>;
  deleteDataset: (id: string) => Promise<void>;
  selectDataset: (dataset: Dataset) => void;
}

// Usage in components
const { datasets, uploadDataset, currentDataset } = useDataset();
```

#### AnalyticsContext
```typescript
interface AnalyticsContextType {
  sessions: AnalysisSession[];
  currentSession: AnalysisSession | null;
  isProcessing: boolean;
  createSession: (datasetId: string, title: string) => Promise<AnalysisSession>;
  processQuery: (query: string, context?: QueryContext) => Promise<QueryResult>;
  saveVisualization: (chart: ChartConfig) => Promise<void>;
}

// Usage in components
const { processQuery, currentSession, sessions } = useAnalytics();
```

## 🎨 UI Components

### Chart Components

#### Chart.tsx - Base Chart Wrapper
```typescript
interface ChartProps {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'radar';
  data: ChartData;
  options?: ChartOptions;
  height?: number;
  responsive?: boolean;
  onDataPointClick?: (point: DataPoint) => void;
}

// Usage
<Chart 
  type="line" 
  data={salesData} 
  options={{ responsive: true }}
  onDataPointClick={handlePointClick}
/>
```

#### ChartBuilder.tsx - Interactive Chart Creator
```typescript
interface ChartBuilderProps {
  dataset: Dataset;
  onChartCreate: (chart: ChartConfig) => void;
  initialConfig?: Partial<ChartConfig>;
}

// Features
// - Drag-and-drop field selection
// - Real-time chart preview
// - Advanced styling options
// - Export capabilities
```

#### D3Heatmap.tsx - Custom D3 Visualization
```typescript
interface D3HeatmapProps {
  data: HeatmapData[];
  width?: number;
  height?: number;
  colorScale?: ColorScale;
  onCellHover?: (cell: HeatmapCell) => void;
}

// Features
// - Interactive hover effects
// - Customizable color scales
// - Zoom and pan capabilities
// - Tooltip integration
```

### Collaboration Components

#### CollaborationChat.tsx
```typescript
interface CollaborationChatProps {
  sessionId: string;
  participants: User[];
  onMessageSend: (message: ChatMessage) => void;
}

// Features
// - Real-time messaging
// - File sharing
// - Emoji reactions
// - Message threading
```

#### CollaborativeCursors.tsx
```typescript
interface CollaborativeCursorsProps {
  sessionId: string;
  currentUser: User;
  onCursorMove: (position: CursorPosition) => void;
}

// Features
// - Real-time cursor tracking
// - User identification
// - Smooth animations
// - Click indicators
```

## 📡 API Integration

### Service Layer Architecture

#### authService.ts
```typescript
class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    const { token, user } = response.data;
    
    // Store token securely
    tokenStorage.setToken(token);
    
    return { token, user };
  }

  async refreshToken(): Promise<string> {
    const response = await api.post('/auth/refresh');
    return response.data.token;
  }

  logout(): void {
    tokenStorage.removeToken();
    api.defaults.headers.common['Authorization'] = '';
  }
}
```

#### chartService.ts
```typescript
class ChartService {
  generateChartConfig(data: any[], chartType: ChartType): ChartConfig {
    // Intelligent chart configuration based on data types
    const config = this.analyzeDataStructure(data);
    return this.buildChartConfig(config, chartType);
  }

  async exportChart(chartId: string, format: 'png' | 'svg' | 'pdf'): Promise<Blob> {
    const response = await api.get(`/analytics/charts/${chartId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }
}
```

#### nlpService.ts
```typescript
class NLPService {
  async processQuery(query: string, context: QueryContext): Promise<NLPResult> {
    const response = await api.post('/analytics/nlp/process', {
      query,
      context,
      datasetSchema: context.dataset?.schema
    });
    
    return this.parseNLPResponse(response.data);
  }

  generateSuggestions(partialQuery: string): QuerySuggestion[] {
    // Client-side query completion suggestions
    return this.matchQueryPatterns(partialQuery);
  }
}
```

## 🎯 Performance Optimization

### Code Splitting
```typescript
// Lazy loading for route components
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const DatasetsPage = lazy(() => import('../pages/DatasetsPage'));

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/analytics" element={<AnalyticsPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/datasets" element={<DatasetsPage />} />
  </Routes>
</Suspense>
```

### Memoization
```typescript
// Expensive calculations
const chartData = useMemo(() => {
  return processLargeDataset(rawData);
}, [rawData]);

// Component memoization
const MemoizedChart = memo(Chart, (prevProps, nextProps) => {
  return prevProps.data === nextProps.data && 
         prevProps.type === nextProps.type;
});
```

### Virtual Scrolling
```typescript
// For large datasets
const VirtualizedDataTable = ({ data }: { data: DataRow[] }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  
  return (
    <FixedSizeList
      height={400}
      itemCount={data.length}
      itemSize={35}
      onItemsRendered={({ visibleStartIndex, visibleStopIndex }) => {
        setVisibleRange({ start: visibleStartIndex, end: visibleStopIndex });
      }}
    >
      {({ index, style }) => (
        <div style={style}>
          <DataRow data={data[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

## 🧪 Testing Strategy

### Test Structure
```
src/
├── components/
│   └── __tests__/
│       ├── LoginPage.test.tsx
│       ├── CollaborationChat.test.tsx
│       └── Chart.test.tsx
├── services/
│   └── __tests__/
│       ├── authService.test.ts
│       └── chartService.test.ts
└── setupTests.ts
```

### Component Testing
```typescript
// Example: LoginPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../LoginPage';
import { AuthProvider } from '../../contexts/AuthContext';

describe('LoginPage', () => {
  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <AuthProvider>
        {component}
      </AuthProvider>
    );
  };

  test('should submit login form with valid credentials', async () => {
    renderWithProvider(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });
  });
});
```

### Service Testing
```typescript
// Example: authService.test.ts
import { authService } from '../authService';
import { api } from '../api';

jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('AuthService', () => {
  test('should login successfully with valid credentials', async () => {
    const mockResponse = {
      data: {
        token: 'mock-jwt-token',
        user: { id: '1', email: 'test@example.com' }
      }
    };
    
    mockedApi.post.mockResolvedValueOnce(mockResponse);
    
    const result = await authService.login({
      email: 'test@example.com',
      password: 'password123'
    });
    
    expect(result.token).toBe('mock-jwt-token');
    expect(result.user.email).toBe('test@example.com');
  });
});
```

## 🚢 Build & Deployment

### Production Build
```bash
# Create optimized production build
npm run build

# Analyze bundle size
npm run build:analyze
```

### Environment Configuration
```typescript
// config/environment.ts
export const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  wsUrl: process.env.REACT_APP_WS_URL || 'http://localhost:5000',
  environment: process.env.REACT_APP_ENVIRONMENT || 'development',
  version: process.env.REACT_APP_VERSION || '1.0.0',
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  maxFileSize: parseInt(process.env.REACT_APP_MAX_FILE_SIZE || '10485760') // 10MB
};
```

### Production Deployment

For production deployment, you can deploy the built frontend to any static hosting service (Netlify, Vercel, GitHub Pages, etc.) and the backend to any Node.js hosting service.

#### Frontend Deployment
```bash
# Create optimized production build
npm run build

# The build folder contains the static files ready for deployment
# Upload the contents to your hosting service
```

#### Backend Integration
Ensure your production backend is accessible and update your environment variables accordingly.

## 📄 TypeScript Types

### Core Types
```typescript
// types/index.ts
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'viewer' | 'analyst' | 'admin';
  avatar?: string;
  preferences: UserPreferences;
  lastLogin?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dataset {
  _id: string;
  name: string;
  description?: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  metadata: DatasetMetadata;
  schema: DatasetSchema[];
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalysisSession {
  _id: string;
  title: string;
  description?: string;
  datasetId: string;
  userId: string;
  queries: AnalysisQuery[];
  visualizations: Visualization[];
  insights: Insight[];
  predictions: Prediction[];
  collaborators: string[];
  isShared: boolean;
  lastActivity: Date;
  createdAt: Date;
}
```

## 🤝 Contributing

### Development Guidelines
1. **Follow React best practices**: Functional components, hooks, and modern patterns
2. **TypeScript strict mode**: All components and services must be fully typed
3. **Component testing**: Every new component should include comprehensive tests
4. **Accessibility**: Follow WCAG 2.1 guidelines for inclusive design
5. **Performance**: Consider bundle size and runtime performance for all changes

### Pull Request Process
1. **Create feature branch** from `main`
2. **Run tests**: `npm test` and `npm run type-check`
3. **Update documentation** for any API changes
4. **Test accessibility** with screen readers and keyboard navigation
5. **Ensure mobile compatibility** across different screen sizes
6. **Submit PR** with clear description and screenshots

---

**Built with ❤️ using React, TypeScript, and modern web technologies**
