import { Router } from 'express';
import multer from 'multer';
import {
  uploadDataset,
  getDatasets,
  getDatasetById,
  updateDataset,
  deleteDataset,
  getDatasetPreview,
  shareDataset,
  removeDatasetAccess,
  validateDatasetUpload,
  validateDatasetUpdate,
  validateDatasetShare,
  validatePagination,
  handleValidationErrors
} from '../controllers/datasetController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { env } from '../config/environment';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.fileUpload.maxSize // Use environment config for file size limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/json', 
                         'application/vnd.ms-excel',
                         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const allowedExtensions = ['csv', 'json', 'xlsx', 'xls'];
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(extension || '')) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported. Please upload CSV, JSON, or Excel files.'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Upload new dataset
router.post('/upload',
  requirePermission('datasets:create'),
  upload.single('file'),
  validateDatasetUpload,
  handleValidationErrors,
  uploadDataset
);

// Get user's datasets
router.get('/',
  requirePermission('datasets:read'),
  validatePagination,
  handleValidationErrors,
  getDatasets
);

// Get dataset by ID
router.get('/:id',
  requirePermission('datasets:read'),
  getDatasetById
);

// Update dataset metadata
router.put('/:id',
  requirePermission('datasets:update'),
  validateDatasetUpdate,
  handleValidationErrors,
  updateDataset
);

// Delete dataset
router.delete('/:id',
  // Custom authorization: admin users OR dataset owners
  async (req, res, next) => {
    try {
      const user = req.user as any;
      if (!user) {
        throw new Error('Authentication required');
      }
      
      // Admin users can delete any dataset
      if (user.role === 'admin') {
        return next();
      }
      
      // For non-admin users, check if they own the dataset
      const { Dataset } = await import('../models/Dataset');
      const dataset = await Dataset.findById(req.params.id);
      
      if (!dataset) {
        throw new Error('Dataset not found');
      }
      
      // Check if user is the owner
      if (dataset.uploadedBy.toString() === user._id.toString()) {
        return next();
      }
      
      throw new Error('Access denied. You can only delete your own datasets or need admin privileges');
    } catch (error: any) {
      const { AppError } = await import('../middleware/errorHandler');
      next(new AppError(error.message, 403));
    }
  },
  deleteDataset
);

// Get dataset preview
router.get('/:id/preview',
  requirePermission('datasets:read'),
  getDatasetPreview
);

// Share dataset with user
router.post('/:id/share',
  requirePermission('datasets:update'),
  validateDatasetShare,
  handleValidationErrors,
  shareDataset
);

// Remove dataset access
router.delete('/:id/access/:userId',
  requirePermission('datasets:update'),
  removeDatasetAccess
);

export default router;