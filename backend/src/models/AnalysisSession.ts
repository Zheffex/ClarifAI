import mongoose, { Document, Schema } from 'mongoose';

export interface IVisualization {
  _id: mongoose.Types.ObjectId;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'table' | 'heatmap';
  title: string;
  data: any;
  config: Record<string, any>;
  createdAt: Date;
}

export interface IInsight {
  _id: mongoose.Types.ObjectId;
  type: 'trend' | 'anomaly' | 'correlation' | 'pattern';
  title: string;
  description: string;
  confidence: number;
  supporting_data: any;
  createdAt: Date;
}

export interface IPrediction {
  _id: mongoose.Types.ObjectId;
  type: 'forecast' | 'classification' | 'regression';
  target: string;
  predictions: any[];
  confidence: number;
  metrics: Record<string, number>;
  horizon?: number;
  createdAt: Date;
}

export interface IQuery {
  query: string;
  response: string;
  timestamp: Date;
  processingTime?: number;
  visualizations?: mongoose.Types.ObjectId[];
  insights?: mongoose.Types.ObjectId[];
  error?: string;
}

export interface IAnalysisSession extends Document {
  _id: mongoose.Types.ObjectId;
  datasetId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  queries: IQuery[];
  visualizations: IVisualization[];
  insights: IInsight[];
  predictions: IPrediction[];
  collaborators: mongoose.Types.ObjectId[];
  isShared: boolean;
  shareSettings: {
    allowComments: boolean;
    allowEditing: boolean;
    expiresAt?: Date;
  };
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  addQuery(query: string, response: string, processingTime?: number): Promise<void>;
  addVisualization(visualization: Omit<IVisualization, '_id' | 'createdAt'>): Promise<IVisualization>;
  addInsight(insight: Omit<IInsight, '_id' | 'createdAt'>): Promise<IInsight>;
  addPrediction(prediction: Omit<IPrediction, '_id' | 'createdAt'>): Promise<IPrediction>;
  addCollaborator(userId: string): Promise<void>;
  removeCollaborator(userId: string): Promise<void>;
  hasAccess(userId: string): boolean;
  updateActivity(): Promise<void>;
}

const visualizationSchema = new Schema<IVisualization>({
  type: {
    type: String,
    enum: {
      values: ['bar', 'line', 'pie', 'scatter', 'table', 'heatmap'],
      message: 'Visualization type must be one of: bar, line, pie, scatter, table, heatmap'
    },
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Visualization title cannot exceed 200 characters']
  },
  data: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(v: any) {
        return v !== null && v !== undefined;
      },
      message: 'Visualization data is required'
    }
  },
  config: {
    type: Schema.Types.Mixed,
    default: {},
    validate: {
      validator: function(v: any) {
        return typeof v === 'object' && v !== null;
      },
      message: 'Config must be an object'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const insightSchema = new Schema<IInsight>({
  type: {
    type: String,
    enum: {
      values: ['trend', 'anomaly', 'correlation', 'pattern'],
      message: 'Insight type must be one of: trend, anomaly, correlation, pattern'
    },
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Insight title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Insight description cannot exceed 2000 characters']
  },
  confidence: {
    type: Number,
    required: true,
    min: [0, 'Confidence cannot be negative'],
    max: [1, 'Confidence cannot exceed 1']
  },
  supporting_data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const predictionSchema = new Schema<IPrediction>({
  type: {
    type: String,
    enum: {
      values: ['forecast', 'classification', 'regression'],
      message: 'Prediction type must be one of: forecast, classification, regression'
    },
    required: true
  },
  target: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Target cannot exceed 100 characters']
  },
  predictions: {
    type: [{type: Schema.Types.Mixed}],
    required: true,
    validate: {
      validator: function(v: any[]) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Predictions array cannot be empty'
    }
  },
  confidence: {
    type: Number,
    required: true,
    min: [0, 'Confidence cannot be negative'],
    max: [1, 'Confidence cannot exceed 1']
  },
  metrics: {
    type: Schema.Types.Mixed,
    default: {},
    validate: {
      validator: function(v: any) {
        return typeof v === 'object' && v !== null;
      },
      message: 'Metrics must be an object'
    }
  },
  horizon: {
    type: Number,
    min: [1, 'Horizon must be at least 1']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const querySchema = new Schema<IQuery>({
  query: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Query cannot exceed 2000 characters']
  },
  response: {
    type: String,
    required: true,
    maxlength: [10000, 'Response cannot exceed 10000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  processingTime: {
    type: Number,
    min: [0, 'Processing time cannot be negative']
  },
  visualizations: [{
    type: Schema.Types.ObjectId,
    ref: 'Visualization'
  }],
  insights: [{
    type: Schema.Types.ObjectId,
    ref: 'Insight'
  }],
  error: {
    type: String,
    maxlength: [1000, 'Error message cannot exceed 1000 characters']
  }
}, { _id: false });

const analysisSessionSchema = new Schema<IAnalysisSession>({
  datasetId: {
    type: Schema.Types.ObjectId,
    ref: 'Dataset',
    required: [true, 'Dataset ID is required'],
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Session title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  queries: [querySchema],
  visualizations: [visualizationSchema],
  insights: [insightSchema],
  predictions: [predictionSchema],
  collaborators: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  isShared: {
    type: Boolean,
    default: false,
    index: true
  },
  shareSettings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowEditing: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date
    }
  },
  lastActivity: {
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
analysisSessionSchema.index({ userId: 1, lastActivity: -1 });
analysisSessionSchema.index({ datasetId: 1, createdAt: -1 });
analysisSessionSchema.index({ collaborators: 1 });
analysisSessionSchema.index({ isShared: 1, lastActivity: -1 });
analysisSessionSchema.index({ title: 'text' });

// Virtual for query count
analysisSessionSchema.virtual('queryCount').get(function() {
  return this.queries.length;
});

// Instance method to add query
analysisSessionSchema.methods.addQuery = async function(
  query: string, 
  response: string, 
  processingTime?: number
): Promise<void> {
  this.queries.push({
    query,
    response,
    timestamp: new Date(),
    processingTime
  });
  this.lastActivity = new Date();
  await this.save();
};

// Instance method to add visualization
analysisSessionSchema.methods.addVisualization = async function(
  visualization: Omit<IVisualization, '_id' | 'createdAt'>
): Promise<IVisualization> {
  const newViz = {
    ...visualization,
    _id: new mongoose.Types.ObjectId(),
    createdAt: new Date()
  };
  this.visualizations.push(newViz);
  this.lastActivity = new Date();
  await this.save();
  return newViz as IVisualization;
};

// Instance method to add insight
analysisSessionSchema.methods.addInsight = async function(
  insight: Omit<IInsight, '_id' | 'createdAt'>
): Promise<IInsight> {
  const newInsight = {
    ...insight,
    _id: new mongoose.Types.ObjectId(),
    createdAt: new Date()
  };
  this.insights.push(newInsight);
  this.lastActivity = new Date();
  await this.save();
  return newInsight as IInsight;
};

// Instance method to add prediction
analysisSessionSchema.methods.addPrediction = async function(
  prediction: Omit<IPrediction, '_id' | 'createdAt'>
): Promise<IPrediction> {
  const newPrediction = {
    ...prediction,
    _id: new mongoose.Types.ObjectId(),
    createdAt: new Date()
  };
  this.predictions.push(newPrediction);
  this.lastActivity = new Date();
  await this.save();
  return newPrediction as IPrediction;
};

// Instance method to add collaborator
analysisSessionSchema.methods.addCollaborator = async function(userId: string): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  if (!this.collaborators.some((id: mongoose.Types.ObjectId) => id.equals(userObjectId))) {
    this.collaborators.push(userObjectId);
    this.lastActivity = new Date();
    await this.save();
  }
};

// Instance method to remove collaborator
analysisSessionSchema.methods.removeCollaborator = async function(userId: string): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  this.collaborators = this.collaborators.filter((id: mongoose.Types.ObjectId) => !id.equals(userObjectId));
  this.lastActivity = new Date();
  await this.save();
};

// Instance method to check access
analysisSessionSchema.methods.hasAccess = function(userId: string): boolean {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  return this.userId.equals(userObjectId) || 
         this.collaborators.some((id: mongoose.Types.ObjectId) => id.equals(userObjectId)) ||
         this.isShared;
};

// Instance method to update activity
analysisSessionSchema.methods.updateActivity = async function(): Promise<void> {
  this.lastActivity = new Date();
  await this.save();
};

// Static methods
analysisSessionSchema.statics.findByUser = function(userId: string) {
  return this.find({
    $or: [
      { userId },
      { collaborators: userId },
      { isShared: true }
    ]
  }).sort({ lastActivity: -1 });
};

analysisSessionSchema.statics.findByDataset = function(datasetId: string) {
  return this.find({ datasetId }).sort({ lastActivity: -1 });
};

analysisSessionSchema.statics.findShared = function() {
  return this.find({ isShared: true }).sort({ lastActivity: -1 });
};

analysisSessionSchema.statics.findRecent = function(userId: string, limit: number = 10) {
  return this.find({
    $or: [
      { userId },
      { collaborators: userId }
    ]
  }).sort({ lastActivity: -1 }).limit(limit);
};

export const AnalysisSession = mongoose.model<IAnalysisSession>('AnalysisSession', analysisSessionSchema);