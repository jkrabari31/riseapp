import express from 'express';
import * as schedulerController from '../controllers/scheduler.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

// Public/Common routes (authenticated)
router.get('/student', authenticateToken, schedulerController.getStudentSchedule);
router.get('/trainer', authenticateToken, schedulerController.getTrainerSchedule);

// Admin/Trainer routes
router.put('/update/:id', authenticateToken, schedulerController.updateSchedule);
router.delete('/delete/:id', authenticateToken, schedulerController.deleteSchedule);
router.get('/', authenticateToken, schedulerController.getSchedules);
router.get('/rooms', authenticateToken, schedulerController.getRooms);
router.get('/slots', authenticateToken, schedulerController.getTimeSlots);
router.get('/batches', authenticateToken, schedulerController.getBatches);
router.get('/specializations', schedulerController.getSpecializations);

router.post('/bulk-create', authenticateToken, schedulerController.bulkCreateSchedule);
router.patch('/update-status/:id', authenticateToken, schedulerController.updateScheduleStatus);

// Metadata CRUD (Admin/Admission Officer only)
router.post('/rooms', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), schedulerController.createRoom);
router.put('/rooms/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), schedulerController.updateRoom);
router.delete('/rooms/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), schedulerController.deleteRoom);

router.post('/specializations', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), schedulerController.createSpecialization);
router.put('/specializations/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), schedulerController.updateSpecialization);
router.delete('/specializations/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), schedulerController.deleteSpecialization);

router.post('/batches', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), schedulerController.createBatch);
router.put('/batches/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), schedulerController.updateBatch);
router.delete('/batches/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), schedulerController.deleteBatch);

router.post('/slots', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), schedulerController.createTimeSlot);
router.delete('/slots/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), schedulerController.deleteTimeSlot);

// Report routes
router.get('/reports/type-hours', authenticateToken, schedulerController.getTypeHoursReport);
router.get('/reports/intern-metrics', authenticateToken, schedulerController.getInternMetricsReport);

export default router;
