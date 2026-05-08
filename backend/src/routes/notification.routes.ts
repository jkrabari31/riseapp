import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { prisma } from '../server';

const router = Router();

// Get all notifications for the active user
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        const userId = req.user.id;

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        res.json(notifications);
    } catch (error) {
        console.error('Fetch Notifications Error:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// Mark an individual notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id as string;

        await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Update Notification Error:', error);
        res.status(500).json({ message: 'Error updating notification status' });
    }
});

// Mark all as read
router.put('/read-all', authenticateToken, async (req: any, res) => {
    try {
        const userId = req.user.id;

        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Update Notifications Error:', error);
        res.status(500).json({ message: 'Error updating notifications status' });
    }
});

export default router;
