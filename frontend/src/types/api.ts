// Re-export all types from index.ts for API compatibility
export * from './index';

// Re-export ChartConfig from chartService for compatibility
export type { ChartConfig, ChartData, ChartOptions } from '../services/chartService';

// Additional API-specific types if needed
export interface ApiEndpoint {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
}

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required?: boolean;
  unique?: boolean;
}