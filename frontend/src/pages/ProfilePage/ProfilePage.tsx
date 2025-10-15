import React, { useState } from "react";
import "./ProfilePage.css";

const ProfilePage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [user, setUser] = useState({
    firstname: "John Doe",
    lastname: "Mcknight",
    email: "JohnDoe@gmail.com",
    role: "Admin",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleEditToggle = () => setIsEditing(!isEditing);
  const handleChangePasswordToggle = () => setIsChangingPassword(!isChangingPassword);

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setUser({ ...user, [e.target.name]: e.target.value });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  const saveProfile = () => {
    alert("Profile saved successfully!");
    setIsEditing(false);
  };

  const changePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    alert("Password changed successfully!");
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setIsChangingPassword(false);
  };

  return (
    <div className="profile-page">
      <title>Profile</title>
      <h1 className="profile-title">Profile</h1>

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="#6b7280"
              className="avatar-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.5 19.5a8.25 8.25 0 0 1 15 0v.75H4.5v-.75z"
              />
            </svg>
          </div>
          <div className="profile-info">
            <h2>{user.firstname}</h2>
            <p>{user.role}</p>
          </div>
        </div>

        <div className="personal-info-section">
          <div className="personal-info-header">
            <h3>Personal Information</h3>
            <div className="profile-buttons">
              <button className="btn edit" onClick={handleEditToggle}>
                {isEditing ? "Cancel" : "Edit"}
              </button>
              <button className="btn change" onClick={handleChangePasswordToggle}>
                {isChangingPassword ? "Close" : "Change password"}
              </button>
            </div>
          </div>

          <hr />

          {!isChangingPassword ? (
            <>
              <div className="info-grid">
                {isEditing ? (
                  <>
                    <div>
                      <p className="label">Firstname</p>
                      <input
                        name="firstname"
                        value={user.firstname}
                        onChange={handleUserChange}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <p className="label">Lastname</p>
                      <input
                        name="lastname"
                        value={user.lastname}
                        onChange={handleUserChange}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <p className="label">Email</p>
                      <input
                        name="email"
                        value={user.email}
                        onChange={handleUserChange}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <p className="label">User Role</p>
                      <input
                        name="role"
                        value={user.role}
                        onChange={handleUserChange}
                        className="input-field"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="label">Firstname</p>
                      <p className="value">{user.firstname}</p>
                    </div>
                    <div>
                      <p className="label">Lastname</p>
                      <p className="value">{user.lastname}</p>
                    </div>
                    <div>
                      <p className="label">Email</p>
                      <p className="value">{user.email}</p>
                    </div>
                    <div>
                      <p className="label">User Role</p>
                      <p className="value">{user.role}</p>
                    </div>
                  </>
                )}
              </div>

              {isEditing && (
                <div className="btn-save-container">
                  <button className="btn save" onClick={saveProfile}>
                    Save
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="password-section">
              <div className="password-fields">
                <label>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  className="input-field-password"
                />
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className="input-field-password-1"
                />
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  className="input-field-password-2"
                />
              </div>
              <button className="btn-change" onClick={changePassword}>
                Change Password
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
