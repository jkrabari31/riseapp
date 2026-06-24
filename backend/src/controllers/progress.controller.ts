import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getProgressData = async (req: Request, res: Response) => {
    try {
        const batchId = req.params.batchId as string;

        const students = await prisma.student.findMany({
            where: { batchId, status: { in: ['ACTIVE', 'ON_LEAVE'] } },
            include: {
                progressData: true,
                specialization: true
            },
            orderBy: { firstName: 'asc' }
        });

        res.json(students);
    } catch (error: any) {
        console.error('Error fetching progress data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const saveProgressData = async (req: Request, res: Response) => {
    try {
        const batchId = req.params.batchId as string;
        const { updates } = req.body; // Array of { studentId, attendancePct, offlineScoresJSON }

        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ message: 'Invalid data format' });
        }

        const results = await prisma.$transaction(
            updates.map((update: any) => 
                prisma.studentProgressData.upsert({
                    where: { studentId: update.studentId },
                    update: {
                        attendancePct: update.attendancePct,
                        offlineScoresJSON: update.offlineScoresJSON
                    },
                    create: {
                        studentId: update.studentId,
                        attendancePct: update.attendancePct,
                        offlineScoresJSON: update.offlineScoresJSON
                    }
                })
            )
        );

        res.json({ message: 'Progress data saved successfully', count: results.length });
    } catch (error: any) {
        console.error('Error saving progress data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getBatchAssessments = async (req: Request, res: Response) => {
    try {
        const batchId = req.params.batchId as string;

        const assessments = await prisma.assessment.findMany({
            where: { batchId },
            include: {
                submissions: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(assessments);
    } catch (error: any) {
        console.error('Error fetching batch assessments:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
