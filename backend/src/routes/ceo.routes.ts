import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../server';

const router = Router();

// Get CEO High-Level Metrics
router.get('/metrics', authenticateToken, requireRole(['CEO', 'SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { startDate, endDate, batchId } = req.query;

        // --- 1. Filter Construction ---
        // Global Date Filter (applied to events like Attendance, Fees, Assessments, Sessions)
        const eventDateFilter: any = {};
        if (startDate && endDate) {
            eventDateFilter.gte = new Date(startDate as string);
            eventDateFilter.lte = new Date(endDate as string);
            eventDateFilter.lte.setHours(23, 59, 59, 999);
        }

        // Student Date Filter (applied to createdAt for demographic growth filtering)
        const studentDateFilter: any = {};
        if (startDate && endDate) {
            studentDateFilter.gte = new Date(startDate as string);
            studentDateFilter.lte = new Date(endDate as string);
            studentDateFilter.lte.setHours(23, 59, 59, 999);
        }

        const studentWhere: any = {};
        if (batchId) studentWhere.batchId = batchId as string;
        if (startDate && endDate) studentWhere.createdAt = studentDateFilter;

        // --- 2. Intern Demographics (Status, Education, Specialization) ---
        const [statuses, educations, specializationsRaw, authSpecList] = await Promise.all([
            prisma.student.groupBy({ by: ['status'], where: studentWhere, _count: true }),
            prisma.student.groupBy({ by: ['education'], where: studentWhere, _count: true }),
            prisma.student.groupBy({ by: ['specializationId'], where: studentWhere, _count: true }),
            prisma.specialization.findMany() // To map IDs to names
        ]);

        const totalInterns = statuses.reduce((sum: number, item: any) => sum + item._count, 0);
        const activeInterns = statuses.find((s: any) => s.status === 'ACTIVE')?._count || 0;
        const exitInterns = totalInterns - activeInterns;

        const specMap = new Map(authSpecList.map((s: any) => [s.id, s.name]));
        const specializationDistribution = specializationsRaw
            .filter((s: any) => s.specializationId)
            .map((s: any) => ({
                name: specMap.get(s.specializationId as string) || 'Unknown',
                count: s._count
            }));

        const educationDistribution = educations
            .filter((e: any) => e.education)
            .map((e: any) => ({
                name: e.education as string,
                count: e._count
            }));

        // --- 3. Revenue Tracker ---
        const feeWhere: any = {};
        if (startDate && endDate) feeWhere.paymentDate = eventDateFilter;
        if (batchId) feeWhere.student = { batchId: batchId as string };

        const fees = await prisma.fee.aggregate({
            _sum: { amountPaid: true, dueAmount: true },
            where: feeWhere
        });
        const totalCollected = fees._sum.amountPaid || 0;
        const totalPending = fees._sum.dueAmount || 0;
        const totalRevenue = totalCollected + totalPending;

        // --- 4. Attendance Analysis ---
        // Optimized: Use groupBy to aggregate at DB level instead of fetching all rows
        const attWhere: any = {};
        if (startDate && endDate) attWhere.date = eventDateFilter;
        if (batchId) attWhere.batchId = batchId as string;

        const attGrouped = await prisma.attendance.groupBy({
            by: ['studentId', 'status'],
            where: attWhere,
            _count: true
        });

        // Build per-student totals from the grouped result (much smaller than raw rows)
        const studentAttCount: Record<string, { present: number, total: number }> = {};
        attGrouped.forEach((row: any) => {
            if (!studentAttCount[row.studentId]) studentAttCount[row.studentId] = { present: 0, total: 0 };
            studentAttCount[row.studentId].total += row._count;
            if (row.status === 'PRESENT' || row.status === 'HALF_DAY') {
                studentAttCount[row.studentId].present += row._count;
            }
        });

        let attBelow80 = 0, att80to90 = 0, attAbove90 = 0;
        Object.values(studentAttCount).forEach((stats: any) => {
            if (stats.total === 0) return;
            const percentage = (stats.present / stats.total) * 100;
            if (percentage < 80) attBelow80++;
            else if (percentage < 90) att80to90++;
            else attAbove90++;
        });

        const attendanceMetrics = { '< 80%': attBelow80, '80% - 90%': att80to90, '> 90%': attAbove90 };

        // --- 5. Student Performance (Assessments) ---
        // Optimized: Use select to fetch only needed fields instead of full include
        const subWhere: any = {};
        if (startDate && endDate) subWhere.submittedAt = eventDateFilter;
        if (batchId) subWhere.student = { batchId: batchId as string };

        const submissions = await prisma.assessmentSubmission.findMany({
            where: subWhere,
            select: {
                score: true,
                totalQuestions: true,
                assessment: {
                    select: { subject: { select: { name: true } } }
                }
            }
        });

        // Group by Subject
        const specPerf: Record<string, { above90: number, range70to80: number, range60to70: number, below60: number }> = {};
        
        submissions.forEach((sub: any) => {
            const subjectName = sub.assessment.subject?.name || 'Unknown';
            if (!specPerf[subjectName]) {
                specPerf[subjectName] = { above90: 0, range70to80: 0, range60to70: 0, below60: 0 };
            }

            const percentage = (sub.score / sub.totalQuestions) * 100;
            if (percentage >= 90) specPerf[subjectName].above90++;
            else if (percentage >= 70) specPerf[subjectName].range70to80++;
            else if (percentage >= 60) specPerf[subjectName].range60to70++;
            else specPerf[subjectName].below60++;
        });

        const performanceMetrics = Object.entries(specPerf).map(([subject, stats]) => ({
            subject,
            ...stats
        }));

        // --- 6. Trainer Utilization ---
        // Optimized: Use select to fetch only needed fields
        const schedWhere: any = { status: 'Completed' };
        if (startDate && endDate) schedWhere.date = eventDateFilter;
        if (batchId) schedWhere.batchId = batchId as string;

        const schedules = await prisma.trainingSchedule.findMany({
            where: schedWhere,
            select: {
                mode: true,
                timeSlot: { select: { durationHours: true } },
                trainers: { select: { trainer: { select: { firstName: true, lastName: true } } } }
            }
        });

        const trainerHours: Record<string, { trainerName: string, ILT: number, Practice: number }> = {};
        
        schedules.forEach((s: any) => {
            const hours = s.timeSlot.durationHours || 1;
            const mode = s.mode || 'ILT';
            
            s.trainers.forEach((st: any) => {
                const tName = st.trainer.firstName + ' ' + st.trainer.lastName;
                if (!trainerHours[tName]) {
                    trainerHours[tName] = { trainerName: tName, ILT: 0, Practice: 0 };
                }
                
                if (mode === 'ILT') trainerHours[tName].ILT += hours;
                else if (mode === 'Practice' || mode === 'Measurement') trainerHours[tName].Practice += hours;
            });
        });

        const utilizationMetrics = Object.values(trainerHours);

        // --- Construct Final Response ---
        res.json({
            success: true,
            demographics: {
                totalInterns,
                activeInterns,
                exitInterns,
                educationDistribution,
                specializationDistribution
            },
            revenue: {
                totalCollected,
                totalPending,
                totalRevenue
            },
            attendance: attendanceMetrics,
            performance: performanceMetrics,
            utilization: utilizationMetrics
        });

    } catch (error) {
        console.error('CEO Metrics Aggregation Error:', error);
        res.status(500).json({ success: false, message: 'Failed to aggregate CEO metrics' });
    }
});

export default router;
