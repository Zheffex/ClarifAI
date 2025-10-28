import React, { useState } from "react";
import {
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  Database,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  Save,
  Eye,
  EyeOff,
  Mail,
  Smartphone,
  Desktop
} from "lucide-react";
import "./SettingsPage.css";
import { useAuth } from "../../contexts/AuthContext";

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  
  // Settings state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [settings, setSettings] = useState({
    // Theme settings
    theme: 'light',
    language: 'en',
    
    // Notification settings
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: false,
    securityAlerts: true,
    
    // Privacy settings
    profileVisibility: 'public',
    dataSharing: false,
    analyticsTracking: true,
    
    // Account settings
    twoFactorAuth: false,
    autoBackup: true,
    sessionTimeout: 30,
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSaveSettings = () => {
    // TODO: Save settings to backend
    showNotification('success', 'Settings saved successfully!');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      showNotification('error', 'Account deletion initiated. Please contact support.');
      // TODO: Implement account deletion
    }
  };

  return (
    <div className="settings-page">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' ? (
              <CheckCircle className="notification-icon" />
            ) : (
              <AlertCircle className="notification-icon" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="settings-header">
        <div className="header-content">
          <h1>Settings</h1>
          <p>Manage your account preferences and privacy settings</p>
        </div>
      </div>

      <div className="settings-content">
        {/* Theme Settings */}
        <div className="settings-card">
          <div className="card-header">
            <div className="card-title">
              <Sun className="card-icon" />
              <h3>Theme Preferences</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="setting-item">
              <div className="setting-info">
                <label>Theme</label>
                <p>Choose your preferred color theme</p>
              </div>
              <div className="theme-options">
                <button 
                  className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
                  onClick={() => setSettings({...settings, theme: 'light'})}
                >
                  <Sun className="theme-icon" />
                  Light
                </button>
                <button 
                  className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setSettings({...settings, theme: 'dark'})}
                >
                  <Moon className="theme-icon" />
                  Dark
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="settings-card">
          <div className="card-header">
            <div className="card-title">
              <Bell className="card-icon" />
              <h3>Notification Settings</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="setting-item">
              <div className="setting-info">
                <label>Email Notifications</label>
                <p>Receive updates via email</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Push Notifications</label>
                <p>Get real-time updates</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={settings.pushNotifications}
                  onChange={(e) => setSettings({...settings, pushNotifications: e.target.checked})}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Weekly Digest</label>
                <p>Receive weekly summary emails</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={settings.weeklyDigest}
                  onChange={(e) => setSettings({...settings, weeklyDigest: e.target.checked})}
                />
                <span className="slider"></span>
              </label>
            </div>

          </div>
        </div>

        {/* Privacy Settings */}
        <div className="settings-card">
          <div className="card-header">
            <div className="card-title">
              <Shield className="card-icon" />
              <h3>Privacy Settings</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="setting-item">
              <div className="setting-info">
                <label>Profile Visibility</label>
                <p>Control who can see your profile</p>
              </div>
              <select 
                className="setting-select"
                value={settings.profileVisibility}
                onChange={(e) => setSettings({...settings, profileVisibility: e.target.value})}
              >
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Data Sharing</label>
                <p>Allow sharing of anonymous usage data</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={settings.dataSharing}
                  onChange={(e) => setSettings({...settings, dataSharing: e.target.checked})}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Analytics Tracking</label>
                <p>Help improve our service with analytics</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={settings.analyticsTracking}
                  onChange={(e) => setSettings({...settings, analyticsTracking: e.target.checked})}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="settings-card">
          <div className="card-header">
            <div className="card-title">
              <Database className="card-icon" />
              <h3>Account Settings</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="setting-item">
              <div className="setting-info">
                <label>Two-Factor Authentication</label>
                <p>Add an extra layer of security</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={settings.twoFactorAuth}
                  onChange={(e) => setSettings({...settings, twoFactorAuth: e.target.checked})}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Auto Backup</label>
                <p>Automatically backup your data</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={settings.autoBackup}
                  onChange={(e) => setSettings({...settings, autoBackup: e.target.checked})}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Session Timeout</label>
                <p>Automatically log out after inactivity (minutes)</p>
              </div>
              <input 
                type="number" 
                className="setting-input"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
                min="5"
                max="120"
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="settings-card danger-card">
          <div className="card-header">
            <div className="card-title">
              <AlertCircle className="card-icon" />
              <h3>Danger Zone</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="danger-zone-content">
              <p>Once you delete your account, there is no going back. Please be certain.</p>
              <button className="btn btn-danger" onClick={handleDeleteAccount}>
                <Trash2 className="btn-icon" />
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="settings-footer">
          <button className="btn btn-save" onClick={handleSaveSettings}>
            <Save className="btn-icon" />
            Save All Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
