import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useSettingsStore } from '../store/settingsStore';

export default function AcademicYears() {
    const [years, setYears] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });
    const [editingId, setEditingId] = useState<string | null>(null);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ show: boolean, id: string, name: string, confirmCount: number }>({
        show: false, id: '', name: '', confirmCount: 0
    });

    const { fetchSettings } = useSettingsStore();

    useEffect(() => {
        fetchYears();
    }, []);

    const fetchYears = async () => {
        try {
            const res = await api.get('/academic-years');
            setYears(res.data);
        } catch (error) {
            console.error('Error fetching academic years:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingId) {
                await api.patch(`/academic-years/${editingId}`, formData);
            } else {
                await api.post('/academic-years', formData);
            }
            setShowCreateModal(false);
            setEditingId(null);
            setFormData({ name: '', startDate: '', endDate: '', isCurrent: false });
            fetchYears();
            fetchSettings(); // Update global context if one is set as current
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to save academic year');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSetCurrent = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to set "${name}" as the ACTIVE academic year? This affects filters across the entire system.`)) return;
        try {
            await api.patch(`/academic-years/${id}`, { isCurrent: true });
            fetchYears();
            fetchSettings();
        } catch (error) {
            console.error('Error setting current year:', error);
        }
    };

    const handleDelete = async () => {
        if (deleteModal.confirmCount < 2) {
            setDeleteModal(prev => ({ ...prev, confirmCount: prev.confirmCount + 1 }));
            return;
        }

        try {
            await api.delete(`/academic-years/${deleteModal.id}`);
            setDeleteModal({ show: false, id: '', name: '', confirmCount: 0 });
            fetchYears();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete year');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading academic years...</div>;

    return (
        <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 20 }} className="p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Academic Year Management</h1>
                    <p className="text-slate-500 mt-2 font-medium">Create lifecycle batches and partition system data by academic session.</p>
                </div>
                <button 
                    onClick={() => { setShowCreateModal(true); setEditingId(null); setFormData({ name: '', startDate: '', endDate: '', isCurrent: false }); }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                    <Plus size={18} />
                    Create New Year
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {years.map((y) => (
                    <div key={y.id} className={`bg-white p-6 rounded-[2.5rem] border ${y.isCurrent ? 'border-indigo-500 shadow-xl shadow-indigo-50' : 'border-slate-100 shadow-sm'} transition-all hover:shadow-md relative overflow-hidden group`}>
                        {y.isCurrent && (
                            <div className="absolute top-0 right-0 bg-indigo-500 text-white px-4 py-1.5 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                                <CheckCircle2 size={12} /> Active
                            </div>
                        )}

                        <div className={`w-14 h-14 rounded-2xl ${y.isCurrent ? 'bg-indigo-50' : 'bg-slate-50'} flex items-center justify-center mb-6`}>
                            <Calendar className={y.isCurrent ? 'text-indigo-600' : 'text-slate-400'} size={28} />
                        </div>

                        <h3 className="text-2xl font-black text-slate-800 mb-2">{y.name}</h3>
                        
                        <div className="space-y-2 mb-8">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                <span>Start: {y.startDate ? new Date(y.startDate).toLocaleDateString() : 'Not Set'}</span>
                                <ArrowRight size={12} />
                                <span>End: {y.endDate ? new Date(y.endDate).toLocaleDateString() : 'Not Set'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {!y.isCurrent ? (
                                <>
                                    <button 
                                        onClick={() => handleSetCurrent(y.id, y.name)}
                                        className="flex-1 py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                                    >
                                        Set Active
                                    </button>
                                    <button 
                                        onClick={() => setDeleteModal({ show: true, id: y.id, name: y.name, confirmCount: 0 })}
                                        className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => { setEditingId(y.id); setFormData({ name: y.name, startDate: y.startDate?.split('T')[0] || '', endDate: y.endDate?.split('T')[0] || '', isCurrent: true }); setShowCreateModal(true); }}
                                    className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                                >
                                    Edit Details
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl">
                            <h2 className="text-2xl font-black text-slate-900 mb-2">{editingId ? 'Edit' : 'Create'} Academic Year</h2>
                            <p className="text-slate-500 text-sm mb-8 font-medium italic">Define the session name and duration.</p>
                            
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Session Name</label>
                                    <input 
                                        type="text" required placeholder="e.g. 2025 - 2026"
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                                        <input 
                                            type="date"
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                            value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                                        <input 
                                            type="date"
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                            value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                    <input 
                                        type="checkbox" id="isCurrent"
                                        className="w-5 h-5 accent-indigo-600 cursor-pointer"
                                        checked={formData.isCurrent} onChange={e => setFormData({...formData, isCurrent: e.target.checked})}
                                    />
                                    <label htmlFor="isCurrent" className="text-sm font-bold text-indigo-700 cursor-pointer select-none">Set as Active Year immediately</label>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        type="button" onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-4 rounded-2xl font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" disabled={isSubmitting}
                                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Year'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Double Confirmation Delete Modal */}
            <AnimatePresence>
                {deleteModal.show && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-rose-900/20 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl shadow-rose-500/20 text-center">
                            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                                <AlertTriangle size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">Dangerous Deletion</h2>
                            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                                You are about to delete <span className="font-black text-rose-600">"{deleteModal.name}"</span>. 
                                <br/><br/>
                                <span className="text-rose-500 font-bold">WARNING:</span> This will permanently delete ALL students, batches, fees, and training schedules associated with this year. This action CANNOT be undone.
                            </p>

                            <div className="space-y-4">
                                {deleteModal.confirmCount === 0 ? (
                                    <button 
                                        onClick={handleDelete}
                                        className="w-full py-4 bg-rose-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-200 transition-all hover:bg-rose-700"
                                    >
                                        Yes, I Understand
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleDelete}
                                        className="w-full py-4 bg-rose-500 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-100 animate-pulse transition-all hover:bg-rose-600"
                                    >
                                        CONFIRM DELETE (Final Step)
                                    </button>
                                )}
                                <button 
                                    onClick={() => setDeleteModal({ show: false, id: '', name: '', confirmCount: 0 })}
                                    className="w-full py-4 bg-slate-50 text-slate-400 rounded-3xl font-black text-sm uppercase tracking-widest transition-all hover:bg-slate-100"
                                >
                                    No, Keep it safe
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
