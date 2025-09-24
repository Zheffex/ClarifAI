// User types
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'analyst' | 'viewer';
  organizationId?: string;
  preferences: Record<string, any>;
  lastLogin?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Dataset types
export interface Dataset {
  _id: string;
  name: string;
  description?: string;
  fileId: string;
  uploadedBy: string;
  organizationId: string;
  schema: Record<string, any>;
  metadata: {
    size: number;
    type: string;
    rows?: number;
    columns?: number;
  };
  processingStatus: 'pending' | 'processing' | 'ready' | 'error';
  tags: string[];
  isPublic: boolean;
  accessPermissions: Array<{
    userId: string;
    permission: 'read' | 'write' | 'admin';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Analysis types
export interface AnalysisSession {
  _id: string;
  datasetId: string;
  userId: string;
  title: string;
  queries: Array<{
    query: string;
    response: string;
    timestamp: Date;
    visualizations?: Visualization[];
  }>;
  visualizations: Visualization[];
  insights: Insight[];
  predictions: Prediction[];
  collaborators: string[];
  isShared: boolean;
  lastActivity: Date;
  createdAt: Date;
}

export interface Visualization {
  _id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'table' | 'heatmap';
  title: string;
  data: any;
  config: Record<string, any>;
  createdAt: Date;
}

export interface Insight {
  _id: string;
  type: 'trend' | 'anomaly' | 'correlation' | 'pattern';
  title: string;
  description: string;
  confidence: number;
  supporting_data: any;
  createdAt: Date;
}

export interface Prediction {
  _id: string;
  type: 'forecast' | 'classification' | 'regression';
  target: string;
  predictions: any[];
  confidence: number;
  metrics: Record<string, number>;
  horizon?: number;
  createdAt: Date;
}

// Collaboration types
export interface Collaboration {
  _id: string;
  resourceType: 'dashboard' | 'analysis' | 'dataset';
  resourceId: string;
  ownerId: string;
  participants: Array<{
    userId: string;
    permissions: string[];
    joinedAt: Date;
  }>;
  comments: Comment[];
  annotations: Annotation[];
  version: number;
  lastModified: Date;
  createdAt: Date;
}

export interface Comment {
  _id: string;
  userId: string;
  content: string;
  threadId?: string;
  mentions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Annotation {
  _id: string;
  userId: string;
  chartId: string;
  position: {
    x: number;
    y: number;
  };
  content: string;
  type: 'note' | 'highlight' | 'question';
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'analyst' | 'viewer';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Context types
export interface DatasetContextType {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  isLoading: boolean;
  error: string | null;
  uploadDataset: (file: File, metadata: any) => Promise<Dataset>;
  fetchDatasets: () => Promise<void>;
  selectDataset: (datasetId: string) => Promise<void>;
  deleteDataset: (datasetId: string) => Promise<void>;
}

export interface AnalyticsContextType {
  sessions: AnalysisSession[];
  currentSession: AnalysisSession | null;
  isLoading: boolean;
  error: string | null;
  createSession: (datasetId: string, title: string) => Promise<AnalysisSession>;
  sendQuery: (sessionId: string, query: string) => Promise<any>;
  generatePrediction: (datasetId: string, config: any) => Promise<Prediction>;
  fetchSession: (sessionId: string) => Promise<AnalysisSession>;
  updateSession: (sessionId: string, updates: Partial<AnalysisSession>) => Promise<void>;
  fetchSessions: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
}

export interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
}