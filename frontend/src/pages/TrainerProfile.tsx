import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Mail, Phone, BookOpen, Clock, FileText, LayoutDashboard, Activity } from 'lucide-react';
import api from '../utils/api';

export default function TrainerProfile() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [teacher, setTeacher] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchTeacherDetails();
    }, [id]);

    const fetchTeacherDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/teachers/${id}/details`);
            setTeacher(res.data);
        } catch (error) {
            console.error("Error fetching trainer details", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (!teacher) {
        return (
            <div className="p-8 text-center text-slate-500">
                <h2>Trainer not found.</h2>
                <button onClick={() => navigate(-1)} className="mt-4 text-emerald-600 hover:underline">Go Back</button>
            </div>
        );
    }

    // Helper functions
    const fullName = `${teacher.firstName} ${teacher.middleName ? teacher.middleName + ' ' : ''}${teacher.lastName}`.trim();
    const totalAssignments = teacher.assignments?.length || 0;
    const totalAssessments = teacher.assessments?.length || 0;

    // Group timetables by day
    const groupedTimetables = (teacher.timetables || []).reduce((acc: any, curr: any) => {
        if (!acc[curr.dayOfWeek]) acc[curr.dayOfWeek] = [];
        acc[curr.dayOfWeek].push(curr);
        return acc;
    }, {});

    // Group internship schedules by Date (formatted)
    const groupedSchedules = (teacher.scheduledSessions || []).reduce((acc: any, curr: any) => {
        const dateStr = new Date(curr.schedule.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(curr.schedule);
        return acc;
    }, {});

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header / Back Button */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="text-slate-600" size={24} />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">Trainer Profile</h1>
            </div>

            {/* Profile Hero Card */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-bl-full -z-0"></div>

                <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-lg relative z-10">
                    <User size={48} className="text-emerald-500" />
                </div>

                <div className="flex-1 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800">{fullName}</h2>
                            <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
                                <Mail size={16} className="text-emerald-500" />
                                {teacher.user?.email || 'No email registered'}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {teacher.subjects?.map((sub: any) => (
                                    <span key={sub.id} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                                        {sub.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="px-4 py-1.5 rounded-full text-sm font-bold tracking-wider bg-emerald-100 text-emerald-700">
                                ACTIVE STAFF
                            </span>
                            <p className="text-xs text-slate-400 mt-2 font-medium">Joined: {new Date(teacher.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2"><LayoutDashboard size={16} className="text-emerald-500" /> Programs Assigned</p>
                            <p className="text-2xl font-bold text-slate-800">{teacher.assignedClasses?.split(',').filter(Boolean).length || 0}</p>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{teacher.classTeacherFor ? `Program Lead: ${teacher.classTeacherFor}` : 'Standard Trainer'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2"><FileText size={16} className="text-blue-500" /> Assignments Created</p>
                            <p className="text-2xl font-bold text-slate-800">{totalAssignments}</p>
                            <p className="text-xs text-slate-400 mt-1">Total Assignments</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2"><BookOpen size={16} className="text-purple-500" /> Assessments Authored</p>
                            <p className="text-2xl font-bold text-slate-800">{totalAssessments}</p>
                            <p className="text-xs text-slate-400 mt-1">Total MCQ Tests</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto hide-scrollbar">
                {['overview', 'workload', 'content'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 font-medium text-sm capitalize transition-colors relative whitespace-nowrap ${activeTab === tab ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <motion.div layoutId="activeTabTeacher" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm min-h-[400px]">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Personal Details</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0"><User size={18} className="text-slate-400" /></div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Full Name</p>
                                        <p className="text-slate-800 font-medium">{fullName}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0"><Phone size={18} className="text-slate-400" /></div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Contact Number</p>
                                        <p className="text-slate-800 font-medium">{teacher.mobileNo || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0"><Mail size={18} className="text-slate-400" /></div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">System Email Account</p>
                                        <p className="text-slate-800 font-medium">{teacher.user?.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Program Assignments</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0"><LayoutDashboard size={18} className="text-emerald-600" /></div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Assigned Levels to Train</p>
                                        <p className="text-slate-800 font-medium">{teacher.assignedClasses || 'None'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0"><BookOpen size={18} className="text-emerald-600" /></div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Subjects Authorized</p>
                                        <p className="text-slate-800 font-medium">
                                            {teacher.subjects?.map((s: any) => s.name).join(', ') || 'None'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'workload' && (
                    <div className="space-y-10">
                        {/* Internship Schedules (New System) */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Activity size={20} className="text-indigo-600" />
                                Internship Training Schedule
                            </h3>
                            {Object.keys(groupedSchedules).length === 0 ? (
                                <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                    <Clock size={40} className="mx-auto mb-3 text-slate-300" />
                                    <p className="font-medium">No internship sessions found in current schedule.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(groupedSchedules).map(([dateLabel, sessions]: [string, any]) => (
                                        <div key={dateLabel} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                            <div className="bg-indigo-50 p-3 border-b border-indigo-100">
                                                <h4 className="font-bold text-indigo-800 text-sm uppercase tracking-tight">{dateLabel}</h4>
                                            </div>
                                            <div className="p-3 space-y-3">
                                                {sessions.sort((a: any, b: any) => a.timeSlot.slotOrder - b.timeSlot.slotOrder).map((s: any) => (
                                                    <div key={s.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-100 px-1.5 py-0.5 rounded">
                                                                {s.mode}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-slate-400">
                                                                {s.timeSlot.startTime} - {s.timeSlot.endTime}
                                                            </span>
                                                        </div>
                                                        <h5 className="font-bold text-slate-800 text-sm leading-tight">{s.topic}</h5>
                                                        <p className="text-[11px] text-slate-500 mt-1">Batch: <span className="font-semibold">{s.batch?.name}</span> • {s.focus}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Traditional Timetable (Legacy/Backup) */}
                        {Object.keys(groupedTimetables).length > 0 && (
                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800 mb-6">Weekly Timetable Schedule (Recurring)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                                    {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map(day => (
                                        <div key={day} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden opacity-80 grayscale-[0.3]">
                                            <div className="bg-slate-200/50 p-3 flex justify-between items-center border-b border-slate-200">
                                                <h4 className="font-bold text-slate-700 text-sm tracking-wider">{day}</h4>
                                            </div>
                                            <div className="p-3 space-y-3">
                                                {(groupedTimetables[day] || [])
                                                    .sort((a: any, b: any) => a.periodNumber - b.periodNumber)
                                                    .map((period: any) => (
                                                        <div key={period.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                                                            <p className="text-[10px] font-bold text-emerald-600 mb-1 tracking-wider">PERIOD {period.periodNumber}</p>
                                                            <h5 className="font-bold text-slate-800 text-sm truncate">{period.subject?.name}</h5>
                                                            <p className="text-xs text-slate-500 mt-1">{period.classLevel}-{period.section}</p>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'content' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b flex items-center justify-between">
                                Published Assessments
                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">{totalAssessments} Total</span>
                            </h3>
                            {teacher.assessments?.length === 0 ? (
                                <p className="text-slate-400 text-sm italic">No MCQ assessments created.</p>
                            ) : (
                                <div className="space-y-3">
                                    {teacher.assessments.map((quiz: any) => (
                                        <div key={quiz.id} className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 transition-colors bg-white shadow-sm flex justify-between items-center group">
                                            <div>
                                                <h4 className="font-bold text-slate-800 group-hover:text-purple-600 transition-colors">{quiz.title}</h4>
                                                <p className="text-xs text-slate-500 mt-1">{quiz.subject?.name} • {quiz.classLevel}-{quiz.section}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Due</span>
                                                <p className="text-sm font-medium text-slate-700">{new Date(quiz.dueDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b flex items-center justify-between">
                                Homework Assignments
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{totalAssignments} Total</span>
                            </h3>
                            {teacher.assignments?.length === 0 ? (
                                <p className="text-slate-400 text-sm italic">No homework assignments created.</p>
                            ) : (
                                <div className="space-y-3">
                                    {teacher.assignments.map((assignment: any) => (
                                        <div key={assignment.id} className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors bg-white shadow-sm flex justify-between items-center group">
                                            <div>
                                                <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{assignment.title}</h4>
                                                <p className="text-xs text-slate-500 mt-1">{assignment.subject?.name} • {assignment.classLevel}-{assignment.section}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Due</span>
                                                <p className="text-sm font-medium text-slate-700">{new Date(assignment.dueDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
