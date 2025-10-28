import mongoose, { Document, Schema } from 'mongoose';

export interface IDatasetMetadata {
  size: number;
  type: string;
  rows?: number;
  columns?: number;
  encoding?: string;
  delimiter?: string;
  headers?: string[];
}

export interface IAccessPermission {
  userId: mongoose.Types.ObjectId;
  permission: 'read' | 'write' | 'admin';
  grantedAt: Date;
  grantedBy: mongoose.Types.ObjectId;
}

export interface IDataset extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  fileId: mongoose.Types.ObjectId; // GridFS file reference
  uploadedBy: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  dataSchema: Record<string, any>;
  metadata: IDatasetMetadata;
  processingStatus: 'pending' | 'processing' | 'ready' | 'failed' | 'error';
  processingError?: string;
  tags: string[];
  isPublic: boolean;
  accessPermissions: IAccessPermission[];
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  hasUserAccess(userId: string, permission?: string): boolean;
  addUserAccess(userId: string, permission: string, grantedBy: string): Promise<void>;
  removeUserAccess(userId: string): Promise<void>;
  isReadyForAnalysis(): boolean;
}

const accessPermissionSchema = new Schema<IAccessPermission>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permission: {
    type: String,
    enum: {
      values: ['read', 'write', 'admin'],
      message: 'Permission must be read, write, or admin'
    },
    required: true,
    default: 'read'
  },
  grantedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  grantedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const datasetMetadataSchema = new Schema<IDatasetMetadata>({
  size: {
    type: Number,
    required: true,
    min: [0, 'File size cannot be negative']
  },
  type: {
    type: String,
    required: true,
    enum: {
      values: ['csv', 'json', 'xlsx', 'tsv', 'parquet'],
      message: 'File type must be one of: csv, json, xlsx, tsv, parquet'
    }
  },
  rows: {
    type: Number,
    min: [0, 'Row count cannot be negative']
  },
  columns: {
    type: Number,
    min: [0, 'Column count cannot be negative']
  },
  encoding: {
    type: String,
    default: 'utf-8'
  },
  delimiter: {
    type: String,
    default: ','
  },
  headers: [{
    type: String,
    trim: true
  }]
}, { _id: false });

const datasetSchema = new Schema<IDataset>({
  name: {
    type: String,
    required: [true, 'Dataset name is required'],
    trim: true,
    maxlength: [100, 'Dataset name cannot exceed 100 characters'],
    minlength: [2, 'Dataset name must be at least 2 characters long']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  fileId: {
    type: Schema.Types.ObjectId,
    required: [true, 'File ID is required']
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader ID is required']
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required']
  },
  dataSchema: {
    type: Schema.Types.Mixed,
    default: {},
    validate: {
      validator: function(v: any) {
        return typeof v === 'object' && v !== null;
      },
      message: 'Data schema must be an object'
    }
  },
  metadata: {
    type: datasetMetadataSchema,
    required: true
  },
  processingStatus: {
    type: String,
    enum: {
      values: ['pending', 'processing', 'ready', 'failed', 'error'],
      message: 'Processing status must be pending, processing, ready, failed, or error'
    },
    required: true,
    default: 'pending'
  },
  processingError: {
    type: String,
    required: false
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  isPublic: {
    type: Boolean,
    default: false,
    required: true
  },
  accessPermissions: [accessPermissionSchema]
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
datasetSchema.index({ name: 'text', description: 'text', tags: 'text' });
datasetSchema.index({ createdAt: -1 });
datasetSchema.index({ updatedAt: -1 });
datasetSchema.index({ 'accessPermissions.userId': 1 });
datasetSchema.index({ uploadedBy: 1, createdAt: -1 });
datasetSchema.index({ organizationId: 1, isPublic: 1 });

// Instance method to check user access
datasetSchema.methods.hasUserAccess = function(userId: string, permission: string = 'read'): boolean {
  // Owner has full access
  if (this.uploadedBy.toString() === userId) return true;
  
  // Check if dataset is public (for read access)
  if (this.isPublic && permission === 'read') return true;
  
  // Check explicit permissions
  const userPermission = this.accessPermissions.find(
    (perm: IAccessPermission) => perm.userId.toString() === userId
  );
  
  if (!userPermission) return false;
  
  // Check permission hierarchy: admin > write > read
  const permissionLevels = { read: 1, write: 2, admin: 3 };
  const requiredLevel = permissionLevels[permission as keyof typeof permissionLevels] || 1;
  const userLevel = permissionLevels[userPermission.permission as keyof typeof permissionLevels] || 1;
  
  return userLevel >= requiredLevel;
};

// Instance method to add user access
datasetSchema.methods.addUserAccess = async function(
  userId: string, 
  permission: string, 
  grantedBy: string
): Promise<void> {
  // Remove existing permission for this user
  this.accessPermissions = this.accessPermissions.filter(
    (perm: IAccessPermission) => perm.userId.toString() !== userId
  );
  
  // Add new permission
  this.accessPermissions.push({
    userId: new mongoose.Types.ObjectId(userId),
    permission,
    grantedAt: new Date(),
    grantedBy: new mongoose.Types.ObjectId(grantedBy)
  });
  
  await this.save();
};

// Instance method to remove user access
datasetSchema.methods.removeUserAccess = async function(userId: string): Promise<void> {
  this.accessPermissions = this.accessPermissions.filter(
    (perm: IAccessPermission) => perm.userId.toString() !== userId
  );
  await this.save();
};

// Instance method to check if dataset is ready for analysis
datasetSchema.methods.isReadyForAnalysis = function(): boolean {
  return this.processingStatus === 'ready';
};

// Static methods
datasetSchema.statics.findByUser = function(userId: string) {
  return this.find({
    $or: [
      { uploadedBy: userId },
      { isPublic: true },
      { 'accessPermissions.userId': userId }
    ]
  });
};

datasetSchema.statics.findByOrganization = function(organizationId: string) {
  return this.find({ organizationId });
};

datasetSchema.statics.findPublic = function() {
  return this.find({ isPublic: true, processingStatus: 'ready' });
};

datasetSchema.statics.findByStatus = function(status: string) {
  return this.find({ processingStatus: status });
};

datasetSchema.statics.searchDatasets = function(query: string, userId?: string) {
  const searchQuery: any = {
    $text: { $search: query },
    processingStatus: 'ready'
  };
  
  if (userId) {
    searchQuery.$or = [
      { uploadedBy: userId },
      { isPublic: true },
      { 'accessPermissions.userId': userId }
    ];
  } else {
    searchQuery.isPublic = true;
  }
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

export const Dataset = mongoose.model<IDataset>('Dataset', datasetSchema);