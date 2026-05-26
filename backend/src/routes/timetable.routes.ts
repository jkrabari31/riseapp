import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../server';

const router = Router();

// Helper: get Monday of the week for a given date string / today
function getMondayOf(dateStr?: string): string {
    const d = dateStr ? new Date(dateStr) : new Date();
    const day = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const diff = (day === 0) ? -6 : 1 - day; // adjust to Monday
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// Helper: check if a user can edit the timetable
const canEdit = async (req: any): Promise<boolean> => {
    const { role, id } = req.user;
    if (role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN') return true;
    if (role === 'TRAINER') {
        const profile = await prisma.teacherProfile.findFirst({ where: { userId: id } });
        return profile?.canEditTimetable === true;
    }
    return false;
};

// ─── GET: Teacher's timetable ──────────────────────────────────────────────
router.get('/teacher/:teacherId', authenticateToken, async (req, res) => {
    try {
        const { teacherId } = req.params;
        const weekStart = getMondayOf(String(req.query.weekStart || ''));

        const schedule = await prisma.timetable.findMany({
            where: { teacherId: String(teacherId), weekStart },
            include: { subject: true, teacher: true },
            orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }]
        });
        res.json(schedule);
    } catch (error) {
        console.error('Fetch Teacher Timetable Error:', error);
        res.status(500).json({ message: 'Error fetching timetable' });
    }
});

// ─── GET: Class timetable ─────────────────────────────────────────────────
router.get('/class/:classLevel/:section', authenticateToken, async (req, res) => {
    try {
        const { classLevel, section } = req.params;
        const weekStart = getMondayOf(String(req.query.weekStart || ''));

        const schedule = await prisma.timetable.findMany({
            where: { classLevel: String(classLevel), section: String(section), weekStart },
            include: { subject: true, teacher: true },
            orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }]
        });
        res.json(schedule);
    } catch (error) {
        console.error('Fetch Class Timetable Error:', error);
        res.status(500).json({ message: 'Error fetching class timetable' });
    }
});

// ─── GET: Teacher contribution analytics ─────────────────────────────────
router.get('/analytics', authenticateToken, requireRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), async (req, res) => {
    try {
        // Filter by month+year by matching weekStart prefix "YYYY-MM"
        const monthStr = String(req.query.month || '').padStart(2, '0');
        const year = String(req.query.year || new Date().getFullYear());
        const prefix = monthStr ? `${year}-${monthStr}` : year;

        const entries = await prisma.timetable.findMany({
            where: { weekStart: { startsWith: prefix } },
            include: {
                teacher: { select: { id: true, firstName: true, lastName: true } },
                subject: { select: { name: true } }
            }
        });

        const map = new Map<string, any>();
        for (const entry of entries) {
            const key = entry.teacherId;
            if (!map.has(key)) {
                map.set(key, {
                    teacherId: entry.teacherId,
                    teacherName: `${entry.teacher.firstName} ${entry.teacher.lastName}`,
                    totalPeriods: 0,
                    subjects: new Set<string>(),
                    periodDetails: [] as any[]
                });
            }
            const rec = map.get(key);
            rec.totalPeriods += 1;
            rec.subjects.add(entry.subject.name);
            rec.periodDetails.push({
                day: entry.dayOfWeek,
                period: entry.periodNumber,
                subject: entry.subject.name,
                classLevel: entry.classLevel,
                section: entry.section,
                startTime: entry.startTime,
                endTime: entry.endTime,
                weekStart: entry.weekStart
            });
        }

        const result = Array.from(map.values()).map(r => ({
            ...r,
            subjects: Array.from(r.subjects)
        }));
        res.json(result);
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: 'Error fetching analytics' });
    }
});

// ─── GET: Export timetable as CSV ─────────────────────────────────────────
// Supports three modes:
//   ?weekStart=2025-03-10           → export one specific week
//   ?month=3&year=2025              → export all weeks in March 2025
//   ?year=2025                      → export entire year
router.get('/export', authenticateToken, requireRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), async (req, res) => {
    try {
        const { classLevel, section } = req.query;
        const weekStartParam = String(req.query.weekStart || '');
        const monthParam = String(req.query.month || '');
        const yearParam = String(req.query.year || '');

        const where: any = {};

        // Build weekStart filter
        if (weekStartParam) {
            // Specific week
            where.weekStart = getMondayOf(weekStartParam);
        } else if (monthParam && yearParam) {
            // All weeks in a specific month: prefix "YYYY-MM"
            const mm = String(parseInt(monthParam)).padStart(2, '0');
            where.weekStart = { startsWith: `${yearParam}-${mm}` };
        } else if (yearParam) {
            // All weeks in a year: prefix "YYYY"
            where.weekStart = { startsWith: yearParam };
        } else {
            // Fallback: this week
            where.weekStart = getMondayOf('');
        }

        if (classLevel) where.classLevel = String(classLevel);
        if (section) where.section = String(section);

        const entries = await prisma.timetable.findMany({
            where,
            include: {
                teacher: { select: { firstName: true, lastName: true } },
                subject: { select: { name: true } }
            },
            orderBy: [{ weekStart: 'asc' }, { classLevel: 'asc' }, { dayOfWeek: 'asc' }, { periodNumber: 'asc' }]
        });

        const MONTH_NAMES = ['January','February','March','April','May','June',
            'July','August','September','October','November','December'];

        const headers = ['Week Start', 'Class', 'Section', 'Day', 'Period', 'Start Time', 'End Time', 'Subject', 'Teacher', 'Month', 'Year'];
        const rows = entries.map(e => {
            const d = new Date(e.weekStart);
            return [
                e.weekStart, e.classLevel, e.section, e.dayOfWeek, e.periodNumber,
                e.startTime, e.endTime, e.subject.name,
                `${e.teacher.firstName} ${e.teacher.lastName}`,
                MONTH_NAMES[d.getMonth()], d.getFullYear()
            ];
        });

        const csv = [
            headers.join(','),
            ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Build a descriptive filename
        let filePeriod = weekStartParam ? `week_${getMondayOf(weekStartParam)}`
            : (monthParam && yearParam) ? `${MONTH_NAMES[parseInt(monthParam) - 1]}_${yearParam}`
            : yearParam ? `year_${yearParam}` : 'export';

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="timetable_${classLevel || 'all'}_${filePeriod}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).json({ message: 'Error exporting timetable' });
    }
});


// ─── POST: Assign a timetable block ───────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
    try {
        const allowed = await canEdit(req as any);
        if (!allowed) return res.status(403).json({ message: 'You do not have permission to edit the timetable.' });

        const data = req.body;
        const weekStart = getMondayOf(data.weekStart);

        const block = await prisma.timetable.create({
            data: {
                classLevel: data.classLevel,
                section: data.section,
                dayOfWeek: data.dayOfWeek,
                periodNumber: parseInt(data.periodNumber),
                startTime: data.startTime,
                endTime: data.endTime,
                subjectId: data.subjectId,
                teacherId: data.teacherId,
                weekStart
            },
            include: { subject: true, teacher: true }
        });
        res.status(201).json(block);
    } catch (error: any) {
        console.error('Create Timetable Block Error:', error);
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('teacherId')) {
                return res.status(400).json({ message: 'Conflict: This teacher is already assigned to another class at this time this week.' });
            }
            return res.status(400).json({ message: 'Conflict: This class already has a period at this slot this week.' });
        }
        res.status(500).json({ message: 'Error creating timetable block' });
    }
});

// ─── DELETE: Remove a timetable block ────────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const allowed = await canEdit(req as any);
        if (!allowed) return res.status(403).json({ message: 'You do not have permission to edit the timetable.' });

        const { id } = req.params;
        await prisma.timetable.delete({ where: { id: String(id) } });
        res.json({ success: true, message: 'Block removed' });
    } catch (error) {
        console.error('Delete Timetable Block Error:', error);
        res.status(500).json({ message: 'Error deleting timetable block' });
    }
});

// ─── PUT: Grant/revoke timetable edit permission to a teacher ────────────
router.put('/permission/:teacherProfileId', authenticateToken, requireRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), async (req, res) => {
    try {
        const { teacherProfileId } = req.params;
        const { canEditTimetable } = req.body;

        const updated = await prisma.teacherProfile.update({
            where: { id: String(teacherProfileId) },
            data: { canEditTimetable: Boolean(canEditTimetable) }
        });
        res.json({ success: true, canEditTimetable: updated.canEditTimetable });
    } catch (error) {
        console.error('Permission Update Error:', error);
        res.status(500).json({ message: 'Error updating permission' });
    }
});

export default router;
