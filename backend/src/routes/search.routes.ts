import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { prisma } from '../server';

const router = Router();

// GET /api/search?q={query}
router.get('/', authenticateToken, async (req, res) => {
    try {
        const query = req.query.q as string;

        if (!query || query.length < 2) {
            return res.json({ students: [], teachers: [] });
        }

        // Fuzzy match students by name or admission number
        const students = await prisma.student.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { admissionNumber: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 5,
            select: {
                id: true,
                name: true,
                admissionNumber: true,
                classLevel: true,
                section: true
            }
        });

        // Fuzzy match teachers by their profile 
        const teachers = await prisma.teacherProfile.findMany({
            where: {
                OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 5,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                user: {
                    select: { email: true }
                }
            }
        });

        res.json({ students, teachers });
    } catch (error) {
        console.error('Search Error:', error);
        res.status(500).json({ message: 'Error processing search query' });
    }
});

export default router;
