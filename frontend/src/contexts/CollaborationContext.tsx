import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface CollaborationUser {
  userId: string;
  username: string;
  color: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system';
}

interface CursorPosition {
  userId: string;
  username: string;
  x: number;
  y: number;
  color: string;
}

interface DocumentEdit {
  id: string;
  userId: string;
  username: string;
  type: 'insert' | 'delete' | 'update';
  position: number;
  content: string;
  timestamp: Date;
}

interface RoomState {
  participants: CollaborationUser[];
  permissions: { [userId: string]: string[] };
}

interface CollaborationContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentRoom: string | null;
  participants: CollaborationUser[];
  messages: ChatMessage[];
  cursors: { [userId: string]: CursorPosition };
  joinRoom: (roomId: string, resourceType: 'dataset' | 'analysis', resourceId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (message: string) => void;
  updateCursor: (x: number, y: number) => void;
  sendDocumentEdit: (edit: Omit<DocumentEdit, 'userId' | 'username' | 'timestamp'>) => void;
  clearMessages: () => void;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

interface CollaborationProviderProps {
  children: ReactNode;
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [participants, setParticipants] = useState<CollaborationUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursors, setCursors] = useState<{ [userId: string]: CursorPosition }>({});

  useEffect(() => {
    if (user && token) {
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Connected to collaboration server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from collaboration server');
        setIsConnected(false);
        setCurrentRoom(null);
        setParticipants([]);
        setCursors({});
      });

      newSocket.on('room-joined', (data: { roomId: string; participants: string[] }) => {
        console.log('Joined room:', data.roomId);
        setCurrentRoom(data.roomId);
      });

      newSocket.on('user-joined', (user: CollaborationUser) => {
        console.log('User joined:', user.username);
        setParticipants(prev => {
          const exists = prev.find(p => p.userId === user.userId);
          if (exists) return prev;
          return [...prev, user];
        });
      });

      newSocket.on('user-left', (userData: { userId: string; username: string }) => {
        console.log('User left:', userData.username);
        setParticipants(prev => prev.filter(p => p.userId !== userData.userId));
        setCursors(prev => {
          const newCursors = { ...prev };
          delete newCursors[userData.userId];
          return newCursors;
        });
      });

      newSocket.on('chat-message', (message: ChatMessage) => {
        setMessages(prev => [...prev, {
          ...message,
          timestamp: new Date(message.timestamp)
        }]);
      });

      newSocket.on('cursor-update', (position: CursorPosition) => {
        setCursors(prev => ({
          ...prev,
          [position.userId]: position
        }));
      });

      newSocket.on('document-edit', (edit: DocumentEdit) => {
        // Handle document edits (can be extended based on specific needs)
        console.log('Document edit received:', edit);
      });

      newSocket.on('room-state', (state: RoomState) => {
        setParticipants(state.participants);
      });

      newSocket.on('resource-updated', (data: any) => {
        console.log('Resource updated:', data);
        // Handle resource updates (notifications, changes, etc.)
      });

      newSocket.on('permission-updated', (data: any) => {
        console.log('Permissions updated:', data);
        // Handle permission changes
      });

      newSocket.on('error', (error: { message: string }) => {
        console.error('Collaboration error:', error.message);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user, token]);

  const joinRoom = (roomId: string, resourceType: 'dataset' | 'analysis', resourceId: string) => {
    if (socket && isConnected) {
      socket.emit('join-room', { roomId, resourceType, resourceId });
      setMessages([]); // Clear previous messages
    }
  };

  const leaveRoom = (roomId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-room', roomId);
      setCurrentRoom(null);
      setParticipants([]);
      setMessages([]);
      setCursors({});
    }
  };

  const sendMessage = (message: string) => {
    if (socket && isConnected && currentRoom) {
      socket.emit('chat-message', {
        roomId: currentRoom,
        message
      });
    }
  };

  const updateCursor = (x: number, y: number) => {
    if (socket && isConnected && currentRoom) {
      socket.emit('cursor-move', {
        roomId: currentRoom,
        x,
        y
      });
    }
  };

  const sendDocumentEdit = (edit: Omit<DocumentEdit, 'userId' | 'username' | 'timestamp'>) => {
    if (socket && isConnected && currentRoom) {
      socket.emit('document-edit', {
        roomId: currentRoom,
        edit
      });
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const value: CollaborationContextType = {
    socket,
    isConnected,
    currentRoom,
    participants,
    messages,
    cursors,
    joinRoom,
    leaveRoom,
    sendMessage,
    updateCursor,
    sendDocumentEdit,
    clearMessages
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

export const useCollaboration = (): CollaborationContextType => {
  const context = useContext(CollaborationContext);
  if (context === undefined) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};