import { useState, useEffect } from 'react';
import { Megaphone, Trash2, Send, Download } from 'lucide-react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import ConfirmModal from './ConfirmModal';

export default function NoticeBoard() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [newMsg, setNewMsg] = useState({ title: '', content: '', targetRole: 'ALL', priority: 'NORMAL' });
    const userRole = useAuthStore((state) => state.user?.role);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMISSION_OFFICER';

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const res = await api.get('/announcements');
            setAnnouncements(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handlePostAnnouncement = async () => {
        if (!newMsg.title || !newMsg.content) return;
        try {
            await api.post('/announcements', newMsg);
            setNewMsg({ title: '', content: '', targetRole: 'ALL', priority: 'NORMAL' });
            fetchAnnouncements();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/announcements/${deleteId}`);
            setDeleteId(null);
            fetchAnnouncements();
        } catch (error) {
            console.error(error);
        }
    };

    const handleExportCSV = async () => {
        try {
            const res = await api.get('/announcements/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `announcements_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed', error);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-indigo-500" />
                    Notice Board
                    {announcements.length > 0 && (
                        <span className="ml-1 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {announcements.length}
                        </span>
                    )}
                </h2>
                {isAdmin && announcements.length > 0 && (
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
                        title="Export all announcements as CSV"
                    >
                        <Download size={13} />
                        Export CSV
                    </button>
                )}
            </div>

            {/* Fixed-height scrollable list — prevents page from expanding */}
            <div className="overflow-y-auto space-y-3 pr-1 custom-scrollbar" style={{ maxHeight: '360px' }}>
                {announcements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <Megaphone className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-500">No recent announcements.</p>
                    </div>
                ) : (
                    announcements.map((msg) => {
                        const isUrgent = msg.priority === 'URGENT';
                        const isHigh = msg.priority === 'HIGH';
                        let badgeColor = 'bg-indigo-100 text-indigo-700';
                        if (isUrgent) badgeColor = 'bg-rose-100 text-rose-700 font-bold';
                        else if (isHigh) badgeColor = 'bg-amber-100 text-amber-700 font-bold';

                        return (
                            <div key={msg.id} className={`p-4 rounded-xl border transition-colors relative group ${isUrgent ? 'bg-rose-50 border-rose-200' : isHigh ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}>
                                <div className="flex justify-between items-start mb-1.5 gap-2">
                                    <h4 className="text-sm font-bold text-slate-800 leading-tight">{msg.title}</h4>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {(isUrgent || isHigh) && (
                                            <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-md ${badgeColor}`}>
                                                {msg.priority}
                                            </span>
                                        )}
                                        {(userRole === 'SUPER_ADMIN' || userRole === 'ADMISSION_OFFICER') && (
                                            <button onClick={() => setDeleteId(msg.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 mb-2 leading-relaxed">{msg.content}</p>
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> {msg.author?.name}</span>
                                        {msg.createdAt && (
                                            <span className="text-slate-400">&bull; {new Date(msg.createdAt).toLocaleString()}</span>
                                        )}
                                    </div>
                                    <span className="bg-white px-2 py-0.5 rounded-md shadow-sm border border-slate-200 font-semibold text-slate-600 shrink-0 ml-2">
                                        {msg.targetRole === 'ALL' ? 'Everyone' : msg.targetRole.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Admin / Clerk Creation Panel */}
            {(userRole === 'SUPER_ADMIN' || userRole === 'ADMISSION_OFFICER') && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Post Announcement</h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Announcement Title"
                            className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={newMsg.title}
                            onChange={e => setNewMsg({ ...newMsg, title: e.target.value })}
                        />
                        <textarea
                            placeholder="Message details..."
                            rows={2}
                            className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            value={newMsg.content}
                            onChange={e => setNewMsg({ ...newMsg, content: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <select
                                className="w-1/3 text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                                value={newMsg.priority}
                                onChange={e => setNewMsg({ ...newMsg, priority: e.target.value })}
                            >
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High Priority</option>
                                <option value="URGENT">🔴 Urgent</option>
                            </select>
                            <select
                                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newMsg.targetRole}
                                onChange={e => setNewMsg({ ...newMsg, targetRole: e.target.value })}
                            >
                                <option value="ALL">Everyone</option>
                                <option value="TRAINER">Trainers Only</option>
                                <option value="INTERN">Interns Only</option>
                                <option value="ADMISSION_OFFICER">Admissions Only</option>
                            </select>
                            <button
                                onClick={handlePostAnnouncement}
                                disabled={!newMsg.title || !newMsg.content}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center w-12 shrink-0 active:scale-95 shadow-sm"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteId}
                title="Remove Notice"
                message="Are you sure you want to delete this announcement? This will remove it from all users' notice boards globally."
                confirmText="Delete Notice"
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
