import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../server';

const router = Router();

// Get all leads
router.get('/', async (req, res) => {
    try {
        const { status, date } = req.query;
        let whereClause: any = {};

        if (status && status !== 'ALL') {
            whereClause.status = status as string;
        }

        if (date) {
            const startDate = new Date(date as string);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date as string);
            endDate.setHours(23, 59, 59, 999);
            whereClause.followUpDate = {
                gte: startDate,
                lte: endDate
            };
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: {
                remarks: {
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json(leads);
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ message: 'Error fetching leads' });
    }
});

// Get today's followups
router.get('/today-followups', async (req, res) => {
    try {
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const leads = await prisma.lead.findMany({
            where: {
                followUpDate: {
                    lte: todayEnd,
                    not: null
                },
                status: {
                    notIn: ['NOT_INTERESTED', 'ADMITTED']
                }
            },
            include: {
                remarks: {
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { followUpDate: 'asc' }
        });

        res.json(leads);
    } catch (error) {
        console.error('Error fetching today followups:', error);
        res.status(500).json({ message: 'Error fetching followups' });
    }
});

// Get single lead
router.get('/:id', async (req, res) => {
    try {
        const lead = await prisma.lead.findUnique({
            where: { id: req.params.id },
            include: {
                remarks: { orderBy: { createdAt: 'desc' } }
            }
        });
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        res.json(lead);
    } catch (error) {
        console.error('Error fetching lead:', error);
        res.status(500).json({ message: 'Error fetching lead' });
    }
});

// Create new lead
router.post('/', async (req, res) => {
    try {
        const leadData = req.body;
        
        const newLead = await prisma.lead.create({
            data: {
                firstName: leadData.firstName,
                lastName: leadData.lastName,
                mobileNo: leadData.mobileNo,
                email: leadData.email,
                education: leadData.education,
                city: leadData.city,
                fatherOccupation: leadData.fatherOccupation,
                collegeName: leadData.collegeName,
                cgpa: leadData.cgpa,
                interestedCourse: leadData.interestedCourse,
                interestedBatch: leadData.interestedBatch,
                status: leadData.status || 'NEW',
                followUpDate: leadData.followUpDate ? new Date(leadData.followUpDate) : null,
            }
        });

        if (leadData.remark) {
            await prisma.leadRemark.create({
                data: {
                    leadId: newLead.id,
                    remark: leadData.remark
                }
            });
        }

        res.status(201).json(newLead);
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ message: 'Error creating lead' });
    }
});

// Update lead
router.put('/:id', async (req, res) => {
    try {
        const leadData = req.body;
        const updatedLead = await prisma.lead.update({
            where: { id: req.params.id },
            data: {
                firstName: leadData.firstName,
                lastName: leadData.lastName,
                mobileNo: leadData.mobileNo,
                email: leadData.email,
                education: leadData.education,
                city: leadData.city,
                fatherOccupation: leadData.fatherOccupation,
                collegeName: leadData.collegeName,
                cgpa: leadData.cgpa,
                interestedCourse: leadData.interestedCourse,
                interestedBatch: leadData.interestedBatch,
                status: leadData.status,
                followUpDate: leadData.followUpDate ? new Date(leadData.followUpDate) : null,
            }
        });

        // Add remark if provided during update
        if (leadData.remark) {
            await prisma.leadRemark.create({
                data: {
                    leadId: updatedLead.id,
                    remark: leadData.remark
                }
            });
        }

        res.json(updatedLead);
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({ message: 'Error updating lead' });
    }
});

// Add remark to lead
router.post('/:id/remarks', async (req, res) => {
    try {
        const { remark } = req.body;
        if (!remark) return res.status(400).json({ message: 'Remark is required' });

        const newRemark = await prisma.leadRemark.create({
            data: {
                leadId: req.params.id,
                remark
            }
        });
        res.status(201).json(newRemark);
    } catch (error) {
        console.error('Error adding remark:', error);
        res.status(500).json({ message: 'Error adding remark' });
    }
});

// Convert lead to AdmissionRequest (Promote)
router.post('/:id/admit', async (req, res) => {
    try {
        const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        if (lead.status === 'PROMOTED' || lead.status === 'ADMITTED') {
            return res.status(400).json({ message: 'This lead has already been promoted or admitted.' });
        }

        // Generate reference number (same pattern as admission.routes.ts)
        const year = new Date().getFullYear();
        const randomId = Math.floor(1000 + Math.random() * 9000);
        const referenceNumber = `APP-${year}-${randomId}`;

        // Create AdmissionRequest from lead data
        await (prisma as any).admissionRequest.create({
            data: {
                referenceNumber,
                firstName: lead.firstName,
                lastName: lead.lastName || '',
                mobileNo: lead.mobileNo,
                email: lead.email || '',
                education: lead.education,
                collegeName: lead.collegeName,
                city: lead.city,
                fatherOccupation: lead.fatherOccupation,
                interestedCourse: lead.interestedCourse,
                interestedBatch: lead.interestedBatch,
                cgpa: lead.cgpa,
                address: lead.city || '', // Use city as address fallback
                status: 'PENDING'
            }
        });

        // Update lead status to PROMOTED
        await prisma.lead.update({
            where: { id: lead.id },
            data: { status: 'PROMOTED' }
        });

        // Add a remark documenting the promotion
        await prisma.leadRemark.create({
            data: {
                leadId: lead.id,
                remark: `Lead promoted to Admission Request (Ref: ${referenceNumber})`
            }
        });

        // Notify admins
        try {
            const { notificationService } = await import('../services/notificationService');
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
                    title: 'Lead Promoted to Admission',
                    message: `${lead.firstName} ${lead.lastName || ''} has been promoted from telecalling. Reference: ${referenceNumber}`,
                    priority: 'HIGH'
                });
            }
        } catch (notifError) {
            console.error('Failed to dispatch promotion notifications:', notifError);
        }

        res.json({ message: `Lead promoted to Admission Request (${referenceNumber})`, referenceNumber });
    } catch (error) {
        console.error('Error promoting lead:', error);
        res.status(500).json({ message: 'Error promoting lead to admission' });
    }
});

// Delete lead
router.delete('/:id', async (req, res) => {
    try {
        await prisma.lead.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ message: 'Error deleting lead' });
    }
});

export default router;
