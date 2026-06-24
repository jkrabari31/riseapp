import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../server';
import bcrypt from 'bcryptjs';

const router = Router();

// Helper to guarantee string types for sqlite
const formatCsv = (input: any): string | null => {
    if (!input) return null;
    if (Array.isArray(input)) return input.join(',');
    return String(input);
};

// Get all teachers with profiles
router.get('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const teachers = await prisma.user.findMany({
            where: {
                role: 'TRAINER',
                isActive: true
            },
            include: {
                TeacherProfile: {
                    include: {
                        subjects: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Format for frontend
        const formattedTeachers = teachers.map(t => ({
            id: t.id,
            email: t.email,
            name: t.name,
            createdAt: t.createdAt,
            profile: t.TeacherProfile || null
        }));

        res.json(formattedTeachers);
    } catch (error) {
        console.error('Error fetching teachers', error);
        res.status(500).json({ message: 'Error fetching teachers list' });
    }
});

// Get profile for the currently logged in Teacher
router.get('/me', authenticateToken, requireRole(['TRAINER']), async (req: any, res) => {
    try {
        const userId = req.user.id;
        const profile = await prisma.teacherProfile.findUnique({
            where: { userId },
            include: {
                user: { select: { name: true, email: true } },
                subjects: true,
                timetables: {
                    include: { subject: true }
                },
                scheduledSessions: {
                    where: {
                        schedule: {
                            date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                        }
                    },
                    orderBy: {
                        schedule: { date: 'asc' }
                    },
                    include: {
                        schedule: {
                            include: {
                                timeSlot: true,
                                batch: true,
                                specializations: { include: { specialization: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });
        res.json(profile);
    } catch (error) {
        console.error('Error fetching teacher profile:', error);
        res.status(500).json({ message: 'Error fetching teacher profile' });
    }
});

// Get comprehensive teacher profile details
router.get('/:id/details', authenticateToken, async (req, res) => {
    try {
        // ID here can be either the User ID or TeacherProfile ID. We'll search both to be safe.
        const idStr = req.params.id as string;

        const profile = await prisma.teacherProfile.findFirst({
            where: {
                OR: [
                    { id: idStr },
                    { userId: idStr }
                ]
            },
            include: {
                user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
                subjects: true,
                timetables: { include: { subject: true } },
                scheduledSessions: {
                    where: {
                        schedule: {
                            date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                        }
                    },
                    orderBy: {
                        schedule: { date: 'asc' }
                    },
                    include: {
                        schedule: {
                            include: {
                                timeSlot: true,
                                batch: true,
                                specializations: { include: { specialization: true } }
                            }
                        }
                    }
                },
                assignments: { include: { subject: true }, orderBy: { createdAt: 'desc' } },
                assessments: { include: { subject: true }, orderBy: { createdAt: 'desc' } }
            }
        });

        if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });

        res.json(profile);
    } catch (error) {
        console.error("Error fetching detailed teacher profile:", error);
        res.status(500).json({ message: 'Error fetching teacher detailed profile' });
    }
});

// Create new Teacher (User + TeacherProfile + Subjects)
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { email, password, firstName, middleName, lastName, mobileNo, assignedClasses, classTeacherFor, subjectIds } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: 'Required fields missing' });
        }

        // Check if email exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'Email already in use' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();

        // Transaction to create User + Profile
        const teacher = await prisma.$transaction(async (prisma) => {
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: 'TRAINER',
                    name: fullName
                }
            });

            await prisma.teacherProfile.create({
                data: {
                    userId: user.id,
                    firstName,
                    middleName: middleName || null,
                    lastName,
                    mobileNo: mobileNo || null,
                    assignedClasses: formatCsv(assignedClasses),
                    classTeacherFor: formatCsv(classTeacherFor),
                    subjects: subjectIds && Array.isArray(subjectIds) && subjectIds.length > 0 ? {
                        connect: (subjectIds as string[]).map((id: string) => ({ id }))
                    } : undefined
                }
            });

            return user;
        });

        res.status(201).json({ message: 'Teacher created successfully', teacherId: teacher.id });
    } catch (error) {
        console.error('Error creating teacher', error);
        res.status(500).json({ message: 'Error creating teacher' });
    }
});

// Update Teacher
router.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, middleName, lastName, mobileNo, assignedClasses, classTeacherFor, subjectIds } = req.body;

        const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();

        await prisma.$transaction(async (prisma) => {
            // Update User Name
            await prisma.user.update({
                where: { id: id as string },
                data: { name: fullName }
            });

            // Update Profile
            await prisma.teacherProfile.update({
                where: { userId: id as string },
                data: {
                    firstName,
                    middleName: middleName || null,
                    lastName,
                    mobileNo: mobileNo || null,
                    assignedClasses: formatCsv(assignedClasses),
                    classTeacherFor: formatCsv(classTeacherFor),
                    subjects: {
                        set: [], // Clear existing
                        connect: subjectIds && Array.isArray(subjectIds) ? (subjectIds as string[]).map((sid: string) => ({ id: sid })) : [] // Recreate
                    }
                }
            });
        });

        res.json({ message: 'Teacher updated successfully' });
    } catch (error) {
        console.error('Error updating teacher', error);
        res.status(500).json({ message: 'Error updating teacher' });
    }
});

// Delete Teacher (Soft Delete)
router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.update({
            where: { id: id as string },
            data: { isActive: false }
        });
        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Error deleting teacher', error);
        res.status(500).json({ message: 'Error deleting teacher' });
    }
});

export default router;
