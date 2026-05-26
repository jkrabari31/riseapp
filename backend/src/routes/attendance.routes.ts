import { Router } from 'express';
import { prisma } from '../server';

const router = Router();

// Get attendance for a batch on a date
router.get('/', async (req, res) => {
    try {
        const { date, batchId } = req.query;

        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                batchId: batchId as string,
                date: date ? new Date(date as string) : undefined,
            },
            include: {
                student: { select: { admissionNumber: true, name: true, firstName: true, lastName: true } }
            }
        });

        res.json(attendanceRecords);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance' });
    }
});

// Export attendance by Date Range
router.get('/export', async (req, res) => {
    try {
        const { startDate, endDate, batchId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Start date and end date are required" });
        }

        const whereClause: any = {
            date: {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            }
        };

        if (batchId && batchId !== 'All') whereClause.batchId = batchId as string;

        const attendanceRecords = await prisma.attendance.findMany({
            where: whereClause,
            include: {
                student: { select: { admissionNumber: true, rollNumber: true, name: true, firstName: true, lastName: true } }
            },
            orderBy: {
                date: 'asc'
            }
        });

        res.json(attendanceRecords);
    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ message: 'Error fetching export data' });
    }
});

// Mark attendance batch
router.post('/mark', async (req, res) => {
    try {
        const { attendanceRecords } = req.body; // Array of { studentId, date, status, batchId, remarks }

        const results = await prisma.$transaction(
            attendanceRecords.map((record: any) =>
                prisma.attendance.upsert({
                    where: {
                        studentId_date: {
                            studentId: record.studentId,
                            date: new Date(record.date)
                        }
                    },
                    update: {
                        status: record.status,
                        remarks: record.remarks,
                        batchId: record.batchId
                    },
                    create: {
                        studentId: record.studentId,
                        date: new Date(record.date),
                        status: record.status,
                        batchId: record.batchId,
                        remarks: record.remarks
                    }
                })
            )
        );

        res.status(201).json({ message: 'Attendance marked', count: results.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error marking attendance' });
    }
});

export default router;
