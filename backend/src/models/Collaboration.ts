import mongoose, { Document, Schema } from 'mongoose';

export interface IParticipant {
  userId: mongoose.Types.ObjectId;
  permissions: string[];
  joinedAt: Date;
  lastActivity: Date;
  status: 'active' | 'inactive' | 'banned';
}

export interface IComment {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  threadId?: string;
  mentions: mongoose.Types.ObjectId[];
  reactions: {
    userId: mongoose.Types.ObjectId;
    type: 'like' | 'dislike' | 'love' | 'laugh' | 'angry';
    createdAt: Date;
  }[];
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnnotation {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  chartId: string;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  content: string;
  type: 'note' | 'highlight' | 'question' | 'suggestion';
  status: 'active' | 'resolved' | 'archived';
  replies: {
    userId: mongoose.Types.ObjectId;
    content: string;
    createdAt: Date;
  }[];
  createdAt: Date;
}

export interface ICollaboration extends Document {
  _id: mongoose.Types.ObjectId;
  resourceType: 'dashboard' | 'analysis' | 'dataset';
  resourceId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  participants: IParticipant[];
  comments: IComment[];
  annotations: IAnnotation[];
  settings: {
    allowComments: boolean;
    allowAnnotations: boolean;
    allowEditing: boolean;
    requireApproval: boolean;
    isPublic: boolean;
    expiresAt?: Date;
  };
  version: number;
  lastModified: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  addParticipant(userId: string, permissions: string[]): Promise<void>;
  removeParticipant(userId: string): Promise<void>;
  updateParticipantPermissions(userId: string, permissions: string[]): Promise<void>;
  hasPermission(userId: string, permission: string): boolean;
  addComment(userId: string, content: string, threadId?: string, mentions?: string[]): Promise<IComment>;
  addAnnotation(userId: string, annotation: Omit<IAnnotation, '_id' | 'userId' | 'createdAt'>): Promise<IAnnotation>;
  incrementVersion(): Promise<void>;
  isActive(): boolean;
}

const participantSchema = new Schema<IParticipant>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissions: [{
    type: String,
    enum: {
      values: ['read', 'comment', 'annotate', 'edit', 'admin'],
      message: 'Permission must be one of: read, comment, annotate, edit, admin'
    }
  }],
  joinedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    required: true
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'banned'],
      message: 'Status must be active, inactive, or banned'
    },
    default: 'active',
    required: true
  }
});

const reactionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: {
      values: ['like', 'dislike', 'love', 'laugh', 'angry'],
      message: 'Reaction type must be one of: like, dislike, love, laugh, angry'
    },
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, { _id: false });

const commentSchema = new Schema<IComment>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  threadId: {
    type: String,
    maxlength: [50, 'Thread ID cannot exceed 50 characters']
  },
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: [reactionSchema],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

const annotationReplySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Reply cannot exceed 1000 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, { _id: false });

const annotationSchema = new Schema<IAnnotation>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chartId: {
    type: String,
    required: [true, 'Chart ID is required'],
    maxlength: [100, 'Chart ID cannot exceed 100 characters']
  },
  position: {
    x: {
      type: Number,
      required: true,
      min: [0, 'X position cannot be negative']
    },
    y: {
      type: Number,
      required: true,
      min: [0, 'Y position cannot be negative']
    },
    width: {
      type: Number,
      min: [0, 'Width cannot be negative']
    },
    height: {
      type: Number,
      min: [0, 'Height cannot be negative']
    }
  },
  content: {
    type: String,
    required: [true, 'Annotation content is required'],
    trim: true,
    maxlength: [1000, 'Annotation cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: {
      values: ['note', 'highlight', 'question', 'suggestion'],
      message: 'Annotation type must be one of: note, highlight, question, suggestion'
    },
    required: true,
    default: 'note'
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'resolved', 'archived'],
      message: 'Status must be active, resolved, or archived'
    },
    required: true,
    default: 'active'
  },
  replies: [annotationReplySchema],
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  }
});

const collaborationSchema = new Schema<ICollaboration>({
  resourceType: {
    type: String,
    enum: {
      values: ['dashboard', 'analysis', 'dataset'],
      message: 'Resource type must be dashboard, analysis, or dataset'
    },
    required: [true, 'Resource type is required'],
    index: true
  },
  resourceId: {
    type: Schema.Types.ObjectId,
    required: [true, 'Resource ID is required'],
    index: true
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required'],
    index: true
  },
  participants: [participantSchema],
  comments: [commentSchema],
  annotations: [annotationSchema],
  settings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowAnnotations: {
      type: Boolean,
      default: true
    },
    allowEditing: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true
    },
    expiresAt: {
      type: Date
    }
  },
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be at least 1']
  },
  lastModified: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc: any, ret: any) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
collaborationSchema.index({ resourceType: 1, resourceId: 1 }, { unique: true });
collaborationSchema.index({ ownerId: 1, lastModified: -1 });
collaborationSchema.index({ 'participants.userId': 1 });
collaborationSchema.index({ 'settings.isPublic': 1, lastModified: -1 });
collaborationSchema.index({ 'settings.expiresAt': 1 });

// Virtual for participant count
collaborationSchema.virtual('participantCount').get(function() {
  return this.participants.filter((p: IParticipant) => p.status === 'active').length;
});

// Virtual for comment count
collaborationSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for annotation count
collaborationSchema.virtual('annotationCount').get(function() {
  return this.annotations.filter((a: IAnnotation) => a.status === 'active').length;
});

// Instance method to add participant
collaborationSchema.methods.addParticipant = async function(
  userId: string, 
  permissions: string[]
): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  // Remove existing participant if exists
  this.participants = this.participants.filter(
    (p: IParticipant) => !p.userId.equals(userObjectId)
  );
  
  // Add new participant
  this.participants.push({
    userId: userObjectId,
    permissions,
    joinedAt: new Date(),
    lastActivity: new Date(),
    status: 'active'
  });
  
  this.lastModified = new Date();
  await this.save();
};

// Instance method to remove participant
collaborationSchema.methods.removeParticipant = async function(userId: string): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  this.participants = this.participants.filter(
    (p: IParticipant) => !p.userId.equals(userObjectId)
  );
  this.lastModified = new Date();
  await this.save();
};

// Instance method to update participant permissions
collaborationSchema.methods.updateParticipantPermissions = async function(
  userId: string, 
  permissions: string[]
): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const participant = this.participants.find(
    (p: IParticipant) => p.userId.equals(userObjectId)
  );
  
  if (participant) {
    participant.permissions = permissions;
    participant.lastActivity = new Date();
    this.lastModified = new Date();
    await this.save();
  } else {
    throw new Error('Participant not found');
  }
};

// Instance method to check permissions
collaborationSchema.methods.hasPermission = function(userId: string, permission: string): boolean {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  // Owner has all permissions
  if (this.ownerId.equals(userObjectId)) return true;
  
  const participant = this.participants.find(
    (p: IParticipant) => p.userId.equals(userObjectId) && p.status === 'active'
  );
  
  if (!participant) return false;
  
  return participant.permissions.includes(permission) || participant.permissions.includes('admin');
};

// Instance method to add comment
collaborationSchema.methods.addComment = async function(
  userId: string, 
  content: string, 
  threadId?: string, 
  mentions?: string[]
): Promise<IComment> {
  const newComment = {
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(userId),
    content,
    threadId,
    mentions: mentions ? mentions.map(id => new mongoose.Types.ObjectId(id)) : [],
    reactions: [],
    isEdited: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  this.comments.push(newComment);
  this.lastModified = new Date();
  await this.incrementVersion();
  await this.save();
  
  return newComment as IComment;
};

// Instance method to add annotation
collaborationSchema.methods.addAnnotation = async function(
  userId: string, 
  annotation: Omit<IAnnotation, '_id' | 'userId' | 'createdAt'>
): Promise<IAnnotation> {
  const newAnnotation = {
    ...annotation,
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(userId),
    createdAt: new Date()
  };
  
  this.annotations.push(newAnnotation);
  this.lastModified = new Date();
  await this.incrementVersion();
  await this.save();
  
  return newAnnotation as IAnnotation;
};

// Instance method to increment version
collaborationSchema.methods.incrementVersion = async function(): Promise<void> {
  this.version += 1;
  this.lastModified = new Date();
};

// Instance method to check if collaboration is active
collaborationSchema.methods.isActive = function(): boolean {
  if (this.settings.expiresAt && this.settings.expiresAt < new Date()) {
    return false;
  }
  return true;
};

// Static methods
collaborationSchema.statics.findByResource = function(resourceType: string, resourceId: string) {
  return this.findOne({ resourceType, resourceId });
};

collaborationSchema.statics.findByUser = function(userId: string) {
  return this.find({
    $or: [
      { ownerId: userId },
      { 'participants.userId': userId }
    ]
  }).sort({ lastModified: -1 });
};

collaborationSchema.statics.findPublic = function() {
  return this.find({ 'settings.isPublic': true }).sort({ lastModified: -1 });
};

collaborationSchema.statics.findExpired = function() {
  return this.find({
    'settings.expiresAt': { $lt: new Date() }
  });
};

// Pre-save middleware to clean up expired collaborations
collaborationSchema.pre('save', function(next) {
  if (this.settings.expiresAt && this.settings.expiresAt < new Date()) {
    // Mark as inactive or handle expiration logic
    this.settings.allowComments = false;
    this.settings.allowAnnotations = false;
    this.settings.allowEditing = false;
  }
  next();
});

export const Collaboration = mongoose.model<ICollaboration>('Collaboration', collaborationSchema);