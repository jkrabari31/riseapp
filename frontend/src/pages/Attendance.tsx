import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Save, UserCheck, AlertCircle, Download, X } from 'lucide-react';
import api from '../utils/api';
import * as XLSX from 'xlsx';

export default function Attendance() {
    const [selectedBatch, setSelectedBatch] = useState('');
    const [batches, setBatches] = useState<any[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [students, setStudents] = useState<any[]>([]);
    const [attendanceData, setAttendanceData] = useState<Record<string, { status: string, remarks: string }>>({});

    // Export Modal States
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStart, setExportStart] = useState('');
    const [exportEnd, setExportEnd] = useState('');
    const [exportBatch, setExportBatch] = useState('All');
    const [exporting, setExporting] = useState(false);

    useState(() => {
        const fetchBatches = async () => {
            try {
                const res = await api.get('/scheduler/batches');
                setBatches(res.data);
                if (res.data.length > 0) setSelectedBatch(res.data[0].id);
            } catch (err) {
                console.error('Error fetching batches:', err);
            }
        };
        fetchBatches();
    });

    const loadStudentsAndAttendance = async () => {
        if (!selectedBatch) return setError('Please select a batch');
        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            // 1. Fetch Students
            const studentRes = await api.get(`/students?batchId=${selectedBatch}`);
            const studentsList = studentRes.data;
            setStudents(studentsList);

            // 2. Fetch Existing Attendance for this date/batch
            const attendanceRes = await api.get(`/attendance?date=${date}&batchId=${selectedBatch}`);
            const existingRecords = attendanceRes.data;

            // 3. Map existing records, default to 'PRESENT' if no record
            const newAttendanceData: Record<string, any> = {};
            studentsList.forEach((st: any) => {
                const record = existingRecords.find((r: any) => r.studentId === st.id);
                if (record) {
                    newAttendanceData[st.id] = { status: record.status, remarks: record.remarks || '' };
                } else {
                    newAttendanceData[st.id] = { status: 'PRESENT', remarks: '' };
                }
            });
            setAttendanceData(newAttendanceData);

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId: string, status: string) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status }
        }));
    };

    const handleRemarksChange = (studentId: string, remarks: string) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], remarks }
        }));
    };

    const saveAttendance = async () => {
        if (students.length === 0) return;
        setSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            const recordsToSave = students.map(st => ({
                studentId: st.id,
                date: new Date(date),
                status: attendanceData[st.id].status,
                batchId: selectedBatch,
                remarks: attendanceData[st.id].remarks
            }));

            await api.post('/attendance/mark', { attendanceRecords: recordsToSave });
            setSuccessMessage(`Successfully saved attendance for ${students.length} students.`);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Error saving attendance');
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async () => {
        if (!exportStart || !exportEnd) {
            setError('Please select both a Start Date and End Date for the export.');
            return;
        }
        setExporting(true);
        setError('');
        try {
            const res = await api.get(`/attendance/export?startDate=${exportStart}&endDate=${exportEnd}&batchId=${exportBatch}`);
            const data = res.data;

            if (data.length === 0) {
                setError('No attendance records found for this period.');
                setExporting(false);
                return;
            }

            const flattenedData = data.map((record: any) => ({
                'Date': new Date(record.date).toLocaleDateString(),
                'Batch': record.batch?.name || 'N/A',
                'Intern Name': record.student.firstName + ' ' + (record.student.lastName || ''),
                'Admission No': record.student.admissionNumber,
                'Student Name': record.student.name,
                'Status': record.status,
                'Remarks': record.remarks || ''
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(flattenedData);
            XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");

            const filename = `Attendance_Report_${exportStart}_to_${exportEnd}.xlsx`;
            XLSX.writeFile(wb, filename);

            setShowExportModal(false);
        } catch (err: any) {
            console.error(err);
            setError('Failed to export data.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Mark Attendance</h1>
                    <p className="text-slate-500">Record daily attendance for interns.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm font-medium transition-colors">
                        <Download size={18} /> Export Report
                    </button>
                    <button onClick={saveAttendance} disabled={saving || students.length === 0} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm font-medium transition-colors disabled:opacity-50">
                        <Save size={18} /> {saving ? 'Saving...' : 'Save Attendance'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-lg flex items-center gap-2 border border-rose-100">
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2 border border-emerald-100">
                    <UserCheck size={20} /> {successMessage}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Training Batch</label>
                        <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                            <option value="">Select Batch</option>
                            {batches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button onClick={loadStudentsAndAttendance} disabled={loading} className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium disabled:opacity-50">
                            <UserCheck size={18} /> {loading ? 'Loading...' : 'Load Interns'}
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase">No</th>
                                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase">ID</th>
                                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Intern Name</th>
                                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase text-center">Present</th>
                                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase text-center">Absent</th>
                                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase text-center">Late</th>
                                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-500">
                                        Select batch and date, then click 'Load Interns'
                                    </td>
                                </tr>
                            ) : (
                                students.map((student) => {
                                    const state = attendanceData[student.id];
                                    if (!state) return null; // fallback

                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6 text-sm font-medium text-slate-700">{student.rollNumber || '-'}</td>
                                            <td className="py-4 px-6 text-sm font-medium text-indigo-600">{student.admissionNumber}</td>
                                            <td className="py-4 px-6 text-sm font-bold text-slate-900">{student.name}</td>
                                            <td className="py-4 px-6 text-center">
                                                <input type="radio" name={`status-${student.id}`} checked={state.status === 'PRESENT'} onChange={() => handleStatusChange(student.id, 'PRESENT')} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <input type="radio" name={`status-${student.id}`} checked={state.status === 'ABSENT'} onChange={() => handleStatusChange(student.id, 'ABSENT')} className="w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer" />
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <input type="radio" name={`status-${student.id}`} checked={state.status === 'LATE'} onChange={() => handleStatusChange(student.id, 'LATE')} className="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer" />
                                            </td>
                                            <td className="py-4 px-6 text-sm">
                                                <input type="text" placeholder="Optional remark" value={state.remarks} onChange={(e) => handleRemarksChange(student.id, e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Export Modal */}
            <AnimatePresence>
                {showExportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800">Export Attendance</h2>
                                <button onClick={() => setShowExportModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                        <input type="date" value={exportStart} onChange={(e) => setExportStart(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                        <input type="date" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Batch</label>
                                        <select value={exportBatch} onChange={(e) => setExportBatch(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                                            <option value="All">All Batches</option>
                                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                    <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                                    <button onClick={handleExport} disabled={exporting || !exportStart || !exportEnd} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
                                        {exporting ? 'Exporting...' : <><Download size={18} /> Download Excel</>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}
