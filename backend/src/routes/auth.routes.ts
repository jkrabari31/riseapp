import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../server';

const router = Router();

// Validate current token and return user details
router.get('/me', authenticateToken, async (req: any, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, isActive: true }
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Account not found or deactivated' });
        }
        res.json({ user });
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired session' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if the stored password is a bcrypt hash (starts with $2a$, $2b$, etc.)
        let isPasswordValid = false;
        if (user.password.startsWith('$2')) {
            isPasswordValid = await bcrypt.compare(password, user.password);
        } else {
            // Fallback: plaintext compare for seeded mock MVP users
            isPasswordValid = user.password === password;
        }

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is deactivated' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update Password endpoint (Logged In Users Only)
router.put('/password', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate the current password natively
        let isPasswordValid = false;
        if (user.password.startsWith('$2')) {
            isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        } else {
            isPasswordValid = user.password === currentPassword;
        }

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid current password' });
        }

        // Securely hash the new user credentials and push to db
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword }
        });

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password Update Error:', error);
        res.status(500).json({ message: 'Error updating password' });
    }
});

// Admin Password Override endpoint
router.post('/reset-password-admin', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { targetEmail, newPassword } = req.body;

        const targetUser = await prisma.user.findUnique({ where: { email: targetEmail } });
        if (!targetUser) {
            return res.status(404).json({ message: 'No registered user matches this email address.' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { email: targetEmail },
            data: { password: hashedNewPassword }
        });

        res.json({ success: true, message: `Password for ${targetUser.name} (${targetUser.role}) has been successfully overridden.` });
    } catch (error) {
        console.error('Admin Password Override Error:', error);
        res.status(500).json({ message: 'Error overriding password' });
    }
});

export default router;
