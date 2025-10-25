import React, { useState, useEffect } from "react";
import { User, Eye, EyeOff, Save, Edit3, Lock, Mail, User as UserIcon, Shield, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import "./ProfilePage.css";
import { useAuth } from "../../contexts/AuthContext";
import { authService } from "../../services/authService";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
}

const ProfilePage: React.FC = () => {
  const { user, updateProfile, isLoading } = useAuth();
  
  // State management
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Form states
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordErrors, setPasswordErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  // Show notification helper
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle profile form changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle password form changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when user starts typing
    if (passwordErrors[name as keyof typeof passwordErrors]) {
      setPasswordErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Validate password form
  const validatePasswordForm = (): boolean => {
    const errors: typeof passwordErrors = {};

    if (!passwordForm.currentPassword) {
      errors.current = "Current password is required";
    }

    if (!passwordForm.newPassword) {
      errors.new = "New password is required";
    } else if (passwordForm.newPassword.length < 8) {
      errors.new = "Password must be at least 8 characters";
    }

    if (!passwordForm.confirmPassword) {
      errors.confirm = "Please confirm your new password";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirm = "Passwords do not match";
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      errors.new = "New password must be different from current password";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updateProfile({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
      });
      
      showNotification('success', 'Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    setIsSaving(true);
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      
      showNotification('success', 'Password changed successfully!');
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setIsChangingPassword(false);
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Cancel editing
  const handleCancelEdit = () => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
    }
    setIsEditingProfile(false);
  };

  // Cancel password change
  const handleCancelPasswordChange = () => {
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordErrors({});
    setIsChangingPassword(false);
  };

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <AlertCircle className="error-icon" />
          <h2>User not found</h2>
          <p>Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
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
      <div className="profile-header">
        <div className="header-content">
          <h1>Profile Settings</h1>
          <p>Manage your account information and security settings</p>
        </div>
      </div>

      <div className="profile-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="card-header">
            <div className="avatar-section">
              <div className="avatar">
                <UserIcon className="avatar-icon" />
              </div>
              <div className="avatar-info">
                <h2>{user.firstName} {user.lastName}</h2>
                <p className="user-role">
                  <Shield className="role-icon" />
                  {user.role}
                </p>
                <p className="user-email">
                  <Mail className="email-icon" />
                  {user.email}
                </p>
              </div>
            </div>
            <div className="header-actions">
              <button
                className={`btn btn-primary ${isEditingProfile ? 'active' : ''}`}
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                disabled={isSaving}
              >
                <Edit3 className="btn-icon" />
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Profile Information */}
          <div className="profile-section">
            <h3>Personal Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <div className="input-wrapper">
                  <User className="input-icon" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={profileForm.firstName}
                    onChange={handleProfileChange}
                    disabled={!isEditingProfile}
                    className="form-input"
                    placeholder="Enter your first name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <div className="input-wrapper">
                  <User className="input-icon" />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={profileForm.lastName}
                    onChange={handleProfileChange}
                    disabled={!isEditingProfile}
                    className="form-input"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="form-input disabled"
                    placeholder="Enter your email"
                  />
                </div>
                <small className="form-note">Email cannot be changed</small>
              </div>

              <div className="form-group">
                <label>Account Status</label>
                <div className="status-badge">
                  <CheckCircle className="status-icon" />
                  <span>{user.isEmailVerified ? 'Verified' : 'Unverified'}</span>
                </div>
              </div>
            </div>

            {isEditingProfile && (
              <div className="form-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  <Save className="btn-icon" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Security Card */}
        <div className="security-card">
          <div className="card-header">
            <h3>Security Settings</h3>
            <button
              className={`btn btn-outline ${isChangingPassword ? 'active' : ''}`}
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              disabled={isSaving}
            >
              <Lock className="btn-icon" />
              {isChangingPassword ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {isChangingPassword && (
            <div className="password-section">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" />
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className={`form-input ${passwordErrors.current ? 'error' : ''}`}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePasswordVisibility('current')}
                    >
                      {showPasswords.current ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {passwordErrors.current && (
                    <span className="error-message">{passwordErrors.current}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" />
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className={`form-input ${passwordErrors.new ? 'error' : ''}`}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePasswordVisibility('new')}
                    >
                      {showPasswords.new ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {passwordErrors.new && (
                    <span className="error-message">{passwordErrors.new}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className={`form-input ${passwordErrors.confirm ? 'error' : ''}`}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePasswordVisibility('confirm')}
                    >
                      {showPasswords.confirm ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {passwordErrors.confirm && (
                    <span className="error-message">{passwordErrors.confirm}</span>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelPasswordChange}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleChangePassword}
                  disabled={isSaving}
                >
                  <Lock className="btn-icon" />
                  {isSaving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          )}

          {!isChangingPassword && (
            <div className="security-info">
              <div className="security-item">
                <Calendar className="security-icon" />
                <div className="security-details">
                  <h4>Last Login</h4>
                  <p>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</p>
                </div>
              </div>
              <div className="security-item">
                <Shield className="security-icon" />
                <div className="security-details">
                  <h4>Account Created</h4>
                  <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;