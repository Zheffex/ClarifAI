import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import CollaborationChat from '../../components/CollaborationChat';
import './CollaborationPage.css';

interface SharedResource {
  _id: string;
  name: string;
  type: 'dataset' | 'analysis';
  description?: string;
  sharedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  sharedWith: string[];
  permissions: 'view' | 'edit' | 'admin';
  sharedAt: string;
  lastAccessed?: string;
}

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
}

interface Activity {
  _id: string;
  user: {
    firstName: string;
    lastName: string;
  };
  action: string;
  target: {
    name: string;
    type: string;
  };
  timestamp: string;
}

// Team Dashboard Component
const TeamDashboard: React.FC = () => {
  const { user } = useAuth();
  const [sharedResources, setSharedResources] = useState<SharedResource[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCollaborationData = async () => {
      setIsLoading(true);
      try {
        // Mock data - in real app this would come from API
        const mockSharedResources: SharedResource[] = [
          {
            _id: '1',
            name: 'Sales Analytics Q4',
            type: 'analysis',
            description: 'Quarterly sales performance analysis with predictive modeling',
            sharedBy: { _id: '2', firstName: 'John', lastName: 'Doe' },
            sharedWith: [user?._id || ''],
            permissions: 'edit',
            sharedAt: '2024-01-15T10:30:00Z',
            lastAccessed: '2024-01-20T14:45:00Z'
          },
          {
            _id: '2',
            name: 'Customer Feedback Dataset',
            type: 'dataset',
            description: 'Customer survey responses and sentiment analysis data',
            sharedBy: { _id: '3', firstName: 'Jane', lastName: 'Smith' },
            sharedWith: [user?._id || ''],
            permissions: 'view',
            sharedAt: '2024-01-18T09:15:00Z'
          }
        ];

        const mockTeamMembers: TeamMember[] = [
          {
            _id: '2',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@company.com',
            role: 'Data Analyst',
            status: 'online',
            lastSeen: new Date().toISOString()
          },
          {
            _id: '3',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@company.com',
            role: 'Data Scientist',
            status: 'away',
            lastSeen: '2024-01-20T12:30:00Z'
          },
          {
            _id: '4',
            firstName: 'Mike',
            lastName: 'Johnson',
            email: 'mike.johnson@company.com',
            role: 'Business Analyst',
            status: 'offline',
            lastSeen: '2024-01-19T17:45:00Z'
          }
        ];

        const mockActivity: Activity[] = [
          {
            _id: '1',
            user: { firstName: 'John', lastName: 'Doe' },
            action: 'shared analysis',
            target: { name: 'Sales Analytics Q4', type: 'analysis' },
            timestamp: '2024-01-20T15:30:00Z'
          },
          {
            _id: '2',
            user: { firstName: 'Jane', lastName: 'Smith' },
            action: 'uploaded dataset',
            target: { name: 'Customer Feedback Dataset', type: 'dataset' },
            timestamp: '2024-01-20T14:15:00Z'
          },
          {
            _id: '3',
            user: { firstName: 'Mike', lastName: 'Johnson' },
            action: 'commented on',
            target: { name: 'Monthly Report Analysis', type: 'analysis' },
            timestamp: '2024-01-20T11:45:00Z'
          }
        ];

        setSharedResources(mockSharedResources);
        setTeamMembers(mockTeamMembers);
        setRecentActivity(mockActivity);
      } catch (error) {
        console.error('Failed to load collaboration data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCollaborationData();
  }, [user?._id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'away': return '#f59e0b';
      case 'offline': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'dataset': return '📄';
      case 'analysis': return '📊';
      default: return '💼';
    }
  };

  const getPermissionBadge = (permission: string) => {
    const badges = {
      view: { label: 'View', color: '#6b7280' },
      edit: { label: 'Edit', color: '#3b82f6' },
      admin: { label: 'Admin', color: '#ef4444' }
    };
    return badges[permission as keyof typeof badges] || badges.view;
  };

  if (isLoading) {
    return (
      <div className="collaboration-loading">
        <div className="loading-spinner">Loading collaboration workspace...</div>
      </div>
    );
  }

  return (
    <div className="team-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Team Collaboration</h1>
            <p>Share resources and collaborate on data analysis projects</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn-primary"
              onClick={() => navigate('/collaboration/share')}
            >
              <span className="btn-icon">🔗</span>
              Share Resource
            </button>
            <button 
              className="btn-secondary"
              onClick={() => navigate('/collaboration/chat')}
            >
              <span className="btn-icon">💬</span>
              Team Chat
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Shared Resources Section */}
        <div className="dashboard-section shared-resources">
          <div className="section-header">
            <h2>Shared Resources</h2>
            <span className="resource-count">{sharedResources.length} items</span>
          </div>
          
          <div className="resources-list">
            {sharedResources.length > 0 ? (
              sharedResources.map(resource => {
                const permission = getPermissionBadge(resource.permissions);
                return (
                  <div key={resource._id} className="resource-card">
                    <div className="resource-icon">{getResourceIcon(resource.type)}</div>
                    <div className="resource-info">
                      <div className="resource-header">
                        <h3 className="resource-title">{resource.name}</h3>
                        <span 
                          className="permission-badge"
                          style={{ backgroundColor: permission.color }}
                        >
                          {permission.label}
                        </span>
                      </div>
                      <p className="resource-description">
                        {resource.description || 'No description provided'}
                      </p>
                      <div className="resource-meta">
                        <span className="meta-item">
                          Shared by {resource.sharedBy.firstName} {resource.sharedBy.lastName}
                        </span>
                        <span className="meta-separator">•</span>
                        <span className="meta-item">
                          {new Date(resource.sharedAt).toLocaleDateString()}
                        </span>
                        {resource.lastAccessed && (
                          <>
                            <span className="meta-separator">•</span>
                            <span className="meta-item">
                              Last accessed {new Date(resource.lastAccessed).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="resource-actions">
                      <button className="action-btn primary">Open</button>
                      {resource.permissions !== 'view' && (
                        <button className="action-btn secondary">Edit</button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <h3>No shared resources</h3>
                <p>Resources shared with you will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Team Members Section */}
        <div className="dashboard-section team-members">
          <div className="section-header">
            <h2>Team Members</h2>
            <span className="online-count">
              {teamMembers.filter(m => m.status === 'online').length} online
            </span>
          </div>
          
          <div className="members-list">
            {teamMembers.map(member => (
              <div key={member._id} className="member-card">
                <div className="member-avatar">
                  <div className="avatar-initials">
                    {member.firstName[0]}{member.lastName[0]}
                  </div>
                  <div 
                    className="status-indicator"
                    style={{ backgroundColor: getStatusColor(member.status) }}
                  />
                </div>
                <div className="member-info">
                  <h4 className="member-name">{member.firstName} {member.lastName}</h4>
                  <p className="member-role">{member.role}</p>
                  <p className="member-status">
                    {member.status === 'online' ? 'Online now' :
                     member.status === 'away' ? 'Away' :
                     `Last seen ${new Date(member.lastSeen).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="member-actions">
                  <button className="action-btn small">Message</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="dashboard-section recent-activity">
          <div className="section-header">
            <h2>Recent Activity</h2>
            <button className="btn-link">View All</button>
          </div>
          
          <div className="activity-list">
            {recentActivity.map(activity => (
              <div key={activity._id} className="activity-item">
                <div className="activity-icon">{getResourceIcon(activity.target.type)}</div>
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{activity.user.firstName} {activity.user.lastName}</strong>
                    {' '}{activity.action}{' '}
                    <strong>{activity.target.name}</strong>
                  </p>
                  <p className="activity-time">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Share Resource Component
const ShareResource: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [resourceType, setResourceType] = useState<'dataset' | 'analysis'>('dataset');
  const [selectedResource, setSelectedResource] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<'view' | 'edit'>('view');
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  // Mock available resources
  const availableResources = {
    dataset: [
      { _id: '1', name: 'Customer Analytics Dataset' },
      { _id: '2', name: 'Sales Performance Data' },
      { _id: '3', name: 'Market Research Results' }
    ],
    analysis: [
      { _id: '1', name: 'Quarterly Revenue Analysis' },
      { _id: '2', name: 'Customer Churn Prediction' },
      { _id: '3', name: 'Product Performance Review' }
    ]
  };

  const availableMembers = [
    { _id: '1', name: 'John Doe', email: 'john.doe@company.com' },
    { _id: '2', name: 'Jane Smith', email: 'jane.smith@company.com' },
    { _id: '3', name: 'Mike Johnson', email: 'mike.johnson@company.com' }
  ];

  const handleShare = async () => {
    if (!selectedResource || teamMembers.length === 0) return;
    
    setIsSharing(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addNotification({
        type: 'success',
        title: 'Resource Shared',
        message: `Successfully shared with ${teamMembers.length} team member(s).`
      });
      
      navigate('/collaboration');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Share Failed',
        message: 'Failed to share resource. Please try again.'
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="share-resource">
      <div className="share-header">
        <button 
          className="back-button"
          onClick={() => navigate('/collaboration')}
        >
          ← Back to Collaboration
        </button>
        <h1>Share Resource</h1>
        <p>Share datasets and analyses with your team members</p>
      </div>

      <div className="share-form">
        <div className="form-section">
          <h3>Select Resource</h3>
          
          <div className="resource-type-selector">
            <button 
              className={`type-button ${resourceType === 'dataset' ? 'active' : ''}`}
              onClick={() => setResourceType('dataset')}
            >
              📄 Datasets
            </button>
            <button 
              className={`type-button ${resourceType === 'analysis' ? 'active' : ''}`}
              onClick={() => setResourceType('analysis')}
            >
              📊 Analyses
            </button>
          </div>
          
          <div className="resource-list">
            {availableResources[resourceType].map(resource => (
              <div 
                key={resource._id}
                className={`resource-option ${selectedResource === resource._id ? 'selected' : ''}`}
                onClick={() => setSelectedResource(resource._id)}
              >
                <div className="resource-check">
                  {selectedResource === resource._id && '✓'}
                </div>
                <div className="resource-name">{resource.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3>Select Team Members</h3>
          
          <div className="members-selector">
            {availableMembers.map(member => (
              <div 
                key={member._id}
                className={`member-option ${teamMembers.includes(member._id) ? 'selected' : ''}`}
                onClick={() => {
                  setTeamMembers(prev => 
                    prev.includes(member._id) 
                      ? prev.filter(id => id !== member._id)
                      : [...prev, member._id]
                  );
                }}
              >
                <div className="member-check">
                  {teamMembers.includes(member._id) && '✓'}
                </div>
                <div className="member-info">
                  <div className="member-name">{member.name}</div>
                  <div className="member-email">{member.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3>Permissions</h3>
          
          <div className="permissions-selector">
            <label className="permission-option">
              <input 
                type="radio"
                name="permissions"
                value="view"
                checked={permissions === 'view'}
                onChange={e => setPermissions(e.target.value as 'view')}
              />
              <div className="permission-info">
                <div className="permission-title">View Only</div>
                <div className="permission-description">Can view and download the resource</div>
              </div>
            </label>
            
            <label className="permission-option">
              <input 
                type="radio"
                name="permissions"
                value="edit"
                checked={permissions === 'edit'}
                onChange={e => setPermissions(e.target.value as 'edit')}
              />
              <div className="permission-info">
                <div className="permission-title">Edit Access</div>
                <div className="permission-description">Can view, edit, and collaborate on the resource</div>
              </div>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>Message (Optional)</h3>
          
          <textarea 
            className="form-textarea"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Add a message for the recipients..."
            rows={4}
          />
        </div>

        <div className="form-actions">
          <button 
            className="btn-secondary"
            onClick={() => navigate('/collaboration')}
          >
            Cancel
          </button>
          <button 
            className="btn-primary"
            onClick={handleShare}
            disabled={!selectedResource || teamMembers.length === 0 || isSharing}
          >
            {isSharing ? 'Sharing...' : 'Share Resource'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Team Chat Component
const TeamChatPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="team-chat-page">
      <div className="chat-header">
        <button 
          className="back-button"
          onClick={() => navigate('/collaboration')}
        >
          ← Back to Collaboration
        </button>
        <h1>Team Chat</h1>
        <p>Collaborate and discuss with your team in real-time</p>
      </div>
      
      <div className="chat-container">
        <CollaborationChat 
          roomId="general"
          resourceType="analysis"
          resourceId="general"
        />
      </div>
    </div>
  );
};

const CollaborationPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<TeamDashboard />} />
      <Route path="/share" element={<ShareResource />} />
      <Route path="/chat" element={<TeamChatPage />} />
      <Route path="/*" element={<TeamDashboard />} />
    </Routes>
  );
};

export default CollaborationPage;