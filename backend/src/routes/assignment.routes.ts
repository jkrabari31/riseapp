import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { notificationService } from '../services/notificationService';
import { prisma } from '../server';

const router = Router();

// Create new assignment (Teachers Only)
router.post('/', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const data = req.body;

        // Ensure teacherId matches mapped profile for Teachers
        let teacherId = data.teacherId;
        if ((req as any).user.role === 'TRAINER') {
            const profile = await prisma.teacherProfile.findUnique({
                where: { userId: (req as any).user.id }
            });
            if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });
            teacherId = profile.id;
        }

        const assignment = await prisma.assignment.create({
            data: {
                title: data.title,
                description: data.description,
                questionsJSON: data.questionsJSON,
                dueDate: new Date(data.dueDate),
                classLevel: data.classLevel,
                section: data.section,
                batchId: data.batchId,
                specializationId: data.specializationId || null,
                subjectId: data.subjectId,
                teacherId: teacherId,
                isReleased: !!data.isReleased
            }
        });

        // Notify students if it's released immediately
        if (assignment.isReleased) {
            const students = await prisma.student.findMany({
                where: {
                    batchId: assignment.batchId,
                    batch: { isCurrent: true },
                    ...(assignment.specializationId ? {
                        OR: [
                            { specializationId: assignment.specializationId },
                            { specializationId: null }
                        ]
                    } : {}),
                    status: 'ACTIVE',
                    parentId: { not: null }
                },
                select: { 
                    firstName: true,
                    parent: { select: { id: true, email: true } } 
                }
            });

            const usersToNotify = students
                .filter(s => s.parent?.id)
                .map(s => ({ 
                    id: s.parent!.id, 
                    email: s.parent!.email,
                    name: s.firstName 
                }));

            if (usersToNotify.length > 0) {
                await notificationService.notifyMultiple({
                    users: usersToNotify,
                    type: 'assignment',
                    title: 'New Assignment Assigned',
                    message: `You have a new assignment: "${assignment.title}". Due date: ${assignment.dueDate.toLocaleDateString()}.`
                });
            }
        }

        res.status(201).json(assignment);
    } catch (error) {
        console.error('Create Assignment Error:', error);
        res.status(500).json({ message: 'Error creating assignment' });
    }
});

// Get assignments by class and section (For Students/Parents)
router.get('/class/:classLevel/:section', authenticateToken, async (req, res) => {
    try {
        const { classLevel, section } = req.params;
        const assignments = await prisma.assignment.findMany({
            where: { classLevel: classLevel as string, section: section as string },
            include: { subject: true, teacher: true, batch: true, specialization: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assignments);
    } catch (error) {
        console.error('Fetch Class Assignments Error:', error);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
});

// Get assignments for a child's batch & specialization (Intern)
router.get('/intern/:batchId/:specializationId', authenticateToken, async (req, res) => {
    try {
        // Cast route params to string to satisfy Prisma type expectations
        const { batchId: batchIdParam, specializationId: specializationIdParam } = req.params as { batchId: string; specializationId: string };
        const batchId = batchIdParam;
        const specializationId = specializationIdParam;
        const assignments = await prisma.assignment.findMany({
            where: { 
                batchId,
                OR: specializationId && specializationId !== 'all' ? [
                    { specializationId: null },
                    { specializationId: specializationId }
                ] : [
                    { specializationId: null }
                ],
                isReleased: true
            },
            include: { subject: true, teacher: { include: { user: { select: { name: true } } } }, batch: true, specialization: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assignments);
    } catch (error) {
        console.error('Fetch Intern Assignments Error:', error);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
});

router.get('/intern/:batchId', authenticateToken, async (req, res) => {
    try {
        const { batchId: rawBatchId } = req.params as { batchId: string }; const batchId = rawBatchId;
        const assignments = await prisma.assignment.findMany({
            where: { 
                batchId,
                specializationId: null,
                isReleased: true
            },
            include: { subject: true, teacher: { include: { user: { select: { name: true } } } }, batch: true, specialization: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assignments);
    } catch (error) {
        console.error('Fetch Intern Assignments Error:', error);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
});

// Get assignments created by a specific teacher
router.get('/teacher/me', authenticateToken, requireRole(['TRAINER']), async (req, res) => {
    try {
        const profile = await prisma.teacherProfile.findUnique({
            where: { userId: (req as any).user.id }
        });
        if (!profile) return res.json([]);

        const assignments = await prisma.assignment.findMany({
            where: { teacherId: profile.id },
            include: { subject: true, batch: true, specialization: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assignments);
    } catch (error) {
        console.error('Fetch Teacher Assignments Error:', error);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
});

// Update assignment
router.put('/:id', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if ((req as any).user.role === 'TRAINER') {
            const profile = await prisma.teacherProfile.findUnique({ where: { userId: (req as any).user.id } });
            if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });
            const existing = await prisma.assignment.findUnique({ where: { id: id as string } });
            if (!existing || existing.teacherId !== profile.id) {
                return res.status(403).json({ message: 'Not authorized' });
            }
        }

        const assignment = await prisma.assignment.update({
            where: { id: id as string },
            data: {
                title: data.title,
                description: data.description,
                questionsJSON: data.questionsJSON,
                dueDate: new Date(data.dueDate),
                classLevel: data.classLevel,
                section: data.section,
                batchId: data.batchId,
                specializationId: data.specializationId || null,
                subjectId: data.subjectId
            }
        });

        res.json(assignment);
    } catch (error) {
        console.error('Update Assignment Error:', error);
        res.status(500).json({ message: 'Error updating assignment' });
    }
});

// Delete assignment
router.delete('/:id', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.assignment.delete({ where: { id: id as string } });
        res.json({ success: true, message: 'Assignment deleted' });
    } catch (error) {
        console.error('Delete Assignment Error:', error);
        res.status(500).json({ message: 'Error deleting assignment' });
    }
});

// Toggle Release status (Teacher/Admin)
router.patch('/:id/toggle-release', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const { isReleased } = req.body;

        if ((req as any).user.role === 'TRAINER') {
            const profile = await prisma.teacherProfile.findUnique({ where: { userId: (req as any).user.id } });
            if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });
            const existing = await prisma.assignment.findUnique({ where: { id: id as string } });
            if (!existing || existing.teacherId !== profile.id) {
                return res.status(403).json({ message: 'Not authorized' });
            }
        }

        const updated = await prisma.assignment.update({
            where: { id: id as string },
            data: { isReleased: !!isReleased }
        });

        // Notify students if it was just released
        if (updated.isReleased && !isReleased) { // Only if it was previously NOT released (though req.body.isReleased is the target)
             // Simplified: Always notify if targeting released=true for now, or check previous state
        }
        
        // Actually, just notify if the update makes it released
        if (updated.isReleased) {
            const students = await prisma.student.findMany({
                where: {
                    batchId: updated.batchId,
                    batch: { isCurrent: true },
                    ...(updated.specializationId ? {
                        OR: [
                            { specializationId: updated.specializationId },
                            { specializationId: null }
                        ]
                    } : {}),
                    status: 'ACTIVE',
                    parentId: { not: null }
                },
                select: { 
                    firstName: true,
                    parent: { select: { id: true, email: true } } 
                }
            });

            const usersToNotify = students
                .filter(s => s.parent?.id)
                .map(s => ({ 
                    id: s.parent!.id, 
                    email: s.parent!.email,
                    name: s.firstName 
                }));

            if (usersToNotify.length > 0) {
                await notificationService.notifyMultiple({
                    users: usersToNotify,
                    type: 'assignment',
                    title: 'Assignment Released',
                    message: `The assignment "${updated.title}" has been released. Due date: ${updated.dueDate.toLocaleDateString()}.`
                });
            }
        }

        res.json(updated);
    } catch (error) {
        console.error('Toggle Release Error:', error);
        res.status(500).json({ message: 'Error toggling release status' });
    }
});

export default router;
