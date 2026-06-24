import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, ClipboardCheck, Clock, CalendarDays } from 'lucide-react';
import NoticeBoard from '../components/NoticeBoard';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function TrainerDashboard() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [myInternsCount, setMyInternsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const getDayName = () => {
        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        return days[new Date().getDay()];
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Profile and Timetable
                const profileRes = await api.get('/teachers/me');
                setProfile(profileRes.data);

                // Fetch Students count quickly
                const studentsRes = await api.get('/students/my-students/count');
                setMyInternsCount(studentsRes.data.count);

            } catch (error) {
                console.error("Error loading teacher data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading Dashboard Data...</div>;
    }

    const todayDateStr = new Date().toISOString().split('T')[0];
    
    // Filter internship schedules for today
    const todaySessions = (profile?.scheduledSessions || [])
        .filter((s: any) => new Date(s.schedule.date).toISOString().split('T')[0] === todayDateStr)
        .map((s: any) => s.schedule)
        .sort((a: any, b: any) => a.timeSlot.slotOrder - b.timeSlot.slotOrder);

    // Filter legacy timetables if any (fallback)
    const todayDay = getDayName();
    const todayClasses = (profile?.timetables || [])
        .filter((t: any) => t.dayOfWeek === todayDay)
        .sort((a: any, b: any) => a.periodNumber - b.periodNumber);

    const getUpcomingClassAlert = (classes: any[]) => {
        if (!classes || classes.length === 0) return null;

        const now = new Date();
        const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

        for (const cls of classes) {
            const match = cls.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (match) {
                let h = parseInt(match[1]);
                let m = parseInt(match[2]);
                let ampm = match[3].toUpperCase();

                if (ampm === 'PM' && h < 12) h += 12;
                if (ampm === 'AM' && h === 12) h = 0;

                const classTotalMinutes = h * 60 + m;
                const diff = classTotalMinutes - currentTotalMinutes;

                if (diff > 0 && diff <= 30) {
                    return { classInfo: cls, minutesLeft: diff };
                }
            }
        }
        return null;
    };

    const alertInfo = getUpcomingClassAlert(todayClasses);

    // Logic for Internship Schedule: Find next session starting after now
    const upcomingSession = todaySessions.find((s: any) => {
        const match = s.timeSlot.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
            let h = parseInt(match[1]);
            let ampm = match[3].toUpperCase();
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return (h * 60 + parseInt(match[2])) > (new Date().getHours() * 60 + new Date().getMinutes());
        }
        return false;
    }) || (todaySessions.length > 0 ? todaySessions[0] : null);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {alertInfo && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-r from-amber-100 to-amber-50 border-l-4 border-amber-500 p-5 rounded-r-2xl shadow-sm flex items-center justify-between border border-y-amber-200 border-r-amber-200">
                    <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center w-12 h-12">
                            <span className="absolute w-full h-full bg-amber-400 rounded-full animate-ping opacity-30"></span>
                            <div className="relative bg-amber-500 rounded-full p-2.5 shadow-md">
                                <Clock size={20} className="text-white" />
                            </div>
                        </div>
                        <div>
                            <p className="font-black text-amber-900 text-lg tracking-tight">Class starting in {alertInfo.minutesLeft} minutes!</p>
                            <p className="text-amber-800 font-medium">Head to <span className="font-bold">{alertInfo.classInfo.classLevel}-{alertInfo.classInfo.section}</span> for <span className="font-bold uppercase tracking-wider">{alertInfo.classInfo.subject.name}</span> at {alertInfo.classInfo.startTime}</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/attendance')} className="hidden sm:block px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold tracking-wide uppercase rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95">
                        Take Attendance
                    </button>
                </motion.div>
            )}

            <div className="flex justify-between items-center bg-indigo-600 rounded-2xl p-8 text-white shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Hello, {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : 'Trainer'}</h1>
                    <p className="text-indigo-100 italic">Today is {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="text-white mt-2 font-medium bg-white/20 inline-block px-3 py-1 rounded-lg backdrop-blur-sm">
                        Total {todaySessions.length} internship sessions today
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition" onClick={() => navigate('/my-students')}>
                    <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium mb-1">Total Interns Assigned</p>
                        <h3 className="text-2xl font-bold text-slate-800">{myInternsCount}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition" onClick={() => navigate('/attendance')}>
                    <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <ClipboardCheck size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium mb-1">Assigned Batches</p>
                        <h3 className="text-2xl font-bold text-slate-800">{profile?.assignedClasses ? profile.assignedClasses.split(',').length : 0} Batches</h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium mb-1">Next Upcoming Session</p>
                        <h3 className="text-xl font-bold text-slate-800">
                            {upcomingSession ? `${upcomingSession.batch?.name} - ${upcomingSession.topic}` : 'No more sessions'}
                        </h3>
                    </div>
                </div>
            </div>

            <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2"><CalendarDays className="text-indigo-600" /> Today's Schedule</h2>
            {todaySessions.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400">
                    <CalendarDays size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">You have no internship sessions scheduled for today.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {todaySessions.map((s: any) => (
                        <div key={s.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-56 hover:shadow-md transition group">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-black px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg uppercase tracking-wider">{s.mode}</span>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">{s.timeSlot.startTime} - {s.timeSlot.endTime}</span>
                                </div>

                                <h3 className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase leading-tight line-clamp-2">{s.topic}</h3>
                                <p className="text-sm font-bold text-slate-400 mt-2">BATCH: <span className="text-slate-600">{s.batch?.name}</span></p>
                                <p className="text-xs text-slate-400 mt-1 font-medium">{s.type} • {s.focus}</p>
                            </div>
                            <button onClick={() => navigate('/attendance')} className="w-full mt-4 py-2.5 bg-slate-900 text-white hover:bg-indigo-600 font-bold rounded-xl text-xs transition-all tracking-wider uppercase">
                                Take Attendance
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Legacy Timetable Support (Optional/Minified) */}
            {todayClasses.length > 0 && (
                <div className="mt-12 pt-8 border-t border-slate-100">
                    <h3 className="text-lg font-bold text-slate-400 mb-6 uppercase tracking-widest">Recurring Timetable (School)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 opacity-60">
                        {todayClasses.map((period: any, idx: number) => (
                            <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-slate-400">Period {period.periodNumber}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-700 text-sm truncate">{period.classLevel} {period.section}</h4>
                                    <p className="text-[10px] text-slate-500 uppercase">{period.subject.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-8">
                <NoticeBoard />
            </div>

        </motion.div>
    );
}
