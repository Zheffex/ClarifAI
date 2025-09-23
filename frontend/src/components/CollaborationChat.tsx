import React, { useState, useRef, useEffect } from 'react';
import { useCollaboration } from '../contexts/CollaborationContext';
import './CollaborationChat.css';

interface CollaborationChatProps {
  roomId: string;
  resourceType: 'dataset' | 'analysis';
  resourceId: string;
}

const CollaborationChat: React.FC<CollaborationChatProps> = ({
  roomId,
  resourceType,
  resourceId
}) => {
  const {
    isConnected,
    currentRoom,
    participants,
    messages,
    joinRoom,
    leaveRoom,
    sendMessage
  } = useCollaboration();
  
  const [messageInput, setMessageInput] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isConnected && roomId && !isJoined) {
      joinRoom(roomId, resourceType, resourceId);
      setIsJoined(true);
    }

    return () => {
      if (isJoined && roomId) {
        leaveRoom(roomId);
        setIsJoined(false);
      }
    };
  }, [isConnected, roomId, resourceType, resourceId, isJoined, joinRoom, leaveRoom]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && isConnected && currentRoom) {
      sendMessage(messageInput.trim());
      setMessageInput('');
    }
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getParticipantColor = (userId: string) => {
    const participant = participants.find(p => p.userId === userId);
    return participant?.color || '#333333';
  };

  if (!isConnected) {
    return (
      <div className=\"collaboration-chat\">
        <div className=\"chat-status disconnected\">
          <div className=\"status-indicator\"></div>
          <span>Connecting to collaboration server...</span>
        </div>
      </div>
    );
  }

  return (
    <div className=\"collaboration-chat\">
      <div className=\"chat-header\">
        <div className=\"chat-status connected\">
          <div className=\"status-indicator\"></div>
          <span>Connected • {participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
        </div>
        
        <div className=\"participants-list\">
          {participants.map(participant => (
            <div 
              key={participant.userId}
              className=\"participant-avatar\"
              style={{ backgroundColor: participant.color }}
              title={participant.username}
            >
              {participant.username.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      <div className=\"chat-messages\" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className=\"empty-messages\">
            <p>No messages yet. Start collaborating by sending a message!</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id}
              className={`message ${message.type} ${message.userId === 'system' ? 'system' : 'user'}`}
            >
              {message.type === 'system' ? (
                <div className=\"system-message\">
                  <span className=\"system-text\">{message.message}</span>
                  <span className=\"message-time\">{formatTime(message.timestamp)}</span>
                </div>
              ) : (
                <div className=\"user-message\">
                  <div className=\"message-header\">
                    <span 
                      className=\"username\"
                      style={{ color: getParticipantColor(message.userId) }}
                    >
                      {message.username}
                    </span>
                    <span className=\"message-time\">{formatTime(message.timestamp)}</span>
                  </div>
                  <div className=\"message-content\">{message.message}</div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className=\"chat-input-form\" onSubmit={handleSendMessage}>
        <div className=\"input-container\">
          <input
            type=\"text\"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder=\"Type a message...\"
            className=\"message-input\"
            disabled={!isConnected || !currentRoom}
            maxLength={500}
          />
          <button 
            type=\"submit\" 
            className=\"send-button\"
            disabled={!messageInput.trim() || !isConnected || !currentRoom}
          >
            <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\">
              <line x1=\"22\" y1=\"2\" x2=\"11\" y2=\"13\"></line>
              <polygon points=\"22,2 15,22 11,13 2,9\"></polygon>
            </svg>
          </button>
        </div>
        <div className=\"input-info\">
          <span className=\"char-count\">{messageInput.length}/500</span>
        </div>
      </form>
    </div>
  );
};

export default CollaborationChat;