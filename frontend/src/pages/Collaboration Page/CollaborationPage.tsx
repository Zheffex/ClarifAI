import React, { useState, useEffect } from 'react';
import { Users, Share2, MessageSquare, StickyNote, Settings, Plus, Search, MoreVertical } from 'lucide-react';
import { collaborationService, Collaboration, ShareResourceRequest } from '../../services/collaboration';
import { useAuth } from '../../contexts/AuthContext';
import './CollaborationPage.css';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const CollaborationPage: React.FC = () => {
  const { user } = useAuth();
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-collaborations' | 'public' | 'share'>('my-collaborations');
  const [searchTerm, setSearchTerm] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCollaboration, setSelectedCollaboration] = useState<Collaboration | null>(null);

  // Share modal state
  const [shareData, setShareData] = useState<Partial<ShareResourceRequest>>({
    resourceType: 'dataset',
    resourceId: '',
    participants: [],
    settings: {
      allowComments: true,
      allowAnnotations: true,
      allowEditing: false,
      requireApproval: false,
      isPublic: false
    }
  });

  useEffect(() => {
    loadCollaborations();
  }, [activeTab]);

  const loadCollaborations = async () => {
    try {
      setLoading(true);
      let response;
      
      if (activeTab === 'my-collaborations') {
        response = await collaborationService.getUserCollaborations();
      } else if (activeTab === 'public') {
        response = await collaborationService.getPublicCollaborations();
      } else {
        response = await collaborationService.getShareInfo();
      }
      
      setCollaborations(response.data.collaborations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load collaborations');
    } finally {
      setLoading(false);
    }
  };

  const handleShareResource = async () => {
    try {
      if (!shareData.resourceType || !shareData.resourceId || !shareData.participants?.length) {
        throw new Error('Please fill in all required fields');
      }

      await collaborationService.shareResource(shareData as ShareResourceRequest);
      setShowShareModal(false);
      setShareData({
        resourceType: 'dataset',
        resourceId: '',
        participants: [],
        settings: {
          allowComments: true,
          allowAnnotations: true,
          allowEditing: false,
          requireApproval: false,
          isPublic: false
        }
      });
      loadCollaborations();
    } catch (err: any) {
      setError(err.message || 'Failed to share resource');
    }
  };

  const filteredCollaborations = collaborations.filter(collab => {
    const matchesSearch = collab.resourceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         collab.resourceId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'dataset': return '📊';
      case 'analysis': return '📈';
      case 'dashboard': return '📋';
      default: return '📄';
    }
  };

  const getPermissionBadges = (permissions: string[]) => {
    return permissions.map(permission => (
      <span key={permission} className={`permission-badge ${permission}`}>
        {permission}
      </span>
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="collaboration-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading collaborations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="collaboration-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <Users className="header-icon" />
            Collaboration Hub
          </h1>
          <p>Manage and join collaborative data analysis sessions</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="btn-icon" />
            Create Collaboration
          </button>
        </div>
      </div>

      <div className="collaboration-tabs">
        <button 
          className={`tab ${activeTab === 'my-collaborations' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-collaborations')}
        >
          <Users className="tab-icon" />
          My Collaborations
        </button>
        <button 
          className={`tab ${activeTab === 'public' ? 'active' : ''}`}
          onClick={() => setActiveTab('public')}
        >
          <Share2 className="tab-icon" />
          Public
        </button>
        <button 
          className={`tab ${activeTab === 'share' ? 'active' : ''}`}
          onClick={() => setActiveTab('share')}
        >
          <Share2 className="tab-icon" />
          Share Resource
        </button>
      </div>


      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="collaborations-grid">
        {filteredCollaborations.length === 0 ? (
          <div className="empty-state">
            <Users className="empty-icon" />
            <h3>No collaborations found</h3>
            <p>
              {activeTab === 'my-collaborations' 
                ? "You haven't joined any collaborations yet. Create one or ask someone to invite you."
                : activeTab === 'public'
                ? "No public collaborations available at the moment."
                : "No resources available for sharing."
              }
            </p>
            {activeTab === 'my-collaborations' && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="btn-icon" />
                Create Your First Collaboration
              </button>
            )}
          </div>
        ) : (
          filteredCollaborations.map(collab => (
            <div key={collab._id} className="collaboration-card">
              <div className="card-header">
                <div className="resource-info">
                  <span className="resource-icon">{getResourceTypeIcon(collab.resourceType)}</span>
                  <div className="resource-details">
                    <h3>{collab.resourceType.charAt(0).toUpperCase() + collab.resourceType.slice(1)}</h3>
                    <p>ID: {collab.resourceId}</p>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="action-btn">
                    <MoreVertical className="action-icon" />
                  </button>
                </div>
              </div>

              <div className="card-content">
                <div className="collaboration-stats">
                  <div className="stat">
                    <Users className="stat-icon" />
                    <span>{collab.participants.length} participants</span>
                  </div>
                  <div className="stat">
                    <MessageSquare className="stat-icon" />
                    <span>{collab.comments.length} comments</span>
                  </div>
                  <div className="stat">
                    <StickyNote className="stat-icon" />
                    <span>{collab.annotations.length} annotations</span>
                  </div>
                </div>

                <div className="collaboration-settings">
                  <div className="settings-row">
                    <span className="setting-label">Comments:</span>
                    <span className={`setting-value ${collab.settings.allowComments ? 'enabled' : 'disabled'}`}>
                      {collab.settings.allowComments ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="settings-row">
                    <span className="setting-label">Annotations:</span>
                    <span className={`setting-value ${collab.settings.allowAnnotations ? 'enabled' : 'disabled'}`}>
                      {collab.settings.allowAnnotations ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="settings-row">
                    <span className="setting-label">Public:</span>
                    <span className={`setting-value ${collab.settings.isPublic ? 'enabled' : 'disabled'}`}>
                      {collab.settings.isPublic ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <div className="participants-preview">
                  <h4>Participants</h4>
                  <div className="participants-list">
                    {collab.participants.slice(0, 3).map(participant => (
                      <div key={participant.userId} className="participant-item">
                        <div className="participant-avatar">
                          {participant.userId.charAt(0).toUpperCase()}
                        </div>
                        <div className="participant-info">
                          <span className="participant-name">User {participant.userId.slice(-4)}</span>
                          <div className="participant-permissions">
                            {getPermissionBadges(participant.permissions)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {collab.participants.length > 3 && (
                      <div className="more-participants">
                        +{collab.participants.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <div className="collaboration-meta">
                  <span className="last-modified">
                    Modified: {formatDate(collab.lastModified)}
                  </span>
                  <span className="version">v{collab.version}</span>
                </div>
                <div className="card-buttons">
                  <button 
                    className="btn btn-outline"
                    onClick={() => setSelectedCollaboration(collab)}
                  >
                    View Details
                  </button>
                  <button className="btn btn-primary">
                    Join
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Share Resource Modal */}
      {showShareModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Share Resource</h2>
              <button 
                className="modal-close"
                onClick={() => setShowShareModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Resource Type</label>
                <select
                  value={shareData.resourceType}
                  onChange={(e) => setShareData(prev => ({ 
                    ...prev, 
                    resourceType: e.target.value as 'dataset' | 'analysis' | 'dashboard' 
                  }))}
                >
                  <option value="dataset">Dataset</option>
                  <option value="analysis">Analysis</option>
                  <option value="dashboard">Dashboard</option>
                </select>
              </div>

              <div className="form-group">
                <label>Resource ID</label>
                <input
                  type="text"
                  value={shareData.resourceId}
                  onChange={(e) => setShareData(prev => ({ ...prev, resourceId: e.target.value }))}
                  placeholder="Enter resource ID"
                />
              </div>

              <div className="form-group">
                <label>Participants</label>
                <div className="participants-input">
                  <input
                    type="text"
                    placeholder="Enter user email or ID"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const value = e.currentTarget.value.trim();
                        if (value) {
                          setShareData(prev => ({
                            ...prev,
                            participants: [...(prev.participants || []), {
                              userId: value,
                              permissions: ['read']
                            }]
                          }));
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                  <div className="participants-list">
                    {shareData.participants?.map((participant, index) => (
                      <div key={index} className="participant-tag">
                        <span>{participant.userId}</span>
                        <button
                          onClick={() => setShareData(prev => ({
                            ...prev,
                            participants: prev.participants?.filter((_, i) => i !== index)
                          }))}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Settings</label>
                <div className="settings-grid">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={shareData.settings?.allowComments}
                      onChange={(e) => setShareData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, allowComments: e.target.checked }
                      }))}
                    />
                    Allow Comments
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={shareData.settings?.allowAnnotations}
                      onChange={(e) => setShareData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, allowAnnotations: e.target.checked }
                      }))}
                    />
                    Allow Annotations
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={shareData.settings?.allowEditing}
                      onChange={(e) => setShareData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, allowEditing: e.target.checked }
                      }))}
                    />
                    Allow Editing
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={shareData.settings?.isPublic}
                      onChange={(e) => setShareData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, isPublic: e.target.checked }
                      }))}
                    />
                    Make Public
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline"
                onClick={() => setShowShareModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleShareResource}
              >
                Share Resource
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationPage;