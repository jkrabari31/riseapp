import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
    console.log('Starting Academic Year Migration...');

    // 1. Get current settings
    const settings = await prisma.systemSettings.findFirst();
    const currentYearName = settings?.academicYear || '2024 - 2025';

    // 2. Create the first Academic Year record
    const academicYear = await (prisma as any).academicYear.upsert({
        where: { name: currentYearName },
        update: { isCurrent: true },
        create: {
            name: currentYearName,
            isCurrent: true,
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31')
        }
    });

    console.log(`Initialized Academic Year: ${academicYear.name}`);

    // 3. Link existing SystemSettings
    if (settings) {
        await (prisma as any).systemSettings.update({
            where: { id: settings.id },
            data: { currentYearId: academicYear.id }
        });
    }

    // 4. Link existing Batches
    const batchUpdate = await (prisma as any).batch.updateMany({
        where: { academicYearId: null },
        data: { academicYearId: academicYear.id }
    });
    console.log(`Linked ${batchUpdate.count} Batches.`);

    // 5. Link existing Students
    const studentUpdate = await (prisma as any).student.updateMany({
        where: { academicYearId: null },
        data: { academicYearId: academicYear.id }
    });
    console.log(`Linked ${studentUpdate.count} Students.`);

    // 6. Link existing Fees
    const feeUpdate = await (prisma as any).fee.updateMany({
        where: { academicYearId: null },
        data: { academicYearId: academicYear.id }
    });
    console.log(`Linked ${feeUpdate.count} Fees.`);

    // 7. Link existing Assessments
    const assessmentUpdate = await (prisma as any).assessment.updateMany({
        where: { academicYearId: null },
        data: { academicYearId: academicYear.id }
    });
    console.log(`Linked ${assessmentUpdate.count} Assessments.`);

    console.log('Migration completed successfully!');
}

migrate()
    .catch((e) => {
        console.error('Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
