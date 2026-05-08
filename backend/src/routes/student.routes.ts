import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../server';
import bcrypt from 'bcryptjs';
import { generateAdmissionNumber } from '../utils/studentUtils';
import upload from '../middleware/upload.middleware';
import { uploadToCloudinary } from '../utils/cloudinary';

const router = Router();

// Get students specific to a Teacher's assigned classes
router.get('/my-students', authenticateToken, requireRole(['TRAINER']), async (req: any, res) => {
    try {
        const userId = req.user.id;

        const profile = await prisma.teacherProfile.findUnique({
            where: { userId }
        });

        if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });

        const assignedClassesStr = profile.assignedClasses || '';
        const classesArray = assignedClassesStr.split(',').map(c => c.trim()).filter(Boolean);

        if (classesArray.length === 0) {
            return res.json([]);
        }

        const students = await prisma.student.findMany({
            where: {
                status: 'ACTIVE',
                classLevel: { in: classesArray }
            },
            include: {
                parent: { select: { name: true, email: true } }
            },
            orderBy: [
                { classLevel: 'asc' },
                { section: 'asc' },
                { name: 'asc' }
            ]
        });

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students' });
    }
});

// Get students for a specific parent
router.get('/parent/me', authenticateToken, requireRole(['INTERN']), async (req: any, res) => {
    try {
        const userId = req.user.id;
        // Optimized: limit attendance to last 30 days, use select for fees
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const students = await prisma.student.findMany({
            where: {
                parentId: userId,
                status: 'ACTIVE'
            },
            include: {
                attendances: {
                    where: { date: { gte: thirtyDaysAgo } },
                    orderBy: { date: 'desc' }
                },
                fees: {
                    select: { amountPaid: true, paymentDate: true, paymentMode: true, receiptNumber: true }
                },
                batch: {
                    include: {
                        schedules: {
                            where: { date: { gte: new Date() } }, // Upcoming sessions
                            orderBy: { date: 'asc' },
                            take: 3,
                            include: {
                                timeSlot: true,
                                trainers: {
                                    include: {
                                        trainer: {
                                            include: { user: { select: { name: true, email: true } } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Also fetch fee structures to compute due amounts
        const structures = await prisma.feeStructure.findMany();
        const structureMap = new Map(structures.map(s => [s.specializationId, s.totalAmount]));

        const processedStudents = students.map(student => {
            const classTotal = student.specializationId ? (structureMap.get(student.specializationId) || 0) : 0;
            const totalPaid = student.fees.reduce((acc, fee) => acc + fee.amountPaid, 0);
            const dueAmount = Math.max(0, classTotal - totalPaid);

            let feeStatus = 'Unpaid';
            if (totalPaid >= classTotal && classTotal > 0) feeStatus = 'Paid';
            else if (totalPaid > 0) feeStatus = 'Partial';

            return {
                ...student,
                feeSummary: {
                    total: classTotal,
                    paid: totalPaid,
                    due: dueAmount,
                    status: feeStatus
                }
            };
        });

        res.json(processedStudents);
    } catch (error) {
        console.error('Error fetching parent students:', error);
        res.status(500).json({ message: 'Error fetching students' });
    }
});

// Get all students
router.get('/', async (req, res) => {
    try {
        const { classLevel, section, status, batchId } = req.query;

        const whereClause: any = {};

        // Only apply status filter if explicitly passed; otherwise return ALL statuses
        if (status && status !== 'ALL') {
            whereClause.status = status as string;
        }

        if (batchId) {
            whereClause.batchId = batchId as string;
        }

        if (classLevel) {
            whereClause.classLevel = classLevel as string;
        }

        if (section) {
            whereClause.section = section as string;
        }

        const students = await prisma.student.findMany({
            where: whereClause,
            include: {
                parent: { select: { name: true, email: true } }
            },
            orderBy: [
                { classLevel: 'asc' },
                { section: 'asc' },
                { name: 'asc' }
            ]
        });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students' });
    }
});

// Get comprehensive student profile details
router.get('/:id/details', authenticateToken, async (req, res) => {
    try {
        const student = await prisma.student.findUnique({
            where: { id: req.params.id as string },
            include: {
                parent: { select: { id: true, name: true, email: true } },
                attendances: { orderBy: { date: 'desc' }, take: 30 },
                fees: { orderBy: { paymentDate: 'desc' } },
                assessmentSubmissions: {
                    include: { assessment: { include: { subject: true } } },
                    orderBy: { submittedAt: 'desc' }
                }
            }
        });

        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Calculate Fee Summary
        const structure = student.specializationId 
            ? await prisma.feeStructure.findUnique({ where: { specializationId: student.specializationId } })
            : null;
        const classTotal = structure?.totalAmount || 0;
        const totalPaid = (student as any).fees.reduce((acc: number, fee: any) => acc + fee.amountPaid, 0);
        const dueAmount = Math.max(0, classTotal - totalPaid);
        let feeStatus = 'Unpaid';
        if (totalPaid >= classTotal && classTotal > 0) feeStatus = 'Paid';
        else if (totalPaid > 0) feeStatus = 'Partial';

        res.json({
            ...student,
            feeSummary: { total: classTotal, paid: totalPaid, due: dueAmount, status: feeStatus }
        });
    } catch (error) {
        console.error("Error fetching detailed student profile:", error);
        res.status(500).json({ message: 'Error fetching student detailed profile' });
    }
});

// Get single student by ID
router.get('/:id', async (req, res) => {
    try {
        const student = await prisma.student.findUnique({
            where: { id: req.params.id as string },
            include: {
                parent: { select: { id: true, name: true, email: true } }
            }
        });
        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json(student);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching student details' });
    }
});

// Create new student
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), upload.single('photo'), async (req: any, res) => {
    try {
        const studentData = req.body;
        let photoUrl = null;

        if (req.file) {
            try {
                photoUrl = await uploadToCloudinary(req.file.buffer, 'student_photos');
            } catch (err) {
                console.error('Cloudinary student photo upload error:', err);
            }
        }

        // ── Auto-generate GR / Admission Number ──────────────────────────────
        const admissionNumber = await generateAdmissionNumber(prisma);
        // ─────────────────────────────────────────────────────────────────────

        // Ensure Parent User exists
        let parentUser = null;
        if (studentData.parentEmail) {
            parentUser = await prisma.user.findUnique({ where: { email: studentData.parentEmail } });

            if (!parentUser) {
                const hashedPassword = await bcrypt.hash('password123', 10);
                parentUser = await prisma.user.create({
                    data: {
                        email: studentData.parentEmail,
                        password: hashedPassword,
                        name: studentData.fatherName || studentData.motherName || 'Parent',
                        role: 'INTERN'
                    }
                });
            }
        }

        const newStudent = await prisma.student.create({
            data: {
                admissionNumber,
                firstName: studentData.firstName || studentData.name?.split(' ')[0] || 'Intern',
                lastName: studentData.lastName || studentData.name?.split(' ').slice(1).join(' ') || 'User',
                name: studentData.name || `${studentData.firstName} ${studentData.lastName}`,
                dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : null,
                gender: studentData.gender,
                classLevel: studentData.classLevel,
                section: studentData.section,
                rollNumber: studentData.rollNumber,
                status: 'ACTIVE',
                photoUrl: photoUrl || studentData.photoUrl,
                fatherName: studentData.fatherName,
                motherName: studentData.motherName,
                contactNumber: studentData.contactNumber,
                address: studentData.address,
                parentEmail: studentData.parentEmail,
                parentId: parentUser ? parentUser.id : null,
                // Internship Fields
                education: studentData.education,
                collegeName: studentData.collegeName,
                universityName: studentData.universityName,
                mobileNo: studentData.mobileNo,
                email: studentData.email,
                parentsMobileNo: studentData.parentsMobileNo,
                interestedCourse: studentData.interestedCourse,
                fatherOccupation: studentData.fatherOccupation,
                cgpa: studentData.cgpa,
                passingYear: studentData.passingYear,
                city: studentData.city,
                source: studentData.source,
                batchId: studentData.batchId,
                specializationId: studentData.specializationId,
            }
        });

        res.status(201).json(newStudent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding student' });
    }
});


// Update an existing student
router.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), upload.single('photo'), async (req: any, res) => {
    try {
        const studentData = req.body;
        let updateData: any = {};

        if (req.file) {
            try {
                const photoUrl = await uploadToCloudinary(req.file.buffer, 'student_photos');
                updateData.photoUrl = photoUrl;
            } catch (err) {
                console.error('Cloudinary student photo update error:', err);
            }
        }
        // Update common fields
        updateData = {
            ...updateData,
            batchId: studentData.batchId,
            specializationId: studentData.specializationId,
            address: studentData.address,
            // Only add fields if they are explicitly provided in studentData
            firstName: studentData.firstName,
            middleName: studentData.middleName,
            lastName: studentData.lastName,
            name: studentData.name || (studentData.firstName && studentData.lastName ? `${studentData.firstName} ${studentData.lastName}` : undefined),
            gender: studentData.gender,
            classLevel: studentData.classLevel,
            section: studentData.section,
            rollNumber: studentData.rollNumber,
            status: studentData.status,
            fatherName: studentData.fatherName,
            motherName: studentData.motherName,
            contactNumber: studentData.contactNumber,
            parentEmail: studentData.parentEmail,
            education: studentData.education,
            collegeName: studentData.collegeName,
            universityName: studentData.universityName,
            mobileNo: studentData.mobileNo,
            email: studentData.email,
            parentsMobileNo: studentData.parentsMobileNo,
            interestedCourse: studentData.interestedCourse,
            fatherOccupation: studentData.fatherOccupation,
            cgpa: studentData.cgpa,
            passingYear: studentData.passingYear,
            city: studentData.city,
            source: studentData.source,
        };

        // Remove undefined fields to prevent Prisma from trying to update them
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined || updateData[key] === 'undefined' || updateData[key] === 'null') {
                delete updateData[key];
            }
        });

        if (studentData.dateOfBirth) {
            updateData.dateOfBirth = new Date(studentData.dateOfBirth);
        }

        const updatedStudent = await prisma.student.update({
            where: { id: req.params.id },
            data: updateData
        });
        res.json(updatedStudent);
    } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ message: 'Error updating student' });
    }
});

// Delete a student
router.delete('/:id', async (req, res) => {
    try {
        await prisma.student.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ message: 'Error deleting student' });
    }
});

// Promote a student to the next class
router.post('/:id/promote', async (req, res) => {
    try {
        const student = await prisma.student.findUnique({ where: { id: req.params.id } });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const classMap: Record<string, string> = {
            '1st': '2nd', '2nd': '3rd', '3rd': '4th', '4th': '5th',
            '5th': '6th', '6th': '7th', '7th': '8th', '8th': '9th',
            '9th': '10th', '10th': '11th', '11th': '12th'
        };

        const currentClass = student.classLevel;
        const nextClass = currentClass ? (classMap as any)[currentClass] : null;

        let updateData: any = {};

        if (nextClass) {
            updateData.classLevel = nextClass;
        } else if (currentClass === '12th') {
            updateData.status = 'ALUMNI';
            // Optionally, we could keep them at 12th or unset class level when they graduate.
        } else {
            return res.status(400).json({ message: 'Cannot promote this student class level.' });
        }

        const promotedStudent = await prisma.student.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json(promotedStudent);
    } catch (error) {
        console.error("Error promoting student:", error);
        res.status(500).json({ message: 'Error promoting student' });
    }
});

export default router;
