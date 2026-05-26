import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { notificationService } from '../services/notificationService';
import { prisma } from '../server';
import crypto from 'crypto';
import Razorpay from 'razorpay';

const router = Router();

let razorpay: any;
function getRazorpay() {
    if (!razorpay) {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!
        });
    }
    return razorpay;
}

// ─────────────────────────────────────────────
// HELPER: get student where clause by user role
// ─────────────────────────────────────────────
function getInternWhereClause(user: any): any {
    // Interns are linked via their own email stored on the Student record
    if (user.role === 'INTERN') {
        return { email: user.email };
    }
    return {};
}

// ─────────────────────────────────────────────
// GET /fees  —  Summary dashboard
// ─────────────────────────────────────────────
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        const user = req.user;
        let totalCollected = 0;
        let totalCollectable = 0;
        let receiptsGenerated = 0;

        const structures = await prisma.feeStructure.findMany();
        const structureMap = new Map(structures.map(s => [s.specializationId, s.totalAmount]));

        if (user.role === 'INTERN') {
            const students = await prisma.student.findMany({
                where: { status: 'ACTIVE', email: user.email },
                select: { id: true, specializationId: true }
            });
            const studentIds = students.map(s => s.id);

            const agg = await prisma.fee.aggregate({
                where: { studentId: { in: studentIds } },
                _sum: { amountPaid: true },
                _count: { id: true }
            });
            totalCollected = agg._sum.amountPaid || 0;
            receiptsGenerated = agg._count.id;

            totalCollectable = students.reduce((acc, student) => {
                const specId = student.specializationId;
                return acc + (specId ? (structureMap.get(specId) || 0) : 0);
            }, 0);
        } else {
            const agg = await prisma.fee.aggregate({
                _sum: { amountPaid: true },
                _count: { id: true }
            });
            totalCollected = agg._sum.amountPaid || 0;
            receiptsGenerated = agg._count.id;

            const studentsByClass = await prisma.student.groupBy({
                by: ['specializationId'],
                where: { status: 'ACTIVE' },
                _count: { id: true }
            });

            totalCollectable = studentsByClass.reduce((acc, group) => {
                const specId = group.specializationId;
                return acc + (specId ? (structureMap.get(specId) || 0) : 0) * group._count.id;
            }, 0);
        }

        res.json({
            summary: { totalCollected, totalCollectable, receiptsGenerated }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching summary' });
    }
});

// ─────────────────────────────────────────────
// POST /fees/structures  —  Set fee structure per specialization
// ─────────────────────────────────────────────
router.post('/structures', async (req, res) => {
    try {
        const { specializationId, tuitionFee, otherCharges } = req.body;
        const totalAmount = Number(tuitionFee) + Number(otherCharges);

        const result = await prisma.feeStructure.upsert({
            where: { specializationId },
            update: { tuitionFee, otherCharges, totalAmount },
            create: { specializationId, tuitionFee, otherCharges, totalAmount }
        });

        res.json({ message: 'Fee structure updated successfully', data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating fee structure' });
    }
});

// ─────────────────────────────────────────────
// GET /fees/students  —  All intern fee data
// ─────────────────────────────────────────────
router.get('/students', authenticateToken, async (req: any, res) => {
    try {
        const user = req.user;

        const whereClause: any = { status: 'ACTIVE' };
        if (user.role === 'INTERN') {
            whereClause.email = user.email;
        }

        const students = await prisma.student.findMany({
            where: whereClause,
            include: {
                fees: true,
                specialization: true,
                emiPlan: true
            }
        });

        const structures = await prisma.feeStructure.findMany();
        const structureMap = new Map(structures.map(s => [s.specializationId, s.totalAmount]));

        const studentFees = students.map(student => {
            const classTotal = student.specializationId ? (structureMap.get(student.specializationId) || 0) : 0;
            const totalPaid = student.fees.reduce((acc, fee) => acc + fee.amountPaid, 0);
            const dueActive = Math.max(0, classTotal - totalPaid);

            let status = 'Unpaid';
            if (totalPaid >= classTotal && classTotal > 0) status = 'Paid';
            else if (totalPaid > 0) status = 'Partial';

            return {
                id: student.id,
                name: student.name,
                admissionNumber: student.admissionNumber,
                rollNumber: student.rollNumber,
                classLevel: student.classLevel,
                section: student.section,
                specializationId: student.specializationId,
                specializationName: student.specialization?.name || 'N/A',
                class: `${student.classLevel || ''} ${student.section || ''}`.trim(),
                total: classTotal,
                paid: totalPaid,
                due: dueActive,
                status,
                emiPlan: student.emiPlan || null,
                fees: student.fees.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
            };
        });

        res.json(studentFees);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching student fees' });
    }
});

// ─────────────────────────────────────────────
// POST /fees/collect  —  Offline payment (cash / upi / bank)
// ─────────────────────────────────────────────
router.post('/collect', async (req, res) => {
    try {
        const { studentId, amountPaid, paymentMode, emiInstallmentNo } = req.body;

        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, specializationId: true, email: true, firstName: true, parentId: true }
        });

        if (!student) return res.status(404).json({ message: 'Student not found' });

        const structure = student.specializationId
            ? await prisma.feeStructure.findUnique({ where: { specializationId: student.specializationId } })
            : null;
        const classTotal = structure?.totalAmount || 0;

        // Optimized: use aggregate instead of fetching all fee rows
        const totalPaidResult = await prisma.fee.aggregate({
            where: { studentId },
            _sum: { amountPaid: true }
        });
        const totalPaidSoFar = totalPaidResult._sum.amountPaid || 0;
        const newDueAmount = Math.max(0, classTotal - (totalPaidSoFar + Number(amountPaid)));

        const receiptNumber = `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const payment = await prisma.fee.create({
            data: {
                studentId,
                amountPaid: Number(amountPaid),
                dueAmount: newDueAmount,
                paymentDate: new Date(),
                paymentMode,
                receiptNumber,
                emiInstallmentNo: emiInstallmentNo ? Number(emiInstallmentNo) : null
            }
        });

        // Update EMI plan paid installments if applicable
        if (emiInstallmentNo) {
            await prisma.emiPlan.updateMany({
                where: { studentId },
                data: { paidInstallments: { increment: 1 } }
            });

            // Check if EMI is fully paid
            const plan = await prisma.emiPlan.findUnique({ where: { studentId } });
            if (plan && plan.paidInstallments >= plan.totalInstallments) {
                await prisma.emiPlan.update({
                    where: { studentId },
                    data: { status: 'COMPLETED' }
                });
            }
        }

        res.status(201).json({ message: 'Payment collected successfully', receipt: payment });

        // Notify about offline payment success
        try {
            const studentAndParent = await prisma.student.findUnique({
                where: { id: studentId },
                select: { parentId: true, email: true, firstName: true }
            });
            if (studentAndParent?.parentId) {
                await notificationService.notify({
                    userId: studentAndParent.parentId,
                    email: studentAndParent.email,
                    userName: studentAndParent.firstName,
                    type: 'fee',
                    title: 'Payment Recorded',
                    message: `A payment of ₹${Number(amountPaid)} has been recorded via ${paymentMode}. Receipt #${receiptNumber}.`
                });
            }
        } catch (err) { console.error('Manual payment notification error:', err); }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error collecting fee' });
    }
});

// ─────────────────────────────────────────────
// POST /fees/razorpay/create-order  —  Create Razorpay order
// ─────────────────────────────────────────────
router.post('/razorpay/create-order', authenticateToken, async (req: any, res) => {
    try {
        const { studentId, amount } = req.body;

        if (!studentId || !amount) {
            return res.status(400).json({ message: 'studentId and amount are required' });
        }

        const amountInPaise = Math.round(Number(amount) * 100);

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${studentId.slice(0, 8)}_${Date.now()}`,
            notes: { studentId }
        };

        const order = await getRazorpay().orders.create(options);

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({ message: 'Error creating Razorpay order' });
    }
});

// ─────────────────────────────────────────────
// POST /fees/razorpay/verify  —  Verify payment + record fee
// ─────────────────────────────────────────────
router.post('/razorpay/verify', authenticateToken, async (req: any, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            studentId,
            amountPaid,
            emiInstallmentNo
        } = req.body;

        // Signature verification
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Payment verification failed: Invalid signature' });
        }

        // Look up student and compute due
        // Optimized: use aggregate for total paid instead of fetching all fee rows
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, specializationId: true, email: true, firstName: true, parentId: true }
        });

        if (!student) return res.status(404).json({ message: 'Student not found' });

        const structure = student.specializationId
            ? await prisma.feeStructure.findUnique({ where: { specializationId: student.specializationId } })
            : null;
        const classTotal = structure?.totalAmount || 0;
        const totalPaidResult = await prisma.fee.aggregate({
            where: { studentId },
            _sum: { amountPaid: true }
        });
        const totalPaidSoFar = totalPaidResult._sum.amountPaid || 0;
        const newDueAmount = Math.max(0, classTotal - (totalPaidSoFar + Number(amountPaid)));

        const receiptNumber = `RZPY-${razorpay_payment_id.replace('pay_', '')}-${Date.now()}`;

        const payment = await prisma.fee.create({
            data: {
                studentId,
                amountPaid: Number(amountPaid),
                dueAmount: newDueAmount,
                paymentDate: new Date(),
                paymentMode: 'RAZORPAY',
                receiptNumber,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                emiInstallmentNo: emiInstallmentNo ? Number(emiInstallmentNo) : null
            }
        });

        // Update EMI plan if applicable
        if (emiInstallmentNo) {
            await prisma.emiPlan.updateMany({
                where: { studentId },
                data: { paidInstallments: { increment: 1 } }
            });

            const plan = await prisma.emiPlan.findUnique({ where: { studentId } });
            if (plan && plan.paidInstallments >= plan.totalInstallments) {
                await prisma.emiPlan.update({
                    where: { studentId },
                    data: { status: 'COMPLETED' }
                });
            }
        }

        res.status(201).json({ message: 'Payment verified and recorded', receipt: payment });

        // Notify about online payment success
        try {
            const studentAndParent = await prisma.student.findUnique({
                where: { id: studentId },
                select: { parentId: true, email: true, firstName: true }
            });
            if (studentAndParent?.parentId) {
                await notificationService.notify({
                    userId: studentAndParent.parentId,
                    email: studentAndParent.email,
                    userName: studentAndParent.firstName,
                    type: 'fee',
                    title: 'Online Payment Success!',
                    message: `Your payment of ₹${Number(amountPaid)} via Razorpay was successful. Receipt #${receiptNumber}.`
                });
            }
        } catch (err) { console.error('Razorpay payment notification error:', err); }

    } catch (error) {
        console.error('Razorpay verify error:', error);
        res.status(500).json({ message: 'Error verifying Razorpay payment' });
    }
});

// ─────────────────────────────────────────────
// POST /fees/emi/setup  —  Assign EMI plan
//   scope: "student" | "batch" | "specialization"
//   scopeId: studentId | batchId | specializationId
//   totalInstallments: 1–6
// ─────────────────────────────────────────────
router.post('/emi/setup', authenticateToken, async (req: any, res) => {
    try {
        const { scope, scopeId, totalInstallments } = req.body;

        if (!['student', 'batch', 'specialization'].includes(scope)) {
            return res.status(400).json({ message: 'scope must be "student", "batch", or "specialization"' });
        }

        const installments = Number(totalInstallments);
        if (installments < 1 || installments > 6) {
            return res.status(400).json({ message: 'totalInstallments must be between 1 and 6' });
        }

        // Fetch fee structures for amount computation
        const structures = await prisma.feeStructure.findMany();
        const structureMap = new Map(structures.map(s => [s.specializationId, s.totalAmount]));

        // Resolve student IDs based on scope
        let students: { id: string; specializationId: string | null }[] = [];

        if (scope === 'student') {
            const s = await prisma.student.findUnique({
                where: { id: scopeId },
                select: { id: true, specializationId: true }
            });
            if (!s) return res.status(404).json({ message: 'Student not found' });
            students = [s];
        } else if (scope === 'batch') {
            students = await prisma.student.findMany({
                where: { batchId: scopeId, status: 'ACTIVE' },
                select: { id: true, specializationId: true }
            });
        } else if (scope === 'specialization') {
            students = await prisma.student.findMany({
                where: { specializationId: scopeId, status: 'ACTIVE' },
                select: { id: true, specializationId: true }
            });
        }

        if (students.length === 0) {
            return res.status(404).json({ message: 'No active students found for the given scope' });
        }

        // Upsert EMI plan for each student
        const results = await Promise.all(
            students.map(async (student) => {
                const totalAmount = student.specializationId
                    ? (structureMap.get(student.specializationId) || 0)
                    : 0;
                const installmentAmount = totalAmount > 0 ? totalAmount / installments : 0;

                return prisma.emiPlan.upsert({
                    where: { studentId: student.id },
                    update: {
                        totalInstallments: installments,
                        installmentAmount,
                        totalAmount,
                        paidInstallments: 0,
                        status: 'ACTIVE'
                    },
                    create: {
                        studentId: student.id,
                        totalInstallments: installments,
                        installmentAmount,
                        totalAmount,
                        paidInstallments: 0,
                        status: 'ACTIVE'
                    }
                });
            })
        );

        res.json({
            message: `EMI plan (${installments} installments) set for ${results.length} intern(s)`,
            count: results.length
        });
    } catch (error) {
        console.error('EMI setup error:', error);
        res.status(500).json({ message: 'Error setting up EMI plan' });
    }
});

// ─────────────────────────────────────────────
// GET /fees/emi/:studentId  —  Get EMI plan for a student
// ─────────────────────────────────────────────
router.get('/emi/:studentId', authenticateToken, async (req, res) => {
    try {
        const plan = await prisma.emiPlan.findUnique({
            where: { studentId: String(req.params.studentId) }
        });
        res.json(plan || null);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching EMI plan' });
    }
});

// ─────────────────────────────────────────────
// POST /fees/notify — Manual Fee Reminders (Individual or Batch)
// ─────────────────────────────────────────────
router.post('/notify', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMISSION_OFFICER']), async (req, res) => {
    try {
        const { studentId, batchId, message } = req.body;

        if (batchId) {
            // Batch notification
            const students = await prisma.student.findMany({
                where: { batchId, status: 'ACTIVE', parentId: { not: null } },
                select: { 
                    firstName: true,
                    parent: { select: { id: true, email: true } } 
                }
            });

            const usersToNotify = students
                .filter(s => s.parent?.id)
                .map(s => ({ 
                    id: s.parent!.id, 
                    email: s.parent!.email,
                    name: s.firstName 
                }));

            if (usersToNotify.length > 0) {
                await notificationService.notifyMultiple({
                    users: usersToNotify,
                    type: 'fee',
                    title: 'Fee Payment Reminder',
                    message: message || 'This is a friendly reminder to settle your outstanding fee dues.'
                });
            }
            return res.json({ success: true, count: usersToNotify.length });
        } else if (studentId) {
            // Individual notification
            const student = await prisma.student.findUnique({
                where: { id: studentId },
                select: { 
                    parent: { select: { id: true, email: true } }, 
                    firstName: true 
                }
            });

            if (student?.parent?.id) {
                await notificationService.notify({
                    userId: student.parent.id,
                    email: student.parent.email,
                    userName: student.firstName,
                    type: 'fee',
                    title: 'Fee Payment Reminder',
                    message: message || `Hi ${student.firstName}, this is a reminder regarding your outstanding fee dues.`
                });
                return res.json({ success: true });
            }
        }

        res.status(400).json({ message: 'Invalid target for notification' });
    } catch (error) {
        console.error('Fee Notify Error:', error);
        res.status(500).json({ message: 'Error sending fee notifications' });
    }
});

export default router;

