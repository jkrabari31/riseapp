import { Request, Response } from 'express';
import { prisma } from '../server';

export const exportStudents = async (req: Request, res: Response) => {
    try {
        const { batchId } = req.query;
        const students = await (prisma as any).student.findMany({
            where: batchId ? { batchId: String(batchId) } : {},
            include: {
                batch: true,
                specialization: true
            }
        });

        const data = students.map((s: any) => ({
            "Intern ID": s.admissionNumber,
            "First Name": s.firstName,
            "Last Name": s.lastName,
            "Email": s.email || '',
            "Mobile No": s.mobileNo || '',
            "Gender": s.gender || '',
            "Date of Birth": s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : '',
            "Status": s.status,
            "Batch Name": s.batch?.name || '',
            "Specialization": s.specialization?.name || '',
            "Education": s.education || '',
            "College Name": s.collegeName || '',
            "University Name": s.universityName || '',
            "Passing Year": s.passingYear || '',
            "CGPA": s.cgpa || '',
            "City": s.city || '',
            "Interested Course": s.interestedCourse || '',
            "Source": s.source || '',
            "Father Name": s.fatherName || '',
            "Mother Name": s.motherName || '',
            "Parents Mobile": s.parentsMobileNo || '',
            "Father Occupation": s.fatherOccupation || '',
            "Parent Email": s.parentEmail || '',
        }));

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const exportAssessments = async (req: Request, res: Response) => {
    try {
        const { batchId, subjectId } = req.query;

        const submissions = await (prisma as any).assessmentSubmission.findMany({
            where: {
                student: batchId ? { batchId: String(batchId) } : { status: 'ACTIVE' },
                assessment: subjectId ? { subjectId: String(subjectId) } : {}
            },
            include: {
                student: { include: { specialization: true, batch: true } },
                assessment: { include: { subject: true } }
            }
        });

        const data = submissions.map((sub: any) => ({
            "Intern ID": sub.student.admissionNumber,
            "Intern Name": `${sub.student.firstName} ${sub.student.lastName}`,
            "Batch": sub.student.batch?.name || '',
            "Specialization": sub.student.specialization?.name || '',
            "Subject Name": sub.assessment.subject?.name || '',
            "Assessment Title": sub.assessment.title,
            "Total Questions": sub.totalQuestions,
            "Achieved Score": sub.score,
            "Percentage": `${((sub.score / sub.totalQuestions) * 100).toFixed(2)}%`,
            "Submitted Date": new Date(sub.submittedAt).toLocaleDateString(),
            "Due Date": new Date(sub.assessment.dueDate).toLocaleDateString()
        }));

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const exportSchedules = async (req: Request, res: Response) => {
    try {
        const { batchId } = req.query;
        const schedules = await (prisma as any).trainingSchedule.findMany({
            where: batchId ? { batchId: String(batchId) } : {},
            include: {
                batch: true,
                timeSlot: true,
                room: true,
                trainers: { include: { trainer: true } }
            },
            orderBy: { date: 'asc' }
        });

        const data = schedules.map((s: any) => ({
            "Date": new Date(s.date).toLocaleDateString(),
            "Month No": s.monthNo,
            "Batch Name": s.batch?.name || '',
            "Slot Start": s.timeSlot?.startTime || '',
            "Slot End": s.timeSlot?.endTime || '',
            "Duration (Hrs)": s.timeSlot?.durationHours || '',
            "Room": s.room?.name || '',
            "Type": s.type,
            "Mode": s.mode,
            "Focus": s.focus,
            "Topic": s.topic,
            "Status": s.status,
            "Trainers": s.trainers.map((st: any) => `${st.trainer.firstName} ${st.trainer.lastName}`).join(', '),
            "External Trainer": s.externalTrainer || '',
        }));

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const exportFees = async (req: Request, res: Response) => {
    try {
        const { batchId } = req.query;
        
        // Fetch students and their structured fees
        const students = await (prisma as any).student.findMany({
            where: batchId ? { batchId: String(batchId) } : {},
            include: {
                batch: true,
                specialization: { include: { feeStructure: true } },
                fees: { orderBy: { paymentDate: 'asc' } }
            }
        });

        const data: any[] = [];

        students.forEach((s: any) => {
            const fixedFee = s.specialization?.feeStructure?.totalAmount || 'Not Assigned';
            let currentDue = s.specialization?.feeStructure?.totalAmount || 0;

            if (s.fees && s.fees.length > 0) {
                // Return a row for each payment 
                s.fees.forEach((fee: any) => {
                    data.push({
                        "Intern ID": s.admissionNumber,
                        "Intern Name": `${s.firstName} ${s.lastName}`,
                        "Batch": s.batch?.name || '',
                        "Specialization": s.specialization?.name || '',
                        "Fixed Fees (Specialization)": fixedFee,
                        "Receipt No": fee.receiptNumber,
                        "Amount Paid": fee.amountPaid,
                        "Payment Mode": fee.paymentMode,
                        "Payment Date": new Date(fee.paymentDate).toLocaleDateString(),
                        "Remaining Due": fee.dueAmount
                    });
                });
            } else {
                // Log the student anyway to show they haven't paid
                data.push({
                    "Intern ID": s.admissionNumber,
                    "Intern Name": `${s.firstName} ${s.lastName}`,
                    "Batch": s.batch?.name || '',
                    "Specialization": s.specialization?.name || '',
                    "Fixed Fees (Specialization)": fixedFee,
                    "Receipt No": 'N/A',
                    "Amount Paid": 0,
                    "Payment Mode": 'N/A',
                    "Payment Date": 'N/A',
                    "Remaining Due": currentDue
                });
            }
        });

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const exportAttendance = async (req: Request, res: Response) => {
    try {
        const { batchId } = req.query;
        
        const attendances = await (prisma as any).attendance.findMany({
            where: batchId ? { batchId: String(batchId) } : {},
            include: {
                student: true,
                batch: true
            },
            orderBy: { date: 'asc' }
        });

        const data = attendances.map((a: any) => ({
            "Intern ID": a.student?.admissionNumber || '',
            "Intern Name": `${a.student?.firstName || ''} ${a.student?.lastName || ''}`,
            "Batch Name": a.batch?.name || '',
            "Date": new Date(a.date).toLocaleDateString(),
            "Status": a.status,
            "Remarks": a.remarks || ''
        }));

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
