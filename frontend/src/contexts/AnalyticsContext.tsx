import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AnalysisSession, AnalyticsContextType, Prediction } from '../types';

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AnalysisSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = async (datasetId: string, title: string): Promise<AnalysisSession> => {
    throw new Error('Create session not yet implemented');
  };

  const sendQuery = async (sessionId: string, query: string): Promise<any> => {
    throw new Error('Send query not yet implemented');
  };

  const generatePrediction = async (datasetId: string, config: any): Promise<Prediction> => {
    throw new Error('Generate prediction not yet implemented');
  };

  const value: AnalyticsContextType = {
    sessions,
    currentSession,
    isLoading,
    error,
    createSession,
    sendQuery,
    generatePrediction,
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