import express from 'express';
import * as exportController from '../controllers/export.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/students', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), exportController.exportStudents);
router.get('/assessments', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), exportController.exportAssessments);
router.get('/schedules', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), exportController.exportSchedules);
router.get('/fees', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), exportController.exportFees);
router.get('/attendance', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), exportController.exportAttendance);

export default router;
