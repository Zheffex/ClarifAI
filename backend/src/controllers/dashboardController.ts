import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Dataset } from '../models/Dataset';
import { AnalysisSession } from '../models/AnalysisSession';
import { Collaboration } from '../models/Collaboration';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

interface DashboardStats {
  totalDatasets: number;
  totalAnalyses: number;
  recentActivity: number;
  collaborations: number;
  dataQualityScore?: number;
  storageUsed?: string;
}

interface RecentActivity {
  _id: string;
  type: 'dataset_uploaded' | 'analysis_created' | 'dataset_shared' | 'analysis_completed';
  title: string;
  description: string;
  timestamp: Date;
  entityId: string;
  entityType: 'dataset' | 'analysis' | 'collaboration';
}

/**
 * Get dashboard statistics for the authenticated user
 */
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Get total datasets count
    const totalDatasets = await Dataset.countDocuments({
      $or: [
        { uploadedBy: userObjectId },
        { 'accessPermissions.userId': userObjectId }
      ]
    });

    // Get total analysis sessions count
    const totalAnalyses = await AnalysisSession.countDocuments({
      userId: userObjectId
    });

    // Get collaborations count (where user is participant)
    const collaborations = await Collaboration.countDocuments({
      $or: [
        { ownerId: userObjectId },
        { 'participants.userId': userObjectId }
      ]
    });

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDatasets = await Dataset.countDocuments({
      $or: [
        { uploadedBy: userObjectId },
        { 'accessPermissions.userId': userObjectId }
      ],
      createdAt: { $gte: thirtyDaysAgo }
    });

    const recentAnalyses = await AnalysisSession.countDocuments({
      userId: userObjectId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const recentActivity = recentDatasets + recentAnalyses;

    // Calculate average data quality score based on processing status
    // We'll use a simple heuristic: ready datasets have good quality
    const allUserDatasets = await Dataset.find({
      $or: [
        { uploadedBy: userObjectId },
        { 'accessPermissions.userId': userObjectId }
      ]
    }).select('processingStatus');
    
    const readyDatasets = allUserDatasets.filter(d => d.processingStatus === 'ready').length;
    const dataQualityScore = allUserDatasets.length > 0 
      ? (readyDatasets / allUserDatasets.length) * 100
      : 0;

    // Calculate storage used (sum of dataset file sizes)
    const datasetsWithSize = await Dataset.find({
      $or: [
        { uploadedBy: userObjectId },
        { 'accessPermissions.userId': userObjectId }
      ]
    }).select('metadata.size');
    const totalBytes = datasetsWithSize.reduce((sum, dataset) => 
      sum + (dataset.metadata?.size || 0), 0
    );
    const storageUsed = formatBytes(totalBytes);

    const stats: DashboardStats = {
      totalDatasets,
      totalAnalyses,
      recentActivity,
      collaborations,
      dataQualityScore: Math.round(dataQualityScore * 10) / 10,
      storageUsed
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    throw new AppError('Failed to fetch dashboard statistics', 500);
  }
};

/**
 * Get recent activity feed for the authenticated user
 */
export const getRecentActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const limit = parseInt(req.query.limit as string) || 20;

    const activities: RecentActivity[] = [];

    // Get recent datasets
    const recentDatasets = await Dataset.find({
      $or: [
        { uploadedBy: userObjectId },
        { 'accessPermissions.userId': userObjectId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('_id name description createdAt uploadedBy');

    recentDatasets.forEach(dataset => {
      activities.push({
        _id: dataset._id.toString(),
        type: 'dataset_uploaded',
        title: `Dataset "${dataset.name}" uploaded`,
        description: dataset.description || 'New dataset added to workspace',
        timestamp: dataset.createdAt,
        entityId: dataset._id.toString(),
        entityType: 'dataset'
      });
    });

    // Get recent analysis sessions
    const recentSessions = await AnalysisSession.find({
      userId: userObjectId
    })
    .sort({ lastActivity: -1 })
    .limit(limit)
    .select('_id title lastActivity');

    recentSessions.forEach(session => {
      activities.push({
        _id: session._id.toString(),
        type: 'analysis_created',
        title: `Analysis "${session.title}" started`,
        description: 'New analysis session created',
        timestamp: session.lastActivity,
        entityId: session._id.toString(),
        entityType: 'analysis'
      });
    });

    // Sort all activities by timestamp and limit
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const limitedActivities = activities.slice(0, limit);

    res.json({
      success: true,
      data: limitedActivities
    });

  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    throw new AppError('Failed to fetch recent activity', 500);
  }
};

/**
 * Get dashboard overview data including stats and recent items
 */
export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Calculate stats directly
    const totalDatasets = await Dataset.countDocuments({
      $or: [
        { uploadedBy: userObjectId },
        { 'accessPermissions.userId': userObjectId }
      ]
    });

    const totalAnalyses = await AnalysisSession.countDocuments({
      userId: userObjectId
    });

    const collaborations = await Collaboration.countDocuments({
      $or: [
        { ownerId: userObjectId },
        { 'participants.userId': userObjectId }
      ]
    });

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDatasets = await Dataset.countDocuments({
      $or: [
        { uploadedBy: userObjectId },
        { 'accessPermissions.userId': userObjectId }
      ],
      createdAt: { $gte: thirtyDaysAgo }
    });

    const recentAnalyses = await AnalysisSession.countDocuments({
      userId: userObjectId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const recentActivity = recentDatasets + recentAnalyses;

    // Calculate average data quality score
    const allUserDatasets = await Dataset.find({
      $or: [
        { uploadedBy: userObjectId },
        { 'accessPermissions.userId': userObjectId }
      ]
    }).select('processingStatus');
    
    const readyDatasets = allUserDatasets.filter(d => d.processingStatus === 'ready').length;
    const dataQualityScore = allUserDatasets.length > 0 
      ? (readyDatasets / allUserDatasets.length) * 100
      : 0;

    // Calculate storage used
    const datasetsWithSize = await Dataset.find({
      $or: [
        { uploadedBy: userObjectId },
        { 'accessPermissions.userId': userObjectId }
      ]
    }).select('metadata.size');
    const totalBytes = datasetsWithSize.reduce((sum, dataset) => 
      sum + (dataset.metadata?.size || 0), 0
    );
    const storageUsed = formatBytes(totalBytes);

    const stats: DashboardStats = {
      totalDatasets,
      totalAnalyses,
      recentActivity,
      collaborations,
      dataQualityScore: Math.round(dataQualityScore * 10) / 10,
      storageUsed
    };

    // Get recent datasets
    const recentDatasetsData = await Dataset.find({
      $or: [
        { uploadedBy: userObjectId },
        { 'accessPermissions.userId': userObjectId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('uploadedBy', 'firstName lastName')
    .select('name description processingStatus metadata createdAt uploadedBy');

    // Get recent analysis sessions
    const recentSessions = await AnalysisSession.find({
      userId: userObjectId
    })
    .sort({ lastActivity: -1 })
    .limit(5)
    .select('title queries visualizations lastActivity');

    res.json({
      success: true,
      data: {
        stats,
        recentDatasets: recentDatasetsData,
        recentSessions
      }
    });

  } catch (error) {
    logger.error('Error fetching dashboard overview:', error);
    throw new AppError('Failed to fetch dashboard overview', 500);
  }
};

/**
 * Helper function to format bytes into human readable format
 */
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}