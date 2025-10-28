import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, AuthState, LoginCredentials, RegisterData } from '../types';
import { authService } from '../services/authService';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  markEmailVerified: () => void;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; payload: User }
  | { type: 'MARK_EMAIL_VERIFIED' };

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isLoading: !!localStorage.getItem('token'), // Set loading to true if token exists
  isAuthenticated: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        isAuthenticated: true,
      };
    case 'LOGIN_FAILURE':
      return { ...state, user: null, token: null, isLoading: false, isAuthenticated: false };
    case 'LOGOUT':
      return { ...state, user: null, token: null, isAuthenticated: false };
    case 'UPDATE_PROFILE':
      return { ...state, user: action.payload };
    case 'MARK_EMAIL_VERIFIED':
      return {
        ...state,
        user: state.user ? { ...state.user, isEmailVerified: true } : null,
      };
    default:
      return state;
  }
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authService.getCurrentUser()
        .then((user) => dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } }))
        .catch(() => {
          localStorage.removeItem('token');
          dispatch({ type: 'LOGIN_FAILURE' });
        });
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const { user, token } = await authService.login(credentials);
      localStorage.setItem('token', token);
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      // For OTP flow, we don't want to automatically log in
      // Just register the user and let them verify via OTP
      await authService.register(data);
      // Don't store token or dispatch LOGIN_SUCCESS here
      // The user will be logged in after OTP verification
      dispatch({ type: 'LOGIN_FAILURE' }); // Reset to not logged in state
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token');
      dispatch({ type: 'LOGOUT' });
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    const updatedUser = await authService.updateProfile(data);
    dispatch({ type: 'UPDATE_PROFILE', payload: updatedUser });
  };

  const markEmailVerified = () => {
    dispatch({ type: 'MARK_EMAIL_VERIFIED' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    markEmailVerified,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}