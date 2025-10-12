import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DatasetProvider } from './contexts/DatasetContext';
import { AnalyticsProvider } from './contexts/AnalyticsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { CollaborationProvider } from './contexts/CollaborationContext';

// Import page components
import LandingPage from "./pages/Landing Page/LandingPage";
import LoginPage from './pages/Authentication Pages/LoginPage';
import RegisterPage from './pages/Authentication Pages/RegisterPage';
import DatasetsPage from './pages/Datasets Page/DatasetsPage';
import AnalyticsPage from './pages/Analytics Page/AnalyticsPage';
import CollaborationPage from './pages/Collaboration Page/CollaborationPage';
import ForgotPasswordPage from './pages/Authentication Pages/ForgotPasswordPage';
import DashboardPage from './pages/Dashboard Page/DashboardPage';



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
                   <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                   <Route path="/Datasets" element={<DatasetsPage/>} />
                   <Route path="/Dashboard" element={<DashboardPage />} />
                  
                  
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
                        <ForgotPasswordPage />
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
