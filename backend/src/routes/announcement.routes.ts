import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../server';

const router = Router();

// Get Relevant Announcements based on user role
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userRole = (req as any).user.role;
        const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SCHOOL_ADMIN';

        // Admins see every announcement ever posted (no filter)
        const whereClause = isAdmin ? {} : {
            OR: [
                { targetRole: 'ALL' },
                { targetRole: userRole }
            ]
        };

        const announcements = await (prisma as any).announcement.findMany({
            where: whereClause,
            include: {
                author: { select: { name: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
            // Removed 'take: 10' – admins need ALL records
        });

        res.json(announcements);
    } catch (error) {
        console.error('Error fetching announcements', error);
        res.status(500).json({ message: 'Error fetching announcements' });
    }
});

// Create Announcement (Admin/Clerk only)
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { title, content, targetRole, priority } = req.body;
        const authorId = (req as any).user.id;

        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }

        const announcement = await (prisma as any).announcement.create({
            data: {
                title,
                content,
                targetRole: targetRole || 'ALL',
                priority: priority || 'NORMAL',
                authorId
            }
        });

        // Determine which users to notify
        let userFilter: any = { isActive: true };
        
        if (targetRole && targetRole !== 'ALL') {
            userFilter.role = targetRole;
        } else {
            // ALL targetRole: notify parents, teachers, clerks, admins etc.
            // Exclude SUPER_ADMIN from notifications if desired, but we'll include everyone active
        }

        const targetUsers = await prisma.user.findMany({
            where: userFilter,
            select: { id: true, role: true }
        });

        if (targetUsers.length > 0) {
            const notificationsToInsert = targetUsers.map(u => ({
                userId: u.id,
                title: `New Announcement: ${title}`,
                message: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
                type: 'INFO',
                priority: priority || 'NORMAL'
            }));

            await (prisma as any).notification.createMany({
                data: notificationsToInsert
            });
        }

        res.status(201).json(announcement);
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ message: 'Error creating announcement' });
    }
});

// Delete Announcement (Admin/Clerk only)
router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { id } = req.params;
        await (prisma as any).announcement.delete({ where: { id } });
        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Error deleting announcement' });
    }
});

// Export All Announcements as CSV (Admin only)
router.get('/export', authenticateToken, requireRole(['SUPER_ADMIN', 'SCHOOL_ADMIN']), async (req, res) => {
    try {
        const announcements = await (prisma as any).announcement.findMany({
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const headers = ['Title', 'Content', 'Priority', 'Target Audience', 'Posted By', 'Date & Time'];
        const rows = announcements.map((a: any) => [
            `"${a.title.replace(/"/g, '""')}"`,
            `"${a.content.replace(/"/g, '""')}"`,
            a.priority,
            a.targetRole === 'ALL' ? 'Everyone' : a.targetRole,
            a.author?.name || 'Unknown',
            new Date(a.createdAt).toLocaleString()
        ]);

        const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="announcements_${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Error exporting announcements' });
    }
});

export default router;
