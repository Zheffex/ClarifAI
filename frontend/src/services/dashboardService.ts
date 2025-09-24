import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export interface DashboardStats {
  totalDatasets: number;
  totalAnalyses: number;
  recentActivity: number;
  collaborations: number;
  dataQualityScore?: number;
  storageUsed?: string;
}

export interface RecentActivity {
  _id: string;
  type: 'dataset_uploaded' | 'analysis_created' | 'dataset_shared' | 'analysis_completed';
  title: string;
  description: string;
  timestamp: Date;
  entityId: string;
  entityType: 'dataset' | 'analysis' | 'collaboration';
}

export interface DashboardOverview {
  stats: DashboardStats;
  recentDatasets: any[];
  recentSessions: any[];
}

// Cache and debounce mechanism
let statsCache: { data: DashboardStats; timestamp: number } | null = null;
let isStatsLoading = false;
const CACHE_DURATION = 30000; // 30 seconds

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const dashboardService = {
  /**
   * Get dashboard statistics with caching
   */
  async getStats(): Promise<DashboardStats> {
    // Check cache first
    if (statsCache && Date.now() - statsCache.timestamp < CACHE_DURATION) {
      return statsCache.data;
    }
    
    // Prevent concurrent requests
    if (isStatsLoading) {
      // Wait for current request to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      if (statsCache) {
        return statsCache.data;
      }
    }
    
    isStatsLoading = true;
    
    try {
      const response = await api.get('/dashboard/stats');
      const data = response.data.data;
      
      // Update cache
      statsCache = {
        data,
        timestamp: Date.now()
      };
      
      return data;
    } catch (error: any) {
      // Return cached data if available, otherwise throw
      if (statsCache) {
        return statsCache.data;
      }
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch dashboard stats');
    } finally {
      isStatsLoading = false;
    }
  },

  /**
   * Get recent activity feed
   */
  async getRecentActivity(limit: number = 20): Promise<RecentActivity[]> {
    try {
      const response = await api.get(`/dashboard/activity?limit=${limit}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch recent activity');
    }
  },

  /**
   * Get complete dashboard overview
   */
  async getOverview(): Promise<DashboardOverview> {
    try {
      const response = await api.get('/dashboard/overview');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch dashboard overview');
    }
  },
};