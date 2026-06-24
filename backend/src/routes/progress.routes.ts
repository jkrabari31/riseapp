import express from 'express';
import { getProgressData, saveProgressData, getBatchAssessments } from '../controllers/progress.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

// Allow admins and perhaps trainers to manage progress reports
router.get('/:batchId', requireRole(['SUPER_ADMIN', 'ADMIN']), getProgressData);
router.post('/:batchId', requireRole(['SUPER_ADMIN', 'ADMIN']), saveProgressData);
router.get('/assessments/:batchId', requireRole(['SUPER_ADMIN', 'ADMIN']), getBatchAssessments);

export default router;
