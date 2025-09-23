import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
  resourceType: 'dataset' | 'analysis';
  resourceId: string;
  resourceName: string;
  onShare: (shareData: ShareData) => Promise<void>;
}

interface ShareData {
  participants: Array<{
    userId: string;
    permissions: string[];
  }>;
  settings: {
    allowComments: boolean;
    allowAnnotations: boolean;
    allowEditing: boolean;
    requireApproval: boolean;
    isPublic: boolean;
    expiresAt?: Date;
  };
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceName,
  onShare
}) => {
  const { token } = useAuth();
  const [participants, setParticipants] = useState<Array<{ user: User; permissions: string[] }>>([]);
  const [emailInput, setEmailInput] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [settings, setSettings] = useState({
    allowComments: true,
    allowAnnotations: true,
    allowEditing: false,
    requireApproval: false,
    isPublic: false,
    expiresAt: undefined as Date | undefined
  });
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');

  const permissionOptions = [
    { value: 'view', label: 'View only', description: 'Can view the resource' },
    { value: 'comment', label: 'Comment', description: 'Can view and comment' },
    { value: 'edit', label: 'Edit', description: 'Can view, comment, and edit' },
    { value: 'admin', label: 'Admin', description: 'Full access including sharing' }
  ];

  useEffect(() => {
    if (!isOpen) {
      // Reset form when dialog closes
      setParticipants([]);
      setEmailInput('');
      setSearchResults([]);
      setError('');
      setSettings({
        allowComments: true,
        allowAnnotations: true,
        allowEditing: false,
        requireApproval: false,
        isPublic: false,
        expiresAt: undefined
      });
    }
  }, [isOpen]);

  const searchUsers = async (email: string) => {
    if (!email.trim() || !token) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/search?email=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.data.users || []);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmailInput(value);
    
    if (value.length > 2) {
      const debounceTimeout = setTimeout(() => {
        searchUsers(value);
      }, 300);
      return () => clearTimeout(debounceTimeout);
    } else {
      setSearchResults([]);
    }
  };

  const addParticipant = (user: User) => {
    const exists = participants.find(p => p.user._id === user._id);
    if (!exists) {
      setParticipants(prev => [...prev, { user, permissions: ['view'] }]);
      setEmailInput('');
      setSearchResults([]);
    }
  };

  const removeParticipant = (userId: string) => {
    setParticipants(prev => prev.filter(p => p.user._id !== userId));
  };

  const updateParticipantPermissions = (userId: string, permissions: string[]) => {
    setParticipants(prev => prev.map(p => 
      p.user._id === userId ? { ...p, permissions } : p
    ));
  };

  const handleShare = async () => {
    if (participants.length === 0) {
      setError('Please add at least one participant');
      return;
    }

    setIsSharing(true);
    setError('');
    
    try {
      const shareData: ShareData = {
        participants: participants.map(p => ({
          userId: p.user._id,
          permissions: p.permissions
        })),
        settings
      };
      
      await onShare(shareData);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to share resource');
    } finally {
      setIsSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className=\"share-dialog-overlay\" onClick={onClose}>
      <div className=\"share-dialog\" onClick={e => e.stopPropagation()}>
        <div className=\"dialog-header\">
          <h2>Share {resourceType}</h2>
          <button className=\"close-button\" onClick={onClose}>×</button>
        </div>
        
        <div className=\"dialog-content\">
          <div className=\"resource-info\">
            <p>Sharing: <strong>{resourceName}</strong></p>
          </div>

          <div className=\"participants-section\">
            <h3>Add Participants</h3>
            
            <div className=\"user-search\">
              <input
                type=\"email\"
                value={emailInput}
                onChange={handleEmailChange}
                placeholder=\"Enter email address to search users...\"
                className=\"search-input\"
              />
              
              {isSearching && <div className=\"search-loading\">Searching...</div>}
              
              {searchResults.length > 0 && (
                <div className=\"search-results\">
                  {searchResults.map(user => (
                    <div 
                      key={user._id}
                      className=\"search-result\"
                      onClick={() => addParticipant(user)}
                    >
                      <div className=\"user-info\">
                        <span className=\"user-name\">{user.firstName} {user.lastName}</span>
                        <span className=\"user-email\">{user.email}</span>
                      </div>
                      <button className=\"add-button\">Add</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {participants.length > 0 && (
              <div className=\"participants-list\">
                <h4>Participants ({participants.length})</h4>
                {participants.map(participant => (
                  <div key={participant.user._id} className=\"participant-item\">
                    <div className=\"participant-info\">
                      <span className=\"participant-name\">
                        {participant.user.firstName} {participant.user.lastName}
                      </span>
                      <span className=\"participant-email\">{participant.user.email}</span>
                    </div>
                    
                    <div className=\"participant-controls\">
                      <select
                        value={participant.permissions[0] || 'view'}
                        onChange={(e) => updateParticipantPermissions(participant.user._id, [e.target.value])}
                        className=\"permission-select\"
                      >
                        {permissionOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      
                      <button
                        onClick={() => removeParticipant(participant.user._id)}
                        className=\"remove-button\"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className=\"settings-section\">
            <h3>Collaboration Settings</h3>
            
            <div className=\"settings-grid\">
              <label className=\"setting-item\">
                <input
                  type=\"checkbox\"
                  checked={settings.allowComments}
                  onChange={(e) => setSettings(prev => ({ ...prev, allowComments: e.target.checked }))}
                />
                <span>Allow comments</span>
              </label>
              
              <label className=\"setting-item\">
                <input
                  type=\"checkbox\"
                  checked={settings.allowAnnotations}
                  onChange={(e) => setSettings(prev => ({ ...prev, allowAnnotations: e.target.checked }))}
                />
                <span>Allow annotations</span>
              </label>
              
              <label className=\"setting-item\">
                <input
                  type=\"checkbox\"
                  checked={settings.allowEditing}
                  onChange={(e) => setSettings(prev => ({ ...prev, allowEditing: e.target.checked }))}
                />
                <span>Allow editing</span>
              </label>
              
              <label className=\"setting-item\">
                <input
                  type=\"checkbox\"
                  checked={settings.requireApproval}
                  onChange={(e) => setSettings(prev => ({ ...prev, requireApproval: e.target.checked }))}
                />
                <span>Require approval for changes</span>
              </label>
              
              <label className=\"setting-item\">
                <input
                  type=\"checkbox\"
                  checked={settings.isPublic}
                  onChange={(e) => setSettings(prev => ({ ...prev, isPublic: e.target.checked }))}
                />
                <span>Make public</span>
              </label>
            </div>
            
            <div className=\"expiry-setting\">
              <label>
                <span>Expires at (optional):</span>
                <input
                  type=\"datetime-local\"
                  value={settings.expiresAt ? settings.expiresAt.toISOString().slice(0, 16) : ''}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    expiresAt: e.target.value ? new Date(e.target.value) : undefined 
                  }))}
                  className=\"datetime-input\"
                />
              </label>
            </div>
          </div>

          {error && (
            <div className=\"error-message\">{error}</div>
          )}
        </div>
        
        <div className=\"dialog-footer\">
          <button 
            onClick={onClose}
            className=\"cancel-button\"
            disabled={isSharing}
          >
            Cancel
          </button>
          <button 
            onClick={handleShare}
            className=\"share-button\"
            disabled={isSharing || participants.length === 0}
          >
            {isSharing ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;