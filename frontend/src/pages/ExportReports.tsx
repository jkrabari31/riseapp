import { useState, useEffect } from 'react';
import { Download, Users, ClipboardList, Calendar, DollarSign, CalendarCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import * as XLSX from 'xlsx';

export default function ExportReports() {
    const [batches, setBatches] = useState<{ id: string, name: string }[]>([]);
    const [subjects, setSubjects] = useState<{ id: string, name: string }[]>([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [loading, setLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchFilters();
    }, []);

    const fetchFilters = async () => {
        try {
            const [bRes, sRes] = await Promise.all([
                api.get('/scheduler/batches'),
                api.get('/subjects')
            ]);
            setBatches(bRes.data);
            setSubjects(sRes.data);
        } catch (error) {
            console.error('Error fetching filters:', error);
        }
    };

    const downloadExcel = (data: any[], fileName: string) => {
        if (!data || data.length === 0) {
            alert('No data found for the selected filters.');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExport = async (type: string, name: string) => {
        setLoading(type);
        try {
            const params: any = {};
            if (selectedBatch) params.batchId = selectedBatch;
            if (type === 'assessments' && selectedSubject) params.subjectId = selectedSubject;

            const res = await api.get(`/export/${type}`, { params });
            downloadExcel(res.data, name);
        } catch (error) {
            console.error(`Error exporting ${type}:`, error);
            alert('Failed to export data. Please try again.');
        } finally {
            setLoading(null);
        }
    };

    const exportOptions = [
        {
            id: 'students',
            name: 'Intern Details Report',
            description: 'Comprehensive data of all interns including personal, educational, and parental info.',
            icon: Users,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            border: 'border-indigo-100',
            btn: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
        },
        {
            id: 'assessments',
            name: 'Assessment Performance Report',
            description: 'Scores, dates, and subject performance metrics for all submitted assessments.',
            icon: ClipboardList,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
            btn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
        },
        {
            id: 'schedules',
            name: 'Training Schedule Report',
            description: 'Complete timeline of all training sessions, trainers, topics, and room utilization.',
            icon: Calendar,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        },
        {
            id: 'fees',
            name: 'Fees Collection Report',
            description: 'Fixed fees assignments versus payment history per intern, including due balances.',
            icon: DollarSign,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-100',
            btn: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500'
        },
        {
            id: 'attendance',
            name: 'Master Attendance Report',
            description: 'Daily raw attendance logs combining all statuses and remarks.',
            icon: CalendarCheck,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            border: 'border-rose-100',
            btn: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
        }
    ];

    return (
        <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 20 }} className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Data Export Center</h1>
                    <p className="text-slate-500 mt-2 font-medium">Download comprehensive system records in Excel format.</p>
                </div>
                <div className="flex gap-4">
                    <select
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700 w-full md:w-auto"
                    >
                        <option value="">All Batches (Global)</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700 w-full md:w-auto"
                    >
                        <option value="">All Subjects</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {exportOptions.map((opt) => (
                    <div key={opt.id} className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-start transition-all hover:shadow-md`}>
                        <div className={`p-4 rounded-2xl ${opt.bg} ${opt.border} border mb-6`}>
                            <opt.icon className={opt.color} size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{opt.name}</h3>
                        <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed flex-1">
                            {opt.description}
                        </p>
                        
                        <button
                            onClick={() => handleExport(opt.id, opt.name)}
                            disabled={loading === opt.id}
                            className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all ${opt.btn} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loading === opt.id ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <Download size={18} />
                                    Download Excel
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
