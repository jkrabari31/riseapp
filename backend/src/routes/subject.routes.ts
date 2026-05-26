import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../server';

const router = Router();

// Get all subjects
router.get('/', authenticateToken, async (req, res) => {
    try {
        const subjects = await prisma.subject.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(subjects);
    } catch (error) {
        console.error('Error fetching subjects', error);
        res.status(500).json({ message: 'Error fetching subjects' });
    }
});

// Admin and Clerk Add Subject
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Subject name required' });

        const existing = await prisma.subject.findUnique({ where: { name: name.trim() } });
        if (existing) return res.status(400).json({ message: 'Subject already exists' });

        const subject = await prisma.subject.create({
            data: { name: name.trim() }
        });

        res.status(201).json({ message: 'Subject created', subject });
    } catch (error) {
        console.error('Error creating subject', error);
        res.status(500).json({ message: 'Error creating subject' });
    }
});

// Admin and Clerk Delete Subject
router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.subject.delete({ where: { id: id as string } });
        res.json({ message: 'Subject deleted successfully' });
    } catch (error) {
        console.error('Error deleting subject', error);
        res.status(500).json({ message: 'Error deleting subject' });
    }
});

export default router;
