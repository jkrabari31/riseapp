import { prisma } from '../server';
import { emailService } from './emailService';

type NotificationType = 'assignment' | 'assessment' | 'fee' | 'admission';

class NotificationService {

    // Cache config in memory with 60-second TTL to avoid DB hit on every notification
    private cachedConfig: any = null;
    private configCachedAt: number = 0;
    private static CONFIG_TTL_MS = 60_000; // 60 seconds

    private async getConfig() {
        const now = Date.now();
        if (this.cachedConfig && (now - this.configCachedAt) < NotificationService.CONFIG_TTL_MS) {
            return this.cachedConfig;
        }
        let config = await prisma.notificationConfig.findFirst();
        if (!config) {
            config = await prisma.notificationConfig.create({
                data: {} // Uses defaults from schema
            });
        }
        this.cachedConfig = config;
        this.configCachedAt = now;
        return config;
    }

    async notify({
        userId,
        email,
        userName,
        type,
        title,
        message,
        priority = 'NORMAL',
    }: {
        userId: string;
        email?: string | null;
        userName?: string;
        type: NotificationType;
        title: string;
        message: string;
        priority?: 'NORMAL' | 'HIGH' | 'URGENT';
    }) {
        const config = await this.getConfig();

        // 1. In-App Notification
        const inAppKey = `${type}InApp` as keyof typeof config;
        if (config[inAppKey]) {
            await prisma.notification.create({
                data: {
                    userId,
                    title,
                    message,
                    type: priority === 'NORMAL' ? 'INFO' : priority === 'HIGH' ? 'ALERT' : 'URGENT',
                    priority,
                    isRead: false
                }
            });
        }

        // 2. Email Notification
        const emailKey = `${type}Email` as keyof typeof config;
        if (config[emailKey] && email) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const payNowLink = `${frontendUrl}/fees`;

            const html = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                    <h2 style="color: #4F46E5; margin-bottom: 20px;">${title}</h2>
                    <p>Hello ${userName || 'User'},</p>
                    <p>${message}</p>
                    
                    ${type === 'fee' ? `
                        <div style="margin: 30px 0;">
                            <a href="${payNowLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                                Pay Now / View Outstanding Fees
                            </a>
                        </div>
                    ` : ''}

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #666;">This is an automated message from RISE, Rishabh Software.</p>
                    </div>
                </div>
            `;
            await emailService.sendEmail(email, title, html);
        }
    }

    /**
     * Notify multiple users at once (e.g., a batch)
     */
    async notifyMultiple({
        users,
        type,
        title,
        message,
        priority = 'NORMAL',
    }: {
        users: { id: string; email?: string | null; name?: string }[];
        type: NotificationType;
        title: string;
        message: string;
        priority?: 'NORMAL' | 'HIGH' | 'URGENT';
    }) {
        const config = await this.getConfig();
        const inAppEnabled = config[`${type}InApp` as keyof typeof config];
        const emailEnabled = config[`${type}Email` as keyof typeof config];

        if (inAppEnabled) {
            await prisma.notification.createMany({
                data: users.map(user => ({
                    userId: user.id,
                    title,
                    message,
                    type: priority === 'NORMAL' ? 'INFO' : priority === 'HIGH' ? 'ALERT' : 'URGENT',
                    priority,
                }))
            });
        }

        if (emailEnabled) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const payNowLink = `${frontendUrl}/fees`;

            for (const user of users) {
                if (user.email) {
                    const html = `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                            <h2 style="color: #4F46E5; margin-bottom: 20px;">${title}</h2>
                            <p>Hello ${user.name || 'User'},</p>
                            <p>${message}</p>

                            ${type === 'fee' ? `
                                <div style="margin: 30px 0;">
                                    <a href="${payNowLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                                        Pay Now / View Outstanding Fees
                                    </a>
                                </div>
                            ` : ''}

                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                                <p style="font-size: 12px; color: #666;">This is an automated message from RISE, Rishabh Software.</p>
                            </div>
                        </div>
                    `;
                    // Fire and forget email for each user to avoid blocking
                    emailService.sendEmail(user.email, title, html);
                }
            }
        }
    }
}

export const notificationService = new NotificationService();
