import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DatasetProvider } from './contexts/DatasetContext';
import { AnalyticsProvider } from './contexts/AnalyticsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { CollaborationProvider } from './contexts/CollaborationContext';

// Pages
import LandingPage from "./pages/Landing Page/LandingPage";
import LoginPage from './pages/Authentication Pages/LoginPage';
import RegisterPage from './pages/Authentication Pages/RegisterPage';
import ForgotPasswordPage from './pages/Authentication Pages/ForgotPasswordPage';
import NewPasswordPage from './pages/Authentication Pages/NewPasswordPage';
import OtpPage from './pages/Authentication Pages/OtpPage';
import DashboardPage from './pages/Dashboard Page/DashboardPage';
import DatasetsPage from './pages/Datasets Page/DatasetsPage';
import AnalyticsPage from './pages/Analytics Page/AnalyticsPage';
import CollaborationPage from './pages/Collaboration Page/CollaborationPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
// import Settings from './pages/Settings Page/Apperance/Terms and Condition';


// Sidebar
import Sidebar from './components/Sidebar/Sidebar';
import './App.css';


// Layout wrapper for pages with sidebar
const LayoutWithSidebar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-layout" style={{ display: 'flex', minHeight: '100vh' }}>
    <Sidebar />
    <main className="main-content" style={{ flex: 1, padding: '20px' }}>
      {children}
    </main>
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <CollaborationProvider>
          <DatasetProvider>
            <AnalyticsProvider>
              <NotificationProvider>
                <div className="App">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/landing" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/new-password" element={<NewPasswordPage />} />
                    <Route path="/verify" element={<OtpPage />} />
                    {/* <Route path="/Settings" element={<Settings Page />} /> */}

                    <Route path="/dashboard" element={<LayoutWithSidebar><DashboardPage /></LayoutWithSidebar>} />
                    <Route path="/datasets/*" element={<LayoutWithSidebar><DatasetsPage /></LayoutWithSidebar>} />
                    <Route path="/profile" element={<LayoutWithSidebar><ProfilePage /></LayoutWithSidebar>}/>
                    <Route path="/analytics/*" element={<LayoutWithSidebar><AnalyticsPage /></LayoutWithSidebar>} />
                    <Route path="/collaboration/*" element={<LayoutWithSidebar><CollaborationPage /></LayoutWithSidebar>} />
                    {/* <Route path="/Settings" element={<Settings Page />} /> */}

                    {/* Redirect unknown routes */}
                    {/* <Route path="/Settings" element={<Settings Page />} /> */}
                  </Routes>
                </div>
              </NotificationProvider>
            </AnalyticsProvider>
          </DatasetProvider>
        </CollaborationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
