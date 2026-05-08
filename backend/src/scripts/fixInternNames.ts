import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixNames() {
    console.log('Starting Intern Name Fix Migration...');

    // 1. Find all users with the INTERN role
    const users = await prisma.user.findMany({
        where: { role: 'INTERN' }
    });

    console.log(`Found ${users.length} intern users.`);

    let updatedCount = 0;

    for (const user of users) {
        // 2. Find the corresponding student by email
        const student = await prisma.student.findFirst({
            where: { email: user.email }
        });

        if (student) {
            const studentFullName = `${student.firstName} ${student.lastName}`;
            
            // Log if the name is different
            if (user.name !== studentFullName) {
                console.log(`Updating user ${user.email}: "${user.name}" -> "${studentFullName}"`);
                
                await prisma.user.update({
                    where: { id: user.id },
                    data: { name: studentFullName }
                });
                updatedCount++;
            }
        } else {
            console.warn(`No student record found for intern user: ${user.email}`);
        }
    }

    console.log(`Migration completed. Updated ${updatedCount} user names.`);
}

fixNames()
    .catch((e) => {
        console.error('Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
