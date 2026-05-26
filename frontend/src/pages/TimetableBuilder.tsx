import { useState, useEffect } from 'react';
import { CalendarDays, Plus, Clock, Trash2, AlertCircle, Download, BarChart3, Shield, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { useAuthStore } from '../store/authStore';

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const SHORT_MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Get the Monday of the week containing a given Date
function getMondayOf(d: Date): Date {
    const day = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

// Format Date → "YYYY-MM-DD"
function toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
}

// Add/subtract N days from a date
function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

// Build the 6 day entries (Mon–Sat) for a week starting on `monday`
function buildWeekDays(monday: Date): { dayName: string; date: Date; label: string }[] {
    return DAY_ORDER.map((dayName, i) => {
        const date = addDays(monday, i);
        const dd = date.getDate();
        const mon = SHORT_MONTH[date.getMonth()];
        return { dayName, date, label: `${dd} ${mon}` };
    });
}

// Format a Date for a nice week label e.g. "10 Mar – 15 Mar 2025"
function weekLabel(monday: Date): string {
    const sat = addDays(monday, 5);
    const d1 = `${monday.getDate()} ${SHORT_MONTH[monday.getMonth()]}`;
    const d2 = `${sat.getDate()} ${SHORT_MONTH[sat.getMonth()]} ${sat.getFullYear()}`;
    return `${d1} – ${d2}`;
}

export default function TimetableBuilder() {
    const user = useAuthStore(s => s.user);
    const userRole = user?.role;
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SCHOOL_ADMIN';

    // Start with this week's Monday
    const [monday, setMonday] = useState<Date>(() => getMondayOf(new Date()));
    const [classLevel, setClassLevel] = useState('Level 1');
    const [section, setSection] = useState('Full Stack');
    const [schedule, setSchedule] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [canEdit, setCanEdit] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState({ day: '', period: 1 });
    const [formData, setFormData] = useState({ subjectId: '', teacherId: '' });
    const [timeData, setTimeData] = useState({
        startHour: '08', startMin: '00', startMeridiem: 'AM',
        endHour: '08', endMin: '45', endMeridiem: 'AM'
    });
    const [error, setError] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Export modal
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportMode, setExportMode] = useState<'week' | 'month' | 'year'>('week');
    const now2 = new Date();
    const [exportMonth, setExportMonth] = useState(now2.getMonth() + 1);
    const [exportYear, setExportYear] = useState(now2.getFullYear());
    const yearRange = Array.from({ length: 6 }, (_, i) => now2.getFullYear() - 2 + i);
    const MONTH_NAMES_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const periods = [1, 2, 3, 4, 5, 6, 7, 8];
    const weekDays = buildWeekDays(monday);
    const weekStartStr = toDateStr(monday);

    useEffect(() => { fetchMetadata(); }, []);
    useEffect(() => { if (classLevel && section) fetchSchedule(); }, [classLevel, section, monday]);

    const fetchMetadata = async () => {
        try {
            const [tRes, sRes] = await Promise.all([api.get('/teachers'), api.get('/subjects')]);
            setTeachers(tRes.data);
            setSubjects(sRes.data);
            if (userRole === 'SUPER_ADMIN' || userRole === 'ADMISSION_OFFICER') {
                setCanEdit(true);
            } else if (userRole === 'TRAINER') {
                const myProfile = tRes.data.find((t: any) => t.profile?.userId === user?.id);
                setCanEdit(myProfile?.profile?.canEditTimetable === true);
            }
        } catch (e) { console.error(e); }
    };

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/timetable/class/${classLevel}/${section}?weekStart=${weekStartStr}`);
            setSchedule(res.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const goToPrevWeek = () => setMonday(prev => addDays(prev, -7));
    const goToNextWeek = () => setMonday(prev => addDays(prev, 7));
    const goToThisWeek = () => setMonday(getMondayOf(new Date()));

    const handleOpenSlot = (day: string, period: number) => {
        if (!canEdit) return;
        if (schedule.find(s => s.dayOfWeek === day && s.periodNumber === period)) return;
        setSelectedSlot({ day, period });
        setFormData({ subjectId: subjects[0]?.id || '', teacherId: teachers[0]?.profile?.id || '' });
        setError('');
        setShowModal(true);
    };

    const handleSaveBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/timetable', {
                classLevel, section,
                weekStart: weekStartStr,
                dayOfWeek: selectedSlot.day,
                periodNumber: selectedSlot.period,
                subjectId: formData.subjectId,
                teacherId: formData.teacherId,
                startTime: `${timeData.startHour}:${timeData.startMin} ${timeData.startMeridiem}`,
                endTime: `${timeData.endHour}:${timeData.endMin} ${timeData.endMeridiem}`
            });
            setShowModal(false);
            fetchSchedule();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error saving block');
        }
    };

    const handleDeleteBlock = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/timetable/${deleteId}`);
            setDeleteId(null);
            fetchSchedule();
        } catch (err) { console.error(err); }
    };

    const handleExportCSV = async () => {
        let params = `classLevel=${classLevel}&section=${section}`;
        let label = `${classLevel}_${section}`;
        if (exportMode === 'week') {
            params += `&weekStart=${weekStartStr}`;
            label += `_week_${weekStartStr}`;
        } else if (exportMode === 'month') {
            params += `&month=${exportMonth}&year=${exportYear}`;
            label += `_${MONTH_NAMES_FULL[exportMonth - 1]}_${exportYear}`;
        } else {
            params += `&year=${exportYear}`;
            label += `_year_${exportYear}`;
        }
        try {
            const res = await api.get(`/timetable/export?${params}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `timetable_${label}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            setShowExportModal(false);
        } catch (e) { console.error('Export failed', e); }
    };

    const getBlock = (day: string, period: number) =>
        schedule.find(s => s.dayOfWeek === day && s.periodNumber === period);

    const isThisWeek = toDateStr(getMondayOf(new Date())) === weekStartStr;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* ── Page Title & Filters ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarDays className="text-indigo-600" />
                        Program Timetable
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-2">
                        Weekly schedules for each class &amp; section
                        {!isAdmin && canEdit && (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                <Shield size={9} className="inline mr-0.5" /> Editor
                            </span>
                        )}
                        {!isAdmin && !canEdit && userRole === 'TEACHER' && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">View Only</span>
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <select value={classLevel} onChange={e => setClassLevel(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                        {['Level 1','Level 2','Level 3','Advanced'].map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select value={section} onChange={e => setSection(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                        {['Full Stack','Backend','Frontend','Mobile', 'DevOps'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    {isAdmin && (
                        <button onClick={() => setShowExportModal(true)}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors">
                            <Download size={15} /> Export CSV
                        </button>
                    )}
                </div>
            </div>

            {/* ── Week Navigation ── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                {/* Indigo week nav bar */}
                <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-700 to-indigo-500">
                    <button onClick={goToPrevWeek}
                        className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all">
                        <ChevronLeft size={20} />
                    </button>

                    <div className="text-center">
                        <p className="text-white font-bold text-base tracking-wide">{weekLabel(monday)}</p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            {!isThisWeek && (
                                <button onClick={goToThisWeek}
                                    className="text-indigo-200 hover:text-white text-xs underline underline-offset-2 transition-colors">
                                    Jump to current week
                                </button>
                            )}
                            {isThisWeek && (
                                <span className="text-emerald-300 text-xs font-semibold">● Current week</span>
                            )}
                        </div>
                    </div>

                    <button onClick={goToNextWeek}
                        className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Timetable Grid */}
                <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse min-w-[900px]">
                        <thead>
                            <tr>
                                <th className="bg-slate-800 text-white p-3 w-32 font-bold uppercase tracking-wider text-xs border border-slate-700">
                                    Day / Date
                                </th>
                                {periods.map(p => (
                                    <th key={p} className="bg-slate-700 text-slate-200 p-3 font-bold border border-slate-600 text-sm">
                                        Period {p}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="p-10 text-slate-400 text-sm">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                            Loading timetable...
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                weekDays.map(({ dayName, label }) => (
                                    <tr key={dayName}>
                                        <td className="bg-slate-100 border border-slate-200 p-3">
                                            <div className="font-black text-slate-700 text-xs tracking-widest">{dayName.slice(0, 3)}</div>
                                            <div className="text-indigo-600 font-bold text-sm mt-0.5">{label}</div>
                                        </td>
                                        {periods.map(period => {
                                            const block = getBlock(dayName, period);
                                            return (
                                                <td key={period} className="border border-slate-200 p-1.5 h-28 w-36 group relative hover:bg-slate-50 transition-colors">
                                                    {block ? (
                                                        <div className="h-full flex flex-col justify-between bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-left">
                                                            <div>
                                                                <h4 className="font-bold text-indigo-900 text-xs leading-tight">{block.subject?.name}</h4>
                                                                <span className="text-[10px] text-indigo-600 font-semibold">
                                                                    {block.teacher?.firstName} {block.teacher?.lastName}
                                                                </span>
                                                            </div>
                                                            <div className="text-[9px] text-slate-400 flex justify-between items-center mt-1">
                                                                <span className="flex items-center gap-0.5"><Clock size={9} /> {block.startTime}</span>
                                                                {canEdit && (
                                                                    <button onClick={() => setDeleteId(block.id)}
                                                                        className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Trash2 size={11} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : canEdit ? (
                                                        <button onClick={() => handleOpenSlot(dayName, period)}
                                                            className="h-full w-full rounded-lg border-2 border-dashed border-slate-200 text-slate-400 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer">
                                                            <Plus size={20} />
                                                            <span className="text-[10px] font-medium mt-0.5">Assign</span>
                                                        </button>
                                                    ) : null}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Analytics link */}
            {isAdmin && (
                <div className="flex justify-end">
                    <a href="/trainer-contribution"
                        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-lg transition-colors">
                        <BarChart3 size={15} /> View Trainer Contribution Analytics
                    </a>
                </div>
            )}

            {/* ── Assign Period Modal ── */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="bg-indigo-600 p-5 text-white text-center">
                                <h2 className="text-xl font-bold">Assign Period {selectedSlot.period}</h2>
                                <p className="text-indigo-200 text-sm mt-1">
                                    {classLevel}-{section} • {selectedSlot.day} • {weekLabel(monday)}
                                </p>
                            </div>
                            <form onSubmit={handleSaveBlock} className="p-5 space-y-4">
                                <AnimatePresence>
                                    {error && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-sm flex items-start gap-2">
                                            <AlertCircle size={16} className="shrink-0 mt-0.5" />{error}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
                                    <select required value={formData.subjectId}
                                        onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                                        <option value="" disabled>Choose subject...</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Trainer</label>
                                    <select required value={formData.teacherId}
                                        onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                                        <option value="" disabled>Choose trainer...</option>
                                        {teachers.filter(t => t.profile).map(t => (
                                            <option key={t.profile.id} value={t.profile.id}>
                                                {t.profile.firstName} {t.profile.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Start Time</label>
                                        <div className="flex gap-1.5">
                                            <select value={timeData.startHour} onChange={e => setTimeData({ ...timeData, startHour: e.target.value })}
                                                className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h}>{h}</option>)}
                                            </select>
                                            <span className="self-center text-slate-400 font-bold">:</span>
                                            <select value={timeData.startMin} onChange={e => setTimeData({ ...timeData, startMin: e.target.value })}
                                                className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                                {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m}>{m}</option>)}
                                            </select>
                                            <select value={timeData.startMeridiem} onChange={e => setTimeData({ ...timeData, startMeridiem: e.target.value })}
                                                className="px-2 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                                <option>AM</option><option>PM</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">End Time</label>
                                        <div className="flex gap-1.5">
                                            <select value={timeData.endHour} onChange={e => setTimeData({ ...timeData, endHour: e.target.value })}
                                                className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h}>{h}</option>)}
                                            </select>
                                            <span className="self-center text-slate-400 font-bold">:</span>
                                            <select value={timeData.endMin} onChange={e => setTimeData({ ...timeData, endMin: e.target.value })}
                                                className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                                {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m}>{m}</option>)}
                                            </select>
                                            <select value={timeData.endMeridiem} onChange={e => setTimeData({ ...timeData, endMeridiem: e.target.value })}
                                                className="px-2 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                                <option>AM</option><option>PM</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 text-sm transition">
                                        Cancel
                                    </button>
                                    <button type="submit"
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 text-sm transition">
                                        Save Period
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={!!deleteId}
                title="Remove Class Period"
                message="Remove this period from the timetable for this week?"
                confirmText="Remove"
                onConfirm={handleDeleteBlock}
                onCancel={() => setDeleteId(null)}
            />

            {/* ── Export CSV Modal ── */}
            <AnimatePresence>
                {showExportModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Download size={18} className="text-emerald-600" /> Export Timetable
                                </h2>
                                <button onClick={() => setShowExportModal(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Export Period</label>
                                    <div className="flex gap-2">
                                        {(['week', 'month', 'year'] as const).map(mode => (
                                            <button key={mode} onClick={() => setExportMode(mode)}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize border transition-all ${
                                                    exportMode === mode
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                                                }`}>
                                                {mode === 'week' ? 'This Week' : mode === 'month' ? 'By Month' : 'By Year'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {exportMode === 'week' && (
                                    <p className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                                        Will export: <strong>{weekLabel(monday)}</strong>
                                    </p>
                                )}

                                {exportMode === 'month' && (
                                    <div className="flex gap-2">
                                        <select value={exportMonth} onChange={e => setExportMonth(Number(e.target.value))}
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                            {MONTH_NAMES_FULL.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                        </select>
                                        <select value={exportYear} onChange={e => setExportYear(Number(e.target.value))}
                                            className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                            {yearRange.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                )}

                                {exportMode === 'year' && (
                                    <select value={exportYear} onChange={e => setExportYear(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                        {yearRange.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                )}

                                <p className="text-xs text-slate-400">
                                    Class <strong>{classLevel}</strong> · Section <strong>{section}</strong> · All periods included
                                </p>

                                <div className="flex gap-3 pt-1">
                                    <button onClick={() => setShowExportModal(false)}
                                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 text-sm transition">
                                        Cancel
                                    </button>
                                    <button onClick={handleExportCSV}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 text-sm transition">
                                        <Download size={14} /> Download CSV
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
