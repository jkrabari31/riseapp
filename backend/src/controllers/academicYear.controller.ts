import { Request, Response } from 'express';
import { prisma } from '../server';

export const listYears = async (req: Request, res: Response) => {
    try {
        const years = await (prisma as any).academicYear.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(years);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createYear = async (req: Request, res: Response) => {
    try {
        const { name, startDate, endDate, isCurrent } = req.body;
        
        // Use transaction to ensure only one is current
        const newYear = await (prisma as any).$transaction(async (tx: any) => {
            if (isCurrent) {
                await tx.academicYear.updateMany({
                    where: { isCurrent: true },
                    data: { isCurrent: false }
                });
            }

            const created = await tx.academicYear.create({
                data: {
                    name,
                    startDate: startDate ? new Date(startDate) : null,
                    endDate: endDate ? new Date(endDate) : null,
                    isCurrent: !!isCurrent
                }
            });

            if (isCurrent) {
                await tx.systemSettings.updateMany({
                    data: { currentYearId: created.id, academicYear: name }
                });
            }

            return created;
        });

        res.status(201).json(newYear);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateYear = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, startDate, endDate, isCurrent } = req.body;

        const updated = await (prisma as any).$transaction(async (tx: any) => {
            if (isCurrent) {
                await tx.academicYear.updateMany({
                    where: { id: { not: id }, isCurrent: true },
                    data: { isCurrent: false }
                });
            }

            const resYear = await tx.academicYear.update({
                where: { id },
                data: {
                    name,
                    startDate: startDate ? new Date(startDate) : null,
                    endDate: endDate ? new Date(endDate) : null,
                    isCurrent: !!isCurrent
                }
            });

            if (isCurrent) {
                await tx.systemSettings.updateMany({
                    data: { currentYearId: id, academicYear: name }
                });
            }

            return resYear;
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteYear = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const year = await (prisma as any).academicYear.findUnique({ where: { id } });
        if (year?.isCurrent) {
            return res.status(400).json({ message: "Cannot delete the current active academic year." });
        }

        await (prisma as any).academicYear.delete({ where: { id } });
        res.json({ message: "Academic Year deleted successfully." });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
