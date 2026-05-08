import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Activity, TrendingUp, Users, Home, Clock, Calendar, X } from 'lucide-react';
import api from '../utils/api';

export default function ReportingDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [internMetrics, setInternMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [batches, setBatches] = useState<any[]>([]);
    
    // Filters
    const [selectedBatch, setSelectedBatch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(''); // 1-12
    const [weekStart, setWeekStart] = useState('');

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [selectedBatch, selectedMonth, weekStart]);

    const fetchMetadata = async () => {
        try {
            const res = await api.get('/scheduler/batches');
            setBatches(res.data);
        } catch (error) {
            console.error('Error fetching metadata:', error);
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (selectedBatch) params.batchId = selectedBatch;
            if (selectedMonth) params.monthNo = selectedMonth;
            if (weekStart) params.weekStart = weekStart;

            const [res1, res2] = await Promise.all([
                api.get('/scheduler/reports/type-hours', { params }),
                api.get('/scheduler/reports/intern-metrics', { params })
            ]);
            setStats(res1.data);
            setInternMetrics(res2.data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading reports...</div>;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Training Analytics</h1>
                    <p className="text-slate-500 text-sm">Real-time insights into training hours and resource utilization.</p>
                </div>
                
                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 px-3 py-2 border-r border-slate-100">
                        <Activity size={16} className="text-slate-400" />
                        <select 
                            className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer"
                            value={selectedBatch}
                            onChange={e => setSelectedBatch(e.target.value)}
                        >
                            <option value="">All Batches</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 border-r border-slate-100">
                        <Clock size={16} className="text-slate-400" />
                        <select 
                            className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                        >
                            <option value="">All Months</option>
                            {monthNames.map((name, i) => (
                                <option key={i+1} value={i+1}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2">
                        <Calendar size={16} className="text-slate-400" />
                        <input 
                            type="date" 
                            className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer"
                            value={weekStart}
                            onChange={e => setWeekStart(e.target.value)}
                        />
                        {weekStart && (
                            <button onClick={() => setWeekStart('')} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Metric Cards - Training Tracks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Total Completed Sessions" value={stats?.count || 0} icon={<Activity className="text-indigo-600" />} color="indigo" />
                <MetricCard title="Technical Training" value={`${stats?.typeHours?.Technical || 0} hrs`} icon={<TrendingUp className="text-emerald-600" />} color="emerald" />
                <MetricCard title="Softskills Tracking" value={`${stats?.typeHours?.Softskills || 0} hrs`} icon={<Users className="text-amber-600" />} color="amber" />
                <MetricCard title="Communication" value={`${stats?.typeHours?.Communication || 0} hrs`} icon={<PieChart className="text-rose-600" />} color="rose" />
            </div>

            {/* Mode-wise breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center relative overflow-hidden group hover:border-indigo-200 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 relative z-10">ILT (Instructor Led)</p>
                    <p className="text-4xl font-black text-slate-800 relative z-10">{stats?.modeHours?.ILT || 0} <span className="text-sm font-bold text-indigo-500">hrs</span></p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center relative overflow-hidden group hover:border-emerald-200 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 relative z-10">Practice / Lab</p>
                    <p className="text-4xl font-black text-slate-800 relative z-10">{stats?.modeHours?.Practice || 0} <span className="text-sm font-bold text-emerald-500">hrs</span></p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center relative overflow-hidden group hover:border-amber-200 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 relative z-10">Measurement / Viva</p>
                    <p className="text-4xl font-black text-slate-800 relative z-10">{stats?.modeHours?.Measurement || 0} <span className="text-sm font-bold text-amber-500">hrs</span></p>
                </div>
            </div>

            {/* Focus-wise breakdown */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
                    <TrendingUp className="text-indigo-600" size={20} /> Focus-wise Activity Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.entries(stats?.focusModeHours || {}).length > 0 ? (
                        Object.entries(stats?.focusModeHours).map(([focus, data]: any) => (
                            <div key={focus} className="p-6 bg-slate-50 rounded-3xl border border-slate-100/50 hover:border-indigo-100 transition-colors group">
                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.15em] mb-4 border-b border-slate-200 pb-2 truncate group-hover:text-indigo-600 transition-colors" title={focus}>{focus}</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-indigo-500 uppercase">ILT</span>
                                        <span className="text-slate-600 bg-white px-2 py-0.5 rounded-md shadow-sm">{data.ILT} hrs</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-emerald-500 uppercase">Lab</span>
                                        <span className="text-slate-600 bg-white px-2 py-0.5 rounded-md shadow-sm">{data.Practice} hrs</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-amber-500 uppercase">Viva</span>
                                        <span className="text-slate-600 bg-white px-2 py-0.5 rounded-md shadow-sm">{data.Measurement} hrs</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-black text-slate-800">
                                        <span>TOTAL</span>
                                        <span className="text-indigo-700">{data.total} hrs</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-12 text-center text-slate-400 text-sm font-medium italic bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">No focus metrics recorded for selected filters.</div>
                    )}
                </div>
            </div>

            {/* Detailed Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
                        <Clock className="text-indigo-600" size={20} /> Trainer Contributions (ILT & Practice)
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(stats?.trainerModeHours || {}).length > 0 ? (
                            Object.entries(stats?.trainerModeHours).map(([name, modes]: any) => (
                                <div key={name} className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xs font-black text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 shadow-sm transition-all">
                                            {name.charAt(0)}
                                        </div>
                                        <span className="text-sm font-black text-slate-600 uppercase tracking-widest">{name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex flex-col items-center min-w-[60px] px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100/50">
                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">ILT</span>
                                            <span className="text-sm font-black text-indigo-700">{modes.ILT}</span>
                                        </div>
                                        <div className="flex flex-col items-center min-w-[60px] px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100/50">
                                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Prac</span>
                                            <span className="text-sm font-black text-emerald-700">{modes.Practice}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-slate-400 text-sm font-medium italic bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">No trainer activity recorded for selected filters.</div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
                        <Home className="text-indigo-600" size={20} /> Room Utilization
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(stats?.roomUtilization || {}).length > 0 ? (
                            Object.entries(stats?.roomUtilization).map(([name, data]: any) => (
                                <div key={name} className="p-5 border border-slate-100 rounded-2xl flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-black text-slate-800 uppercase tracking-widest">{name}</span>
                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{data.count} Sessions</span>
                                    </div>
                                    {/* Simplified fill bar */}
                                    <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${Math.min((data.hours / 40) * 100, 100)}%` }} 
                                            className="h-full bg-indigo-600"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                        <span>Capacity Utilization</span>
                                        <span>{data.hours} Total Hours</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-400 text-sm font-medium italic">No room usage recorded for selected filters.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Intern Specific Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Subject-wise Score Distribution */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Activity className="text-indigo-600" size={20} /> Intern Score Distribution
                    </h3>
                    <div className="overflow-x-auto custom-scrollbar flex-1">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-3 px-2 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Subject</th>
                                    <th className="py-3 px-2 text-center text-[10px] font-bold text-slate-400 uppercase">Total Count</th>
                                    <th className="py-3 px-2 text-center text-[10px] font-bold text-rose-500 uppercase bg-rose-50/50 rounded-tl-xl">&lt;60</th>
                                    <th className="py-3 px-2 text-center text-[10px] font-bold text-amber-500 uppercase bg-amber-50/50">60-70</th>
                                    <th className="py-3 px-2 text-center text-[10px] font-bold text-indigo-500 uppercase bg-indigo-50/50">70-80</th>
                                    <th className="py-3 px-2 text-center text-[10px] font-bold text-emerald-500 uppercase bg-emerald-50/50 rounded-tr-xl">80+</th>
                                    <th className="py-3 px-2 text-center text-[10px] font-bold text-slate-400 uppercase">H/A</th>
                                    <th className="py-3 px-2 text-center text-[10px] font-bold text-slate-400 uppercase">NA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {internMetrics?.scores?.length > 0 ? internMetrics.scores.map((s: any, idx: number) => {
                                    const totalScored = s.below60 + s.b60_70 + s.b70_80 + s.above80;
                                    return (
                                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-2 text-sm font-black text-slate-700 whitespace-nowrap">{s.subjectName}</td>
                                            <td className="py-3 px-2 text-center text-sm font-bold text-slate-600">{totalScored + s.absent + s.na}</td>
                                            <td className="py-3 px-2 text-center text-sm font-bold text-rose-600 bg-rose-50/30">{s.below60}</td>
                                            <td className="py-3 px-2 text-center text-sm font-bold text-amber-600 bg-amber-50/30">{s.b60_70}</td>
                                            <td className="py-3 px-2 text-center text-sm font-bold text-indigo-600 bg-indigo-50/30">{s.b70_80}</td>
                                            <td className="py-3 px-2 text-center text-sm font-bold text-emerald-600 bg-emerald-50/30">{s.above80}</td>
                                            <td className="py-3 px-2 text-center text-xs font-medium text-slate-400" title="Absent/Did not appear">{s.absent}</td>
                                            <td className="py-3 px-2 text-center text-xs font-medium text-slate-400" title="Not Applicable / Unrelated Subject">{s.na}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-slate-400 text-sm italic">No subject assessments recorded for current filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Attendance Distribution */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Users className="text-indigo-600" size={20} /> Intern Attendance Distribution
                    </h3>
                    
                    {/* Overall Summary blocks */}
                    <div className="mb-6 grid grid-cols-3 gap-4">
                        <div className="bg-rose-50/50 p-4 rounded-2xl text-center border border-rose-100">
                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Below 80%</p>
                            <p className="text-3xl font-black text-rose-600">{internMetrics?.attendance?.overall?.below80 || 0}</p>
                            <span className="text-[10px] font-bold text-slate-400 block mt-1 uppercase">Students Overall</span>
                        </div>
                        <div className="bg-amber-50/50 p-4 rounded-2xl text-center border border-amber-100">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">80 - 90%</p>
                            <p className="text-3xl font-black text-amber-500">{internMetrics?.attendance?.overall?.b80_90 || 0}</p>
                            <span className="text-[10px] font-bold text-slate-400 block mt-1 uppercase">Students Overall</span>
                        </div>
                        <div className="bg-emerald-50/50 p-4 rounded-2xl text-center border border-emerald-100">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Above 90%</p>
                            <p className="text-3xl font-black text-emerald-600">{internMetrics?.attendance?.overall?.above90 || 0}</p>
                            <span className="text-[10px] font-bold text-slate-400 block mt-1 uppercase">Students Overall</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-2 px-2 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Week Start</th>
                                    <th className="py-2 px-4 text-center text-[10px] font-bold text-rose-500 uppercase bg-rose-50/50 rounded-tl-xl">&lt; 80% Range</th>
                                    <th className="py-2 px-4 text-center text-[10px] font-bold text-amber-500 uppercase bg-amber-50/50">80 - 90% Range</th>
                                    <th className="py-2 px-4 text-center text-[10px] font-bold text-emerald-500 uppercase bg-emerald-50/50 rounded-tr-xl">Above 90%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {internMetrics?.attendance?.weeks?.length > 0 ? internMetrics.attendance.weeks.map((w: any, idx: number) => (
                                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-2 text-xs font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">{w.weekStr}</td>
                                        <td className="py-3 px-4 text-center text-sm font-black text-rose-600 bg-rose-50/30">{w.below80}</td>
                                        <td className="py-3 px-4 text-center text-sm font-black text-amber-500 bg-amber-50/30">{w.b80_90}</td>
                                        <td className="py-3 px-4 text-center text-sm font-black text-emerald-600 bg-emerald-50/30">{w.above90}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-slate-400 text-sm italic">No attendance records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function MetricCard({ title, value, icon, color }: any) {
    const colorClasses: any = {
        indigo: 'bg-indigo-50 border-indigo-100',
        emerald: 'bg-emerald-50 border-emerald-100',
        amber: 'bg-amber-50 border-amber-100',
        rose: 'bg-rose-50 border-rose-100',
    };

    return (
        <div className={`p-6 rounded-2xl border ${colorClasses[color]} transition-all hover:scale-[1.02]`}>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm">
                {icon}
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
        </div>
    );
}
