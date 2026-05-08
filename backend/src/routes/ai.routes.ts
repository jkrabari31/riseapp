import express from 'express';
import { generateQuiz } from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/generate-quiz', authenticateToken, generateQuiz);

export default router;
