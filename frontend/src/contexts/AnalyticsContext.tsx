import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AnalysisSession, AnalyticsContextType, Prediction } from '../types';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AnalysisSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const createSession = async (datasetId: string, title: string): Promise<AnalysisSession> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/analytics/sessions', {
        datasetId,
        title
      });
      
      const newSession = response.data.data;
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      return newSession;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create session';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const sendQuery = async (sessionId: string, query: string): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/analytics/query', {
        sessionId,
        query
      });
      
      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to process query';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePrediction = async (datasetId: string, config: any): Promise<Prediction> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/analytics/predict', {
        datasetId,
        ...config
      });
      
      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to generate prediction';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSession = async (sessionId: string): Promise<AnalysisSession> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/analytics/sessions/${sessionId}`);
      const session = response.data.data;
      setCurrentSession(session);
      return session;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to fetch session';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSession = async (sessionId: string, updates: Partial<AnalysisSession>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.put(`/analytics/sessions/${sessionId}`, updates);
      const updatedSession = response.data.data;
      
      setSessions(prev => prev.map(session => 
        session._id === sessionId ? updatedSession : session
      ));
      
      if (currentSession?._id === sessionId) {
        setCurrentSession(updatedSession);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update session';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessions = async (): Promise<void> => {
    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastFetchTime < 5000) { // 5 second cooldown
      return;
    }
    
    if (isLoading) return; // Prevent concurrent requests
    
    setIsLoading(true);
    setError(null);
    setLastFetchTime(now);
    
    try {
      const response = await api.get('/analytics/sessions');
      const fetchedSessions = response.data.data || [];
      // Ensure we always set an array
      setSessions(Array.isArray(fetchedSessions) ? fetchedSessions : []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to fetch sessions';
      setError(errorMessage);
      // Set empty array on error
      setSessions([]);
      console.error('Sessions fetch error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await api.delete(`/analytics/sessions/${sessionId}`);
      setSessions(prev => prev.filter(session => session._id !== sessionId));
      if (currentSession?._id === sessionId) {
        setCurrentSession(null);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete session';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AnalyticsContextType = {
    sessions,
    currentSession,
    isLoading,
    error,
    createSession,
    sendQuery,
    generatePrediction,
    fetchSession,
    updateSession,
    fetchSessions,
    deleteSession,
  };

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}