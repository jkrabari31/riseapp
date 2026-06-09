import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import api from '../utils/api';

export default function LeadFormModal({ isOpen, onClose, onSave, lead = null }: any) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        mobileNo: '',
        email: '',
        education: '',
        collegeName: '',
        city: '',
        fatherOccupation: '',
        cgpa: '',
        interestedCourse: '',
        interestedBatch: '',
        status: 'NEW',
        followUpDate: '',
        remark: ''
    });
    const [saving, setSaving] = useState(false);
    const [specializations, setSpecializations] = useState<any[]>([]);
    const [batches, setBatches] = useState<any[]>([]);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [specsRes, batchesRes] = await Promise.all([
                    api.get('/scheduler/specializations'),
                    api.get('/scheduler/batches')
                ]);
                setSpecializations(specsRes.data);
                setBatches(batchesRes.data);
            } catch (err) {
                console.error('Failed to fetch dropdown metadata', err);
            }
        };
        if (isOpen) {
            fetchMetadata();
        }
    }, [isOpen]);

    useEffect(() => {
        if (lead) {
            setFormData({
                firstName: lead.firstName || '',
                lastName: lead.lastName || '',
                mobileNo: lead.mobileNo || '',
                email: lead.email || '',
                education: lead.education || '',
                collegeName: lead.collegeName || '',
                city: lead.city || '',
                fatherOccupation: lead.fatherOccupation || '',
                cgpa: lead.cgpa || '',
                interestedCourse: lead.interestedCourse || '',
                interestedBatch: lead.interestedBatch || '',
                status: lead.status || 'NEW',
                followUpDate: lead.followUpDate ? lead.followUpDate.split('T')[0] : '',
                remark: ''
            });
        } else {
            // Reset
            setFormData({
                firstName: '', lastName: '', mobileNo: '', email: '', education: '',
                collegeName: '', city: '', fatherOccupation: '', cgpa: '',
                interestedCourse: '', interestedBatch: '', status: 'NEW', followUpDate: '', remark: ''
            });
        }
    }, [lead, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (lead) {
                await api.put(`/leads/${lead.id}`, formData);
            } else {
                await api.post('/leads', formData);
            }
            onSave();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                    <div>
                        <h3 className="font-bold text-xl text-slate-800">{lead ? 'Edit Lead' : 'New Inquiry / Lead'}</h3>
                        <p className="text-sm text-slate-500">Enter details gathered from telecalling</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                            <input required type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                            <input type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Mobile No. *</label>
                            <input required type="text" value={formData.mobileNo} onChange={(e) => setFormData({...formData, mobileNo: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email ID</label>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        
                        <div className="col-span-full mt-2"><h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1">Academic & Course Info</h4></div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Education</label>
                            <input type="text" value={formData.education} onChange={(e) => setFormData({...formData, education: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. B.Tech, MCA" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">College/University</label>
                            <input type="text" value={formData.collegeName} onChange={(e) => setFormData({...formData, collegeName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">CGPA / Percentage</label>
                            <input type="text" value={formData.cgpa} onChange={(e) => setFormData({...formData, cgpa: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Interested Course</label>
                            <select value={formData.interestedCourse} onChange={(e) => setFormData({...formData, interestedCourse: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                                <option value="">Select Course</option>
                                {specializations.map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Interested Batch</label>
                            <select value={formData.interestedBatch} onChange={(e) => setFormData({...formData, interestedBatch: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                                <option value="">Select Batch</option>
                                {batches.map(b => (
                                    <option key={b.id} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-full mt-2"><h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1">Other Info & Actions</h4></div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                            <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Father's Occupation</label>
                            <input type="text" value={formData.fatherOccupation} onChange={(e) => setFormData({...formData, fatherOccupation: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="NEW">New</option>
                                <option value="INTERESTED">Interested</option>
                                <option value="MAYBE">Maybe</option>
                                <option value="NOT_INTERESTED">Not Interested</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Date</label>
                            <input type="date" value={formData.followUpDate} onChange={(e) => setFormData({...formData, followUpDate: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        
                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {lead ? 'Add Follow-up / New Remark' : 'Initial Remark'}
                            </label>
                            <textarea rows={2} value={formData.remark} onChange={(e) => setFormData({...formData, remark: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder={lead ? "Add notes about this follow-up..." : "Conversation notes..."} />
                        </div>

                        {lead && lead.remarks && lead.remarks.length > 0 && (
                            <div className="col-span-full mt-2 pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-bold text-slate-700 mb-2">Remarks History</h4>
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                    {lead.remarks.map((r: any) => (
                                        <div key={r.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                                <span className="font-semibold text-slate-500">Recorded By Team</span>
                                                <span>{new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                            </div>
                                            <p className="text-slate-600 whitespace-pre-wrap">{r.remark}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6 sticky bottom-0 bg-white">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                        <button type="submit" disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 disabled:opacity-50">
                            <Save size={18} /> {saving ? 'Saving...' : 'Save Lead'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
