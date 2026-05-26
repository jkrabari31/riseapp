import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { notificationService } from '../services/notificationService';
import { prisma } from '../server';

const router = Router();

// Create new Assessment (Teacher only)
router.post('/', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const data = req.body;
        let teacherId = data.teacherId;

        if ((req as any).user.role === 'TRAINER') {
            const profile = await prisma.teacherProfile.findUnique({
                where: { userId: (req as any).user.id }
            });
            if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });
            teacherId = profile.id;
        }

        const assessment = await (prisma as any).assessment.create({
            data: {
                title: data.title,
                description: data.description,
                questionsJSON: JSON.stringify(data.questions),
                dueDate: new Date(data.dueDate),
                timeLimit: parseInt(data.timeLimit) || 30,
                batchId: data.batchId,
                specializationId: data.specializationId,
                classLevel: data.classLevel,
                section: data.section,
                subjectId: data.subjectId,
                teacherId: teacherId,
                isReleased: !!data.isReleased
            }
        });

        // Notify students if released
        if (assessment.isReleased) {
            const students = await prisma.student.findMany({
                where: {
                    batchId: assessment.batchId,
                    OR: [
                        { specializationId: assessment.specializationId },
                        { specializationId: null }
                    ],
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
                    type: 'assessment',
                    title: 'New Assessment Released',
                    message: `A new assessment "${assessment.title}" is now available. Due date: ${assessment.dueDate.toLocaleDateString()}.`
                });
            }
        }

        res.status(201).json(assessment);
    } catch (error) {
        console.error('Create Assessment Error:', error);
        res.status(500).json({ message: 'Error creating assessment' });
    }
});

// Update an existing Assessment (Teacher only)
router.put('/:id', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Ensure the teacher owns this assessment
        if ((req as any).user.role === 'TRAINER') {
            const profile = await prisma.teacherProfile.findUnique({
                where: { userId: (req as any).user.id }
            });
            if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });
            const existing = await (prisma as any).assessment.findUnique({ where: { id } });
            if (!existing || existing.teacherId !== profile.id) {
                return res.status(403).json({ message: 'Not authorized to edit this assessment' });
            }
        }

        const updated = await (prisma as any).assessment.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                questionsJSON: JSON.stringify(data.questions),
                dueDate: new Date(data.dueDate),
                timeLimit: parseInt(data.timeLimit) || 30,
                batchId: data.batchId,
                specializationId: data.specializationId,
                classLevel: data.classLevel,
                section: data.section,
                subjectId: data.subjectId,
                isReleased: data.isReleased !== undefined ? !!data.isReleased : undefined
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Update Assessment Error:', error);
        res.status(500).json({ message: 'Error updating assessment' });
    }
});

// Get assessments created by logged in Teacher
router.get('/teacher/me', authenticateToken, requireRole(['TRAINER']), async (req, res) => {
    try {
        const profile = await prisma.teacherProfile.findUnique({
            where: { userId: (req as any).user.id }
        });
        if (!profile) return res.json([]);

        const assessments = await (prisma as any).assessment.findMany({
            where: { teacherId: profile.id },
            include: { subject: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assessments);
    } catch (error) {
        console.error('Fetch Teacher Assessments Error:', error);
        res.status(500).json({ message: 'Error fetching assessments' });
    }
});

// Get assessments for a child's batch & specialization (Intern)
// We split this into two routes to avoid '?' syntax errors with some path-to-regexp versions
router.get('/intern/:batchId/:specializationId', authenticateToken, async (req, res) => {
    try {
        const { batchId, specializationId } = req.params;
        const assessments = await (prisma as any).assessment.findMany({
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
        res.json(assessments);
    } catch (error) {
        console.error('Fetch Intern Assessments Error:', error);
        res.status(500).json({ message: 'Error fetching assessments' });
    }
});

router.get('/intern/:batchId', authenticateToken, async (req, res) => {
    try {
        const { batchId } = req.params;
        const assessments = await (prisma as any).assessment.findMany({
            where: { 
                batchId,
                specializationId: null,
                isReleased: true 
            },
            include: { subject: true, teacher: { include: { user: { select: { name: true } } } }, batch: true, specialization: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assessments);
    } catch (error) {
        console.error('Fetch Intern Assessments Error:', error);
        res.status(500).json({ message: 'Error fetching assessments' });
    }
});

// LEGACY: Get assessments for a child's class (Parent)
router.get('/class/:classLevel/:section', authenticateToken, async (req, res) => {
    try {
        const { classLevel, section } = req.params;
        const assessments = await (prisma as any).assessment.findMany({
            where: { classLevel, section, isReleased: true },
            include: { subject: true, teacher: { include: { user: { select: { name: true } } } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assessments);
    } catch (error) {
        console.error('Fetch Class Assessments Error:', error);
        res.status(500).json({ message: 'Error fetching assessments' });
    }
});

// Admin Route: Get ALL historical submissions across the entire school
router.get('/all-results', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const assessments = await (prisma as any).assessment.findMany({
            include: {
                subject: true,
                teacher: { include: { user: { select: { name: true } } } },
                submissions: {
                    include: {
                        student: { 
                            select: { 
                                name: true, 
                                rollNumber: true, 
                                batch: { select: { name: true } },
                                specialization: { select: { name: true } }
                            } 
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assessments);
    } catch (error) {
        console.error('Fetch All Historical Results Error:', error);
        res.status(500).json({ message: 'Error fetching historical results' });
    }
});

// Get specific assessment (for quiz-taking)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const assessment = await (prisma as any).assessment.findUnique({
            where: { id: req.params.id },
            include: { subject: true }
        });
        if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
        res.json(assessment);
    } catch (error) {
        console.error('Fetch Assessment Error:', error);
        res.status(500).json({ message: 'Error fetching assessment' });
    }
});

// Submit quiz attempt (Parent on behalf of student)
router.post('/:id/submit', authenticateToken, requireRole(['INTERN']), async (req, res) => {
    try {
        const { id } = req.params;
        const { studentId, answers } = req.body; // answers: number[]

        const assessment = await (prisma as any).assessment.findUnique({ where: { id } });
        if (!assessment) return res.status(404).json({ message: 'Assessment not found' });

        const questions = JSON.parse(assessment.questionsJSON);
        const totalQuestions = questions.length;

        // Auto-grade
        let score = 0;
        questions.forEach((q: any, idx: number) => {
            if (answers[idx] === q.correctIndex) score++;
        });

        // Check existing submission
        const existing = await (prisma as any).assessmentSubmission.findUnique({
            where: { assessmentId_studentId: { assessmentId: id, studentId } }
        });
        if (existing) return res.status(409).json({ message: 'This student has already submitted this quiz.' });

        const submission = await (prisma as any).assessmentSubmission.create({
            data: {
                assessmentId: id,
                studentId,
                answersJSON: JSON.stringify(answers),
                score,
                totalQuestions,
                submittedAt: new Date()
            }
        });

        res.status(201).json({ message: 'Submitted successfully', score, totalQuestions, submission });
    } catch (error) {
        console.error('Submit Assessment Error:', error);
        res.status(500).json({ message: 'Error submitting assessment' });
    }
});

// Get all submissions for a specific assessment (Teacher)
router.get('/:id/results', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const submissions = await (prisma as any).assessmentSubmission.findMany({
            where: { assessmentId: req.params.id },
            include: {
                student: { 
                    select: { 
                        name: true, 
                        rollNumber: true,
                        batch: { select: { name: true } },
                        specialization: { select: { name: true } }
                    } 
                }
            },
            orderBy: { score: 'desc' }
        });
        res.json(submissions);
    } catch (error) {
        console.error('Fetch Results Error:', error);
        res.status(500).json({ message: 'Error fetching results' });
    }
});

// Check submission status for a student
router.get('/:id/status/:studentId', authenticateToken, async (req, res) => {
    try {
        const sub = await (prisma as any).assessmentSubmission.findUnique({
            where: { assessmentId_studentId: { assessmentId: req.params.id, studentId: req.params.studentId } }
        });
        res.json({ submitted: !!sub, submission: sub });
    } catch (error) {
        res.status(500).json({ message: 'Error checking status' });
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
            const existing = await (prisma as any).assessment.findUnique({ where: { id } });
            if (!existing || existing.teacherId !== profile.id) {
                return res.status(403).json({ message: 'Not authorized' });
            }
        }

        const updated = await (prisma as any).assessment.update({
            where: { id },
            data: { isReleased: !!isReleased }
        });

        // Notify if released
        if (updated.isReleased) {
            const students = await prisma.student.findMany({
                where: {
                    batchId: updated.batchId,
                    OR: [
                        { specializationId: updated.specializationId },
                        { specializationId: null }
                    ],
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
                    type: 'assessment',
                    title: 'Assessment Released',
                    message: `The assessment "${updated.title}" was just released. Due date: ${updated.dueDate.toLocaleDateString()}.`
                });
            }
        }

        res.json(updated);
    } catch (error) {
        console.error('Toggle Release Error:', error);
        res.status(500).json({ message: 'Error toggling release status' });
    }
});

// Delete assessment (Teacher)
router.delete('/:id', authenticateToken, requireRole(['TRAINER', 'SUPER_ADMIN']), async (req, res) => {
    try {
        await (prisma as any).assessment.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Assessment deleted' });
    } catch (error) {
        console.error('Delete Assessment Error:', error);
        res.status(500).json({ message: 'Error deleting assessment' });
    }
});

export default router;
