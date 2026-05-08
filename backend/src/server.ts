import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';

// Routes
import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import attendanceRoutes from './routes/attendance.routes';
import feeRoutes from './routes/fee.routes';
import admissionRoutes from './routes/admission.routes';
import teacherRoutes from './routes/teacher.routes';
import dashboardRoutes from './routes/dashboard.routes';
import announcementRoutes from './routes/announcement.routes';
import subjectRoutes from './routes/subject.routes';
import searchRoutes from './routes/search.routes';
import notificationRoutes from './routes/notification.routes';
import settingsRoutes from './routes/settings.routes';
import timetableRoutes from './routes/timetable.routes';
import assignmentRoutes from './routes/assignment.routes';
import quizRoutes from './routes/quiz.routes';
import aiRoutes from './routes/ai.routes';
import schedulerRoutes from './routes/scheduler.routes';
import ceoRoutes from './routes/ceo.routes';
import exportRoutes from './routes/export.routes';
import academicYearRoutes from './routes/academicYear.routes';
import { authenticateToken } from './middleware/auth.middleware';

// dotenv.config(); (moved to top)

const app = express();
export const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(compression()); // Gzip all responses — significant size reduction for JSON payloads
app.use(express.json({ limit: '10mb' })); // Prevent accidental large payload processing

// Public Routes
app.use('/api/auth', authRoutes);
app.use('/api/admissions', admissionRoutes); // This route has both public and private sub-routes

// Protected Routes
app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/attendance', authenticateToken, attendanceRoutes);
app.use('/api/fees', authenticateToken, feeRoutes);
app.use('/api/teachers', authenticateToken, teacherRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/announcements', authenticateToken, announcementRoutes);
app.use('/api/subjects', authenticateToken, subjectRoutes);
app.use('/api/search', authenticateToken, searchRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/timetable', authenticateToken, timetableRoutes);
app.use('/api/assignments', authenticateToken, assignmentRoutes);
app.use('/api/quizzes', authenticateToken, quizRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/scheduler', schedulerRoutes);

app.use('/api/ceo', authenticateToken, ceoRoutes);
app.use('/api/export', authenticateToken, exportRoutes);
app.use('/api/academic-years', authenticateToken, academicYearRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'RISE Backend Running' });
});

 
// Backend reloaded
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`AI Configuration Status: ${process.env.GEMINI_API_KEY ? 'AUTHENTICATED' : 'NOT CONFIGURED'}`);
});
