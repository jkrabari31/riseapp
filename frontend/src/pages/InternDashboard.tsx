import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Award, CalendarX2, User } from 'lucide-react';
import NoticeBoard from '../components/NoticeBoard';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

export default function InternDashboard() {
    const user = useAuthStore((state) => state.user);
    const [children, setChildren] = useState<any[]>([]);
    const [selectedChild, setSelectedChild] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                const res = await api.get('/students/parent/me');
                setChildren(res.data);
                if (res.data.length > 0) {
                    setSelectedChild(res.data[0]);
                }
            } catch (error) {
                console.error('Failed to fetch children data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchChildren();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading Dashboard Data...</div>;
    }

    if (children.length === 0) {
        return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-6xl mx-auto">
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-800">Welcome, {user?.name}!</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">No interns are currently linked to your account.</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-6xl mx-auto">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <h2 className="text-2xl font-bold text-slate-800">Intern Dashboard</h2>
                {children.length > 1 && (
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                        {children.map(child => (
                            <button
                                key={child.id}
                                onClick={() => setSelectedChild(child)}
                                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${selectedChild?.id === child.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                {child.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="absolute right-0 bottom-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-10 -mb-10"></div>
                <div className="relative z-10 flex items-center gap-6">
                    <div className="w-20 h-20 bg-white/20 rounded-full border-4 border-white/30 flex items-center justify-center text-3xl font-bold backdrop-blur-sm overflow-hidden">
                        {selectedChild?.photoUrl ? (
                            <img src={selectedChild.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            selectedChild?.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold mb-1">{selectedChild?.name}</h1>
                        <p className="text-emerald-50 font-medium">Program {selectedChild?.classLevel} - Section {selectedChild?.section}  |  ID: {selectedChild?.admissionNumber}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                        <Award size={28} />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">Status</p>
                    <h3 className="text-3xl font-bold text-slate-800">{selectedChild?.status}</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                        <div className="text-xl font-bold tracking-tighter">
                            {selectedChild?.attendances ? (() => {
                                const total = selectedChild.attendances.length;
                                if (total === 0) return 'N/A';
                                const presentCount = selectedChild.attendances.filter((a: any) => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;
                                return `${Math.round((presentCount / total) * 100)}%`;
                            })() : 'N/A'}
                        </div>
                    </div>
                    <p className="text-slate-500 font-medium mb-1">Attendance</p>
                    <h3 className="text-xl font-bold text-slate-800 mt-1 text-slate-400 font-normal text-sm">
                        {selectedChild?.attendances?.length > 0 ? 'Recorded' : 'Waiting for Data'}
                    </h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                        <CalendarX2 size={28} />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">Days Absent</p>
                    <h3 className="text-3xl font-bold text-slate-800">
                        {selectedChild?.attendances?.filter((a: any) => a.status === 'ABSENT').length || 0}
                    </h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                        <CreditCard size={28} />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">Fee Status</p>
                    {selectedChild?.feeSummary ? (
                        <h3 className={`text-xl font-bold mt-1 px-3 py-1 rounded-full text-sm ${selectedChild.feeSummary.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                            selectedChild.feeSummary.status === 'Partial' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                            {selectedChild.feeSummary.status}
                        </h3>
                    ) : (
                        <h3 className="text-xl font-bold text-emerald-600 mt-1 bg-emerald-50 px-3 py-1 rounded-full text-sm">Check Financials</h3>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upcoming Training Sessions */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarX2 size={22} className="text-indigo-600" />
                        Next Training Sessions
                    </h3>
                    {!selectedChild?.batch?.schedules || selectedChild.batch.schedules.length === 0 ? (
                        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500 shadow-sm">
                            <p>No upcoming sessions scheduled for your batch.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {selectedChild.batch.schedules.map((session: any) => (
                                <div key={session.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors group">
                                    <div className="flex items-center gap-5">
                                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(session.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                                            <span className="text-2xl font-black text-slate-700 group-hover:text-indigo-600">{new Date(session.date).getDate()}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase tracking-wider">{session.mode}</span>
                                                <span className="text-xs font-semibold text-slate-400">{session.timeSlot.startTime} - {session.timeSlot.endTime}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-800 text-lg leading-tight">{session.topic}</h4>
                                            <p className="text-sm text-slate-500 mt-1">{session.type} • {session.focus}</p>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Mentor</p>
                                        <div className="flex -space-x-2 justify-end">
                                            {session.trainers?.map((t: any, i: number) => (
                                                <div key={i} title={t.trainer.user.name} className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                                    {t.trainer.user.name.charAt(0)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Assigned Trainers & Mentors */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Award size={22} className="text-emerald-600" />
                        Our Mentors
                    </h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm divide-y divide-slate-100">
                        {/* Derive trainers from schedules to ensure accuracy */}
                        {(() => {
                            const trainerMap = new Map();
                            selectedChild?.batch?.schedules?.forEach((s: any) => {
                                s.trainers?.forEach((t: any) => {
                                    trainerMap.set(t.trainerId, t.trainer);
                                });
                            });

                            if (trainerMap.size === 0) return <p className="text-slate-400 italic text-sm py-4">Wait for mentor assignment.</p>;

                            return Array.from(trainerMap.values()).map((mentor: any) => (
                                <div key={mentor.id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 relative z-10 overflow-hidden">
                                        <User size={24} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{mentor.user.name}</h4>
                                        <p className="text-xs text-slate-500 font-medium">Mentor / Trainer</p>
                                        <p className="text-[10px] text-indigo-500 mt-1">{mentor.subjects?.map((s: any) => s.name).join(', ')}</p>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                    
                    <NoticeBoard />
                </div>
            </div>
        </motion.div>
    );
}
