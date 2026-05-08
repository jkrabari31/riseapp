import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Clearing old data...');
    await prisma.fee.deleteMany();
    await prisma.feeStructure.deleteMany();
    await prisma.attendance.deleteMany();

    // Clear Assessments and Quizzes to avoid foreign key constraints on students and teachers
    await prisma.assessmentSubmission.deleteMany();
    await prisma.assessment.deleteMany();

    // Clear Timetables and Assignments to avoid foreign key constraints on teachers and subjects
    await prisma.timetable.deleteMany();
    await prisma.assignment.deleteMany();

    await prisma.student.deleteMany();
    await prisma.teacherProfile.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.announcement.deleteMany();

    // New scheduling models
    await (prisma as any).scheduleTrainer.deleteMany();
    await (prisma as any).scheduleSpecialization.deleteMany();
    await (prisma as any).trainingSchedule.deleteMany();
    await (prisma as any).timeSlot.deleteMany();
    await (prisma as any).room.deleteMany();
    await (prisma as any).batchSpecialization.deleteMany();
    await (prisma as any).specialization.deleteMany();
    await (prisma as any).batch.deleteMany();

    await prisma.user.deleteMany();

    console.log('Seeding mock users...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Super Admin
    await prisma.user.create({
        data: {
            email: 'admin@rise.in',
            password: hashedPassword,
            name: 'System Admin',
            role: 'SUPER_ADMIN'
        }
    });

    // Trainer
    const trainerUser = await prisma.user.create({
        data: {
            email: 'trainer@rise.in',
            password: hashedPassword,
            name: 'Rohan Sharma',
            role: 'TRAINER'
        }
    });

    await prisma.teacherProfile.create({
        data: {
            userId: trainerUser.id,
            firstName: 'Rohan',
            lastName: 'Sharma',
            assignedClasses: '10th',
            classTeacherFor: '10th'
        }
    });

    console.log('Seeding specializations and batches...');

    const javaSpecialization = await (prisma as any).specialization.create({
        data: { name: 'Java+React', description: 'Enterprise Java with Modern React' }
    });

    const dsSpecialization = await (prisma as any).specialization.create({
        data: { name: 'Data Science', description: 'Python, AI, and Machine Learning' }
    });

    const batchA = await (prisma as any).batch.create({
        data: { name: 'January 2024 - Batch A' }
    });

    await (prisma as any).batchSpecialization.create({
        data: { batchId: batchA.id, specializationId: javaSpecialization.id, studentCount: 25 }
    });

    console.log('Seeding rooms...');
    const roomsData = [
        { name: 'Nalanda', capacity: 100 },
        { name: 'Vallabhi', capacity: 30 },
        { name: 'Somapura', capacity: 25 },
        { name: 'Shantiniketan', capacity: 50 },
    ];
    for (const r of roomsData) {
        await (prisma as any).room.create({ data: r });
    }

    console.log('Seeding time slots...');
    const slotsData = [
        { startTime: '09:00 AM', endTime: '10:00 AM', durationHours: 1.0, slotOrder: 1 },
        { startTime: '10:00 AM', endTime: '11:00 AM', durationHours: 1.0, slotOrder: 2 },
        { startTime: '11:00 AM', endTime: '12:00 PM', durationHours: 1.0, slotOrder: 3 },
        { startTime: '12:45 PM', endTime: '02:00 PM', durationHours: 1.25, slotOrder: 4 },
        { startTime: '02:00 PM', endTime: '03:00 PM', durationHours: 1.0, slotOrder: 5 },
        { startTime: '03:00 PM', endTime: '04:00 PM', durationHours: 1.0, slotOrder: 6 },
        { startTime: '04:15 PM', endTime: '05:30 PM', durationHours: 1.25, slotOrder: 7 },
        { startTime: '05:30 PM', endTime: '06:30 PM', durationHours: 1.0, slotOrder: 8 },
    ];
    for (const s of slotsData) {
        await (prisma as any).timeSlot.create({ data: s });
    }

    // Admission Officer
    await prisma.user.create({
        data: {
            email: 'admissions@rise.in',
            password: hashedPassword,
            name: 'Neha Verma',
            role: 'ADMISSION_OFFICER'
        }
    });

    // Intern
    const intern = await prisma.user.create({
        data: {
            email: 'intern@rise.in',
            password: hashedPassword,
            name: 'Vikram Singh',
            role: 'INTERN'
        }
    });

    console.log('Seeding mock students...');

    const student = await prisma.student.create({
        data: {
            admissionNumber: 'Int_0001',
            firstName: 'Aarav',
            lastName: 'Singh',
            name: 'Aarav Singh',
            dateOfBirth: new Date('2010-05-14'),
            gender: 'Male',
            classLevel: 'Full Stack Development',
            section: 'A',
            fatherName: 'Vikram Singh',
            parentEmail: 'intern@rise.in',
            status: 'ACTIVE',
            parentId: intern.id,
            batchId: batchA.id,
            specializationId: javaSpecialization.id
        } as any
    });

    await prisma.student.create({
        data: {
            admissionNumber: 'Int_0002',
            firstName: 'Diya',
            lastName: 'Patel',
            name: 'Diya Patel',
            dateOfBirth: new Date('2011-02-20'),
            gender: 'Female',
            classLevel: 'Data Science',
            section: 'B',
            status: 'ACTIVE',
            batchId: batchA.id,
            specializationId: dsSpecialization.id
        } as any
    });

    console.log('Seeding mock fee structures...');

    await prisma.feeStructure.create({
        data: {
            specializationId: javaSpecialization.id,
            tuitionFee: 40000,
            otherCharges: 5000,
            totalAmount: 45000
        }
    });

    await prisma.feeStructure.create({
        data: {
            specializationId: dsSpecialization.id,
            tuitionFee: 38000,
            otherCharges: 4000,
            totalAmount: 42000
        }
    });

    console.log('Seeding mock fee payments...');

    await prisma.fee.create({
        data: {
            studentId: student.id,
            amountPaid: 45000,
            dueAmount: 0,
            paymentDate: new Date(),
            paymentMode: 'UPI',
            receiptNumber: 'REC-2024-0001'
        }
    });

    console.log('Seeding attendance...');

    await prisma.attendance.create({
        data: {
            studentId: student.id,
            date: new Date(),
            status: 'PRESENT',
            batchId: batchA.id,
            remarks: 'Mock Seed Attendance'
        } as any
    });

    console.log('Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        // @ts-ignore
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
