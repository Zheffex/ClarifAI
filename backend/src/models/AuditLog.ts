import mongoose, { Document, Schema } from 'mongoose';

// Helper functions
function calculateRiskLevel(action: string, details: any): string {
  if (action.includes('delete') || action.includes('admin') || details.dataSize > 1000000) {
    return 'critical';
  }
  if (action.includes('update') || action.includes('create') || details.accessType === 'bulk') {
    return 'high';
  }
  if (action.includes('export') || action.includes('download')) {
    return 'medium';
  }
  return 'low';
}

function getComplianceRequirements(resourceType: string, action: string): string[] {
  const requirements = ['GDPR']; // Always include GDPR for EU compliance
  
  if (resourceType === 'user' || action.includes('personal')) {
    requirements.push('GDPR');
  }
  
  if (action.includes('financial') || resourceType === 'payment') {
    requirements.push('SOX', 'PCI-DSS');
  }
  
  if (resourceType === 'medical' || action.includes('health')) {
    requirements.push('HIPAA');
  }
  
  requirements.push('ISO27001'); // General information security
  
  return [...new Set(requirements)]; // Remove duplicates
}

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  action: string;
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_config' | 'user_management' | 'file_operation' | 'security';
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  userRole?: string;
  targetType?: 'user' | 'dataset' | 'analysis' | 'collaboration' | 'notification' | 'system';
  targetId?: mongoose.Types.ObjectId;
  resourceId?: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  details: Record<string, any>;
  metadata: {
    sessionId?: string;
    correlationId?: string;
    duration?: number;
    dataSize?: number;
    errorCode?: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    compliance: string[];
  };
  timestamp: Date;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    maxlength: [100, 'Action cannot exceed 100 characters'],
    index: true
  },
  category: {
    type: String,
    enum: {
      values: ['authentication', 'authorization', 'data_access', 'data_modification', 'system_config', 'user_management', 'file_operation', 'security'],
      message: 'Category must be one of: authentication, authorization, data_access, data_modification, system_config, user_management, file_operation, security'
    },
    required: [true, 'Category is required'],
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userEmail: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  userRole: {
    type: String,
    enum: ['admin', 'analyst', 'viewer'],
    index: true
  },
  targetType: {
    type: String,
    enum: ['user', 'dataset', 'analysis', 'collaboration', 'notification', 'system'],
    index: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  resourceId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  ipAddress: {
    type: String,
    trim: true,
    index: true
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    index: true
  },
  endpoint: {
    type: String,
    trim: true,
    maxlength: [200, 'Endpoint cannot exceed 200 characters'],
    index: true
  },
  statusCode: {
    type: Number,
    min: [100, 'Status code must be at least 100'],
    max: [599, 'Status code cannot exceed 599'],
    index: true
  },
  details: {
    type: Schema.Types.Mixed,
    default: {},
    validate: {
      validator: function(v: any) {
        return typeof v === 'object' && v !== null;
      },
      message: 'Details must be an object'
    }
  },
  metadata: {
    sessionId: String,
    correlationId: String,
    duration: {
      type: Number,
      min: [0, 'Duration cannot be negative']
    },
    dataSize: {
      type: Number,
      min: [0, 'Data size cannot be negative']
    },
    errorCode: String,
    riskLevel: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'critical'],
        message: 'Risk level must be low, medium, high, or critical'
      },
      default: 'low',
      required: true,
      index: true
    },
    compliance: [{
      type: String,
      trim: true,
      enum: ['GDPR', 'SOX', 'HIPAA', 'PCI-DSS', 'ISO27001']
    }]
  },
  timestamp: {
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

// Indexes for performance and queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ organizationId: 1, timestamp: -1 });
auditLogSchema.index({ 'metadata.riskLevel': 1, timestamp: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });
auditLogSchema.index({ endpoint: 1, method: 1, timestamp: -1 });

// TTL index for automatic cleanup (keep logs for 7 years for compliance)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 });

// Static method to log authentication events
auditLogSchema.statics.logAuthEvent = async function(
  userId: string, 
  action: string, 
  details: any, 
  req?: any
): Promise<IAuditLog> {
  const auditLog = new this({
    action,
    category: 'authentication',
    userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    userEmail: details.email,
    userRole: details.role,
    ipAddress: req?.ip || req?.connection?.remoteAddress,
    userAgent: req?.get('User-Agent'),
    method: req?.method,
    endpoint: req?.originalUrl || req?.url,
    statusCode: details.statusCode,
    details: {
      ...details,
      email: undefined, // Remove from details to avoid duplication
      role: undefined
    },
    metadata: {
      sessionId: req?.sessionID,
      correlationId: req?.headers['x-correlation-id'],
      riskLevel: action.includes('failed') || action.includes('blocked') ? 'high' : 'low',
      compliance: ['GDPR', 'SOX']
    },
    timestamp: new Date()
  });

  await auditLog.save();
  return auditLog;
};

// Static method to log data access events
auditLogSchema.statics.logDataAccess = async function(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: string,
  details: any,
  req?: any
): Promise<IAuditLog> {
  const user = details.user || {};
  
  const auditLog = new this({
    action,
    category: action.includes('create') || action.includes('update') || action.includes('delete') ? 'data_modification' : 'data_access',
    userId: new mongoose.Types.ObjectId(userId),
    userEmail: user.email,
    userRole: user.role,
    targetType: resourceType,
    targetId: new mongoose.Types.ObjectId(resourceId),
    resourceId: new mongoose.Types.ObjectId(resourceId),
    organizationId: user.organizationId ? new mongoose.Types.ObjectId(user.organizationId) : undefined,
    ipAddress: req?.ip || req?.connection?.remoteAddress,
    userAgent: req?.get('User-Agent'),
    method: req?.method,
    endpoint: req?.originalUrl || req?.url,
    statusCode: details.statusCode,
    details: {
      resourceName: details.resourceName,
      previousValues: details.previousValues,
      newValues: details.newValues,
      accessType: details.accessType,
      dataSize: details.dataSize
    },
    metadata: {
      sessionId: req?.sessionID,
      correlationId: req?.headers['x-correlation-id'],
      duration: details.duration,
      dataSize: details.dataSize,
      riskLevel: calculateRiskLevel(action, details),
      compliance: getComplianceRequirements(resourceType, action)
    },
    timestamp: new Date()
  });

  await auditLog.save();
  return auditLog;
};

// Static method to log security events
auditLogSchema.statics.logSecurityEvent = async function(
  action: string,
  details: any,
  req?: any
): Promise<IAuditLog> {
  const auditLog = new this({
    action,
    category: 'security',
    userId: details.userId ? new mongoose.Types.ObjectId(details.userId) : undefined,
    userEmail: details.userEmail,
    userRole: details.userRole,
    ipAddress: req?.ip || req?.connection?.remoteAddress || details.ipAddress,
    userAgent: req?.get('User-Agent'),
    method: req?.method,
    endpoint: req?.originalUrl || req?.url,
    statusCode: details.statusCode,
    details: {
      threat: details.threat,
      severity: details.severity,
      blocked: details.blocked,
      reason: details.reason,
      additionalInfo: details.additionalInfo
    },
    metadata: {
      sessionId: req?.sessionID,
      correlationId: req?.headers['x-correlation-id'] || details.correlationId,
      riskLevel: details.severity || 'high',
      compliance: ['GDPR', 'SOX', 'ISO27001']
    },
    timestamp: new Date()
  });

  await auditLog.save();
  return auditLog;
};

// Static method to get audit trail with filters
auditLogSchema.statics.getAuditTrail = async function(filters: any): Promise<IAuditLog[]> {
  const {
    userId,
    organizationId,
    category,
    action,
    startDate,
    endDate,
    riskLevel,
    limit = 100,
    offset = 0
  } = filters;

  const query: any = {};

  if (userId) query.userId = userId;
  if (organizationId) query.organizationId = organizationId;
  if (category) query.category = category;
  if (action) query.action = new RegExp(action, 'i');
  if (riskLevel) query['metadata.riskLevel'] = riskLevel;
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query)
    .populate('userId', 'firstName lastName email role')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .lean();
};

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);