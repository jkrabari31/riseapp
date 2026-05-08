import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Check if admin user exists
    const user = await prisma.user.findUnique({ where: { email: 'admin@educore.in' } });
    if (!user) {
        console.log('ERROR: Admin user not found!');
        return;
    }
    console.log('Admin user found:', { email: user.email, role: user.role, name: user.name });

    // Check password
    const isMatch = await bcrypt.compare('password123', user.password);
    console.log('Password match:', isMatch);

    if (isMatch) {
        console.log('SUCCESS: Login credentials are valid!');
    } else {
        console.log('ERROR: Password does not match!');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
