import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Users, MapPin, Clock, Plus,
    ChevronLeft, ChevronRight, X, Check, Trash2, Copy, ClipboardPaste
} from 'lucide-react';
import api from '../utils/api';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { useAuthStore } from '../store/authStore';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function SchedulerGrid() {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [timeSlots, setTimeSlots] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    const [trainers, setTrainers] = useState<any[]>([]);
    const [specializations, setSpecializations] = useState<any[]>([]);
    const [trainerProfile, setTrainerProfile] = useState<any>(null);

    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedCell, setSelectedCell] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [copiedSession, setCopiedSession] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState<any>({
        batchId: '',
        date: '',
        timeSlotId: '',
        roomId: '',
        monthNo: 1,
        type: 'Technical',
        focus: '',
        topic: '',
        mode: 'ILT',
        status: 'YetToStart',
        externalTrainer: '',
        isCommon: false,
        trainerIds: [],
        specializationIds: []
    });

    const user = useAuthStore(state => state.user);
    const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMISSION_OFFICER';
    const isTrainer = user?.role === 'TRAINER';
    const isIntern = user?.role === 'INTERN';

    const canManage = isAdmin || (isTrainer && trainerProfile?.canEditTimetable);

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchSchedules();
    }, [currentWeekStart, viewMode]);

    const fetchMetadata = async () => {
        try {
            // All roles need slots to render the grid
            const slotsRes = await api.get('/scheduler/slots');
            setTimeSlots(slotsRes.data);

            // Only admins/trainers need the rest for management
            if (isAdmin || isTrainer) {
                const [roomsRes, batchesRes, trainersRes, specsRes] = await Promise.allSettled([
                    api.get('/scheduler/rooms'),
                    api.get('/scheduler/batches'),
                    isAdmin ? api.get('/teachers') : Promise.reject('Trainer cannot see all teachers'),
                    api.get('/scheduler/specializations')
                ]);

                if (roomsRes.status === 'fulfilled') setRooms(roomsRes.value.data);
                if (batchesRes.status === 'fulfilled') setBatches(batchesRes.value.data);
                if (trainersRes.status === 'fulfilled') setTrainers(trainersRes.value.data);
                if (specsRes.status === 'fulfilled') setSpecializations(specsRes.value.data);

                if (isTrainer) {
                    try {
                        const profileRes = await api.get('/teachers/me');
                        setTrainerProfile(profileRes.data);
                    } catch (err) {
                        console.error('Error fetching trainer profile:', err);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching metadata:', error);
        }
    };

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const endpoint = isIntern
                ? '/scheduler/student'
                : (isTrainer && viewMode === 'mine')
                    ? '/scheduler/trainer'
                    : '/scheduler';

            const res = await api.get(`${endpoint}?week=${currentWeekStart.toISOString()}`);
            setSchedules(res.data);
        } catch (error) {
            console.error('Error fetching schedules:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCellClick = (dayIndex: number, slot: any) => {
        const date = addDays(currentWeekStart, dayIndex);
        setSelectedCell({ date, slot });
        setIsEditing(false);
        setEditingSessionId(null);
        setFormData({
            batchId: batches[0]?.id || '',
            date: format(date, 'yyyy-MM-dd'),
            timeSlotId: slot.id,
            roomId: rooms[0]?.id || '',
            monthNo: 1,
            type: 'Technical',
            focus: '',
            topic: '',
            mode: 'ILT',
            status: 'YetToStart',
            externalTrainer: '',
            isCommon: false,
            trainerIds: [],
            specializationIds: []
        });
        setShowAddModal(true);
    };

    const handlePasteClick = (dayIndex: number, slot: any) => {
        if (!copiedSession) return;
        const date = addDays(currentWeekStart, dayIndex);
        setSelectedCell({ date, slot });
        setIsEditing(false);
        setEditingSessionId(null);
        setFormData({
            batchId: copiedSession.batchId || batches[0]?.id || '',
            date: format(date, 'yyyy-MM-dd'),
            timeSlotId: slot.id,
            roomId: copiedSession.roomId || rooms[0]?.id || '',
            monthNo: copiedSession.monthNo || 1,
            type: copiedSession.type || 'Technical',
            focus: copiedSession.focus || '',
            topic: copiedSession.topic || '',
            mode: copiedSession.mode || 'ILT',
            status: 'YetToStart',
            externalTrainer: copiedSession.externalTrainer || '',
            isCommon: copiedSession.isCommon || false,
            trainerIds: copiedSession.trainers?.map((t: any) => t.trainerId) || [],
            specializationIds: copiedSession.specializations?.map((s: any) => s.specializationId) || []
        });
        setShowAddModal(true);
    };

    const handleEditClick = (session: any) => {
        setSelectedCell({ date: parseISO(session.date), slot: session.timeSlot });
        setIsEditing(true);
        setEditingSessionId(session.id);
        setFormData({
            batchId: session.batchId,
            date: format(parseISO(session.date), 'yyyy-MM-dd'),
            timeSlotId: session.timeSlotId,
            roomId: session.roomId,
            monthNo: session.monthNo,
            type: session.type,
            focus: session.focus,
            topic: session.topic,
            mode: session.mode,
            status: session.status,
            externalTrainer: session.externalTrainer || '',
            isCommon: session.isCommon,
            trainerIds: session.trainers?.map((t: any) => t.trainerId) || [],
            specializationIds: session.specializations?.map((s: any) => s.specializationId) || []
        });
        setShowAddModal(true);
    };

    const handleDeleteSession = async () => {
        if (!editingSessionId || !window.confirm('Are you sure you want to delete this session?')) return;
        try {
            console.log('DELETING SESSION:', editingSessionId);
            await api.delete(`/scheduler/delete/${editingSessionId}`);
            setShowAddModal(false);
            fetchSchedules();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error deleting session');
        }
    };

    const handleSaveSession = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Validation: Must have at least one trainer (either registered or external)
            if (formData.trainerIds.length === 0 && !formData.externalTrainer.trim()) {
                alert('Please assign at least one trainer (registered or external).');
                return;
            }

            if (isEditing && editingSessionId) {
                console.log(`Sending PUT request to /scheduler/update/${editingSessionId}`, formData);
                await api.put(`/scheduler/update/${editingSessionId}`, formData);
            } else {
                // If not editing, it's a new session. 
                // We use the bulk-create endpoint even for single sessions as it handles the logic well.
                await api.post('/scheduler/bulk-create', { entries: [formData] });
            }
            setShowAddModal(false);
            fetchSchedules();
        } catch (error: any) {
            console.error('Error saving session:', error);
            const msg = error.response?.data?.message || error.message || 'Error saving session';
            alert(`Failed to save: ${msg}`);
        }
    };

    const handleBulkCreate = async () => {
        setLoading(true);
        try {
            if (!batches[0] || !rooms[0]) return alert('Please ensure Batches and Rooms are seeded first');

            const newEntries: any[] = [];
            for (let i = 0; i < 5; i++) {
                const date = format(addDays(currentWeekStart, i), 'yyyy-MM-dd');
                timeSlots.slice(0, 4).forEach((slot, sIdx) => {
                    newEntries.push({
                        batchId: batches[0].id,
                        date,
                        timeSlotId: slot.id,
                        roomId: rooms[0].id,
                        monthNo: 1,
                        type: sIdx === 3 ? 'Communication' : 'Technical',
                        focus: 'Common Foundation',
                        topic: sIdx === 3 ? 'Presentation Skills' : 'Logic Building & Basics',
                        mode: 'ILT',
                        isCommon: true,
                        trainerIds: trainers.slice(0, 1).filter(t => t.profile).map(t => t.profile.id),
                        specializationIds: []
                    });
                });
            }

            await api.post('/scheduler/bulk-create', { entries: newEntries });
            setShowBulkModal(false);
            fetchSchedules();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error bulk creating');
        } finally {
            setLoading(false);
        }
    };

    const navigateWeek = (direction: number) => {
        setCurrentWeekStart(addDays(currentWeekStart, direction * 7));
    };

    const getSessionsForCell = (dayIndex: number, slotId: string) => {
        const date = addDays(currentWeekStart, dayIndex);
        return schedules.filter(s => isSameDay(parseISO(s.date), date) && s.timeSlotId === slotId);
    };

    if (loading && timeSlots.length === 0) return <div className="p-12 text-center text-slate-500 font-medium">Initializing Scheduler...</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-indigo-600" /> Training Weekly Planner
                    </h1>
                    <p className="text-slate-500 text-sm">Managing slots for week of {format(currentWeekStart, 'MMM dd, yyyy')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* View Switcher for Trainers */}
                    {isTrainer && (
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl mr-2">
                            <button
                                onClick={() => setViewMode('all')}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Global Schedule
                            </button>
                            <button
                                onClick={() => setViewMode('mine')}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'mine' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                My Sessions
                            </button>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-slate-50 text-slate-400 border-r border-slate-100"><ChevronLeft size={20} /></button>
                            <button onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-widest">Today</button>
                            <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-slate-50 text-slate-400 border-l border-slate-100"><ChevronRight size={20} /></button>
                        </div>
                        {canManage && (
                            <button onClick={() => setShowBulkModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                                <Plus size={18} /> Bulk Create Week
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse table-fixed min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-left border-r border-slate-100 sticky left-0 z-20 bg-slate-50 w-32">Slot</th>
                                {DAYS.map((day, idx) => (
                                    <th key={idx} className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                                        <div className="text-slate-800 text-sm mb-1">{day}</div>
                                        <div className="font-medium">{format(addDays(currentWeekStart, idx), 'MMM dd')}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timeSlots.map((slot) => (
                                <tr key={slot.id} className="border-b border-slate-50 hover:bg-slate-50/20 transition-colors">
                                    <td className="p-6 border-r border-slate-100 bg-slate-50/50 sticky left-0 z-10 backdrop-blur-sm">
                                        <div className="text-xs font-black text-slate-800">{slot.startTime}</div>
                                        <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{slot.endTime}</div>
                                    </td>
                                    {DAYS.map((_, dayIdx) => {
                                        const sessions = getSessionsForCell(dayIdx, slot.id);
                                        return (
                                            <td key={dayIdx} className="p-3 align-top min-h-[160px] relative group border-r border-slate-50 last:border-r-0">
                                                <div className="space-y-3">
                                                    {sessions.map((s: any) => (
                                                        <SessionCard
                                                            key={s.id}
                                                            session={s}
                                                            onClick={() => (isAdmin || isTrainer) && handleEditClick(s)}
                                                            onCopy={canManage ? (sessionData: any) => setCopiedSession(sessionData) : undefined}
                                                        />
                                                    ))}
                                                    {canManage && (
                                                        <div className="flex gap-2 w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleCellClick(dayIdx, slot)}
                                                                className="flex-1 py-4 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center text-slate-200 hover:text-indigo-400 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all"
                                                                title="Add Session"
                                                            >
                                                                <Plus size={20} />
                                                            </button>
                                                            {copiedSession && (
                                                                <button
                                                                    onClick={() => handlePasteClick(dayIdx, slot)}
                                                                    className="flex-1 py-4 border-2 border-dashed border-amber-200 rounded-2xl flex items-center justify-center text-amber-500 hover:text-amber-600 hover:border-amber-400 hover:bg-amber-50/50 transition-all"
                                                                    title="Paste Copied Session"
                                                                >
                                                                    <ClipboardPaste size={20} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Update Session' : 'Add Training Session'}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs text-slate-500 font-medium">{format(selectedCell.date, 'EEEE, MMM dd')} • {selectedCell.slot.startTime}</p>
                                        <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-200 text-indigo-600 focus:ring-indigo-500"
                                                checked={formData.status === 'Completed'}
                                                onChange={e => setFormData({ ...formData, status: e.target.checked ? 'Completed' : 'YetToStart' })}
                                            />
                                            <span className={`text-xs font-bold transition-colors ${formData.status === 'Completed' ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                Mark as Completed
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white rounded-xl text-slate-400"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSaveSession} className="flex-1 overflow-y-auto p-8 space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                        <input
                                            type="checkbox"
                                            id="isCommon"
                                            className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500"
                                            checked={formData.isCommon}
                                            onChange={e => setFormData({ ...formData, isCommon: e.target.checked })}
                                        />
                                        <label htmlFor="isCommon" className="text-sm font-bold text-indigo-700">Common Module (All Students)</label>
                                    </div>

                                    {!formData.isCommon && (
                                        <div className="col-span-2">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Specializations</label>
                                            <div className="flex flex-wrap gap-2">
                                                {specializations.map(s => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const ids = formData.specializationIds.includes(s.id)
                                                                ? formData.specializationIds.filter((id: any) => id !== s.id)
                                                                : [...formData.specializationIds, s.id];
                                                            setFormData({ ...formData, specializationIds: ids });
                                                        }}
                                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${formData.specializationIds.includes(s.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                    >
                                                        {s.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Target Batch</label>
                                        <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" value={formData.batchId} onChange={e => setFormData({ ...formData, batchId: e.target.value })}>
                                            <option value="">Select Batch</option>
                                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Classroom / Room</label>
                                        <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" value={formData.roomId} onChange={e => setFormData({ ...formData, roomId: e.target.value })}>
                                            <option value="">Select Room</option>
                                            {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.capacity} seats)</option>)}
                                        </select>
                                    </div>

                                    <div className="col-span-2 space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Assign Trainers</label>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Registered Faculty</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {trainers.map(t => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const profileId = t.profile?.id;
                                                            if (!profileId) return;
                                                            const ids = formData.trainerIds.includes(profileId)
                                                                ? formData.trainerIds.filter((id: any) => id !== profileId)
                                                                : [...formData.trainerIds, profileId];
                                                            setFormData({ ...formData, trainerIds: ids });
                                                        }}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${formData.trainerIds.includes(t.profile?.id) ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${formData.trainerIds.includes(t.profile?.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                            {t.name.charAt(0)}
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-xs font-bold text-slate-800">{t.name}</div>
                                                            <p className="text-[10px] text-slate-400">Trainer</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-dashed border-slate-100">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">External Trainer / Guest Speaker</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <Users size={16} />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Enter name of unregistered trainer..."
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm transition-all"
                                                    value={formData.externalTrainer}
                                                    onChange={e => setFormData({ ...formData, externalTrainer: e.target.value })}
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Use this if the trainer is not in the registered list above.</p>
                                        </div>
                                    </div>

                                    <div className="border-t col-span-2 pt-6"></div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Month Number (1-6)</label>
                                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" value={formData.monthNo} onChange={e => setFormData({ ...formData, monthNo: parseInt(e.target.value) })}>
                                            {[1, 2, 3, 4, 5, 6].map(m => <option key={m} value={m}>Month {m}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Session Type</label>
                                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                            <option>Technical</option>
                                            <option>Communication</option>
                                            <option>Softskills</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Session Mode</label>
                                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" value={formData.mode} onChange={e => setFormData({ ...formData, mode: e.target.value })}>
                                            <option>ILT</option>
                                            <option>Practice</option>
                                            <option>Measurement</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                            <option value="YetToStart">Yet To Start</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Focus Area</label>
                                        <input required type="text" placeholder="e.g. Logic Building" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" value={formData.focus} onChange={e => setFormData({ ...formData, focus: e.target.value })} />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Daily Topic</label>
                                        <input required type="text" placeholder="e.g. Advanced React Hooks" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" value={formData.topic} onChange={e => setFormData({ ...formData, topic: e.target.value })} />
                                    </div>
                                </div>

                                <div className="p-8 border-t bg-slate-50/50 -mx-8 -mb-8 flex justify-between items-center shrink-0">
                                    <div>
                                        {isEditing && canManage && (
                                            <button type="button" onClick={handleDeleteSession} className="text-rose-600 font-bold text-sm flex items-center gap-2 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all">
                                                <Trash2 size={16} /> Delete
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 text-slate-600 font-bold hover:bg-white rounded-2xl transition-all">Cancel</button>
                                        {canManage && (
                                            <button type="submit" className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
                                                {isEditing ? 'Update Session' : 'Create Session'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {showBulkModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8 text-center">
                            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Calendar size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Bulk Create Week?</h2>
                            <p className="text-slate-500 text-sm mb-8">This will automatically generate a standard Month 1 common training schedule (4 slots per day) for the entire **Monday to Friday** week of <strong>{format(currentWeekStart, 'MMM dd')}</strong>.</p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleBulkCreate}
                                    disabled={loading}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Generating...' : 'Confirm & Generate'}
                                </button>
                                <button onClick={() => setShowBulkModal(false)} className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancel</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function SessionCard({ session, onClick, onCopy }: any) {
    const isTechnical = session.type === 'Technical';
    const isSoftskills = session.type === 'Softskills';
    const isCompleted = session.status === 'Completed';

    const colorClass = isTechnical ? 'bg-indigo-600' : isSoftskills ? 'bg-amber-500' : 'bg-emerald-500';
    const lightClass = isTechnical ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : isSoftskills ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100';

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onClick}
            className={`p-4 rounded-2xl border ${lightClass} shadow-sm group relative overflow-hidden text-left cursor-pointer hover:shadow-md transition-all active:scale-[0.98] ${isCompleted ? 'opacity-70' : ''}`}
        >
            <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`}></div>
            
            {onCopy && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onCopy(session); }}
                        className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-500 hover:text-indigo-600 shadow-sm transition-all"
                        title="Copy Session"
                    >
                        <Copy size={14} strokeWidth={2.5} />
                    </button>
                </div>
            )}

            <div className="flex justify-between items-start mb-2 pr-8">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${colorClass} text-white`}>
                    {session.type}
                </span>
                {isCompleted ? (
                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        <Check size={12} strokeWidth={4} /> Done
                    </span>
                ) : (
                    <span className="text-[10px] font-bold text-slate-400">Month {session.monthNo}</span>
                )}
            </div>

            <h4 className="text-sm font-black text-slate-800 leading-snug mb-3">
                {session.topic}
            </h4>

            <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-bold opacity-80">
                    <MapPin size={12} strokeWidth={3} /> {session.room?.name || 'No Room'}
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-bold opacity-80">
                        <Clock size={12} strokeWidth={3} /> {session.mode}
                    </div>
                    {session.trainers?.length > 0 ? (
                        <div className="flex items-center gap-2 text-[11px] font-bold opacity-80">
                            <Users size={12} strokeWidth={3} /> {session.trainers.map((t: any) => t.trainer.firstName).join(', ')}
                        </div>
                    ) : session.externalTrainer ? (
                        <div className="flex items-center gap-2 text-[11px] font-bold opacity-80">
                            <Users size={12} strokeWidth={3} /> {session.externalTrainer}
                        </div>
                    ) : null}
                </div>
            </div>

            {session.isCommon && (
                <div className="mt-3 pt-2 border-t border-current border-opacity-10 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                    <Users size={12} strokeWidth={4} /> Common
                </div>
            )}
        </motion.div>
    );
}
