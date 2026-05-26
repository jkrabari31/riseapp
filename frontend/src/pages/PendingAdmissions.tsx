import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Printer, Clock, Edit2, Save, X, Search, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import api from '../utils/api';
import AdmissionPdfTemplate from '../components/AdmissionPdfTemplate.tsx';
import ConfirmModal from '../components/ConfirmModal';

export default function PendingAdmissions() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Print state
    const [printData, setPrintData] = useState<any>(null);

    // Edit Modal State
    const [editingRequest, setEditingRequest] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Filter and Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await api.get('/admissions');
            setRequests(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await api.post(`/admissions/${id}/approve`);
            fetchRequests();
        } catch (e) {
            console.error("Error approving", e);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await api.post(`/admissions/${id}/reject`);
            fetchRequests();
        } catch (e) {
            console.error("Error rejecting", e);
        }
    };

    const handlePrint = (request: any) => {
        setPrintData(request);
        // Give react time to render the hidden print component, then trigger print
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/admissions/${editingRequest.id}`, editingRequest);
            setEditingRequest(null);
            fetchRequests(); // refresh the list
        } catch (err) {
            console.error("Error saving edits", err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/admissions/${deleteId}`);
            setDeleteId(null);
            fetchRequests();
        } catch (e) {
            console.error("Error deleting", e);
        }
    };

    const filteredRequests = requests.filter(req => {
        const searchFields = [
            req.firstName,
            req.lastName,
            `${req.firstName} ${req.lastName}`, // full name search
            req.referenceNumber,
            req.status
        ].map(f => (f || '').toLowerCase());
        return searchTerm === '' || searchFields.some(field => field.includes(searchTerm.toLowerCase()));
    });

    const sortedRequests = [...filteredRequests].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;

        let aValue = a[key] || '';
        let bValue = b[key] || '';

        if (key === 'name') {
            aValue = `${a.firstName} ${a.lastName}`;
            bValue = `${b.firstName} ${b.lastName}`;
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-40 inline-block" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 inline-block" /> : <ArrowDown size={14} className="ml-1 inline-block" />;
    };

    const handleExportCSV = () => {
        if (sortedRequests.length === 0) {
            alert("No data available to export.");
            return;
        }

        const headers = ['Reference Number', 'First Name', 'Last Name', 'Program Applied For', 'Status', 'Date of Birth', 'Gender', 'Previous Institute', 'Blood Group', 'Address', 'Father Name', 'Father Profession', 'Mother Name', 'Mother Profession', 'Contact Number', 'Email', 'Application Date'];

        const csvRows = [
            headers.join(','), // Header row
            ...sortedRequests.map(req => {
                const values = [
                    req.referenceNumber,
                    req.firstName,
                    req.lastName,
                    req.classAppliedFor,
                    req.status,
                    new Date(req.dateOfBirth).toLocaleDateString(),
                    req.gender,
                    req.previousInstitute || '',
                    req.bloodGroup || '',
                    req.address || '',
                    req.fatherName || '',
                    req.fatherProfession || '',
                    req.motherName || '',
                    req.motherProfession || '',
                    req.contactNumber || '',
                    req.email || '',
                    new Date(req.createdAt).toLocaleDateString()
                ];
                // Escape quotes and wrap fields with commas in quotes
                return values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
            })
        ];

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Applications_Export_${new Date().getTime()}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

            {/* Hidden Print Template - only visible during window.print() and controlled by CSS */}
            {printData && (
                <div className="hidden print:block absolute inset-0 bg-white z-[9999]">
                    <AdmissionPdfTemplate data={printData} />
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Internship Applications</h1>
                    <p className="text-slate-500">Review, approve, or reject incoming public applications</p>
                </div>
                <div className="relative w-full md:w-auto flex flex-col md:flex-row gap-3">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search name, ref, status..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <button onClick={handleExportCSV} className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors shadow-sm whitespace-nowrap">
                        <Download size={18} /> Export Excel
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print:hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th onClick={() => requestSort('referenceNumber')} className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition-colors group">
                                    <div className="flex items-center">Ref No {getSortIcon('referenceNumber')}</div>
                                </th>
                                <th onClick={() => requestSort('name')} className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition-colors group">
                                    <div className="flex items-center">Intern Name {getSortIcon('name')}</div>
                                </th>
                                <th onClick={() => requestSort('classAppliedFor')} className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition-colors group">
                                    <div className="flex items-center">Program {getSortIcon('classAppliedFor')}</div>
                                </th>
                                <th onClick={() => requestSort('status')} className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition-colors group">
                                    <div className="flex items-center">Status {getSortIcon('status')}</div>
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-700">{req.referenceNumber}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                                                {req.photoUrl ? (
                                                    <img src={req.photoUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-bold">APP</div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{req.firstName} {req.middleName} {req.lastName}</p>
                                                <p className="text-xs text-slate-500">{req.education} — {req.collegeName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{req.interestedCourse}</td>
                                    <td className="px-6 py-4">
                                        {req.status === 'PENDING' && <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold flex items-center w-max gap-1"><Clock size={12} /> Pending</span>}
                                        {req.status === 'APPROVED' && <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center w-max gap-1"><CheckCircle size={12} /> Approved</span>}
                                        {req.status === 'REJECTED' && <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold flex items-center w-max gap-1"><XCircle size={12} /> Rejected</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => handlePrint(req)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Print PDF Form">
                                            <Printer size={18} />
                                        </button>
                                        {req.status === 'PENDING' && (
                                            <>
                                                <button onClick={() => setEditingRequest(req)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Application">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => handleApprove(req.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button onClick={() => handleReject(req.id)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reject">
                                                    <XCircle size={18} />
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => setDeleteId(req.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Application">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sortedRequests.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        {searchTerm ? 'No applications match your search criteria.' : 'No internship applications found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal Overlay */}
            <AnimatePresence>
                {editingRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Edit Application</h2>
                                    <p className="text-sm text-slate-500">Ref: {editingRequest.referenceNumber}</p>
                                </div>
                                <button onClick={() => setEditingRequest(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleEditSave} className="p-6 space-y-8">
                                {editingRequest.photoUrl && (
                                    <div className="flex justify-center mb-4">
                                        <div className="w-24 h-24 rounded-xl border-4 border-white shadow-sm overflow-hidden bg-slate-50">
                                            <img src={editingRequest.photoUrl} alt="Applicant" className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="col-span-full mb-1">
                                        <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider border-b pb-1">Personal Details</h3>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                        <input required type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.firstName} onChange={e => setEditingRequest({ ...editingRequest, firstName: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name</label>
                                        <input type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.middleName || ''} onChange={e => setEditingRequest({ ...editingRequest, middleName: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                        <input required type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.lastName} onChange={e => setEditingRequest({ ...editingRequest, lastName: e.target.value })} />
                                    </div>

                                    <div className="col-span-full mb-1 mt-4">
                                        <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider border-b pb-1">Academic Background</h3>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Education</label>
                                        <input required type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.education || ''} onChange={e => setEditingRequest({ ...editingRequest, education: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">College Name</label>
                                        <input required type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.collegeName || ''} onChange={e => setEditingRequest({ ...editingRequest, collegeName: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">University Name</label>
                                        <input required type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.universityName || ''} onChange={e => setEditingRequest({ ...editingRequest, universityName: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">CGPA / %</label>
                                        <input required type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.cgpa || ''} onChange={e => setEditingRequest({ ...editingRequest, cgpa: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Passing Year</label>
                                        <input required type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.passingYear || ''} onChange={e => setEditingRequest({ ...editingRequest, passingYear: e.target.value })} />
                                    </div>

                                    <div className="col-span-full mb-1 mt-4">
                                        <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider border-b pb-1">Contact & Other</h3>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Mobile No.</label>
                                        <input required type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.mobileNo || ''} onChange={e => setEditingRequest({ ...editingRequest, mobileNo: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email ID</label>
                                        <input required type="email" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.email || ''} onChange={e => setEditingRequest({ ...editingRequest, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Parents Mobile</label>
                                        <input required type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.parentsMobileNo || ''} onChange={e => setEditingRequest({ ...editingRequest, parentsMobileNo: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Father's Occupation</label>
                                        <input required type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.fatherOccupation || ''} onChange={e => setEditingRequest({ ...editingRequest, fatherOccupation: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Hometown City</label>
                                        <input required type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.city || ''} onChange={e => setEditingRequest({ ...editingRequest, city: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Interested Course</label>
                                        <input required type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.interestedCourse || ''} onChange={e => setEditingRequest({ ...editingRequest, interestedCourse: e.target.value })} />
                                    </div>
                                    <div className="col-span-full">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Source / Referral</label>
                                        <input type="text" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.source || ''} onChange={e => setEditingRequest({ ...editingRequest, source: e.target.value })} />
                                    </div>
                                    <div className="col-span-full">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Address</label>
                                        <textarea required rows={2} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRequest.address} onChange={e => setEditingRequest({ ...editingRequest, address: e.target.value })}></textarea>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setEditingRequest(null)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                                        <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={!!deleteId}
                title="Delete Internship Application"
                message="Are you sure you want to permanently delete this internship application? This cannot be undone."
                confirmText="Delete forever"
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />

        </motion.div>
    );
}
