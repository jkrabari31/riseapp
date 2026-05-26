import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, Download, Edit2, Eye, Trash2, ArrowUpCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../store/authStore';

export default function Students() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    useEffect(() => {
        if (user && (user.role === 'INTERN' || user.role === 'TRAINER')) {
            if (user.role === 'INTERN') navigate('/intern-dashboard', { replace: true });
            else navigate('/trainer-dashboard', { replace: true });
        }
    }, [user, navigate]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClassFilter, setSelectedClassFilter] = useState('All Programs');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [viewingStudent, setViewingStudent] = useState<any>(null);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [deletingStudent, setDeletingStudent] = useState<any>(null);
    const [promotingStudent, setPromotingStudent] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [batches, setBatches] = useState<any[]>([]);
    const [specializations, setSpecializations] = useState<any[]>([]);

    const fetchMetadata = async () => {
        try {
            const [bRes, sRes] = await Promise.all([
                api.get('/scheduler/batches'),
                api.get('/scheduler/specializations')
            ]);
            setBatches(bRes.data);
            setSpecializations(sRes.data);
        } catch (err) {
            console.error('Failed to fetch metadata', err);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/students');
            setStudents(res.data);
        } catch (error) {
            console.error("Error fetching students", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
        fetchMetadata();
    }, []);

    const handleDelete = async () => {
        if (!deletingStudent) return;
        setSubmitting(true);
        try {
            await api.delete(`/students/${deletingStudent.id}`);
            setDeletingStudent(null);
            fetchStudents();
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePromote = async () => {
        if (!promotingStudent) return;
        setSubmitting(true);
        try {
            await api.post(`/students/${promotingStudent.id}/promote`);
            setPromotingStudent(null);
            fetchStudents();
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;
        setSubmitting(true);
        try {
            const submitData = new FormData();
            // Append all fields
            Object.entries(editingStudent).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    submitData.append(key, value as string);
                }
            });

            if (selectedFile) {
                submitData.append('photo', selectedFile);
            }

            await api.put(`/students/${editingStudent.id}`, submitData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setEditingStudent(null);
            setSelectedFile(null);
            setFilePreview(null);
            fetchStudents();
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = selectedClassFilter === 'All Programs' || student.classLevel === selectedClassFilter;
        const matchesStatus = selectedStatusFilter === 'ALL' || student.status === selectedStatusFilter;
        return matchesSearch && matchesClass && matchesStatus;
    });

    const handleExport = () => {
        const exportData = filteredStudents.map(student => ({
            'Roll No': student.rollNumber || 'N/A',
            'Admission No': student.admissionNumber,
            'Student Name': student.name,
            'Class': `${student.classLevel} - ${student.section}`,
            'Gender': student.gender,
            'Date of Birth': new Date(student.dateOfBirth).toLocaleDateString(),
            'Status': student.status,
            'Father Name': student.fatherName || 'N/A',
            'Parent Contact': student.parentEmail || student.parent?.email || 'N/A'
        }));

        const wb = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, worksheet, 'Interns');

        const filename = selectedClassFilter === 'All Programs' ? 'Interns_Directory_All.xlsx' : `Interns_Directory_Level_${selectedClassFilter}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Interns Directory</h1>
                    <p className="text-slate-500">Manage internship enrollments, profiles, and statuses.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm font-medium transition-colors">
                        <Download size={18} /> Export
                    </button>
                    <button
                        onClick={() => navigate('/students/add')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm font-medium transition-colors"
                    >
                        <Plus size={18} /> Add Intern
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="text-slate-400" size={18} />
                        <select
                            value={selectedClassFilter}
                            onChange={(e) => setSelectedClassFilter(e.target.value)}
                            className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                        >
                            <option value="All Programs">All Programs</option>
                            {['Level 1', 'Level 2', 'Level 3', 'Advanced'].map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <select
                            value={selectedStatusFilter}
                            onChange={(e) => setSelectedStatusFilter(e.target.value)}
                            className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                        >
                            <option value="ALL">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="ALUMNI">Alumni</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Intern ID</th>
                                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Intern Name</th>
                                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Program</th>
                                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Email</th>
                                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="py-3 px-6 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-500">Loading students...</td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-500">No students found.</td>
                                </tr>
                            ) : (
                                filteredStudents.map((student, idx) => (
                                    <motion.tr
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={student.id}
                                        className="hover:bg-slate-50/50 transition-colors group"
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                                                    {student.photoUrl ? (
                                                        <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-bold">INT</div>
                                                    )}
                                                </div>
                                                <span className="text-sm font-bold text-indigo-700">{student.admissionNumber}</span>
                                            </div>
                                        </td>
                                        <td onClick={() => navigate(`/student/${student.id}`)} className="py-4 px-6 text-sm font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors">{student.name}</td>
                                        <td className="py-4 px-6 text-sm text-slate-600">
                                            <div className="font-medium">{specializations.find(s => s.id === student.specializationId)?.name || student.classLevel || 'N/A'}</div>
                                            <div className="text-xs text-slate-400">{batches.find(b => b.id === student.batchId)?.name || 'No Batch'}</div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-600">
                                            {student.parent?.name || student.fatherName || 'N/A'}<br />
                                            <span className="text-xs text-slate-400">{student.parentEmail || student.parent?.email || ''}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${student.status === 'ACTIVE'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => navigate(`/student/${student.id}`)} title="View Detailed Profile" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Eye size={16} /></button>
                                                <button onClick={() => setEditingStudent({ ...student })} title="Edit Intern" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                <button onClick={() => setPromotingStudent(student)} title="Promote/Pass to Next Level" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><ArrowUpCircle size={16} /></button>
                                                <button onClick={() => setDeletingStudent(student)} title="Delete Intern" className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Modal */}
            <AnimatePresence>
                {viewingStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800">Intern Profile</h2>
                                <button onClick={() => setViewingStudent(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                            </div>
                             <div className="p-6 space-y-4 text-sm text-slate-600">
                                <div className="flex justify-center mb-6">
                                    <div className="w-32 h-32 rounded-2xl bg-slate-100 overflow-hidden border-4 border-white shadow-lg">
                                        {viewingStudent.photoUrl ? (
                                            <img src={viewingStudent.photoUrl} alt={viewingStudent.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-xl font-bold">INTERN</div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4 mb-4">
                                    <div><span className="block font-medium text-slate-400">Name</span> <span className="text-slate-900 font-semibold">{viewingStudent.name}</span></div>
                                    <div><span className="block font-medium text-slate-400">Intern ID</span> <span className="text-slate-900 font-bold">{viewingStudent.admissionNumber}</span></div>
                                    <div><span className="block font-medium text-slate-400">Class</span> <span className="text-slate-900 font-semibold">{viewingStudent.classLevel} - {viewingStudent.section}</span></div>
                                    <div><span className="block font-medium text-slate-400">Status</span> <span className="text-slate-900 font-semibold">{viewingStudent.status}</span></div>
                                    <div><span className="block font-medium text-slate-400">Gender</span> <span className="text-slate-900 font-semibold">{viewingStudent.gender}</span></div>
                                    <div><span className="block font-medium text-slate-400">DOB</span> <span className="text-slate-900 font-semibold">{new Date(viewingStudent.dateOfBirth).toLocaleDateString()}</span></div>
                                </div>
                                <div className="border-t pt-4">
                                    <h3 className="font-bold text-slate-800 mb-2">Academic & Internship Details</h3>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div><span className="block font-medium text-slate-400">Education</span> <span className="text-slate-900 font-semibold">{viewingStudent.education || 'N/A'}</span></div>
                                        <div><span className="block font-medium text-slate-400">College</span> <span className="text-slate-900 font-semibold">{viewingStudent.collegeName || 'N/A'}</span></div>
                                        <div><span className="block font-medium text-slate-400">University</span> <span className="text-slate-900 font-semibold">{viewingStudent.universityName || 'N/A'}</span></div>
                                        <div><span className="block font-medium text-slate-400">Passing Year</span> <span className="text-slate-900 font-semibold">{viewingStudent.passingYear || 'N/A'}</span></div>
                                        <div><span className="block font-medium text-slate-400">CGPA/Percentage</span> <span className="text-slate-900 font-semibold">{viewingStudent.cgpa || 'N/A'}</span></div>
                                        <div><span className="block font-medium text-slate-400">Source</span> <span className="text-slate-900 font-semibold">{viewingStudent.source || 'N/A'}</span></div>
                                    </div>
                                </div>
                                <div className="border-t pt-4">
                                    <h3 className="font-bold text-slate-800 mb-2">Guardian & Contact Information</h3>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div><span className="block font-medium text-slate-400">Father's Name</span> <span className="text-slate-900 font-semibold">{viewingStudent.fatherName || 'N/A'}</span></div>
                                        <div><span className="block font-medium text-slate-400">Father's Occupation</span> <span className="text-slate-900 font-semibold">{viewingStudent.fatherOccupation || 'N/A'}</span></div>
                                        <div><span className="block font-medium text-slate-400">Mobile No</span> <span className="text-slate-900 font-semibold">{viewingStudent.mobileNo || 'N/A'}</span></div>
                                        <div><span className="block font-medium text-slate-400">Guardian Mobile</span> <span className="text-slate-900 font-semibold">{viewingStudent.parentsMobileNo || 'N/A'}</span></div>
                                        <div className="col-span-2"><span className="block font-medium text-slate-400">Email</span> <span className="text-slate-900 font-semibold">{viewingStudent.email || viewingStudent.parentEmail || viewingStudent.parent?.email || 'N/A'}</span></div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                                <h2 className="text-xl font-bold text-slate-800">Edit Intern: {editingStudent.admissionNumber}</h2>
                                <button onClick={() => setEditingStudent(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                            </div>
                            
                            <form onSubmit={handleEditSave} className="flex-1 overflow-y-auto">
                                <div className="p-8 space-y-10">
                                    {/* Personal Info */}
                                    <section>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                            <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded flex items-center justify-center text-[10px]">01</span>
                                            Personal Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2 flex items-center gap-4 mb-2">
                                                <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                                    {filePreview || editingStudent.photoUrl ? (
                                                        <img src={filePreview || editingStudent.photoUrl} alt="Student" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">No Photo</div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Update Photo</label>
                                                    <input 
                                                        type="file" 
                                                        id="edit-photo-upload" 
                                                        className="hidden" 
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                const file = e.target.files[0];
                                                                setSelectedFile(file);
                                                                setFilePreview(URL.createObjectURL(file));
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor="edit-photo-upload" className="inline-flex px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm transition-all">
                                                        {editingStudent.photoUrl ? 'Change Photo' : 'Upload Photo'}
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                                                <input required type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.name} onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
                                                <input required type="date" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.dateOfBirth ? new Date(editingStudent.dateOfBirth).toISOString().split('T')[0] : ''} onChange={e => setEditingStudent({ ...editingStudent, dateOfBirth: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                                                <select required className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.gender} onChange={e => setEditingStudent({ ...editingStudent, gender: e.target.value })}>
                                                    <option>Male</option><option>Female</option><option>Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Academic Info */}
                                    <section className="border-t pt-10">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                            <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded flex items-center justify-center text-[10px]">02</span>
                                            Academic Background
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Education</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.education || ''} onChange={e => setEditingStudent({ ...editingStudent, education: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">College</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.collegeName || ''} onChange={e => setEditingStudent({ ...editingStudent, collegeName: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">University</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.universityName || ''} onChange={e => setEditingStudent({ ...editingStudent, universityName: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">CGPA / %</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.cgpa || ''} onChange={e => setEditingStudent({ ...editingStudent, cgpa: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Passing Year</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.passingYear || ''} onChange={e => setEditingStudent({ ...editingStudent, passingYear: e.target.value })} />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Training Info */}
                                    <section className="border-t pt-10">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                            <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded flex items-center justify-center text-[10px]">03</span>
                                            Training & Status
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Specialization *</label>
                                                <select required className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.specializationId || ''} onChange={e => setEditingStudent({ ...editingStudent, specializationId: e.target.value })}>
                                                    <option value="" disabled>Select Specialization</option>
                                                    {specializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Batch *</label>
                                                <select required className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.batchId || ''} onChange={e => setEditingStudent({ ...editingStudent, batchId: e.target.value })}>
                                                    <option value="" disabled>Select Batch</option>
                                                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                                <select required className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.status} onChange={e => setEditingStudent({ ...editingStudent, status: e.target.value })}>
                                                    <option value="ACTIVE">ACTIVE</option>
                                                    <option value="INACTIVE">INACTIVE</option>
                                                    <option value="ALUMNI">ALUMNI</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Contact Info */}
                                    <section className="border-t pt-10 pb-6">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                            <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded flex items-center justify-center text-[10px]">04</span>
                                            Contact & Guardian
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Personal Mobile</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.mobileNo || ''} onChange={e => setEditingStudent({ ...editingStudent, mobileNo: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Personal Email</label>
                                                <input type="email" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.email || ''} onChange={e => setEditingStudent({ ...editingStudent, email: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Father's Occupation</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.fatherOccupation || ''} onChange={e => setEditingStudent({ ...editingStudent, fatherOccupation: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Guardian Mobile</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.parentsMobileNo || ''} onChange={e => setEditingStudent({ ...editingStudent, parentsMobileNo: e.target.value })} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Address</label>
                                                <textarea rows={2} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" value={editingStudent.address || ''} onChange={e => setEditingStudent({ ...editingStudent, address: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editingStudent.city || ''} onChange={e => setEditingStudent({ ...editingStudent, city: e.target.value })} />
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="p-6 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
                                    <button type="button" onClick={() => setEditingStudent(null)} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-all">Cancel</button>
                                    <button type="submit" disabled={submitting} className="px-10 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50 shadow-xl shadow-indigo-100 transition-all">
                                        {submitting ? 'Updating...' : 'Save All Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Promote Modal */}
            <AnimatePresence>
                {promotingStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><ArrowUpCircle size={32} /></div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Promote Intern?</h2>
                            <p className="text-slate-600 mb-6 text-sm">Are you sure you want to promote <strong>{promotingStudent.name}</strong> to the next program level? Their current level is <strong>{promotingStudent.classLevel}</strong>.</p>
                            <div className="flex justify-center gap-3">
                                <button type="button" onClick={() => setPromotingStudent(null)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                                <button onClick={handlePromote} disabled={submitting} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50">
                                    {submitting ? 'Promoting...' : 'Confirm Promote'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Modal */}
            <AnimatePresence>
                {deletingStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
                            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Delete Intern?</h2>
                            <p className="text-slate-600 mb-6 text-sm">This action cannot be undone. Are you sure you want to permanently delete <strong>{deletingStudent.name}</strong> from the system?</p>
                            <div className="flex justify-center gap-3">
                                <button type="button" onClick={() => setDeletingStudent(null)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                                <button onClick={handleDelete} disabled={submitting} className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium disabled:opacity-50">
                                    {submitting ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}
