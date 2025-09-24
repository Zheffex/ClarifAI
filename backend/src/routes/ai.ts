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
  handleValidationErrors
} from '../controllers/aiController';

const router = Router();

// OpenRouter AI endpoints
router.post('/chat-completion', validateChatCompletion, handleValidationErrors, chatCompletion);
router.post('/analyze-text', validateTextAnalysis, handleValidationErrors, analyzeText);
router.post('/analyze-image', validateImageAnalysis, handleValidationErrors, analyzeImage);
router.post('/generate-insights', validateDataInsights, handleValidationErrors, generateInsights);
router.get('/status', getAIStatus);

export default router;