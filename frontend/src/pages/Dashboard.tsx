import { useState, useEffect } from 'react';
import { Users, UserCheck, DollarSign, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import NoticeBoard from '../components/NoticeBoard';

import { useAuthStore } from '../store/authStore';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1
    }
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalRevenue: 0,
        attendanceRate: 0,
        revenueChartData: [] as any[]
    });

    const user = useAuthStore(state => state.user);

    useEffect(() => {
        if (user && user.role === 'INTERN') {
            navigate('/intern-dashboard', { replace: true });
            return;
        }
        if (user && user.role === 'TRAINER') {
            navigate('/trainer-dashboard', { replace: true });
            return;
        }
        fetchStats();
    }, [user, navigate]);

    const fetchStats = async () => {
        try {
            const res = await api.get('/dashboard/stats');
            setStats(res.data);
        } catch (error) {
            console.error("Error fetching dashboard stats", error);
        }
    };

    const statsData = [
        { title: 'Total Interns', value: stats.totalStudents.toLocaleString(), icon: Users, color: 'bg-blue-500/10 text-blue-600' },
        { title: "Active Trainers", value: stats.totalTeachers.toLocaleString(), icon: UserCheck, color: 'bg-emerald-500/10 text-emerald-600' },
        { title: 'Fees Collected', value: `₹${(stats.totalRevenue).toLocaleString()}`, icon: DollarSign, color: 'bg-indigo-500/10 text-indigo-600' },
        { title: 'Today\'s Attendance', value: `${stats.attendanceRate}%`, icon: AlertCircle, color: 'bg-rose-500/10 text-rose-600' },
    ];

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Overview</h1>
                    <p className="text-slate-500">Welcome back, here's what's happening today.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate('/attendance')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium">
                        Mark Attendance
                    </button>
                    <button onClick={() => navigate('/students/add')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium">
                        Add New Intern
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsData.map((stat, i) => (
                    <motion.div key={i} variants={itemVariants} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-shadow">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${stat.color} transition-transform group-hover:scale-110`}>
                            <stat.icon size={26} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-800">Revenue Analysis</h2>
                        <select className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option>This Year</option>
                            <option>Last Year</option>
                        </select>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.revenueChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorFee" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} dx={-10} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="fee" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorFee)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <NoticeBoard />
                </motion.div>
            </div>

        </motion.div>
    );
}
