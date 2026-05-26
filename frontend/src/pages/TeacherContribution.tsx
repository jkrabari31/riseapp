import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, Clock, User } from 'lucide-react';
import api from '../utils/api';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export default function TeacherContribution() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const yearRange = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

    useEffect(() => { fetchAnalytics(); }, [month, year]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/timetable/analytics?month=${month}&year=${year}`);
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (!data.length) return;
        const headers = ['Trainer', 'Total Periods', 'Subjects Taught', 'Month', 'Year'];
        const rows = data.map(r => [
            r.teacherName,
            r.totalPeriods,
            r.subjects.join(' / '),
            MONTH_NAMES[month - 1],
            year
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trainer_contribution_${MONTH_NAMES[month - 1]}_${year}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="text-indigo-600" /> Trainer Contribution
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Periods and subjects taught per trainer — {MONTH_NAMES[month - 1]} {year}
                    </p>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <select value={month} onChange={e => setMonth(Number(e.target.value))}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500">
                        {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(Number(e.target.value))}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500">
                        {yearRange.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={handleExportCSV} disabled={!data.length}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors">
                        <Download size={15} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {!loading && data.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Active Trainers</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{data.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Total Periods Assigned</p>
                        <p className="text-3xl font-bold text-indigo-700 mt-1">{data.reduce((s, r) => s + r.totalPeriods, 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Avg Periods / Trainer</p>
                        <p className="text-3xl font-bold text-emerald-700 mt-1">
                            {(data.reduce((s, r) => s + r.totalPeriods, 0) / data.length).toFixed(1)}
                        </p>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center text-slate-400">Loading analytics...</div>
                ) : data.length === 0 ? (
                    <div className="py-16 text-center">
                        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No timetable data for {MONTH_NAMES[month - 1]} {year}</p>
                        <p className="text-slate-400 text-sm mt-1">Create a timetable for this session first.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Trainer</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Total Periods</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Subjects</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Period Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.sort((a, b) => b.totalPeriods - a.totalPeriods).map(teacher => (
                                    <tr key={teacher.teacherId} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                    <User size={14} className="text-indigo-600" />
                                                </div>
                                                <span className="font-semibold text-slate-800">{teacher.teacherName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xl font-bold text-indigo-700">{teacher.totalPeriods}</span>
                                            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                                <Clock size={10} /> periods/week × ~4 weeks
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {teacher.subjects.map((s: string) => (
                                                    <span key={s} className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-indigo-100">{s}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1 max-h-20 overflow-y-auto">
                                                {teacher.periodDetails.map((d: any, i: number) => (
                                                    <div key={i} className="text-[10px] text-slate-500 flex gap-2">
                                                        <span className="font-semibold text-slate-600">{d.day.slice(0, 3)}</span>
                                                        <span>P{d.period}</span>
                                                        <span className="text-xs text-indigo-600">{d.subject}</span>
                                                        <span>{d.classLevel}-{d.section}</span>
                                                        <span className="text-slate-400">{d.startTime}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
