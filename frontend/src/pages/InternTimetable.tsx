import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import api from '../utils/api';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export default function InternTimetable() {
    const [intern, setIntern] = useState<any>(null);
    const [interns, setInterns] = useState<any[]>([]);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [noTimetable, setNoTimetable] = useState(false);

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                const res = await api.get('/students/parent/me');
                setInterns(res.data);
                if (res.data.length > 0) setIntern(res.data[0]);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchChildren();
    }, []);

    useEffect(() => {
        if (intern) fetchTimetable(intern);
    }, [intern]);

    const fetchTimetable = async (c: any) => {
        setLoading(true);
        try {
            const res = await api.get(`/timetable/class/${c.classLevel}/${c.section}`);
            setSchedule(res.data);
            setNoTimetable(res.data.length === 0);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // Build grid: { day: { periodNumber: entry } }
    const grid: Record<string, Record<number, any>> = {};
    const periods = new Set<number>();
    DAYS.forEach(d => { grid[d] = {}; });
    schedule.forEach((entry: any) => {
        if (!grid[entry.dayOfWeek]) grid[entry.dayOfWeek] = {};
        grid[entry.dayOfWeek][entry.periodNumber] = entry;
        periods.add(entry.periodNumber);
    });
    const sortedPeriods = Array.from(periods).sort((a, b) => a - b);

    const subjectColors = [
        'bg-indigo-50 border-indigo-200 text-indigo-700',
        'bg-emerald-50 border-emerald-200 text-emerald-700',
        'bg-amber-50 border-amber-200 text-amber-700',
        'bg-rose-50 border-rose-200 text-rose-700',
        'bg-violet-50 border-violet-200 text-violet-700',
        'bg-sky-50 border-sky-200 text-sky-700',
        'bg-orange-50 border-orange-200 text-orange-700',
        'bg-teal-50 border-teal-200 text-teal-700',
    ];
    const subjectColorMap: Record<string, string> = {};
    let colorIdx = 0;
    schedule.forEach((e: any) => {
        if (!subjectColorMap[e.subject?.name]) {
            subjectColorMap[e.subject?.name] = subjectColors[colorIdx % subjectColors.length];
            colorIdx++;
        }
    });

    if (loading) return <div className="p-8 text-center text-slate-500">Loading timetable...</div>;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={24} className="text-indigo-500" /> Program Timetable
                    </h1>
                    {intern && (
                        <p className="text-slate-500 mt-1">
                            Weekly schedule for <strong>{intern.name}</strong> — {intern.classLevel} - {intern.section}
                        </p>
                    )}
                </div>
                {interns.length > 1 && (
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                        {interns.map((c: any) => (
                            <button key={c.id} onClick={() => setIntern(c)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${intern?.id === c.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
                                {c.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {noTimetable ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                    <Calendar className="w-12 h-12 text-indigo-100 mx-auto mb-3" />
                    <h3 className="font-semibold text-slate-700 mb-1">No Timetable Yet</h3>
                    <p className="text-slate-500 text-sm">The admin hasn't configured a timetable for {intern?.classLevel} - {intern?.section}.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                        <Clock size={18} className="text-indigo-500" />
                        <span className="text-sm font-semibold text-slate-700">Weekly Program Schedule</span>
                        <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Read Only</span>
                    </div>
                    <table className="w-full text-sm border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400 uppercase w-24">Period</th>
                                {DAYS.map(day => (
                                    <th key={day} className="py-3 px-3 text-left text-xs font-semibold text-slate-600 uppercase">
                                        {day.slice(0, 3)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedPeriods.map(period => (
                                <tr key={period} className="hover:bg-slate-50/40 transition-colors">
                                    <td className="py-3 px-4 text-center">
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">{period}</span>
                                    </td>
                                    {DAYS.map(day => {
                                        const entry = grid[day]?.[period];
                                        if (!entry) return (
                                            <td key={day} className="py-3 px-3">
                                                <span className="text-slate-200 text-center block">—</span>
                                            </td>
                                        );
                                        const colorClass = subjectColorMap[entry.subject?.name] || subjectColors[0];
                                        return (
                                            <td key={day} className="py-2 px-3">
                                                <div className={`px-3 py-2 rounded-xl border text-xs ${colorClass}`}>
                                                    <p className="font-bold truncate">{entry.subject?.name}</p>
                                                    <p className="truncate opacity-70">{entry.teacher?.firstName} {entry.teacher?.lastName}</p>
                                                    <p className="opacity-60 mt-0.5">{entry.startTime} – {entry.endTime}</p>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Color Legend */}
            {Object.keys(subjectColorMap).length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(subjectColorMap).map(([subj, cls]) => (
                        <span key={subj} className={`px-3 py-1 rounded-full text-xs font-semibold border ${cls}`}>{subj}</span>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
