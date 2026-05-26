import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../server';
import bcrypt from 'bcryptjs';
import { generateAdmissionNumber } from '../utils/studentUtils';
import upload from '../middleware/upload.middleware';
import { uploadToCloudinary } from '../utils/cloudinary';
import { notificationService } from '../services/notificationService';

const router = Router();

// Public route: Submit general admission application
router.post('/apply', upload.single('photo'), async (req: any, res) => {
    try {
        const data = req.body;
        let photoUrl = null;

        // Upload photo if provided
        if (req.file) {
            try {
                photoUrl = await uploadToCloudinary(req.file.buffer, 'admission_photos');
            } catch (err) {
                console.error('Cloudinary upload error:', err);
                // We proceed without photo if upload fails, as it's not mandatory
            }
        }

        // Generate reference number (e.g. APP-YYYY-RANDOM)
        const year = new Date().getFullYear();
        const randomId = Math.floor(1000 + Math.random() * 9000);
        const referenceNumber = `APP-${year}-${randomId}`;

        // Create the application request
        const application = await (prisma as any).admissionRequest.create({
            data: {
                referenceNumber,
                firstName: data.firstName,
                middleName: data.middleName,
                lastName: data.lastName,
                education: data.education,
                collegeName: data.collegeName,
                universityName: data.universityName,
                mobileNo: data.mobileNo,
                email: data.email,
                parentsMobileNo: data.parentsMobileNo,
                interestedCourse: data.interestedCourse,
                fatherOccupation: data.fatherOccupation,
                cgpa: data.cgpa,
                passingYear: data.passingYear,
                address: data.address,
                city: data.city,
                source: data.source,
                dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                gender: data.gender,
                photoUrl,
                status: 'PENDING',
                fatherName: data.fatherName,
                motherName: data.motherName
            }
        });

        // Push automated notification to Super Admins and Clerks
        try {
            const adminUsers = await prisma.user.findMany({
                where: {
                    role: { in: ['SUPER_ADMIN', 'ADMISSION_OFFICER'] },
                    isActive: true
                },
                select: { id: true, email: true }
            });

            if (adminUsers.length > 0) {
                await notificationService.notifyMultiple({
                    users: adminUsers.map(admin => ({ id: admin.id, email: admin.email })),
                    type: 'admission',
                    title: 'New Admission Request',
                    message: `Application ${referenceNumber} received for ${data.firstName} ${data.lastName}.`,
                    priority: 'HIGH'
                });
            }
        } catch (notifError) {
            console.error('Failed to dispatch admission notifications:', notifError);
        }

        res.status(201).json({
            message: 'Application submitted successfully',
            referenceNumber: application.referenceNumber
        });
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ message: 'Error submitting application' });
    }
});

// Protected route: Get all pending/approved admission requests
router.get('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { status } = req.query;

        const whereClause = status ? { status: status as string } : {};

        const requests = await (prisma as any).admissionRequest.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admissions' });
    }
});

// Protected route: Approve application and convert to Student
router.post('/:id/approve', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { id } = req.params;

        const request = await (prisma as any).admissionRequest.findUnique({ where: { id } });

        if (!request || request.status !== 'PENDING') {
            return res.status(400).json({ message: 'Invalid or already processed application' });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 0. Generate Admission Number
            const admissionNumber = await generateAdmissionNumber(tx);
            // 1. Mark request as approved
            const updatedRequest = await (tx as any).admissionRequest.update({
                where: { id },
                data: { status: 'APPROVED' }
            });

            // 2. Ensure Parent User exists
            let parentUser = null;
            if (request.email) {
                parentUser = await tx.user.findUnique({ where: { email: request.email } });

                if (!parentUser) {
                    const hashedPassword = await bcrypt.hash('password123', 10);
                    parentUser = await tx.user.create({
                        data: {
                            email: request.email,
                            password: hashedPassword,
                            name: `${request.firstName} ${request.lastName}`,
                            role: 'INTERN'
                        }
                    });
                }
            }

            // 3. Create the student
            const student = await tx.student.create({
                data: {
                    admissionNumber,
                    firstName: request.firstName,
                    middleName: request.middleName,
                    lastName: request.lastName,
                    name: `${request.firstName} ${request.lastName}`,
                    email: request.email,
                    mobileNo: request.mobileNo,
                    education: request.education,
                    collegeName: request.collegeName,
                    universityName: request.universityName,
                    interestedCourse: request.interestedCourse,
                    classLevel: request.interestedCourse, // Map course to classLevel for directory filtering
                    parentsMobileNo: request.parentsMobileNo,
                    fatherOccupation: request.fatherOccupation,
                    photoUrl: request.photoUrl,
                    cgpa: request.cgpa,
                    passingYear: request.passingYear,
                    address: request.address,
                    city: request.city,
                    source: request.source,
                    dateOfBirth: request.dateOfBirth,
                    gender: request.gender,
                    status: 'ACTIVE',
                    parentEmail: request.email,
                    parentId: parentUser ? parentUser.id : null
                }
            });

            return { request: updatedRequest, student };
        });

        // Notify the intern/student about approval
        if (result.student.parentId) {
            try {
                await notificationService.notify({
                    userId: result.student.parentId,
                    email: result.student.email,
                    userName: result.student.firstName,
                    type: 'admission',
                    title: 'Admission Approved!',
                    message: `Congratulations ${result.student.firstName}! Your admission application (${result.request.referenceNumber}) has been approved. Your admission number is ${result.student.admissionNumber}. You can now login with your email.`,
                    priority: 'HIGH'
                });
            } catch (err) {
                console.error('Approval notification error:', err);
            }
        }

        res.json({ message: 'Application Approved. Student identity generated.', result });

    } catch (error) {
        console.error('Approval Error:', error);
        res.status(500).json({ message: 'Error approving application' });
    }
});

// Protected route: Reject application
router.post('/:id/reject', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { id } = req.params;

        const request = await (prisma as any).admissionRequest.update({
            where: { id },
            data: { status: 'REJECTED' }
        });

        res.json({ message: 'Application Rejected', request });
    } catch (error) {
        console.error('Reject Error:', error);
        res.status(500).json({ message: 'Error rejecting application' });
    }
});

// Protected route: Edit application
router.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const request = await (prisma as any).admissionRequest.update({
            where: { id },
            data: {
                firstName: updateData.firstName,
                middleName: updateData.middleName,
                lastName: updateData.lastName,
                education: updateData.education,
                collegeName: updateData.collegeName,
                universityName: updateData.universityName,
                mobileNo: updateData.mobileNo,
                email: updateData.email,
                parentsMobileNo: updateData.parentsMobileNo,
                interestedCourse: updateData.interestedCourse,
                fatherOccupation: updateData.fatherOccupation,
                cgpa: updateData.cgpa,
                passingYear: updateData.passingYear,
                address: updateData.address,
                city: updateData.city,
                source: updateData.source,
                dateOfBirth: updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null,
                gender: updateData.gender
            }
        });

        res.json({ message: 'Application Updated', request });
    } catch (error) {
        console.error('Update Error:', error);
        res.status(500).json({ message: 'Error updating application' });
    }
});

// Protected route: Delete application
router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { id } = req.params;

        await (prisma as any).admissionRequest.delete({
            where: { id }
        });

        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ message: 'Error deleting application' });
    }
});

export default router;
