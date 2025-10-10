import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DatasetProvider } from './contexts/DatasetContext';
import { AnalyticsProvider } from './contexts/AnalyticsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { CollaborationProvider } from './contexts/CollaborationContext';

// Import page components
import LandingPage from "./pages/LandingPage";
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DatasetsPage from './pages/DatasetsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CollaborationPage from './pages/CollaborationPage';



// Import components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CollaborationProvider>
          <DatasetProvider>
            <AnalyticsProvider>
              <NotificationProvider>
              <div className="App">
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<LandingPage />} />
                   <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  
                  
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Layout>
                        <DashboardPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/datasets/*" element={
                    <ProtectedRoute>
                      <Layout>
                        <DatasetsPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/analytics/*" element={
                    <ProtectedRoute>
                      <Layout>
                        <AnalyticsPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/collaboration/*" element={
                    <ProtectedRoute>
                      <Layout>
                        <CollaborationPage />
                      </Layout>
                    </ProtectedRoute>
                  } />

                  <Route path="/landing/*" element={
                    <ProtectedRoute>
                      <Layout>
                        <CollaborationPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Redirect unknown routes to dashboard */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
              </NotificationProvider>
            </AnalyticsProvider>
          </DatasetProvider>
        </CollaborationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
