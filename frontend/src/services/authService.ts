import axios from 'axios';
import { User, LoginCredentials, RegisterData, ApiResponse } from '../types';

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

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    try {
      const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', credentials);
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Login failed');
    }
  },

  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    try {
      const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', data);
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Registration failed');
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<ApiResponse<User>>('/auth/me');
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to get user');
    }
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await api.put<ApiResponse<User>>('/auth/profile', data);
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to update profile');
    }
  },

    async forgotPassword(email: string): Promise<void> {
    try {
      await api.post<ApiResponse<void>>('/auth/forgot-password', { email });
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to send password reset email');
    }
  }
  ,

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    }
  },

     async verifyOtp(email: string, otp: string): Promise<{ token: string; user: any }> {
    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'OTP verification failed');
    }
  },


};
