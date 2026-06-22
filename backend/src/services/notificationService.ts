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

    private getEmailHtml(title: string, userName: string, message: string, type: NotificationType, payNowLink: string, loginLink: string, credentials?: { username?: string, password?: string }) {
        return `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #4F46E5 0%, #3b82f6 100%); padding: 30px 20px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: bold; }
  .content { padding: 40px 30px; color: #374151; line-height: 1.8; font-size: 16px; }
  .greeting { font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 20px; }
  .message { margin-bottom: 30px; }
  .credentials-box { background-color: #f8fafc; border-left: 4px solid #4F46E5; padding: 20px; border-radius: 4px; margin: 30px 0; }
  .credentials-box p { margin: 5px 0; font-family: monospace; font-size: 15px; }
  .credentials-box strong { color: #4F46E5; font-family: 'Segoe UI', sans-serif; }
  .button-container { text-align: center; margin: 40px 0 20px 0; }
  .button { background-color: #4F46E5; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.3s; }
  .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RISE Institute</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello ${userName || 'User'},</div>
      <div class="message">${message}</div>
      
      ${credentials ? `
      <div class="credentials-box">
        <h3 style="margin-top:0; margin-bottom: 15px; color:#1f2937; font-family:sans-serif;">Your Login Details</h3>
        <p><strong>Email/Username:</strong> ${credentials.username}</p>
        <p><strong>Password:</strong> ${credentials.password}</p>
        <p style="font-size: 12px; color: #6b7280; margin-top: 10px; font-family: sans-serif;">Please change your password after logging in for the first time.</p>
      </div>
      ` : ''}

      ${type === 'fee' ? `
      <div class="button-container">
        <a href="${payNowLink}" class="button">Pay Now / View Outstanding Fees</a>
      </div>
      ` : ''}

      ${type === 'admission' ? `
      <div class="button-container">
        <a href="${loginLink}" class="button">Login to Portal</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>This is an automated message from RISE, Rishabh Software.</p>
      <p>&copy; ${new Date().getFullYear()} RISE Institute. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
    }

    async notify({
        userId,
        email,
        userName,
        type,
        title,
        message,
        priority = 'NORMAL',
        credentials
    }: {
        userId: string;
        email?: string | null;
        userName?: string;
        type: NotificationType;
        title: string;
        message: string;
        priority?: 'NORMAL' | 'HIGH' | 'URGENT';
        credentials?: { username?: string, password?: string };
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
            const loginLink = `${frontendUrl}/login`;

            const html = this.getEmailHtml(title, userName || 'User', message, type, payNowLink, loginLink, credentials);
            // Fire and forget to avoid blocking API response
            emailService.sendEmail(email, title, html).catch(err => console.error('Email send error:', err));
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
        credentials
    }: {
        users: { id: string; email?: string | null; name?: string }[];
        type: NotificationType;
        title: string;
        message: string;
        priority?: 'NORMAL' | 'HIGH' | 'URGENT';
        credentials?: { username?: string, password?: string };
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
            const loginLink = `${frontendUrl}/login`;

            for (const user of users) {
                if (user.email) {
                    const html = this.getEmailHtml(title, user.name || 'User', message, type, payNowLink, loginLink, credentials);
                    // Fire and forget email for each user to avoid blocking
                    emailService.sendEmail(user.email, title, html);
                }
            }
        }
    }
}

export const notificationService = new NotificationService();
