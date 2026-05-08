import express from 'express';
import * as yearController from '../controllers/academicYear.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/', authenticateToken, yearController.listYears);
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN']), yearController.createYear);
router.patch('/:id', authenticateToken, requireRole(['SUPER_ADMIN']), yearController.updateYear);
router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN']), yearController.deleteYear);

export default router;
