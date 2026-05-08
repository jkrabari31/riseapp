import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../server';
import bcrypt from 'bcryptjs';

const router = Router();

// Public (no-auth) endpoint — returns just enough info for public-facing pages (e.g. admission form)
router.get('/public', async (_req, res) => {
    try {
        let settings = await prisma.systemSettings.findFirst();
        if (!settings) {
            settings = await prisma.systemSettings.create({ data: {} });
        }
        res.json({
            instituteName: settings.instituteName,
            address: settings.address,
            contactEmail: settings.contactEmail
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching public settings' });
    }
});

// Get the unified global system settings
router.get('/', authenticateToken, async (req, res) => {
    try {
        let settings = await prisma.systemSettings.findFirst();

        // If settings don't exist yet, seed the default config payload
        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: {} // Relies on the defaults configured in schema.prisma natively
            });
        }

        res.json(settings);
    } catch (error) {
        console.error('Fetch Settings Error:', error);
        res.status(500).json({ message: 'Error fetching system settings' });
    }
});

// Update global system settings (Super Admin Only)
router.put('/', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        const { instituteName, academicYear, contactEmail, address } = req.body;

        let settings = await prisma.systemSettings.findFirst();

        if (!settings) {
            settings = await prisma.systemSettings.create({ data: {} });
        }

        const updatedSettings = await prisma.systemSettings.update({
            where: { id: settings.id },
            data: {
                instituteName,
                academicYear,
                contactEmail,
                address
            }
        });

        res.json({ success: true, settings: updatedSettings });
    } catch (error) {
        console.error('Update Settings Error:', error);
        res.status(500).json({ message: 'Error updating system settings' });
    }
});

// Create CEO User (Super Admin Only)
router.post('/ceo', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ message: 'A user with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const ceo = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'CEO',
                isActive: true
            }
        });
        
        res.json({ success: true, message: `Successfully created CEO account for ${ceo.name}` });
    } catch (error) {
        console.error('Create CEO Error:', error);
        res.status(500).json({ message: 'Error creating CEO account' });
    }
});

// Get all CEO Users (Super Admin Only)
router.get('/ceos', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        const ceos = await prisma.user.findMany({
            where: { role: 'CEO' },
            select: { id: true, name: true, email: true, createdAt: true, isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(ceos);
    } catch (error) {
        console.error('Fetch CEOs Error:', error);
        res.status(500).json({ message: 'Error fetching CEO accounts' });
    }
});

// Delete CEO User (Super Admin Only)
router.delete('/ceos/:id', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        const id = req.params.id as string;
        await prisma.user.delete({ where: { id } });
        res.json({ success: true, message: 'CEO account removed successfully' });
    } catch (error) {
        console.error('Delete CEO Error:', error);
        res.status(500).json({ message: 'Error deleting CEO account' });
    }
});

// ─────────────────────────────────────────────
// Notification Configuration
// ─────────────────────────────────────────────

// Get current notification settings
router.get('/notifications', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        let config = await prisma.notificationConfig.findFirst();
        if (!config) {
            config = await prisma.notificationConfig.create({ data: {} });
        }
        res.json(config);
    } catch (error) {
        console.error('Fetch Notification Config Error:', error);
        res.status(500).json({ message: 'Error fetching notification settings' });
    }
});

// Update notification settings
router.put('/notifications', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        const data = req.body;
        let config = await prisma.notificationConfig.findFirst();
        
        if (!config) {
            config = await prisma.notificationConfig.create({ data: {} });
        }

        const updated = await prisma.notificationConfig.update({
            where: { id: config.id },
            data: {
                assignmentInApp: data.assignmentInApp,
                assignmentEmail: data.assignmentEmail,
                assessmentInApp: data.assessmentInApp,
                assessmentEmail: data.assessmentEmail,
                feeInApp: data.feeInApp,
                feeEmail: data.feeEmail,
                admissionInApp: data.admissionInApp,
                admissionEmail: data.admissionEmail
            }
        });

        res.json({ success: true, config: updated });
    } catch (error) {
        console.error('Update Notification Config Error:', error);
        res.status(500).json({ message: 'Error updating notification settings' });
    }
});

export default router;

