import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../server';

const router = Router();

// Create new Reading Material (Trainers & Admins)
router.post('/', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req: any, res) => {
    try {
        const { title, content, specializationId } = req.body;

        if (!title || !content || !specializationId) {
            return res.status(400).json({ message: 'Title, content, and specializationId are required' });
        }

        let authorId: string;
        if (req.user.role === 'TRAINER') {
            const profile = await prisma.teacherProfile.findUnique({
                where: { userId: req.user.id }
            });
            if (!profile) {
                return res.status(404).json({ message: 'Trainer profile not found' });
            }
            authorId = profile.id;
        } else {
            // For SUPER_ADMIN, try to find or create a dummy/admin trainer profile or associate it with the first trainer profile
            // Alternatively, fetch any admin/trainer profile. Let's find first trainer profile as author.
            const firstTrainer = await prisma.teacherProfile.findFirst();
            if (!firstTrainer) {
                return res.status(400).json({ message: 'No trainer profile found in database to assign as author' });
            }
            authorId = firstTrainer.id;
        }

        const material = await prisma.readingMaterial.create({
            data: {
                title,
                content,
                specializationId,
                authorId
            }
        });

        // Create initial NOT_STARTED reading progress records for all active students in this specialization
        const students = await prisma.student.findMany({
            where: {
                specializationId,
                status: 'ACTIVE'
            }
        });

        if (students.length > 0) {
            await prisma.readingProgress.createMany({
                data: students.map(s => ({
                    materialId: material.id,
                    studentId: s.id,
                    status: 'NOT_STARTED',
                    progressPercentage: 0
                })),
                skipDuplicates: true
            });
        }

        res.status(201).json(material);
    } catch (error) {
        console.error('Error creating reading material:', error);
        res.status(500).json({ message: 'Error creating reading material' });
    }
});

// Get all reading materials created by or visible to Trainer/Admin
router.get('/', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req: any, res) => {
    try {
        let whereClause = {};

        if (req.user.role === 'TRAINER') {
            const profile = await prisma.teacherProfile.findUnique({
                where: { userId: req.user.id }
            });
            if (profile) {
                whereClause = { authorId: profile.id };
            }
        }

        const materials = await prisma.readingMaterial.findMany({
            where: whereClause,
            include: {
                specialization: { select: { id: true, name: true } },
                author: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(materials);
    } catch (error) {
        console.error('Error fetching reading materials:', error);
        res.status(500).json({ message: 'Error fetching reading materials' });
    }
});

// Delete a reading material
router.delete('/:id', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req: any, res) => {
    try {
        const { id } = req.params;

        if (req.user.role === 'TRAINER') {
            const profile = await prisma.teacherProfile.findUnique({
                where: { userId: req.user.id }
            });
            if (!profile) {
                return res.status(404).json({ message: 'Trainer profile not found' });
            }

            const material = await prisma.readingMaterial.findUnique({ where: { id } });
            if (!material || material.authorId !== profile.id) {
                return res.status(403).json({ message: 'You are not authorized to delete this material' });
            }
        }

        await prisma.readingMaterial.delete({ where: { id } });
        res.json({ success: true, message: 'Reading material deleted successfully' });
    } catch (error) {
        console.error('Error deleting reading material:', error);
        res.status(500).json({ message: 'Error deleting reading material' });
    }
});

// Fetch assigned reading materials for Intern (student) along with their progress
router.get('/intern', authenticateToken, requireRole(['INTERN']), async (req: any, res) => {
    try {
        const userId = req.user.id;
        const student = await prisma.student.findFirst({
            where: {
                parentId: userId,
                status: 'ACTIVE'
            }
        });

        if (!student) {
            return res.status(404).json({ message: 'Intern profile not found' });
        }

        if (!student.specializationId) {
            return res.json([]); // No specialization assigned, so no materials
        }

        // Fetch materials for student's specialization
        const materials = await prisma.readingMaterial.findMany({
            where: {
                specializationId: student.specializationId
            },
            include: {
                author: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                },
                progressTracking: {
                    where: {
                        studentId: student.id
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Format payload to make it simpler for frontend to consume
        const formatted = materials.map(mat => {
            const progress = mat.progressTracking[0] || null;
            return {
                id: mat.id,
                title: mat.title,
                content: mat.content,
                createdAt: mat.createdAt,
                authorName: `${mat.author.firstName} ${mat.author.lastName}`,
                progress: progress ? {
                    progressPercentage: progress.progressPercentage,
                    status: progress.status,
                    lastReadAt: progress.lastReadAt
                } : {
                    progressPercentage: 0,
                    status: 'NOT_STARTED',
                    lastReadAt: null
                }
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching intern reading materials:', error);
        res.status(500).json({ message: 'Error fetching reading materials' });
    }
});

// Update Reading Progress for an Intern
router.post('/progress', authenticateToken, requireRole(['INTERN']), async (req: any, res) => {
    try {
        const userId = req.user.id;
        const { materialId, progressPercentage } = req.body;

        if (!materialId || progressPercentage === undefined) {
            return res.status(400).json({ message: 'materialId and progressPercentage are required' });
        }

        const student = await prisma.student.findFirst({
            where: {
                parentId: userId,
                status: 'ACTIVE'
            }
        });

        if (!student) {
            return res.status(404).json({ message: 'Intern profile not found' });
        }

        const percentage = Math.min(100, Math.max(0, parseInt(progressPercentage) || 0));
        let status = 'NOT_STARTED';
        if (percentage >= 95) {
            status = 'COMPLETED';
        } else if (percentage > 0) {
            status = 'IN_PROGRESS';
        }

        const progress = await prisma.readingProgress.upsert({
            where: {
                materialId_studentId: {
                    materialId,
                    studentId: student.id
                }
            },
            update: {
                progressPercentage: percentage,
                status,
                lastReadAt: new Date()
            },
            create: {
                materialId,
                studentId: student.id,
                progressPercentage: percentage,
                status,
                lastReadAt: new Date()
            }
        });

        res.json({ success: true, progress });
    } catch (error) {
        console.error('Error updating reading progress:', error);
        res.status(500).json({ message: 'Error updating reading progress' });
    }
});

// View progress details for a specific reading material (Trainers / Admins)
router.get('/:id/progress', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req: any, res) => {
    try {
        const { id } = req.params;

        const material = await prisma.readingMaterial.findUnique({
            where: { id },
            include: {
                specialization: true
            }
        });

        if (!material) {
            return res.status(404).json({ message: 'Reading material not found' });
        }

        // Get all active students in the specialization
        const students = await prisma.student.findMany({
            where: {
                specializationId: material.specializationId,
                status: 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                rollNumber: true,
                admissionNumber: true,
                readingProgress: {
                    where: {
                        materialId: id
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        const progressList = students.map(s => {
            const progress = s.readingProgress[0] || null;
            return {
                studentId: s.id,
                studentName: s.name || `${s.firstName} ${s.lastName}`,
                email: s.email,
                rollNumber: s.rollNumber || s.admissionNumber,
                progressPercentage: progress ? progress.progressPercentage : 0,
                status: progress ? progress.status : 'NOT_STARTED',
                lastReadAt: progress ? progress.lastReadAt : null
            };
        });

        res.json({
            materialTitle: material.title,
            specializationName: material.specialization.name,
            progress: progressList
        });
    } catch (error) {
        console.error('Error fetching reading material progress:', error);
        res.status(500).json({ message: 'Error fetching reading material progress' });
    }
});

// Send Reading Reminder Notification to student (Trainer only)
router.post('/:id/remind/:studentId', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req: any, res: any) => {
    try {
        const { id, studentId } = req.params;

        const material = await prisma.readingMaterial.findUnique({
            where: { id }
        });

        if (!material) {
            return res.status(404).json({ message: 'Reading material not found' });
        }

        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: { parent: true }
        });

        if (!student || !student.parentId) {
            return res.status(404).json({ message: 'Student or student account not found' });
        }

        let trainerName = 'Your trainer';
        if (req.user.role === 'TRAINER') {
            const profile = await prisma.teacherProfile.findUnique({
                where: { userId: req.user.id }
            });
            if (profile) {
                trainerName = `Trainer ${profile.firstName} ${profile.lastName}`;
            }
        } else {
            trainerName = 'Administrator';
        }

        await prisma.notification.create({
            data: {
                userId: student.parentId,
                title: `📚 Reading Reminder: ${material.title}`,
                message: `${trainerName} has requested you to complete your reading for "${material.title}". Please review it as soon as possible.`,
                type: 'ALERT',
                priority: 'HIGH'
            }
        });

        res.json({ success: true, message: 'Reminder notification sent successfully' });
    } catch (error) {
        console.error('Error sending reading reminder:', error);
        res.status(500).json({ message: 'Error sending reading reminder' });
    }
});

export default router;
