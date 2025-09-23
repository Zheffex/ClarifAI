// Export all models
export { User, IUser } from './User';
export { Dataset, IDataset, IDatasetMetadata, IAccessPermission } from './Dataset';
export { 
  AnalysisSession, 
  IAnalysisSession, 
  IVisualization, 
  IInsight, 
  IPrediction, 
  IQuery 
} from './AnalysisSession';
export { 
  Collaboration, 
  ICollaboration, 
  IParticipant, 
  IComment, 
  IAnnotation 
} from './Collaboration';

// Re-export mongoose types for convenience
export { Types as MongooseTypes } from 'mongoose';