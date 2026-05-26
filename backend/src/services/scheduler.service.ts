import { prisma } from '../server';

export interface CreateScheduleDTO {
    batchId: string;
    date: string;
    timeSlotId: string;
    roomId: string;
    monthNo: number;
    type: string;
    focus: string;
    topic: string;
    mode: string;
    externalTrainer?: string;
    isCommon: boolean;
    createdById: string;
    trainerIds: string[];
    specializationIds: string[];
}

export const checkConflicts = async (date: Date, timeSlotId: string, roomId: string, trainerIds: string[], excludeId?: string) => {
    // 1. Room conflict
    const roomConflict = await (prisma as any).trainingSchedule.findFirst({
        where: {
            date,
            timeSlotId,
            roomId,
            id: { not: excludeId }
        }
    });
    if (roomConflict) return { type: 'ROOM', message: 'Room is already booked for this slot' };

    // 2. Trainer conflict
    const trainerConflict = await (prisma as any).scheduleTrainer.findFirst({
        where: {
            trainerId: { in: trainerIds },
            schedule: {
                date,
                timeSlotId,
                id: { not: excludeId }
            }
        },
        include: { trainer: true }
    });
    if (trainerConflict) return { type: 'TRAINER', message: `Trainer ${trainerConflict.trainer.firstName} is already assigned to another session in this slot` };

    return null;
};

export const createSchedule = async (data: CreateScheduleDTO) => {
    const date = new Date(data.date);
    const conflict = await checkConflicts(date, data.timeSlotId, data.roomId, data.trainerIds);
    if (conflict) throw new Error(conflict.message);

    return await (prisma as any).trainingSchedule.create({
        data: {
            date,
            monthNo: data.monthNo || 1,
            type: data.type,
            focus: data.focus,
            topic: data.topic,
            mode: data.mode,
            externalTrainer: data.externalTrainer,
            isCommon: data.isCommon,
            batchId: data.batchId,
            timeSlotId: data.timeSlotId,
            roomId: data.roomId,
            createdById: data.createdById,
            trainers: {
                create: data.trainerIds.map(id => ({ trainerId: id }))
            },
            specializations: {
                create: data.specializationIds.map(id => ({ specializationId: id }))
            }
        },
        include: { trainers: true, specializations: true }
    });
};

export const updateSchedule = async (id: string, data: Partial<CreateScheduleDTO> & { status?: string, updatedById: string }) => {
    const existing = await (prisma as any).trainingSchedule.findUnique({ where: { id }, include: { trainers: true } });
    if (!existing) throw new Error('Schedule not found');

    const date = data.date ? new Date(data.date) : existing.date;
    const timeSlotId = data.timeSlotId || existing.timeSlotId;
    const roomId = data.roomId || existing.roomId;
    const trainerIds = data.trainerIds || existing.trainers.map((t: any) => t.trainerId);

    const conflict = await checkConflicts(date, timeSlotId, roomId, trainerIds, id);
    if (conflict) throw new Error(conflict.message);

    return await (prisma as any).trainingSchedule.update({
        where: { id },
        data: {
            date,
            monthNo: data.monthNo,
            type: data.type,
            focus: data.focus,
            topic: data.topic,
            mode: data.mode,
            status: data.status,
            externalTrainer: data.externalTrainer,
            isCommon: data.isCommon,
            batchId: data.batchId,
            timeSlotId: data.timeSlotId,
            roomId: data.roomId,
            updatedById: data.updatedById,
            trainers: data.trainerIds ? {
                deleteMany: {},
                create: data.trainerIds.map(id => ({ trainerId: id }))
            } : undefined,
            specializations: data.specializationIds ? {
                deleteMany: {},
                create: data.specializationIds.map(id => ({ specializationId: id }))
            } : undefined
        },
        include: { 
            trainers: { include: { trainer: true } }, 
            specializations: { include: { specialization: true } },
            room: true,
            timeSlot: true,
            batch: true
        }
    });
};

export const deleteSchedule = async (id: string) => {
    return await (prisma as any).trainingSchedule.delete({ where: { id } });
};

export const getStudentSchedule = async (studentId: string) => {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new Error('Student not found');

    return await (prisma as any).trainingSchedule.findMany({
        where: {
            batchId: (student as any).batchId || undefined,
            OR: [
                { isCommon: true },
                {
                    specializations: {
                        some: { specializationId: (student as any).specializationId || '' }
                    }
                }
            ]
        },
        include: {
            room: true,
            timeSlot: true,
            trainers: { include: { trainer: true } },
            specializations: { include: { specialization: true } }
        },
        orderBy: [{ date: 'asc' }, { timeSlot: { slotOrder: 'asc' } }]
    });
};

export const getReports = async (filters: any) => {
    const where: any = { status: 'Completed' };
    const { batchId, specializationId, monthNo, weekStart, startDate, endDate } = filters;
    
    if (weekStart) {
        const start = new Date(weekStart);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        where.date = { gte: start, lt: end };
    } else if (startDate && endDate) {
        where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    } else if (monthNo) {
        // If it's a calendar month index (1-12)
        const m = parseInt(monthNo);
        const y = new Date().getFullYear();
        where.date = {
            gte: new Date(y, m - 1, 1),
            lt: new Date(y, m, 1)
        };
    }
    
    if (batchId) where.batchId = batchId;
    if (filters.specializationId) {
        where.specializations = { some: { specializationId: filters.specializationId } };
    }

    const schedules = await (prisma as any).trainingSchedule.findMany({
        where,
        include: { 
            timeSlot: true, 
            trainers: { include: { trainer: true } }, 
            room: true 
        }
    });

    const typeHours: any = {};
    const modeHours: any = { ILT: 0, Practice: 0, Measurement: 0 };
    const trainerHours: any = {};
    const focusModeHours: any = {};
    const trainerModeHours: any = {};
    const roomUtilization: any = {};

    schedules.forEach((s: any) => {
        const hours = s.timeSlot.durationHours;
        const focus = s.focus || 'Unspecified';
        const mode = s.mode;
        
        // Type-wise
        typeHours[s.type] = (typeHours[s.type] || 0) + hours;
        
        // Mode-wise
        if (mode) {
            modeHours[mode] = (modeHours[mode] || 0) + hours;
        }

        // Focus-mode Breakdown
        if (!focusModeHours[focus]) {
            focusModeHours[focus] = { ILT: 0, Practice: 0, Measurement: 0, total: 0 };
        }
        if (mode) focusModeHours[focus][mode] += hours;
        focusModeHours[focus].total += hours;
        
        // Trainer-wise (Legacy + Detailed)
        s.trainers.forEach((st: any) => {
            const name = `${st.trainer.firstName} ${st.trainer.lastName}`;
            trainerHours[name] = (trainerHours[name] || 0) + hours;

            if (!trainerModeHours[name]) {
                trainerModeHours[name] = { ILT: 0, Practice: 0, Measurement: 0 };
            }
            if (mode) trainerModeHours[name][mode] += hours;
        });
        
        if (s.externalTrainer) {
            const name = s.externalTrainer + " (External)";
            trainerHours[name] = (trainerHours[name] || 0) + hours;

            if (!trainerModeHours[name]) {
                trainerModeHours[name] = { ILT: 0, Practice: 0, Measurement: 0 };
            }
            if (mode) trainerModeHours[name][mode] += hours;
        }

        // Room-wise
        const roomName = s.room.name;
        if (!roomUtilization[roomName]) {
            roomUtilization[roomName] = { hours: 0, count: 0 };
        }
        roomUtilization[roomName].hours += hours;
        roomUtilization[roomName].count += 1;
    });

    return { 
        typeHours, 
        modeHours, 
        trainerHours, 
        trainerModeHours,
        focusModeHours,
        roomUtilization, 
        count: schedules.length 
    };
};

export const getTrainerSchedule = async (trainerProfileId: string, week?: string) => {
    let where: any = {
        trainers: {
            some: { trainerId: trainerProfileId }
        }
    };

    if (week) {
        const start = new Date(week);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        where.date = { gte: start, lt: end };
    }

    return await (prisma as any).trainingSchedule.findMany({
        where,
        include: {
            room: true,
            timeSlot: true,
            trainers: { include: { trainer: true } },
            specializations: { include: { specialization: true } },
            batch: true
        },
        orderBy: [{ date: 'asc' }, { timeSlot: { slotOrder: 'asc' } }]
    });
};

export const getInternMetricsReport = async (filters: any) => {
    const { batchId, monthNo, weekStart } = filters;
    const studentWhere: any = { status: 'ACTIVE' };
    if (batchId) studentWhere.batchId = batchId;

    // Date range for metrics
    let dateRangeWhere: any = {};
    if (weekStart) {
        const start = new Date(weekStart);
        const end = new Date(start);
        end.setDate(start.getDate() + 1); // Specific day if picking one date, or 7 for week.
        // Actually, dashboard date picker usually means "on this date". 
        // Let's assume date picker = specific day.
        dateRangeWhere = { gte: new Date(start.setHours(0,0,0,0)), lt: new Date(start.setHours(23,59,59,999)) };
    } else if (monthNo) {
        const m = parseInt(monthNo);
        const y = new Date().getFullYear();
        dateRangeWhere = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    const students = await (prisma as any).student.findMany({
        where: studentWhere,
        include: {
            assessmentSubmissions: {
                where: dateRangeWhere.gte ? { submittedAt: dateRangeWhere } : {}
            }
        }
    });

    // Subject-wise Scores
    const subjects = await (prisma as any).subject.findMany({
        include: { assessments: true }
    });

    const scoreMetrics: any[] = [];
    
    subjects.forEach((subject: any) => {
        const assessments = subject.assessments;
        if (assessments.length === 0) return;

        let counts = { na: 0, absent: 0, below60: 0, b60_70: 0, b70_80: 0, above80: 0 };

        students.forEach((student: any) => {
            const applicable = assessments.filter((a: any) => {
                const batchMatch = !a.batchId || a.batchId === student.batchId;
                const specMatch = !a.specializationId || a.specializationId === student.specializationId;
                return batchMatch && specMatch;
            });

            if (applicable.length === 0) {
                counts.na++;
                return;
            }

            const submissions = student.assessmentSubmissions.filter((sub: any) => 
                applicable.some((a: any) => a.id === sub.assessmentId)
            );

            if (submissions.length === 0) {
                counts.absent++;
                return;
            }

            let totalPct = 0;
            submissions.forEach((sub: any) => {
                totalPct += (sub.score / sub.totalQuestions) * 100;
            });
            const avgPct = totalPct / submissions.length;

            if (avgPct < 60) counts.below60++;
            else if (avgPct < 70) counts.b60_70++;
            else if (avgPct < 80) counts.b70_80++;
            else counts.above80++;
        });

        scoreMetrics.push({
            subjectName: subject.name,
            ...counts
        });
    });

    // Week-wise Attendance
    const attWhere: any = dateRangeWhere.gte ? { date: dateRangeWhere } : {};
    if (batchId) attWhere.student = { batchId };

    const allAttendances = await (prisma as any).attendance.findMany({
        where: attWhere,
        orderBy: { date: 'asc' }
    });

    const weekWiseAttendance: Record<string, any> = {};
    const overallStats: Record<string, { total: number, present: number }> = {};

    const getWeekStr = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0,0,0,0);
        return d.toISOString().split('T')[0];
    };

    allAttendances.forEach((att: any) => {
        const weekStr = getWeekStr(new Date(att.date));
        if (!weekWiseAttendance[weekStr]) {
            weekWiseAttendance[weekStr] = { studentData: {} };
        }
        
        if (!weekWiseAttendance[weekStr].studentData[att.studentId]) {
            weekWiseAttendance[weekStr].studentData[att.studentId] = { total: 0, present: 0 };
        }
        weekWiseAttendance[weekStr].studentData[att.studentId].total++;
        if (att.status === 'PRESENT') {
            weekWiseAttendance[weekStr].studentData[att.studentId].present++;
        }

        if (!overallStats[att.studentId]) {
            overallStats[att.studentId] = { total: 0, present: 0 };
        }
        overallStats[att.studentId].total++;
        if (att.status === 'PRESENT') overallStats[att.studentId].present++;
    });

    const attendanceOutput = { weeks: [] as any[], overall: { below80: 0, b80_90: 0, above90: 0 } };

    Object.keys(weekWiseAttendance).sort().forEach((weekStr) => {
        const buckets = { below80: 0, b80_90: 0, above90: 0, weekStr };
        const sData = weekWiseAttendance[weekStr].studentData;
        
        Object.values(sData).forEach((data: any) => {
            if (data.total === 0) return;
            const pct = (data.present / data.total) * 100;
            if (pct < 80) buckets.below80++;
            else if (pct <= 90) buckets.b80_90++;
            else buckets.above90++;
        });

        attendanceOutput.weeks.push(buckets);
    });

    Object.values(overallStats).forEach((data: any) => {
        if (data.total === 0) return;
        const pct = (data.present / data.total) * 100;
        if (pct < 80) attendanceOutput.overall.below80++;
        else if (pct <= 90) attendanceOutput.overall.b80_90++;
        else attendanceOutput.overall.above90++;
    });

    return {
        scores: scoreMetrics,
        attendance: attendanceOutput
    };
};
