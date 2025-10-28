import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, StickyNote, Users, Settings, Send, Plus, MoreVertical, Edit3, Trash2, Reply } from 'lucide-react';
import { useCollaboration } from '../../contexts/CollaborationContext';
import { collaborationService, Collaboration, CollaborationComment, CollaborationAnnotation } from '../../services/collaboration';
import { useAuth } from '../../contexts/AuthContext';
import './CollaborationWorkspace.css';

interface CollaborationWorkspaceProps {
  collaborationId: string;
  resourceType: 'dataset' | 'analysis' | 'dashboard';
  resourceId: string;
}

const CollaborationWorkspace: React.FC<CollaborationWorkspaceProps> = ({
  collaborationId,
  resourceType,
  resourceId
}) => {
  const { user } = useAuth();
  const { isConnected, participants, joinRoom, leaveRoom } = useCollaboration();
  const [collaboration, setCollaboration] = useState<Collaboration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'comments' | 'annotations' | 'participants'>('comments');
  const [newComment, setNewComment] = useState('');
  const [newAnnotation, setNewAnnotation] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const annotationsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCollaboration();
    const roomId = `${resourceType}-${resourceId}`;
    if (isConnected) {
      joinRoom(roomId, resourceType, resourceId);
    }

    return () => {
      if (isConnected) {
        leaveRoom(roomId);
      }
    };
  }, [collaborationId, resourceType, resourceId, isConnected]);

  const loadCollaboration = async () => {
    try {
      setLoading(true);
      const response = await collaborationService.getCollaboration(collaborationId);
      setCollaboration(response.data.collaboration);
      setIsOwner(response.data.collaboration.ownerId === user?._id);
    } catch (err: any) {
      setError(err.message || 'Failed to load collaboration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !collaboration) return;

    try {
      const response = await collaborationService.addComment(collaborationId, {
        content: newComment.trim(),
        mentions: []
      });
      
      setCollaboration(prev => prev ? {
        ...prev,
        comments: [...prev.comments, response.data.comment]
      } : null);
      
      setNewComment('');
      scrollToComments();
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
    }
  };

  const handleAddAnnotation = async () => {
    if (!newAnnotation.trim() || !collaboration) return;

    try {
      const response = await collaborationService.addAnnotation(collaborationId, {
        chartId: 'main-chart',
        position: { x: 100, y: 100 },
        content: newAnnotation.trim(),
        type: 'note'
      });
      
      setCollaboration(prev => prev ? {
        ...prev,
        annotations: [...prev.annotations, response.data.annotation]
      } : null);
      
      setNewAnnotation('');
      scrollToAnnotations();
    } catch (err: any) {
      setError(err.message || 'Failed to add annotation');
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyContent.trim()) return;

    try {
      // This would be implemented based on backend API for replies
      console.log('Replying to comment:', commentId, replyContent);
      setReplyContent('');
      setReplyingTo(null);
    } catch (err: any) {
      setError(err.message || 'Failed to add reply');
    }
  };

  const scrollToComments = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToAnnotations = () => {
    annotationsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getParticipantInfo = (userId: string) => {
    const participant = collaboration?.participants.find(p => p.userId === userId);
    const onlineParticipant = participants.find(p => p.userId === userId);
    return {
      name: onlineParticipant?.username || `User ${userId.slice(-4)}`,
      color: onlineParticipant?.color || '#3b82f6',
      isOnline: !!onlineParticipant,
      permissions: participant?.permissions || []
    };
  };

  if (loading) {
    return (
      <div className="collaboration-workspace">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading collaboration...</p>
        </div>
      </div>
    );
  }

  if (error || !collaboration) {
    return (
      <div className="collaboration-workspace">
        <div className="error-container">
          <p>{error || 'Collaboration not found'}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      </div>
    );
  }

  return (
    <div className="collaboration-workspace">
      <div className="workspace-header">
        <div className="header-info">
          <h2>
            {resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Collaboration
          </h2>
          <div className="connection-status">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            <span className="participant-count">
              • {participants.length} online
            </span>
          </div>
        </div>
        <div className="header-actions">
          {isOwner && (
            <button 
              className="btn btn-outline"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="btn-icon" />
              Settings
            </button>
          )}
        </div>
      </div>

      <div className="workspace-content">
        <div className="main-content">
          <div className="resource-viewer">
            <div className="viewer-placeholder">
              <h3>Resource Viewer</h3>
              <p>This area would display the {resourceType} content</p>
              <p>Resource ID: {resourceId}</p>
            </div>
          </div>
        </div>

        <div className="collaboration-panel">
          <div className="panel-tabs">
            <button 
              className={`tab ${activePanel === 'comments' ? 'active' : ''}`}
              onClick={() => setActivePanel('comments')}
            >
              <MessageSquare className="tab-icon" />
              Comments ({collaboration.comments.length})
            </button>
            <button 
              className={`tab ${activePanel === 'annotations' ? 'active' : ''}`}
              onClick={() => setActivePanel('annotations')}
            >
              <StickyNote className="tab-icon" />
              Annotations ({collaboration.annotations.length})
            </button>
            <button 
              className={`tab ${activePanel === 'participants' ? 'active' : ''}`}
              onClick={() => setActivePanel('participants')}
            >
              <Users className="tab-icon" />
              Participants ({collaboration.participants.length})
            </button>
          </div>

          <div className="panel-content">
            {activePanel === 'comments' && (
              <div className="comments-panel">
                <div className="comments-list">
                  {collaboration.comments.length === 0 ? (
                    <div className="empty-state">
                      <MessageSquare className="empty-icon" />
                      <p>No comments yet. Start the conversation!</p>
                    </div>
                  ) : (
                    collaboration.comments.map(comment => {
                      const participantInfo = getParticipantInfo(comment.userId);
                      return (
                        <div key={comment._id} className="comment-item">
                          <div className="comment-header">
                            <div className="comment-author">
                              <div 
                                className="author-avatar"
                                style={{ backgroundColor: participantInfo.color }}
                              >
                                {participantInfo.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="author-info">
                                <span className="author-name">{participantInfo.name}</span>
                                <span className="comment-time">{formatDate(comment.createdAt)}</span>
                              </div>
                            </div>
                            <div className="comment-actions">
                              <button 
                                className="action-btn"
                                onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                              >
                                <Reply className="action-icon" />
                              </button>
                              {isOwner && (
                                <button className="action-btn">
                                  <MoreVertical className="action-icon" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="comment-content">
                            <p>{comment.content}</p>
                          </div>
                          {comment.reactions.length > 0 && (
                            <div className="comment-reactions">
                              {comment.reactions.map((reaction, index) => (
                                <span key={index} className="reaction">
                                  {reaction.type} {reaction.userId.slice(-2)}
                                </span>
                              ))}
                            </div>
                          )}
                          {replyingTo === comment._id && (
                            <div className="reply-form">
                              <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Write a reply..."
                                className="reply-input"
                              />
                              <div className="reply-actions">
                                <button 
                                  className="btn btn-outline"
                                  onClick={() => setReplyingTo(null)}
                                >
                                  Cancel
                                </button>
                                <button 
                                  className="btn btn-primary"
                                  onClick={() => handleReply(comment._id)}
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={commentsEndRef} />
                </div>
                
                {collaboration.settings.allowComments && (
                  <div className="comment-input">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="comment-textarea"
                      rows={3}
                    />
                    <div className="input-actions">
                      <span className="char-count">{newComment.length}/2000</span>
                      <button 
                        className="btn btn-primary"
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                      >
                        <Send className="btn-icon" />
                        Comment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activePanel === 'annotations' && (
              <div className="annotations-panel">
                <div className="annotations-list">
                  {collaboration.annotations.length === 0 ? (
                    <div className="empty-state">
                      <StickyNote className="empty-icon" />
                      <p>No annotations yet. Add your first annotation!</p>
                    </div>
                  ) : (
                    collaboration.annotations.map(annotation => {
                      const participantInfo = getParticipantInfo(annotation.userId);
                      return (
                        <div key={annotation._id} className="annotation-item">
                          <div className="annotation-header">
                            <div className="annotation-author">
                              <div 
                                className="author-avatar"
                                style={{ backgroundColor: participantInfo.color }}
                              >
                                {participantInfo.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="author-info">
                                <span className="author-name">{participantInfo.name}</span>
                                <span className="annotation-time">{formatDate(annotation.createdAt)}</span>
                              </div>
                            </div>
                            <div className="annotation-type">
                              <span className={`type-badge ${annotation.type}`}>
                                {annotation.type}
                              </span>
                            </div>
                          </div>
                          <div className="annotation-content">
                            <p>{annotation.content}</p>
                          </div>
                          <div className="annotation-position">
                            <span className="position-info">
                              Chart: {annotation.chartId} • 
                              Position: {annotation.position.x}, {annotation.position.y}
                            </span>
                          </div>
                          {annotation.replies.length > 0 && (
                            <div className="annotation-replies">
                              {annotation.replies.map((reply, index) => (
                                <div key={index} className="reply-item">
                                  <span className="reply-author">
                                    User {reply.userId.slice(-4)}
                                  </span>
                                  <span className="reply-content">{reply.content}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={annotationsEndRef} />
                </div>
                
                {collaboration.settings.allowAnnotations && (
                  <div className="annotation-input">
                    <textarea
                      value={newAnnotation}
                      onChange={(e) => setNewAnnotation(e.target.value)}
                      placeholder="Add an annotation..."
                      className="annotation-textarea"
                      rows={3}
                    />
                    <div className="input-actions">
                      <span className="char-count">{newAnnotation.length}/1000</span>
                      <button 
                        className="btn btn-primary"
                        onClick={handleAddAnnotation}
                        disabled={!newAnnotation.trim()}
                      >
                        <Plus className="btn-icon" />
                        Annotate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activePanel === 'participants' && (
              <div className="participants-panel">
                <div className="participants-list">
                  {collaboration.participants.map(participant => {
                    const onlineParticipant = participants.find(p => p.userId === participant.userId);
                    const isOnline = !!onlineParticipant;
                    const isCurrentUser = participant.userId === user?._id;
                    
                    return (
                      <div key={participant.userId} className="participant-item">
                        <div className="participant-info">
                          <div 
                            className="participant-avatar"
                            style={{ backgroundColor: onlineParticipant?.color || '#3b82f6' }}
                          >
                            {onlineParticipant?.username.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="participant-details">
                            <div className="participant-name">
                              {onlineParticipant?.username || `User ${participant.userId.slice(-4)}`}
                              {isCurrentUser && <span className="you-badge">You</span>}
                            </div>
                            <div className="participant-status">
                              <div className={`status-dot ${isOnline ? 'online' : 'offline'}`}></div>
                              <span>{isOnline ? 'Online' : 'Offline'}</span>
                            </div>
                            <div className="participant-permissions">
                              {participant.permissions.map(permission => (
                                <span key={permission} className={`permission-badge ${permission}`}>
                                  {permission}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        {isOwner && !isCurrentUser && (
                          <div className="participant-actions">
                            <button className="action-btn">
                              <MoreVertical className="action-icon" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationWorkspace;
