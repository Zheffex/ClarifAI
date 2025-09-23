import { Router } from 'express';
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

const router = Router();

// All routes require authentication
router.use(authenticate);

// Upload new dataset
router.post('/upload',
  requirePermission('datasets:create'),
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
  requirePermission('datasets:delete'),
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