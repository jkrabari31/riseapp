import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Activity, Users, UserCheck, DollarSign, Wallet,
    TrendingUp, Filter, Download
} from 'lucide-react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function CEODashboard() {
    const user = useAuthStore((state) => state.user);
    const { selectedBatchId } = useSettingsStore();

    const [batches, setBatches] = useState<any[]>([]);
    
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        batchId: selectedBatchId === 'ALL' ? '' : (selectedBatchId || '')
    });

    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchBatches();
    }, []);

    useEffect(() => {
        fetchMetrics();
    }, [filters]);

    useEffect(() => {
        if (selectedBatchId !== 'ALL' && selectedBatchId !== filters.batchId) {
            setFilters(prev => ({ ...prev, batchId: selectedBatchId || '' }));
        } else if (selectedBatchId === 'ALL' && filters.batchId !== '') {
            setFilters(prev => ({ ...prev, batchId: '' }));
        }
    }, [selectedBatchId]);

    const fetchBatches = async () => {
        try {
            const res = await api.get('/scheduler/batches');
            setBatches(res.data);
        } catch (error) {
            console.error('Failed to fetch batches', error);
        }
    };

    const fetchMetrics = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.batchId) params.append('batchId', filters.batchId);

            const res = await api.get(`/ceo/metrics?${params.toString()}`);
            setMetrics(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to aggregate metrics');
        } finally {
            setLoading(false);
        }
    };

    const handleClearFilters = () => {
        setFilters({ startDate: '', endDate: '', batchId: '' });
    };

    if (loading && !metrics) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 max-w-7xl mx-auto text-center">
                <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-200">
                    {error}
                </div>
            </div>
        );
    }

    const { demographics, revenue, attendance, performance, utilization } = metrics;

    // Transform attendance object into array for charting
    const attData = [
        { name: '< 80%', count: attendance['< 80%'] },
        { name: '80% - 90%', count: attendance['80% - 90%'] },
        { name: '> 90%', count: attendance['> 90%'] }
    ];

    const attCOLORS = ['#ef4444', '#f59e0b', '#10b981'];

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
            
            {/* Header & Global Filters */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-800 to-indigo-500">
                            {user?.name ? `${user.name}'s Executive Dashboard` : 'Executive Dashboard'}
                        </h1>
                        <p className="text-slate-500 font-medium">Global Institution Metrics & Analytics</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                        <Download size={18} /> Export PDF Report
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-2 text-indigo-600 font-semibold mr-2">
                        <Filter size={20} /> Filters
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="text-slate-300 hidden sm:block mt-4">—</div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="w-px h-10 bg-slate-200 mx-2 hidden sm:block"></div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Target Batch</label>
                        <select
                            value={filters.batchId}
                            onChange={(e) => setFilters({ ...filters, batchId: e.target.value })}
                            className="bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-w-[150px]"
                        >
                            <option value="">All Batches (Global)</option>
                            {batches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* Clear Button */}
                    {(filters.startDate || filters.endDate || filters.batchId) && (
                        <button
                            onClick={handleClearFilters}
                            className="mt-5 px-4 py-2 text-rose-500 hover:bg-rose-50 rounded-lg text-sm font-medium transition-colors"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* KPI Scorecards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Total Interns" value={demographics.totalInterns} icon={<Users />} color="blue" />
                <KPICard title="Active Interns" value={demographics.activeInterns} icon={<UserCheck />} color="emerald" subtitle={`${((demographics.activeInterns / demographics.totalInterns) * 100 || 0).toFixed(1)}% of total`} />
                <KPICard title="Total Revenue Collected" value={'₹ ' + revenue.totalCollected.toLocaleString('en-IN')} icon={<DollarSign />} color="indigo" />
                <KPICard title="Pending Dues" value={'₹ ' + revenue.totalPending.toLocaleString('en-IN')} icon={<Wallet />} color="rose" />
            </div>

            {/* Charts Grid Array */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Demographics: Specialization */}
                <ChartCard title="Specialization Distribution">
                    {demographics.specializationDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={demographics.specializationDistribution}
                                    cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                                    paddingAngle={5} dataKey="count"
                                >
                                    {demographics.specializationDistribution.map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => [`${value} Interns`, 'Count']} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState message="No specialization data available" />
                    )}
                </ChartCard>

                {/* 2. Demographics: Education */}
                <ChartCard title="Education Backgrounds">
                    {demographics.educationDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={demographics.educationDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#F1F5F9' }} />
                                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={32}>
                                {demographics.educationDistribution.map((_: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState message="No education background data" />
                    )}
                </ChartCard>

                {/* 3. Performance Base (Assessments) */}
                <ChartCard title="Assessment Performance by Subject">
                    {performance.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={performance} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                                <YAxis />
                                <Tooltip cursor={{ fill: '#F1F5F9' }} />
                                <Legend />
                                <Bar dataKey="above90" stackId="a" name=">= 90%" fill="#10b981" />
                                <Bar dataKey="range70to80" stackId="a" name="70 - 89%" fill="#3b82f6" />
                                <Bar dataKey="range60to70" stackId="a" name="60 - 69%" fill="#f59e0b" />
                                <Bar dataKey="below60" stackId="a" name="< 60%" fill="#ef4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState message="No assessment performance data available" />
                    )}
                </ChartCard>

                {/* 4. Combined: Attendance & Trainer Utilization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:col-span-1">
                    {/* Attendance */}
                    <ChartCard title="Overall Attendance Health">
                         {attData.reduce((acc, a) => acc + a.count, 0) > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={attData}
                                        cx="50%" cy="50%" innerRadius={40} outerRadius={80}
                                        dataKey="count"
                                    >
                                        {attData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={attCOLORS[index]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                         ) : <EmptyState message="No attendance logs" />}
                    </ChartCard>

                    {/* Quick Stats or Small Bar Chart */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-center">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-xl mx-auto mb-4">
                            <TrendingUp size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Trainer Hours</h3>
                        <div className="text-4xl font-black text-slate-800">
                             {utilization.reduce((acc: number, t: any) => acc + t.ILT + t.Practice, 0)} <span className="text-lg text-slate-500 font-medium">hrs</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Delivered in {filters.startDate ? 'selected period' : 'all-time record'}</p>
                    </div>
                </div>

                {/* 5. Trainer Utilization Detailed */}
                <ChartCard title="Trainer Utilization (ILT vs Practice)" fullWidth>
                     {utilization.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={utilization} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="trainerName" tick={{ fontSize: 12 }} />
                                <YAxis />
                                <Tooltip cursor={{ fill: '#F1F5F9' }} />
                                <Legend />
                                <Bar dataKey="ILT" fill="#4f46e5" name="ILT Hours" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Practice" fill="#0ea5e9" name="Practice/Measurement Hours" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                     ) : <EmptyState message="No trainer scheduling utilization data" />}
                </ChartCard>

            </div>

        </div>
    );
}

// Reusable Sub-components

function KPICard({ title, value, icon, color, subtitle }: { title: string, value: string | number, icon: React.ReactNode, color: string, subtitle?: string }) {
    const colorStyles: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        rose: 'bg-rose-50 text-rose-600'
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorStyles[color]}`}>
                    {icon}
                </div>
            </div>
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</h3>
                <div className="text-3xl font-black text-slate-800">{value}</div>
                {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
            </div>
        </motion.div>
    );
}

function ChartCard({ title, children, fullWidth = false }: { title: string, children: React.ReactNode, fullWidth?: boolean }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm ${fullWidth ? 'lg:col-span-2' : ''}`}>
            <h3 className="text-lg font-bold text-slate-800 mb-6">{title}</h3>
            {children}
        </motion.div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="h-[250px] w-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
            <span className="text-slate-400 font-medium text-sm flex items-center gap-2"><Activity size={16} /> {message}</span>
        </div>
    );
}
