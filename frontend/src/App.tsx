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
import DatasetsPage  from './pages/Datasets Page/DatasetsPage';
import AnalyticsPage from './pages/Analytics Page/AnalyticsPage';
import CollaborationPage from './pages/Collaboration Page/CollaborationPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import SettingsPage from './pages/Settings Page/SettingsPage';
import AdminDashboardPage from './pages/Admin Dashboard/AdminDashboardPage';

// Sidebar
import Sidebar from './components/Sidebar/Sidebar';
import AdminSidebar from './components/AdminSidebar/AdminSidebar';
import './App.css';


// Layout wrapper for pages with sidebar
const LayoutWithSidebar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <main className="main-content">
      <div className="content-wrapper">
        {children}
      </div>
    </main>
  </div>
);

// Layout wrapper for admin pages with admin sidebar
const AdminLayoutWithSidebar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-layout">
    <AdminSidebar />
    <main className="main-content admin-main-content">
      <div className="content-wrapper admin-content-wrapper">
        {children}
      </div>
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

                    <Route path="/dashboard" element={<LayoutWithSidebar><DashboardPage /></LayoutWithSidebar>} />
                    <Route path="/datasets/*" element={<LayoutWithSidebar><DatasetsPage /></LayoutWithSidebar>} />
                    <Route path="/profile" element={<LayoutWithSidebar><ProfilePage /></LayoutWithSidebar>}/>
                    <Route path="/settings" element={<LayoutWithSidebar><SettingsPage /></LayoutWithSidebar>} />
                    <Route path="/analytics/*" element={<LayoutWithSidebar><AnalyticsPage /></LayoutWithSidebar>} />
                    <Route path="/collaboration/*" element={<LayoutWithSidebar><CollaborationPage /></LayoutWithSidebar>} />
                    
                    {/* Admin Routes */}
                    <Route path="/admin/dashboard" element={<AdminLayoutWithSidebar><AdminDashboardPage /></AdminLayoutWithSidebar>} />
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
