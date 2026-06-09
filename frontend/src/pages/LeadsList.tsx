import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Filter, Trash2, Edit2, Download, UserCheck } from 'lucide-react';
import api from '../utils/api';
import LeadFormModal from '../components/LeadFormModal';
import ConfirmModal from '../components/ConfirmModal';

export default function LeadsList() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchLeads();
    }, [statusFilter]);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const res = await api.get('/leads', { params: { status: statusFilter } });
            setLeads(res.data);
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/leads/${deleteId}`);
            setDeleteId(null);
            fetchLeads();
        } catch (e) {
            console.error("Error deleting lead", e);
        }
    };

    const handlePromote = async (lead: any) => {
        if (window.confirm(`Promote ${lead.firstName} ${lead.lastName || ''} to Admission? An Admission Request will be created for admin approval.`)) {
            try {
                const res = await api.post(`/leads/${lead.id}/admit`);
                alert(`Success! ${res.data.message}`);
                fetchLeads();
            } catch (err: any) {
                alert(err.response?.data?.message || 'Failed to promote lead');
                console.error(err);
            }
        }
    };

    const handleExportCSV = () => {
        if (leads.length === 0) return alert("No data to export");
        const headers = ['First Name', 'Last Name', 'Mobile No', 'Email', 'City', 'Course', 'Status', 'Follow-up Date'];
        const csvRows = [
            headers.join(','),
            ...leads.map(lead => [
                lead.firstName, lead.lastName || '', lead.mobileNo, lead.email || '', 
                lead.city || '', lead.interestedCourse || '', lead.status, 
                lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString() : ''
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Leads_Export_${new Date().getTime()}.csv`;
        a.click();
    };

    const filteredLeads = leads.filter(lead => {
        const searchFields = [lead.firstName, lead.lastName, lead.mobileNo, lead.interestedCourse, lead.city].map(f => (f || '').toLowerCase());
        return searchTerm === '' || searchFields.some(field => field.includes(searchTerm.toLowerCase()));
    });

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Explore Leads</h1>
                    <p className="text-slate-500">Complete directory of all telecalling inquiries</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExportCSV} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2">
                        <Download size={18} /> Export
                    </button>
                    <button onClick={() => { setEditingLead(null); setIsFormOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 shadow-sm">
                        <Plus size={18} /> New Lead
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Search by name, mobile, course, city..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
                </div>
                <div className="relative md:w-64">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white appearance-none cursor-pointer">
                        <option value="ALL">All Statuses</option>
                        <option value="NEW">New</option>
                        <option value="INTERESTED">Interested</option>
                        <option value="MAYBE">Maybe</option>
                        <option value="NOT_INTERESTED">Not Interested</option>
                        <option value="PROMOTED">Promoted</option>
                        <option value="ADMITTED">Admitted</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Prospect Name</th>
                                <th className="p-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="p-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Course & City</th>
                                <th className="p-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Status & Date</th>
                                <th className="p-4 font-semibold text-sm text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <p className="font-bold text-slate-800">{lead.firstName} {lead.lastName}</p>
                                        <p className="text-xs text-slate-500">{lead.education || 'N/A'}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm font-medium text-slate-700">{lead.mobileNo}</p>
                                        <p className="text-xs text-slate-500">{lead.email}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm font-medium text-slate-700">{lead.interestedCourse || 'Not Specified'}</p>
                                        <p className="text-xs text-slate-500">{lead.city || 'N/A'}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold mb-1
                                            ${lead.status === 'NEW' ? 'bg-blue-50 text-blue-700' : ''}
                                            ${lead.status === 'INTERESTED' ? 'bg-emerald-50 text-emerald-700' : ''}
                                            ${lead.status === 'MAYBE' ? 'bg-amber-50 text-amber-700' : ''}
                                            ${lead.status === 'NOT_INTERESTED' ? 'bg-rose-50 text-rose-700' : ''}
                                            ${lead.status === 'PROMOTED' ? 'bg-violet-50 text-violet-700' : ''}
                                            ${lead.status === 'ADMITTED' ? 'bg-indigo-50 text-indigo-700' : ''}
                                        `}>
                                            {lead.status}
                                        </span>
                                        {lead.followUpDate && (
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                Follow: {new Date(lead.followUpDate).toLocaleDateString()}
                                            </p>
                                        )}
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        {lead.status !== 'PROMOTED' && lead.status !== 'ADMITTED' && (
                                            <button onClick={() => handlePromote(lead)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Promote to Admission">
                                                <UserCheck size={18} />
                                            </button>
                                        )}
                                        <button onClick={() => { setEditingLead(lead); setIsFormOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => setDeleteId(lead.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredLeads.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">No leads found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <LeadFormModal 
                isOpen={isFormOpen} 
                onClose={() => setIsFormOpen(false)} 
                onSave={() => { setIsFormOpen(false); fetchLeads(); }} 
                lead={editingLead} 
            />

            <ConfirmModal
                isOpen={!!deleteId}
                title="Delete Lead"
                message="Are you sure you want to permanently delete this lead? This action cannot be undone."
                confirmText="Delete forever"
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />
        </motion.div>
    );
}
