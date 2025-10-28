// src/services/collaborationService.ts
import apiClient from "./apiClient";

export interface CollaborationParticipant {
  userId: string;
  permissions: string[];
  joinedAt: string;
  lastActivity: string;
  status: 'active' | 'inactive' | 'banned';
}

export interface CollaborationComment {
  _id: string;
  userId: string;
  content: string;
  threadId?: string;
  mentions: string[];
  reactions: {
    userId: string;
    type: 'like' | 'dislike' | 'love' | 'laugh' | 'angry';
    createdAt: string;
  }[];
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollaborationAnnotation {
  _id: string;
  userId: string;
  chartId: string;
  position: {
    x?: number;
    y?: number;
    row?: number;
    column?: string | number;
    width?: number;
    height?: number;
  };
  content: string;
  type: 'note' | 'highlight' | 'question' | 'suggestion';
  status: 'active' | 'resolved' | 'archived';
  replies: {
    userId: string;
    content: string;
    createdAt: string;
  }[];
  createdAt: string;
}

export interface Collaboration {
  _id: string;
  resourceType: 'dataset' | 'analysis' | 'dashboard';
  resourceId: string;
  ownerId: string;
  participants: CollaborationParticipant[];
  comments: CollaborationComment[];
  annotations: CollaborationAnnotation[];
  settings: {
    allowComments: boolean;
    allowAnnotations: boolean;
    allowEditing: boolean;
    requireApproval: boolean;
    isPublic: boolean;
    expiresAt?: string;
  };
  version: number;
  lastModified: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShareResourceRequest {
  resourceType: 'dataset' | 'analysis' | 'dashboard';
  resourceId: string;
  participants: {
    userId: string;
    permissions: string[];
  }[];
  settings?: {
    allowComments?: boolean;
    allowAnnotations?: boolean;
    allowEditing?: boolean;
    requireApproval?: boolean;
    isPublic?: boolean;
    expiresAt?: string;
  };
}

export interface AddCommentRequest {
  content: string;
  threadId?: string;
  mentions?: string[];
}

export interface AddAnnotationRequest {
  chartId: string;
  position: {
    x?: number;
    y?: number;
    row?: number;
    column?: string | number;
    width?: number;
    height?: number;
  };
  content: string;
  type?: 'note' | 'highlight' | 'question' | 'suggestion';
}

export const collaborationService = {
  // Get user's collaborations
  getUserCollaborations: async (page = 1, limit = 20, type?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(type && { type })
    });
    const response = await apiClient.get(`/collaboration?${params}`);
    return response.data;
  },

  // Get public collaborations
  getPublicCollaborations: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await apiClient.get(`/collaboration/public/list?${params}`);
    return response.data;
  },

  // Get sharing information
  getShareInfo: async (page = 1, limit = 20, type?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(type && { type })
    });
    const response = await apiClient.get(`/collaboration/share?${params}`);
    return response.data;
  },

  // Share a resource
  shareResource: async (data: ShareResourceRequest) => {
    const response = await apiClient.post("/collaboration/share", data);
    return response.data;
  },

  // Get collaboration details
  getCollaboration: async (id: string) => {
    const response = await apiClient.get(`/collaboration/${id}`);
    return response.data;
  },

  // Add comment to collaboration
  addComment: async (id: string, data: AddCommentRequest) => {
    const response = await apiClient.post(`/collaboration/${id}/comment`, data);
    return response.data;
  },

  // Add annotation to collaboration
  addAnnotation: async (id: string, data: AddAnnotationRequest) => {
    const response = await apiClient.put(`/collaboration/${id}/annotation`, data);
    return response.data;
  },

  // Update collaboration settings
  updateCollaboration: async (id: string, data: {
    settings?: Partial<Collaboration['settings']>;
    participants?: {
      action: 'add' | 'remove' | 'update';
      userId: string;
      permissions?: string[];
    }[];
  }) => {
    const response = await apiClient.put(`/collaboration/${id}`, data);
    return response.data;
  },

  // End collaboration
  endCollaboration: async (id: string) => {
    const response = await apiClient.delete(`/collaboration/${id}`);
    return response.data;
  },

  // Get active room participants
  getRoomParticipants: async (roomId: string) => {
    const response = await apiClient.get(`/collaboration/room/${roomId}/participants`);
    return response.data;
  },

  // Update user permissions
  updateUserPermissions: async (collaborationId: string, userId: string, permissions: string[]) => {
    const response = await apiClient.put("/collaboration/permissions", {
      collaborationId,
      userId,
      permissions
    });
    return response.data;
  },

  // Get collaboration status
  getCollaborationStatus: async (resourceType: string, resourceId: string) => {
    const response = await apiClient.get(`/collaboration/status/${resourceType}/${resourceId}`);
    return response.data;
  },

  // Kick user from collaboration
  kickUser: async (collaborationId: string, userId: string) => {
    const response = await apiClient.post("/collaboration/kick", {
      collaborationId,
      userId
    });
    return response.data;
  },

  // Send notification
  sendNotification: async (collaborationId: string, message: string, type?: string, targetUsers?: string[]) => {
    const response = await apiClient.post("/collaboration/notify", {
      collaborationId,
      message,
      type,
      targetUsers
    });
    return response.data;
  }
};
