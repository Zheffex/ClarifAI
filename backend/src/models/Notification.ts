import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  anomalyDetection: boolean;
  dataChanges: boolean;
  collaborationUpdates: boolean;
  systemAlerts: boolean;
  frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
}

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'data_change' | 'anomaly_detected' | 'collaboration_update' | 'system_alert' | 'analysis_complete' | 'prediction_ready' | 'info';
  title: string;
  message: string;
  metadata: {
    datasetId?: mongoose.Types.ObjectId;
    sessionId?: mongoose.Types.ObjectId;
    collaborationId?: mongoose.Types.ObjectId;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    actionUrl?: string;
    relatedData?: Record<string, any>;
  };
  channels: {
    email: {
      sent: boolean;
      sentAt?: Date;
      emailId?: string;
      error?: string;
    };
    push: {
      sent: boolean;
      sentAt?: Date;
      pushId?: string;
      error?: string;
    };
    inApp: {
      sent: boolean;
      sentAt?: Date;
      read: boolean;
      readAt?: Date;
    };
  };
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  scheduledFor?: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  markAsRead(): Promise<void>;
  markChannelAsSent(channel: 'email' | 'push' | 'inApp', metadata?: Record<string, any>): Promise<void>;
  markChannelAsFailed(channel: 'email' | 'push' | 'inApp', error: string): Promise<void>;
  isExpired(): boolean;
  canSendToChannel(channel: 'email' | 'push' | 'inApp'): boolean;
}

export interface INotificationTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  subject: string;
  emailTemplate: string;
  pushTemplate: string;
  inAppTemplate: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationChannelSchema = new Schema({
  sent: {
    type: Boolean,
    default: false,
    required: true
  },
  sentAt: {
    type: Date
  },
  emailId: String,
  pushId: String,
  error: String,
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, { _id: false });

const notificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    enum: {
      values: ['data_change', 'anomaly_detected', 'collaboration_update', 'system_alert', 'analysis_complete', 'prediction_ready', 'info'],
      message: 'Notification type must be one of: data_change, anomaly_detected, collaboration_update, system_alert, analysis_complete, prediction_ready, info'
    },
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  metadata: {
    datasetId: {
      type: Schema.Types.ObjectId,
      ref: 'Dataset'
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'AnalysisSession'
    },
    collaborationId: {
      type: Schema.Types.ObjectId,
      ref: 'Collaboration'
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    actionUrl: String,
    relatedData: Schema.Types.Mixed
  },
  channels: {
    email: notificationChannelSchema,
    push: notificationChannelSchema,
    inApp: notificationChannelSchema
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'sent', 'failed', 'cancelled'],
      message: 'Status must be pending, sent, failed, or cancelled'
    },
    default: 'pending',
    required: true
  },
  scheduledFor: {
    type: Date
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'normal', 'high', 'urgent'],
      message: 'Priority must be low, normal, high, or urgent'
    },
    default: 'normal',
    required: true
  },
  expiresAt: {
    type: Date
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
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
// expiresAt index with TTL (expireAfterSeconds is only supported in separate index)
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ 'channels.inApp.read': 1, userId: 1 });

// Instance method to mark notification as read
notificationSchema.methods.markAsRead = async function(): Promise<void> {
  this.channels.inApp.read = true;
  this.channels.inApp.readAt = new Date();
  await this.save();
};

// Instance method to mark channel as sent
notificationSchema.methods.markChannelAsSent = async function(
  channel: 'email' | 'push' | 'inApp', 
  metadata: Record<string, any> = {}
): Promise<void> {
  this.channels[channel].sent = true;
  this.channels[channel].sentAt = new Date();
  
  if (metadata.emailId) this.channels[channel].emailId = metadata.emailId;
  if (metadata.pushId) this.channels[channel].pushId = metadata.pushId;
  
  // Update overall status if all required channels are sent
  const channelValues = Object.values(this.channels);
  const allSent = channelValues.every((ch: any) => ch.sent || !this.canSendToChannel(channel));
  if (allSent) {
    this.status = 'sent';
  }
  
  await this.save();
};

// Instance method to mark channel as failed
notificationSchema.methods.markChannelAsFailed = async function(
  channel: 'email' | 'push' | 'inApp', 
  error: string
): Promise<void> {
  this.channels[channel].error = error;
  
  // Check if all channels failed
  const channelValues = Object.values(this.channels);
  const allFailed = channelValues.every((ch: any) => ch.error || ch.sent);
  if (allFailed && !channelValues.some((ch: any) => ch.sent)) {
    this.status = 'failed';
  }
  
  await this.save();
};

// Instance method to check if notification is expired
notificationSchema.methods.isExpired = function(): boolean {
  return this.expiresAt ? new Date() > this.expiresAt : false;
};

// Instance method to check if can send to channel
notificationSchema.methods.canSendToChannel = function(channel: 'email' | 'push' | 'inApp'): boolean {
  return !this.channels[channel].sent && !this.channels[channel].error && !this.isExpired();
};

// Notification template schema
const notificationTemplateSchema = new Schema<INotificationTemplate>({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Template type is required']
  },
  subject: {
    type: String,
    required: [true, 'Template subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  emailTemplate: {
    type: String,
    required: [true, 'Email template is required']
  },
  pushTemplate: {
    type: String,
    required: [true, 'Push template is required'],
    maxlength: [500, 'Push template cannot exceed 500 characters']
  },
  inAppTemplate: {
    type: String,
    required: [true, 'In-app template is required'],
    maxlength: [1000, 'In-app template cannot exceed 1000 characters']
  },
  variables: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true,
    required: true
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

// Static methods for notifications
notificationSchema.statics.findUnreadByUser = function(userId: string) {
  return this.find({
    userId,
    'channels.inApp.read': false,
    status: { $ne: 'cancelled' }
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findPendingNotifications = function() {
  return this.find({
    status: 'pending',
    $or: [
      { scheduledFor: { $lte: new Date() } },
      { scheduledFor: { $exists: false } }
    ]
  }).sort({ priority: -1, createdAt: 1 });
};

notificationSchema.statics.markAllAsReadForUser = async function(userId: string) {
  return this.updateMany(
    { 
      userId,
      'channels.inApp.read': false 
    },
    { 
      $set: {
        'channels.inApp.read': true,
        'channels.inApp.readAt': new Date()
      }
    }
  );
};

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
export const NotificationTemplate = mongoose.model<INotificationTemplate>('NotificationTemplate', notificationTemplateSchema);