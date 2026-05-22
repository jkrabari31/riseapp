import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, CreditCard, Receipt, Settings, X, Zap, Users, Layers,
    ChevronDown, CheckCircle, Smartphone, Building2, Banknote, Loader2, Bell, Send
} from 'lucide-react';
import api from '../utils/api';
import { useReactToPrint } from 'react-to-print';
import FeeReceiptPdfTemplate from '../components/FeeReceiptPdfTemplate';
import { useAuthStore } from '../store/authStore';

// ─── Razorpay global type ─────────────────────
declare global {
    interface Window { Razorpay: any; }
}

export default function Fees() {
    const { user } = useAuthStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Data
    const [students, setStudents] = useState<any[]>([]);
    const [specializations, setSpecializations] = useState<any[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    const [summary, setSummary] = useState({ totalCollected: 0, totalCollectable: 0, receiptsGenerated: 0 });

    // Modal visibility
    const [showStructureModal, setShowStructureModal] = useState(false);
    const [showCollectModal, setShowCollectModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showEmiModal, setShowEmiModal] = useState(false);
    const [showInternPayModal, setShowInternPayModal] = useState(false);
    const [showNotifyModal, setShowNotifyModal] = useState(false);

    // Form states
    const [structureForm, setStructureForm] = useState({ specializationId: '', tuitionFee: '', otherCharges: '' });
    const [collectForm, setCollectForm] = useState({ studentId: '', amountPaid: '', paymentMode: 'CASH' });
    const [emiForm, setEmiForm] = useState({ scope: 'student', scopeId: '', totalInstallments: 3 });
    const [selectedStudentForCollect, setSelectedStudentForCollect] = useState<any>(null);
    const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<any>(null);
    const [selectedForInternPay, setSelectedForInternPay] = useState<any>(null);
    const [notifyForm, setNotifyForm] = useState({ studentId: '', batchId: '', message: '' });

    // UI states
    const [submitting, setSubmitting] = useState(false);
    const [razorpayLoading, setRazorpayLoading] = useState(false);
    const [error, setError] = useState('');

    // Receipt print state
    const [printReceiptData, setPrintReceiptData] = useState<any>(null);
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: printReceiptData ? `Fee_Receipt_${printReceiptData.receiptNumber}` : 'Fee_Receipt'
    });

    // ── Fetch all data ─────────────────────────────
    const fetchData = async () => {
        setLoading(true);
        try {
            const [studentsRes, summaryRes, specRes, batchRes] = await Promise.all([
                api.get('/fees/students'),
                api.get('/fees'),
                api.get('/scheduler/specializations').catch(() => ({ data: [] })),
                api.get('/scheduler/batches').catch(() => ({ data: [] }))
            ]);
            setStudents(studentsRes.data);
            setSummary(summaryRes.data.summary);
            setSpecializations(specRes.data);
            setBatches(batchRes.data);
            if (specRes.data.length > 0 && !structureForm.specializationId) {
                setStructureForm(prev => ({ ...prev, specializationId: specRes.data[0].id }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // ── Format helpers ─────────────────────────────
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    // ── Fee Structure ───────────────────────────────
    const handleSaveStructure = async (e: React.FormEvent) => {
        e.preventDefault(); setSubmitting(true); setError('');
        try {
            await api.post('/fees/structures', {
                specializationId: structureForm.specializationId,
                tuitionFee: parseFloat(structureForm.tuitionFee),
                otherCharges: parseFloat(structureForm.otherCharges)
            });
            setShowStructureModal(false); fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error saving structure');
        } finally { setSubmitting(false); }
    };

    // ── Open Collect Modal (admin) ──────────────────
    const openCollectModal = (student: any) => {
        setSelectedStudentForCollect(student);
        setCollectForm({ studentId: student.id, amountPaid: student.due.toString(), paymentMode: 'CASH' });
        setError('');
        setShowCollectModal(true);
    };

    // ── Razorpay Checkout ───────────────────────────
    const openRazorpayCheckout = async (
        student: any,
        amount: number,
        emiInstallmentNo?: number
    ) => {
        setRazorpayLoading(true); setError('');
        try {
            const orderRes = await api.post('/fees/razorpay/create-order', {
                studentId: student.id,
                amount
            });
            const { orderId, keyId } = orderRes.data;

            const options = {
                key: keyId,
                amount: Math.round(amount * 100),
                currency: 'INR',
                name: 'RISE Model',
                description: emiInstallmentNo
                    ? `EMI Installment ${emiInstallmentNo}`
                    : 'Internship Fee Payment',
                order_id: orderId,
                handler: async (response: any) => {
                    try {
                        const verifyRes = await api.post('/fees/razorpay/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            studentId: student.id,
                            amountPaid: amount,
                            emiInstallmentNo
                        });
                        setShowCollectModal(false);
                        setShowInternPayModal(false);
                        fetchData();
                        setPrintReceiptData({ ...verifyRes.data.receipt, student });
                    } catch {
                        setError('Payment received but recording failed. Please contact support.');
                    }
                },
                prefill: {
                    name: student.name || '',
                    email: student.email || '',
                    contact: student.mobileNo || ''
                },
                theme: { color: '#4F46E5' },
                modal: { ondismiss: () => setRazorpayLoading(false) }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', () => {
                setError('Payment failed. Please try again.');
                setRazorpayLoading(false);
            });
            rzp.open();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error initiating payment. Try again.');
        } finally {
            setRazorpayLoading(false);
        }
    };

    // ── Offline Collect (admin: cash/upi/bank) ──────
    const handleCollectFee = async (e: React.FormEvent) => {
        e.preventDefault();
        // If online payment mode, delegate to Razorpay
        if (collectForm.paymentMode === 'RAZORPAY') {
            await openRazorpayCheckout(selectedStudentForCollect, parseFloat(collectForm.amountPaid));
            return;
        }
        setSubmitting(true); setError('');
        try {
            const res = await api.post('/fees/collect', {
                studentId: selectedStudentForCollect.id,
                amountPaid: parseFloat(collectForm.amountPaid),
                paymentMode: collectForm.paymentMode
            });
            setShowCollectModal(false);
            fetchData();
            setPrintReceiptData({ ...res.data.receipt, student: selectedStudentForCollect });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error collecting fee');
        } finally { setSubmitting(false); }
    };

    // ── EMI Setup ───────────────────────────────────
    const handleEmiSetup = async (e: React.FormEvent) => {
        e.preventDefault(); setSubmitting(true); setError('');
        try {
            const res = await api.post('/fees/emi/setup', {
                scope: emiForm.scope,
                scopeId: emiForm.scopeId,
                totalInstallments: emiForm.totalInstallments
            });
            alert(res.data.message);
            setShowEmiModal(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error setting EMI plan');
        } finally { setSubmitting(false); }
    };

    // Compute EMI preview amount
    const getEmiPreview = () => {
        if (emiForm.scope === 'student' && emiForm.scopeId) {
            const s = students.find(s => s.id === emiForm.scopeId);
            if (s && s.total > 0) return s.total / emiForm.totalInstallments;
        }
        if (emiForm.scope === 'specialization' && emiForm.scopeId) {
            const s = students.find(s => s.specializationId === emiForm.scopeId);
            if (s && s.total > 0) return s.total / emiForm.totalInstallments;
        }
        return null;
    };

    // ── Intern Pay Modal ────────────────────────────
    const openInternPayModal = (student: any) => {
        setSelectedForInternPay(student);
        setError('');
        setShowInternPayModal(true);
    };

    // ── Receipt History ─────────────────────────────
    const openHistoryModal = (student: any) => {
        setSelectedStudentForHistory(student);
        setShowHistoryModal(true);
    };

    const reprintReceipt = (feeRecord: any, student: any) => {
        setPrintReceiptData({ ...feeRecord, student });
        setShowHistoryModal(false);
    };

    // ── Notifications ───────────────────────────────
    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault(); setSubmitting(true); setError('');
        try {
            await api.post('/fees/notify', notifyForm);
            alert('Notification dispatched successfully!');
            setShowNotifyModal(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error sending notification');
        } finally { setSubmitting(false); }
    };

    const openIndividualNotify = (student: any) => {
        setNotifyForm({ studentId: student.id, batchId: '', message: '' });
        setError('');
        setShowNotifyModal(true);
    };

    const openBatchNotify = () => {
        setNotifyForm({ studentId: '', batchId: '', message: '' });
        setError('');
        setShowNotifyModal(true);
    };

    const filteredStudents = students.filter(student =>
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ── Payment mode label ──────────────────────────
    const paymentModeIcon = (mode: string) => {
        if (mode === 'RAZORPAY') return <Smartphone size={12} className="inline mr-1" />;
        if (mode === 'UPI') return <Smartphone size={12} className="inline mr-1" />;
        if (mode === 'BANK') return <Building2 size={12} className="inline mr-1" />;
        return <Banknote size={12} className="inline mr-1" />;
    };

    const emiPreview = getEmiPreview();

    // ──────────────────────────────────────────────────────────────
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* ── Header ───────────────────── */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Payment Management</h1>
                    <p className="text-slate-500">Collect payments, issue receipts, EMI plans, and track dues.</p>
                </div>
                {user?.role !== 'INTERN' && (
                    <div className="flex gap-3">
                        <button
                            onClick={openBatchNotify}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-sm transition-colors font-medium border border-slate-700"
                        >
                            <Bell size={18} /> Batch Reminder
                        </button>
                        <button
                            onClick={() => { setEmiForm({ scope: 'student', scopeId: '', totalInstallments: 3 }); setError(''); setShowEmiModal(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 shadow-sm transition-colors font-medium"
                        >
                            <Zap size={18} /> EMI Plans
                        </button>
                        <button
                            onClick={() => setShowStructureModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors font-medium"
                        >
                            <Settings size={18} /> Fee Structure
                        </button>
                    </div>
                )}
            </div>

            {/* ── Summary Cards ─────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <p className="text-slate-500 font-medium mb-1">Total Collectable</p>
                    <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(summary.totalCollectable)}</h3>
                </div>
                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/20 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <p className="text-indigo-100 font-medium mb-1 relative z-10">Total Collected</p>
                    <h3 className="text-3xl font-bold relative z-10">{formatCurrency(summary.totalCollected)}</h3>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <p className="text-slate-500 font-medium mb-1">Remaining Dues</p>
                    <h3 className="text-3xl font-bold text-rose-600">{formatCurrency(Math.max(0, summary.totalCollectable - summary.totalCollected))}</h3>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <p className="text-slate-500 font-medium mb-1">Receipts Generated</p>
                    <h3 className="text-3xl font-bold text-slate-800">{summary.receiptsGenerated}</h3>
                </div>
            </div>

            {/* ── Main Table ───────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by intern name or admission ID..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Intern Details</th>
                                <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Specialization</th>
                                <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Total Fee</th>
                                <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Paid</th>
                                <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Due</th>
                                <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">EMI</th>
                                <th className="py-3 px-5 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="py-10 text-center text-slate-500">Loading payments...</td></tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr><td colSpan={8} className="py-10 text-center text-slate-500">No interns found</td></tr>
                            ) : (
                                filteredStudents.map((fee, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-5">
                                            <p className="text-sm font-bold text-slate-900">{fee.name}</p>
                                            <p className="text-xs text-slate-500">{fee.admissionNumber}</p>
                                        </td>
                                        <td className="py-4 px-5 text-sm text-slate-600">{fee.specializationName}</td>
                                        <td className="py-4 px-5 text-sm text-slate-700 font-medium">{formatCurrency(fee.total)}</td>
                                        <td className="py-4 px-5 text-sm text-emerald-600 font-medium">{formatCurrency(fee.paid)}</td>
                                        <td className="py-4 px-5 text-sm text-rose-600 font-semibold">{formatCurrency(fee.due)}</td>
                                        <td className="py-4 px-5">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${fee.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                fee.status === 'Partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {fee.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5">
                                            {fee.emiPlan ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold w-fit">
                                                        <Zap size={10} /> {fee.emiPlan.paidInstallments}/{fee.emiPlan.totalInstallments} EMI
                                                    </span>
                                                    <span className="text-xs text-slate-400">{formatCurrency(fee.emiPlan.installmentAmount)}/inst.</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-5">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* Admin: collect offline / online */}
                                                {user?.role !== 'INTERN' && (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => openIndividualNotify(fee)}
                                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100"
                                                            title="Send Reminder"
                                                        >
                                                            <Bell size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => openCollectModal(fee)}
                                                            disabled={fee.status === 'Paid'}
                                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                                            title="Collect Payment"
                                                        >
                                                            <CreditCard size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                                {/* Intern: Pay Now */}
                                                {user?.role === 'INTERN' && fee.due > 0 && (
                                                    <button
                                                        onClick={() => openInternPayModal(fee)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-semibold transition-colors shadow-sm"
                                                    >
                                                        <Smartphone size={13} /> Pay Now
                                                    </button>
                                                )}
                                                {/* Receipt history — all roles */}
                                                <button
                                                    onClick={() => openHistoryModal(fee)}
                                                    className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                                    title="Receipt History"
                                                >
                                                    <Receipt size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                MODAL 1 — Fee Structure
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {showStructureModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800">Configure Fee Structure</h2>
                                <button onClick={() => setShowStructureModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSaveStructure} className="p-6 space-y-4">
                                {error && <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg">{error}</p>}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Specialization</label>
                                    <select required value={structureForm.specializationId} onChange={e => setStructureForm({ ...structureForm, specializationId: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                        {specializations.map((spec: any) => (
                                            <option key={spec.id} value={spec.id}>{spec.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Program Fee (₹)</label>
                                        <input required type="number" min="0" value={structureForm.tuitionFee} onChange={e => setStructureForm({ ...structureForm, tuitionFee: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Other Charges (₹)</label>
                                        <input required type="number" min="0" value={structureForm.otherCharges} onChange={e => setStructureForm({ ...structureForm, otherCharges: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowStructureModal(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                                    <button type="submit" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50">
                                        {submitting ? 'Saving...' : 'Save Structure'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                MODAL 2 — Admin Collect Payment
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {showCollectModal && selectedStudentForCollect && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800">Collect Payment</h2>
                                <button onClick={() => setShowCollectModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleCollectFee} className="p-6 space-y-4">
                                {error && <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg">{error}</p>}

                                {/* Student info */}
                                <div className="bg-slate-50 p-4 rounded-xl text-sm space-y-1">
                                    <p><span className="text-slate-500">Intern:</span> <span className="font-semibold text-slate-900">{selectedStudentForCollect.name}</span></p>
                                    <p><span className="text-slate-500">Total Fee:</span> <span className="font-medium text-slate-800">{formatCurrency(selectedStudentForCollect.total)}</span></p>
                                    <p><span className="text-slate-500">Paid So Far:</span> <span className="font-medium text-emerald-600">{formatCurrency(selectedStudentForCollect.paid)}</span></p>
                                    <p><span className="text-slate-500">Current Due:</span> <span className="font-semibold text-rose-600">{formatCurrency(selectedStudentForCollect.due)}</span></p>
                                </div>

                                {/* EMI info if plan exists */}
                                {selectedStudentForCollect.emiPlan && (
                                    <div className="bg-violet-50 border border-violet-200 p-3 rounded-xl text-sm">
                                        <div className="flex items-center gap-2 text-violet-700 font-semibold mb-1"><Zap size={14} /> EMI Plan Active</div>
                                        <p className="text-violet-600">
                                            {selectedStudentForCollect.emiPlan.paidInstallments}/{selectedStudentForCollect.emiPlan.totalInstallments} installments paid &nbsp;·&nbsp;
                                            {formatCurrency(selectedStudentForCollect.emiPlan.installmentAmount)} per installment
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                                        <input
                                            required type="number" min="1"
                                            max={selectedStudentForCollect.due}
                                            value={collectForm.amountPaid}
                                            onChange={e => setCollectForm({ ...collectForm, amountPaid: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                                        <select
                                            required value={collectForm.paymentMode}
                                            onChange={e => setCollectForm({ ...collectForm, paymentMode: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="CASH">💵 Cash</option>
                                            <option value="UPI">📱 UPI</option>
                                            <option value="BANK">🏦 Bank Transfer</option>
                                            <option value="RAZORPAY">⚡ Online (Razorpay)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowCollectModal(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>

                                    {collectForm.paymentMode === 'RAZORPAY' ? (
                                        <button
                                            type="submit"
                                            disabled={razorpayLoading}
                                            className="px-6 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2 shadow-md"
                                        >
                                            {razorpayLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                            {razorpayLoading ? 'Opening...' : 'Pay via Razorpay'}
                                        </button>
                                    ) : (
                                        <button type="submit" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50">
                                            {submitting ? 'Processing...' : 'Record Payment'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                MODAL 3 — EMI Setup (Admin)
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {showEmiModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Set EMI Plan</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">Assign 1–6 installments for interns to pay fees</p>
                                </div>
                                <button onClick={() => setShowEmiModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleEmiSetup} className="p-6 space-y-5">
                                {error && <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg">{error}</p>}

                                {/* Scope Selector */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Assign EMI To</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'student', label: 'Individual', icon: <CreditCard size={16} /> },
                                            { value: 'batch', label: 'Batch', icon: <Users size={16} /> },
                                            { value: 'specialization', label: 'Specialization', icon: <Layers size={16} /> }
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setEmiForm({ ...emiForm, scope: opt.value, scopeId: '' })}
                                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all font-medium text-sm ${emiForm.scope === opt.value
                                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                                    : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}
                                            >
                                                {opt.icon}{opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Scope value select */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Select {emiForm.scope === 'student' ? 'Intern' : emiForm.scope === 'batch' ? 'Batch' : 'Specialization'}
                                    </label>
                                    <select
                                        required
                                        value={emiForm.scopeId}
                                        onChange={e => setEmiForm({ ...emiForm, scopeId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                                    >
                                        <option value="">— Select —</option>
                                        {emiForm.scope === 'student' && students.filter(s => s.status !== 'Paid').map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.admissionNumber}) — Due: {formatCurrency(s.due)}</option>
                                        ))}
                                        {emiForm.scope === 'batch' && batches.map((b: any) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                        {emiForm.scope === 'specialization' && specializations.map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Installments */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Number of Installments
                                    </label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5, 6].map(n => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setEmiForm({ ...emiForm, totalInstallments: n })}
                                                className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${emiForm.totalInstallments === n
                                                    ? 'border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-600/30'
                                                    : 'border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700'}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview */}
                                {emiPreview !== null && (
                                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4">
                                        <p className="text-sm text-violet-700 font-semibold mb-1">EMI Preview</p>
                                        <p className="text-2xl font-bold text-violet-900">{formatCurrency(emiPreview)} <span className="text-sm font-medium text-violet-600">/ installment</span></p>
                                        <p className="text-xs text-violet-500 mt-1">{emiForm.totalInstallments} installment{emiForm.totalInstallments > 1 ? 's' : ''} of {formatCurrency(emiPreview)} each</p>
                                    </div>
                                )}

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowEmiModal(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !emiForm.scopeId}
                                        className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Zap size={16} />{submitting ? 'Saving...' : 'Apply EMI Plan'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                MODAL 4 — Intern Pay Now
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {showInternPayModal && selectedForInternPay && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Pay Fees Online</h2>
                                    <p className="text-sm text-slate-500">Secure payment via Razorpay</p>
                                </div>
                                <button onClick={() => setShowInternPayModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-5">
                                {error && <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg">{error}</p>}

                                {/* Fee summary */}
                                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-500">Total Program Fee</span><span className="font-semibold text-slate-800">{formatCurrency(selectedForInternPay.total)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Paid So Far</span><span className="font-semibold text-emerald-600">{formatCurrency(selectedForInternPay.paid)}</span></div>
                                    <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-semibold text-slate-700">Outstanding Due</span><span className="font-bold text-rose-600 text-lg">{formatCurrency(selectedForInternPay.due)}</span></div>
                                </div>

                                {/* Payment options */}
                                <div className="space-y-3">
                                    {/* Full payment */}
                                    <div className="text-sm font-semibold text-slate-600 mb-1">Choose Payment Option</div>

                                    <button
                                        disabled={razorpayLoading}
                                        onClick={() => openRazorpayCheckout(selectedForInternPay, selectedForInternPay.due)}
                                        className="w-full flex items-center justify-between p-4 bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-500 rounded-xl transition-all group"
                                    >
                                        <div className="text-left">
                                            <p className="font-semibold text-indigo-900">Pay Full Amount</p>
                                            <p className="text-indigo-600 font-bold text-lg">{formatCurrency(selectedForInternPay.due)}</p>
                                        </div>
                                        <ChevronDown size={18} className="text-indigo-400 -rotate-90 group-hover:translate-x-1 transition-transform" />
                                    </button>

                                    {/* EMI installment option */}
                                    {selectedForInternPay.emiPlan && selectedForInternPay.emiPlan.status === 'ACTIVE' && (
                                        <button
                                            disabled={razorpayLoading}
                                            onClick={() => openRazorpayCheckout(
                                                selectedForInternPay,
                                                selectedForInternPay.emiPlan.installmentAmount,
                                                selectedForInternPay.emiPlan.paidInstallments + 1
                                            )}
                                            className="w-full flex items-center justify-between p-4 bg-violet-50 border-2 border-violet-200 hover:border-violet-500 rounded-xl transition-all group"
                                        >
                                            <div className="text-left">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <Zap size={14} className="text-violet-600" />
                                                    <p className="font-semibold text-violet-900">Pay EMI Installment {selectedForInternPay.emiPlan.paidInstallments + 1} of {selectedForInternPay.emiPlan.totalInstallments}</p>
                                                </div>
                                                <p className="text-violet-600 font-bold text-lg">{formatCurrency(selectedForInternPay.emiPlan.installmentAmount)}</p>
                                            </div>
                                            <ChevronDown size={18} className="text-violet-400 -rotate-90 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    )}
                                </div>

                                {razorpayLoading && (
                                    <div className="flex items-center justify-center gap-3 text-indigo-600 py-2">
                                        <Loader2 size={20} className="animate-spin" />
                                        <span className="font-medium text-sm">Opening payment gateway...</span>
                                    </div>
                                )}

                                {/* Security note */}
                                <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
                                    <CheckCircle size={12} className="text-emerald-500" />
                                    256-bit SSL encrypted payment powered by Razorpay
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                MODAL 5 — Receipt History
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {showHistoryModal && selectedStudentForHistory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Receipt History</h2>
                                    <p className="text-sm text-slate-500">{selectedStudentForHistory.name}</p>
                                </div>
                                <button onClick={() => setShowHistoryModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                            </div>
                            <div className="p-6 max-h-[60vh] overflow-y-auto">
                                {!selectedStudentForHistory.fees || selectedStudentForHistory.fees.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">No payment history found.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedStudentForHistory.fees.map((record: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-slate-800">{formatCurrency(record.amountPaid)}</p>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${record.paymentMode === 'RAZORPAY' ? 'bg-violet-100 text-violet-700' :
                                                            record.paymentMode === 'UPI' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-slate-100 text-slate-600'}`}>
                                                            {paymentModeIcon(record.paymentMode)}{record.paymentMode}
                                                        </span>
                                                        {record.emiInstallmentNo && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">
                                                                EMI #{record.emiInstallmentNo}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-500 mt-0.5">
                                                        {new Date(record.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Receipt: {record.receiptNumber}</p>
                                                    {record.razorpayPaymentId && (
                                                        <p className="text-xs text-violet-400 mt-0.5">Txn: {record.razorpayPaymentId}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => reprintReceipt(record, selectedStudentForHistory)}
                                                    className="flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors font-medium text-sm"
                                                >
                                                    <Receipt size={16} /> Print
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Hidden Print Wrapper ──────── */}
            <div className="hidden">
                <div ref={componentRef}>
                    {printReceiptData && <FeeReceiptPdfTemplate data={printReceiptData} />}
                </div>
            </div>

            {/* ── Receipt Success Overlay ───── */}
            <AnimatePresence>
                {printReceiptData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={36} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">Payment Successful!</h3>
                            <p className="text-slate-500 mb-6 text-sm">
                                Receipt ID: <span className="font-mono font-semibold text-slate-700">{printReceiptData.receiptNumber}</span>
                                {printReceiptData.emiInstallmentNo && (
                                    <span className="block mt-1 text-violet-600 font-medium">EMI Installment #{printReceiptData.emiInstallmentNo} recorded</span>
                                )}
                            </p>
                            <div className="space-y-3">
                                <button onClick={handlePrint as any} className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors">
                                    <Receipt size={18} /> Print Official Receipt
                                </button>
                                <button onClick={() => setPrintReceiptData(null)} className="w-full px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Close</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                MODAL 6 — Notify Modal
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {showNotifyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Send Payment Reminder</h2>
                                    <p className="text-sm text-slate-500">{notifyForm.batchId ? 'Batch-wide alert' : 'Individual alert'}</p>
                                </div>
                                <button onClick={() => setShowNotifyModal(false)} className="p-2 text-slate-400 hover:bg-white rounded-lg"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSendNotification} className="p-6 space-y-4">
                                {error && <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg">{error}</p>}
                                
                                {notifyForm.batchId === '' && notifyForm.studentId === '' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Batch</label>
                                        <select 
                                            required 
                                            value={notifyForm.batchId} 
                                            onChange={e => setNotifyForm({ ...notifyForm, batchId: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="">— Select Batch —</option>
                                            {batches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                ) : notifyForm.studentId ? (
                                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                                        <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                                            <Bell size={14} /> Targeting: {students.find(s => s.id === notifyForm.studentId)?.name}
                                        </p>
                                    </div>
                                ) : null}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Custom Message (Optional)</label>
                                    <textarea 
                                        rows={4}
                                        placeholder="Enter a message to be sent via In-App and Email..."
                                        value={notifyForm.message}
                                        onChange={e => setNotifyForm({ ...notifyForm, message: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    ></textarea>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowNotifyModal(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                                    <button 
                                        type="submit" 
                                        disabled={submitting || (notifyForm.batchId === '' && notifyForm.studentId === '')}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Send size={16} /> {submitting ? 'Sending...' : 'Send Alerts'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}

