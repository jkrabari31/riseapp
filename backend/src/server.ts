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
import readingMaterialRoutes from './routes/readingMaterial.routes';
import leadsRoutes from './routes/leads.routes';
import { authenticateToken } from './middleware/auth.middleware';

const app = express();
export const prisma = new PrismaClient();

// ✅ Fix 1: Read PORT from Azure environment
const PORT = process.env.PORT || 8080;

// ✅ Fix 2: Restrict CORS to your frontend domain
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Public Routes
app.use('/api/auth', authRoutes);
app.use('/api/admissions', admissionRoutes);

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
app.use('/api/reading-materials', readingMaterialRoutes);
app.use('/api/leads', authenticateToken, leadsRoutes);

// Health check — Azure uses this to verify app is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RISE Backend Running' });
});

// ✅ Fix 3: Graceful shutdown for Prisma
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`AI Configuration: ${process.env.GEMINI_API_KEY ? 'AUTHENTICATED' : 'NOT CONFIGURED'}`);
});