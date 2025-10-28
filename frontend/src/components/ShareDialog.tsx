import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, Settings, Users, Lock, Globe } from 'lucide-react';
import { collaborationService, ShareResourceRequest } from '../../services/collaboration';
import { authService } from '../../services/authService';
import './ShareDialog.css';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'dataset' | 'analysis' | 'dashboard';
  resourceId: string;
  resourceName?: string;
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceName
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<{ userId: string; permissions: string[] }[]>([]);
  const [settings, setSettings] = useState({
    allowComments: true,
    allowAnnotations: true,
    allowEditing: false,
    requireApproval: false,
    isPublic: false,
    expiresAt: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setSearching(true);
      const response = await authService.searchUsers('');
      setUsers(response.data.users || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setSearching(false);
    }
  };

  const searchUsers = async (term: string) => {
    if (!term.trim()) {
      loadUsers();
      return;
    }

    try {
      setSearching(true);
      const response = await authService.searchUsers(term);
      setUsers(response.data.users || []);
    } catch (err: any) {
      console.error('Failed to search users:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    searchUsers(term);
  };

  const addUser = (user: User) => {
    const exists = selectedUsers.find(u => u.userId === user._id);
    if (!exists) {
      setSelectedUsers(prev => [...prev, {
        userId: user._id,
        permissions: ['read']
      }]);
    }
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.userId !== userId));
  };

  const updateUserPermissions = (userId: string, permissions: string[]) => {
    setSelectedUsers(prev => prev.map(u => 
      u.userId === userId ? { ...u, permissions } : u
    ));
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user to share with');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const shareData: ShareResourceRequest = {
        resourceType,
        resourceId,
        participants: selectedUsers,
        settings: {
          ...settings,
          expiresAt: settings.expiresAt ? new Date(settings.expiresAt).toISOString() : undefined
        }
      };

      await collaborationService.shareResource(shareData);
      
      // Reset form
      setSelectedUsers([]);
      setSettings({
        allowComments: true,
        allowAnnotations: true,
        allowEditing: false,
        requireApproval: false,
        isPublic: false,
        expiresAt: ''
      });
      setSearchTerm('');
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to share resource');
    } finally {
      setLoading(false);
    }
  };

  const getPermissionOptions = () => [
    { value: 'read', label: 'Read', description: 'View the resource' },
    { value: 'comment', label: 'Comment', description: 'Add comments' },
    { value: 'annotate', label: 'Annotate', description: 'Add annotations' },
    { value: 'edit', label: 'Edit', description: 'Modify the resource' },
    { value: 'admin', label: 'Admin', description: 'Full control' }
  ];

  const getPermissionDescription = (permission: string) => {
    const options = getPermissionOptions();
    return options.find(opt => opt.value === permission)?.description || '';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="share-dialog">
        <div className="dialog-header">
          <div className="header-content">
            <h2>
              <Users className="header-icon" />
              Share {resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}
            </h2>
            {resourceName && (
              <p className="resource-name">{resourceName}</p>
            )}
          </div>
          <button className="close-button" onClick={onClose}>
            <X className="close-icon" />
          </button>
        </div>

        <div className="dialog-content">
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}

          <div className="share-section">
            <h3>Add People</h3>
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
              />
              {searching && <div className="search-spinner"></div>}
            </div>

            <div className="users-list">
              {users.length === 0 ? (
                <div className="empty-users">
                  <p>No users found</p>
                </div>
              ) : (
                users.map(user => {
                  const isSelected = selectedUsers.some(u => u.userId === user._id);
                  return (
                    <div 
                      key={user._id} 
                      className={`user-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => !isSelected && addUser(user)}
                    >
                      <div className="user-avatar">
                        {user.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <div className="user-name">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="user-email">{user.email}</div>
                      </div>
                      {isSelected && (
                        <div className="selected-indicator">
                          <Plus className="selected-icon" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <div className="selected-section">
              <h3>Selected People ({selectedUsers.length})</h3>
              <div className="selected-users">
                {selectedUsers.map(selectedUser => {
                  const user = users.find(u => u._id === selectedUser.userId);
                  return (
                    <div key={selectedUser.userId} className="selected-user-item">
                      <div className="user-info">
                        <div className="user-avatar">
                          {user?.firstName.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="user-details">
                          <div className="user-name">
                            {user ? `${user.firstName} ${user.lastName}` : 'Unknown User'}
                          </div>
                          <div className="user-email">{user?.email || selectedUser.userId}</div>
                        </div>
                      </div>
                      <div className="permissions-selector">
                        <select
                          value={selectedUser.permissions[0] || 'read'}
                          onChange={(e) => updateUserPermissions(selectedUser.userId, [e.target.value])}
                          className="permissions-select"
                        >
                          {getPermissionOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="permission-description">
                          {getPermissionDescription(selectedUser.permissions[0] || 'read')}
                        </div>
                      </div>
                      <button 
                        className="remove-button"
                        onClick={() => removeUser(selectedUser.userId)}
                      >
                        <Trash2 className="remove-icon" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="settings-section">
            <h3>
              <Settings className="section-icon" />
              Collaboration Settings
            </h3>
            <div className="settings-grid">
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.allowComments}
                  onChange={(e) => setSettings(prev => ({ ...prev, allowComments: e.target.checked }))}
                />
                <div className="setting-content">
                  <div className="setting-label">Allow Comments</div>
                  <div className="setting-description">Participants can add comments</div>
                </div>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.allowAnnotations}
                  onChange={(e) => setSettings(prev => ({ ...prev, allowAnnotations: e.target.checked }))}
                />
                <div className="setting-content">
                  <div className="setting-label">Allow Annotations</div>
                  <div className="setting-description">Participants can add annotations</div>
                </div>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.allowEditing}
                  onChange={(e) => setSettings(prev => ({ ...prev, allowEditing: e.target.checked }))}
                />
                <div className="setting-content">
                  <div className="setting-label">Allow Editing</div>
                  <div className="setting-description">Participants can modify the resource</div>
                </div>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.requireApproval}
                  onChange={(e) => setSettings(prev => ({ ...prev, requireApproval: e.target.checked }))}
                />
                <div className="setting-content">
                  <div className="setting-label">Require Approval</div>
                  <div className="setting-description">Changes need approval before applying</div>
                </div>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.isPublic}
                  onChange={(e) => setSettings(prev => ({ ...prev, isPublic: e.target.checked }))}
                />
                <div className="setting-content">
                  <div className="setting-label">
                    <Globe className="setting-icon" />
                    Make Public
                  </div>
                  <div className="setting-description">Anyone with the link can view</div>
                </div>
              </label>

              <div className="setting-item">
                <div className="setting-content">
                  <div className="setting-label">Expiration Date</div>
                  <div className="setting-description">When this collaboration should end</div>
                </div>
                <input
                  type="datetime-local"
                  value={settings.expiresAt}
                  onChange={(e) => setSettings(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="expiration-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="dialog-footer">
          <button 
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleShare}
            disabled={loading || selectedUsers.length === 0}
          >
            {loading ? 'Sharing...' : 'Share Resource'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;