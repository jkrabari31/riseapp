import { Request, Response } from 'express';
import * as schedulerService from '../services/scheduler.service';
import { prisma } from '../server';

const checkSchedulerAccess = async (userId: string, role: string) => {
    if (role === 'SUPER_ADMIN' || role === 'ADMISSION_OFFICER') return true;
    if (role === 'TRAINER') {
        const profile = await prisma.teacherProfile.findUnique({ where: { userId } });
        return profile?.canEditTimetable || false;
    }
    return false;
};

export const bulkCreateSchedule = async (req: Request, res: Response) => {
    try {
        const { entries } = req.body;
        const user = (req as any).user;
        
        if (!await checkSchedulerAccess(user.id, user.role)) {
            return res.status(403).json({ message: 'Access Denied: You do not have permission to manage schedules' });
        }

        // Optimized: run creates in parallel instead of sequential for-loop
        const results = await Promise.all(
            entries.map((entry: any) => schedulerService.createSchedule({ ...entry, createdById: user.id }))
        );
        res.status(201).json(results);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getStudentSchedule = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        // In this system, User role INTERN should have a linked Student record
        const student = await prisma.student.findFirst({ where: { parentId: userId } }); // Assuming intern user links via parentId or similar
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        const schedule = await schedulerService.getStudentSchedule(student.id);
        res.json(schedule);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSchedule = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const user = (req as any).user;

        if (!await checkSchedulerAccess(user.id, user.role)) {
            return res.status(403).json({ message: 'Access Denied: You do not have permission to manage schedules' });
        }

        console.log(`Updating session ${id} by user ${user.id}. Body:`, req.body);
        const result = await schedulerService.updateSchedule(id, { ...req.body, updatedById: user.id });
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteSchedule = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const user = (req as any).user;

        if (!await checkSchedulerAccess(user.id, user.role)) {
            return res.status(403).json({ message: 'Access Denied: You do not have permission to manage schedules' });
        }

        await schedulerService.deleteSchedule(id);
        res.json({ message: 'Schedule deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateScheduleStatus = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { status } = req.body;
        const schedule = await (prisma as any).trainingSchedule.update({
            where: { id },
            data: { status, updatedById: (req as any).user.id }
        });
        res.json(schedule);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getTypeHoursReport = async (req: Request, res: Response) => {
    try {
        const reports = await schedulerService.getReports(req.query);
        res.json(reports);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getInternMetricsReport = async (req: Request, res: Response) => {
    try {
        const reports = await schedulerService.getInternMetricsReport(req.query);
        res.json(reports);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getRooms = async (req: Request, res: Response) => {
    try {
        const rooms = await (prisma as any).room.findMany();
        res.json(rooms);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTimeSlots = async (req: Request, res: Response) => {
    try {
        const slots = await (prisma as any).timeSlot.findMany({ orderBy: { slotOrder: 'asc' } });
        res.json(slots);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBatches = async (req: Request, res: Response) => {
    try {
        const batches = await (prisma as any).batch.findMany({ include: { specializations: { include: { specialization: true } } } });
        res.json(batches);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSpecializations = async (req: Request, res: Response) => {
    try {
        const specs = await (prisma as any).specialization.findMany();
        res.json(specs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSchedules = async (req: Request, res: Response) => {
    try {
        const { week, batchId } = req.query;
        let where: any = {};
        if (week) {
            const start = new Date(week as string);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            where.date = { gte: start, lt: end };
        }
        if (batchId) {
            where.batchId = batchId as string;
        }
        const schedules = await (prisma as any).trainingSchedule.findMany({
            where,
            include: {
                room: true,
                timeSlot: true,
                trainers: { include: { trainer: true } },
                specializations: { include: { specialization: true } },
                batch: true
            }
        });
        res.json(schedules);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTrainerSchedule = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { week } = req.query;

        const trainer = await prisma.teacherProfile.findUnique({ where: { userId } });
        if (!trainer) return res.status(404).json({ message: 'Trainer profile not found' });

        const schedule = await schedulerService.getTrainerSchedule(trainer.id, week as string);
        res.json(schedule);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Metadata management
export const createRoom = async (req: Request, res: Response) => {
    try {
        const room = await (prisma as any).room.create({ data: req.body });
        res.status(201).json(room);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateRoom = async (req: Request, res: Response) => {
    try {
        const room = await (prisma as any).room.update({ where: { id: req.params.id }, data: req.body });
        res.json(room);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteRoom = async (req: Request, res: Response) => {
    try {
        await (prisma as any).room.delete({ where: { id: req.params.id } });
        res.json({ message: 'Room deleted' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const createSpecialization = async (req: Request, res: Response) => {
    try {
        const spec = await (prisma as any).specialization.create({ data: req.body });
        res.status(201).json(spec);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateSpecialization = async (req: Request, res: Response) => {
    try {
        const spec = await (prisma as any).specialization.update({ where: { id: req.params.id }, data: req.body });
        res.json(spec);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteSpecialization = async (req: Request, res: Response) => {
    try {
        await (prisma as any).specialization.delete({ where: { id: req.params.id } });
        res.json({ message: 'Specialization deleted' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const createBatch = async (req: Request, res: Response) => {
    try {
        const batch = await (prisma as any).batch.create({ data: req.body });
        res.status(201).json(batch);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateBatch = async (req: Request, res: Response) => {
    try {
        const batch = await (prisma as any).batch.update({ where: { id: req.params.id }, data: req.body });
        res.json(batch);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteBatch = async (req: Request, res: Response) => {
    try {
        await (prisma as any).batch.delete({ where: { id: req.params.id } });
        res.json({ message: 'Batch deleted' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const setBatchCurrent = async (req: Request, res: Response) => {
    try {
        const batchId = String(req.params.id);
        
        // Use a transaction to ensure atomic update
        await (prisma as any).$transaction(async (tx: any) => {
            // Set all batches to isCurrent: false
            await tx.batch.updateMany({
                data: { isCurrent: false }
            });
            
            // Set target batch to isCurrent: true
            await tx.batch.update({
                where: { id: batchId },
                data: { isCurrent: true }
            });
        });
        
        res.json({ message: 'Batch set as active successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const createTimeSlot = async (req: Request, res: Response) => {
    try {
        const slot = await (prisma as any).timeSlot.create({ data: req.body });
        res.status(201).json(slot);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteTimeSlot = async (req: Request, res: Response) => {
    try {
        await (prisma as any).timeSlot.delete({ where: { id: req.params.id } });
        res.json({ message: 'Time slot deleted' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const cloneDay = async (req: Request, res: Response) => {
    try {
        const { sourceDate, targetDates, overrideTrainerId, overrideBatchId, overrideRoomId } = req.body;
        const user = (req as any).user;
        
        if (!await checkSchedulerAccess(user.id, user.role)) {
            return res.status(403).json({ message: 'Access Denied: You do not have permission to manage schedules' });
        }

        const startOfDay = new Date(sourceDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(sourceDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch source day schedules
        const sourceSchedules = await (prisma as any).trainingSchedule.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                trainers: true,
                specializations: true
            }
        });

        if (sourceSchedules.length === 0) {
            return res.status(404).json({ message: 'No schedules found on source date to copy' });
        }

        const newEntries: any[] = [];
        
        for (const tDateStr of targetDates) {
            const tDate = new Date(tDateStr);
            tDate.setHours(12, 0, 0, 0); // avoid timezone issues
            for (const s of sourceSchedules) {
                newEntries.push({
                    date: tDate.toISOString().split('T')[0],
                    monthNo: s.monthNo,
                    type: s.type,
                    focus: s.focus,
                    topic: s.topic,
                    mode: s.mode,
                    isCommon: s.isCommon,
                    externalTrainer: s.externalTrainer,
                    batchId: overrideBatchId || s.batchId,
                    roomId: overrideRoomId || s.roomId,
                    timeSlotId: s.timeSlotId,
                    trainerIds: overrideTrainerId ? [overrideTrainerId] : s.trainers.map((t: any) => t.trainerId),
                    specializationIds: s.specializations.map((sp: any) => sp.specializationId)
                });
            }
        }

        const results = await Promise.all(
            newEntries.map((entry: any) => schedulerService.createSchedule({ ...entry, createdById: user.id }))
        );

        res.status(201).json({ message: `Cloned ${sourceSchedules.length} schedules to ${targetDates.length} days`, results });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
