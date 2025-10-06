import { Router } from 'express';
import { 
  chatCompletion, 
  analyzeText, 
  analyzeImage, 
  generateInsights,
  getAIStatus,
  validateChatCompletion,
  validateTextAnalysis,
  validateImageAnalysis,
  validateDataInsights,
  uploadImage,
  handleMulterError
} from '../controllers/aiController';
import { handleValidationErrors } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

// OpenRouter AI endpoints
router.post('/chat-completion', authenticate, validateChatCompletion, handleValidationErrors, chatCompletion);
router.post('/analyze-text', authenticate, validateTextAnalysis, handleValidationErrors, analyzeText);
router.post('/analyze-image', authenticate, uploadImage, handleMulterError, validateImageAnalysis, handleValidationErrors, analyzeImage);
router.post('/generate-insights', authenticate, validateDataInsights, handleValidationErrors, generateInsights);
router.get('/status', getAIStatus);

export default router;