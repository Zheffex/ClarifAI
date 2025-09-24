import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Dataset } from '../models/Dataset';
import { AnalysisSession } from '../models/AnalysisSession';
import { Collaboration } from '../models/Collaboration';
import { logger } from '../config/logger';
import { env } from '../config/environment';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

interface RoomData {
  id: string;
  type: 'dataset' | 'analysis';
  resourceId: string;
  participants: Set<string>;
  owner: string;
  permissions: Map<string, string[]>;
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

class SocketService {
  private io: Server;
  private rooms: Map<string, RoomData> = new Map();
  private userColors: Map<string, string> = new Map();
  private colorPalette: string[] = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
  ];

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: env.cors.frontendUrl,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    logger.info('Socket.IO server initialized');
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, env.jwt.secret) as any;
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        const userId = user._id.toString();
        socket.userId = userId;
        socket.user = user;
        
        // Assign color to user if not already assigned
        if (!this.userColors.has(userId)) {
          const colorIndex = this.userColors.size % this.colorPalette.length;
          const selectedColor = this.colorPalette[colorIndex] || '#333333';
          this.userColors.set(userId, selectedColor);
        }
        
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`User ${socket.user.username} connected with socket ${socket.id}`);

      // Join room event
      socket.on('join-room', async (data: { roomId: string; resourceType: 'dataset' | 'analysis'; resourceId: string }) => {
        try {
          await this.handleJoinRoom(socket, data);
        } catch (error) {
          socket.emit('error', { message: 'Failed to join room' });
          logger.error('Join room error:', error);
        }
      });

      // Leave room event
      socket.on('leave-room', (roomId: string) => {
        this.handleLeaveRoom(socket, roomId);
      });

      // Chat message event
      socket.on('chat-message', (data: { roomId: string; message: string }) => {
        this.handleChatMessage(socket, data);
      });

      // Cursor movement event
      socket.on('cursor-move', (data: { roomId: string; x: number; y: number }) => {
        this.handleCursorMove(socket, data);
      });

      // Document edit event
      socket.on('document-edit', (data: { roomId: string; edit: Omit<DocumentEdit, 'userId' | 'username' | 'timestamp'> }) => {
        this.handleDocumentEdit(socket, data);
      });

      // Request room state
      socket.on('request-room-state', (roomId: string) => {
        this.sendRoomState(socket, roomId);
      });

      // Disconnect event
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async handleJoinRoom(socket: AuthenticatedSocket, data: { roomId: string; resourceType: 'dataset' | 'analysis'; resourceId: string }): Promise<void> {
    const { roomId, resourceType, resourceId } = data;
    
    if (!socket.userId) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }
    
    // Verify user has access to the resource
    const hasAccess = await this.verifyResourceAccess(socket.userId, resourceType, resourceId);
    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied to this resource' });
      return;
    }

    // Join the socket room
    socket.join(roomId);

    // Initialize or update room data
    if (!this.rooms.has(roomId)) {
      const owner = await this.getResourceOwner(resourceType, resourceId);
      const room: RoomData = {
        id: roomId,
        type: resourceType,
        resourceId,
        participants: new Set(),
        owner: owner || socket.userId,
        permissions: new Map()
      };
      this.rooms.set(roomId, room);
    }

    const room = this.rooms.get(roomId)!;
    room.participants.add(socket.userId);

    // Get user permissions
    const permissions = await this.getUserPermissions(socket.userId, resourceType, resourceId);
    room.permissions.set(socket.userId, permissions);

    // Notify room of new participant
    const joinMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      userId: 'system',
      username: 'System',
      message: `${socket.user.username} joined the collaboration`,
      timestamp: new Date(),
      type: 'system'
    };

    socket.to(roomId).emit('user-joined', {
      userId: socket.userId,
      username: socket.user.username,
      color: this.userColors.get(socket.userId) || '#333333'
    });

    socket.to(roomId).emit('chat-message', joinMessage);
    socket.emit('room-joined', { roomId, participants: Array.from(room.participants) });

    logger.info(`User ${socket.user.username} joined room ${roomId}`);
  }

  private handleLeaveRoom(socket: AuthenticatedSocket, roomId: string): void {
    if (!socket.userId) return;
    
    socket.leave(roomId);
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.participants.delete(socket.userId);
      room.permissions.delete(socket.userId);

      // Notify room of participant leaving
      const leaveMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        userId: 'system',
        username: 'System',
        message: `${socket.user.username} left the collaboration`,
        timestamp: new Date(),
        type: 'system'
      };

      socket.to(roomId).emit('user-left', {
        userId: socket.userId,
        username: socket.user.username
      });

      socket.to(roomId).emit('chat-message', leaveMessage);

      // Clean up empty rooms
      if (room.participants.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    logger.info(`User ${socket.user.username} left room ${roomId}`);
  }

  private handleChatMessage(socket: AuthenticatedSocket, data: { roomId: string; message: string }): void {
    const { roomId, message } = data;
    
    if (!socket.userId || !message.trim()) return;

    const chatMessage: ChatMessage = {
      id: `msg-${Date.now()}-${socket.userId}`,
      userId: socket.userId,
      username: socket.user.username,
      message: message.trim(),
      timestamp: new Date(),
      type: 'text'
    };

    // Broadcast to all users in the room
    this.io.to(roomId).emit('chat-message', chatMessage);
    
    logger.info(`Chat message in room ${roomId} from ${socket.user.username}: ${message}`);
  }

  private handleCursorMove(socket: AuthenticatedSocket, data: { roomId: string; x: number; y: number }): void {
    const { roomId, x, y } = data;
    
    if (!socket.userId) return;
    
    const cursorPosition: CursorPosition = {
      userId: socket.userId,
      username: socket.user.username,
      x,
      y,
      color: this.userColors.get(socket.userId) || '#333333'
    };

    // Broadcast cursor position to other users in the room
    socket.to(roomId).emit('cursor-update', cursorPosition);
  }

  private handleDocumentEdit(socket: AuthenticatedSocket, data: { roomId: string; edit: Omit<DocumentEdit, 'userId' | 'username' | 'timestamp'> }): void {
    const { roomId, edit } = data;
    
    if (!socket.userId) return;
    
    const documentEdit: DocumentEdit = {
      ...edit,
      userId: socket.userId,
      username: socket.user.username,
      timestamp: new Date()
    };

    // Broadcast edit to other users in the room
    socket.to(roomId).emit('document-edit', documentEdit);
    
    logger.info(`Document edit in room ${roomId} by ${socket.user.username}: ${edit.type}`);
  }

  private sendRoomState(socket: AuthenticatedSocket, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('room-state', { participants: [], permissions: {} });
      return;
    }

    const participants = Array.from(room.participants).map(userId => ({
      userId,
      color: this.userColors.get(userId) || '#333333'
    }));

    const permissions = Object.fromEntries(room.permissions);

    socket.emit('room-state', { participants, permissions });
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    // Leave all rooms
    socket.rooms.forEach(roomId => {
      if (roomId !== socket.id) {
        this.handleLeaveRoom(socket, roomId);
      }
    });

    logger.info(`User ${socket.user?.username || 'unknown'} disconnected`);
  }

  private async verifyResourceAccess(userId: string, resourceType: 'dataset' | 'analysis', resourceId: string): Promise<boolean> {
    try {
      if (resourceType === 'dataset') {
        const dataset = await Dataset.findById(resourceId);
        if (!dataset) return false;
        
        // Check if user is owner or has collaboration access
        if ((dataset as any).createdBy?.toString() === userId) return true;
        
        const collaboration = await Collaboration.findOne({
          resourceId,
          resourceType: 'dataset',
          collaborators: userId,
          status: 'active'
        });
        
        return !!collaboration;
      } else if (resourceType === 'analysis') {
        const analysis = await AnalysisSession.findById(resourceId);
        if (!analysis) return false;
        
        // Check if user is owner or has collaboration access
        if (analysis.userId.toString() === userId) return true;
        
        const collaboration = await Collaboration.findOne({
          resourceId,
          resourceType: 'analysis',
          collaborators: userId,
          status: 'active'
        });
        
        return !!collaboration;
      }
      
      return false;
    } catch (error) {
      logger.error('Resource access verification error:', error);
      return false;
    }
  }

  private async getResourceOwner(resourceType: 'dataset' | 'analysis', resourceId: string): Promise<string | null> {
    try {
      if (resourceType === 'dataset') {
        const dataset = await Dataset.findById(resourceId);
        return (dataset as any)?.createdBy?.toString() || null;
      } else if (resourceType === 'analysis') {
        const analysis = await AnalysisSession.findById(resourceId);
        return analysis?.userId.toString() || null;
      }
      return null;
    } catch (error) {
      logger.error('Get resource owner error:', error);
      return null;
    }
  }

  private async getUserPermissions(userId: string, resourceType: 'dataset' | 'analysis', resourceId: string): Promise<string[]> {
    try {
      // Check if user is owner
      const owner = await this.getResourceOwner(resourceType, resourceId);
      if (owner === userId) {
        return ['view', 'edit', 'delete', 'share', 'admin'];
      }

      // Check collaboration permissions
      const collaboration = await Collaboration.findOne({
        resourceId,
        resourceType,
        collaborators: userId,
        status: 'active'
      });

      if (collaboration) {
        const participant = collaboration.participants.find(p => 
          p.userId.toString() === userId
        );
        return participant?.permissions || ['view'];
      }

      return ['view'];
    } catch (error) {
      logger.error('Get user permissions error:', error);
      return ['view'];
    }
  }

  // Public methods for external use
  public notifyResourceUpdate(resourceId: string, resourceType: 'dataset' | 'analysis' | 'dashboard', updateData: any): void {
    const roomId = `${resourceType}-${resourceId}`;
    this.io.to(roomId).emit('resource-updated', {
      resourceId,
      resourceType,
      updateData,
      timestamp: new Date()
    });
  }

  public notifyUserPermissionChange(userId: string, resourceId: string, resourceType: 'dataset' | 'analysis' | 'dashboard', newPermissions: string[]): void {
    const roomId = `${resourceType}-${resourceId}`;
    const room = this.rooms.get(roomId);
    
    if (room) {
      room.permissions.set(userId, newPermissions);
    }

    this.io.to(roomId).emit('permission-updated', {
      userId,
      resourceId,
      resourceType,
      permissions: newPermissions,
      timestamp: new Date()
    });
  }

  public getRoomParticipants(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.participants) : [];
  }

  public getActiveRooms(): string[] {
    return Array.from(this.rooms.keys());
  }

  public getServer(): Server {
    return this.io;
  }
}

export default SocketService;