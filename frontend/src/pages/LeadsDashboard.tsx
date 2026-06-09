import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PhoneCall, Users, Calendar, Clock, Plus, Phone, ArrowRight, X, Save, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import LeadFormModal from '../components/LeadFormModal';
import FollowUpPopup from '../components/FollowUpPopup';

export default function LeadsDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ total: 0, interested: 0, todayFollowups: 0 });
    const [todayFollowups, setTodayFollowups] = useState<any[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const [selectedLead, setSelectedLead] = useState<any>(null); // For updating remark/status

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [leadsRes, followupsRes] = await Promise.all([
                api.get('/leads'),
                api.get('/leads/today-followups')
            ]);

            const allLeads = leadsRes.data;
            const followups = followupsRes.data;

            setStats({
                total: allLeads.length,
                interested: allLeads.filter((l: any) => l.status === 'INTERESTED').length,
                todayFollowups: followups.length
            });

            setTodayFollowups(followups);
        } catch (error) {
            console.error("Error fetching leads dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAction = (lead: any) => {
        setSelectedLead(lead);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Telecalling Dashboard</h1>
                    <p className="text-slate-500">Manage inquiries, follow-ups, and convert leads</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/leads')}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2"
                    >
                        <Search size={18} /> Explore All Leads
                    </button>
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={18} /> New Lead
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Inquiries</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <PhoneCall size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Today's Follow-ups</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.todayFollowups}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Interested Leads</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.interested}</h3>
                    </div>
                </div>
            </div>

            {/* Today's Follow-ups List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Pending Follow-ups for Today</h2>
                            <p className="text-sm text-slate-500">Call these prospects today</p>
                        </div>
                    </div>
                </div>
                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading follow-ups...</div>
                    ) : todayFollowups.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                <Phone size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">You're all caught up!</h3>
                            <p className="text-slate-500">No pending follow-ups for today.</p>
                        </div>
                    ) : (
                        todayFollowups.map(lead => (
                            <div key={lead.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg">
                                        {lead.firstName.charAt(0)}{lead.lastName?.charAt(0) || ''}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">{lead.firstName} {lead.lastName}</h4>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                                            <span className="flex items-center gap-1"><Phone size={14} /> {lead.mobileNo}</span>
                                            {lead.interestedCourse && <span className="flex items-center gap-1"><BookOpen size={14} /> {lead.interestedCourse}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">
                                        Status: {lead.status}
                                    </span>
                                    <button
                                        onClick={() => handleOpenAction(lead)}
                                        className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-1 group"
                                    >
                                        Take Action <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modals & Popups */}
            <LeadFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={() => { setIsFormOpen(false); fetchDashboardData(); }}
            />

            {selectedLead && (
                <LeadActionModal
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onSave={() => { setSelectedLead(null); fetchDashboardData(); }}
                />
            )}

            {/* Render FollowUpPopup only if there are followups */}
            {todayFollowups.length > 0 && <FollowUpPopup followups={todayFollowups} onAction={(lead: any) => handleOpenAction(lead)} />}

        </motion.div>
    );
}

// Temporary inline Action Modal (can be extracted later)
function LeadActionModal({ lead, onClose, onSave }: any) {
    const [status, setStatus] = useState(lead.status);
    const [followUpDate, setFollowUpDate] = useState(lead.followUpDate ? lead.followUpDate.split('T')[0] : '');
    const [remark, setRemark] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async (e: any) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/leads/${lead.id}`, {
                ...lead,
                status,
                followUpDate,
                remark: remark || undefined
            });
            onSave();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleAdmit = async () => {
        if (window.confirm('Promote this lead to Admission? An Admission Request will be created for admin approval.')) {
            setSaving(true);
            try {
                const res = await api.post(`/leads/${lead.id}/admit`);
                alert(`Success! ${res.data.message}`);
                onSave();
            } catch (err: any) {
                alert(err.response?.data?.message || 'Failed to promote lead');
                console.error(err);
            } finally {
                setSaving(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Follow-up Action</h3>
                        <p className="text-sm text-slate-500">{lead.firstName} {lead.lastName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg"><X size={20} /></button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">New Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="NEW">New</option>
                            <option value="INTERESTED">Interested</option>
                            <option value="MAYBE">Maybe</option>
                            <option value="NOT_INTERESTED">Not Interested</option>
                            <option value="PROMOTED" disabled>Promoted (Auto)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Next Follow-up Date</label>
                        <input
                            type="date"
                            value={followUpDate}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Call Remarks</label>
                        <textarea
                            rows={3}
                            placeholder="What was discussed?"
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {lead && lead.remarks && lead.remarks.length > 0 && (
                        <div className="pt-4 border-t border-slate-100">
                            <h4 className="text-sm font-bold text-slate-700 mb-2">Remarks History</h4>
                            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                                {lead.remarks.map((r: any) => (
                                    <div key={r.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                            <span className="font-semibold text-slate-500">Telecaller</span>
                                            <span>{new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                        </div>
                                        <p className="text-slate-600 whitespace-pre-wrap">{r.remark}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100">
                        {(status === 'INTERESTED' || status === 'MAYBE') && lead.status !== 'PROMOTED' ? (
                            <button type="button" onClick={handleAdmit} className="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg font-medium transition-colors">
                                Promote to Admission
                            </button>
                        ) : lead.status === 'PROMOTED' ? (
                            <span className="px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-full">Already Promoted</span>
                        ) : (<div></div>)}

                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 disabled:opacity-50">
                                <Save size={18} /> {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

// Ensure lucide icon imports don't fail for BookOpen which I used inline
function BookOpen(props: any) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>;
}
