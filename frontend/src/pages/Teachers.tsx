import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Search, Plus, Edit2, Trash2, X, BookOpen, Users, Eye, Shield } from 'lucide-react';
import api from '../utils/api';
import Select from 'react-select';
import { useNavigate } from 'react-router-dom';

export default function Teachers() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    useEffect(() => {
        if (user && (user.role === 'INTERN' || user.role === 'TRAINER')) {
            if (user.role === 'INTERN') navigate('/intern-dashboard', { replace: true });
            else navigate('/trainer-dashboard', { replace: true });
        }
    }, [user, navigate]);

    const [teachers, setTeachers] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal States
    const [showTeacherModal, setShowTeacherModal] = useState(false);
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Trainer Form
    const [teacherForm, setTeacherForm] = useState({
        id: '',
        email: '',
        password: '',
        firstName: '',
        middleName: '',
        lastName: '',
        mobileNo: '',
        selectedSubjects: [] as any[],
        assignedClasses: [] as any[]
    });

    const [newSubject, setNewSubject] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [teachersRes, subjectsRes, specsRes] = await Promise.all([
                api.get('/teachers'),
                api.get('/subjects'),
                api.get('/scheduler/specializations')
            ]);
            setTeachers(teachersRes.data);
            setSubjects(subjectsRes.data.map((s: any) => ({ value: s.id, label: s.name })));
            // Map specializations for the Assigned Classes dropdown
            // We use specialized tracks instead of generic levels
            setSpecializations(specsRes.data.map((s: any) => ({ value: s.name, label: s.name })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    
    const [specializations, setSpecializations] = useState<any[]>([]);

    const handleTeacherSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const payload = {
            email: teacherForm.email,
            password: teacherForm.password,
            firstName: teacherForm.firstName,
            middleName: teacherForm.middleName,
            lastName: teacherForm.lastName,
            mobileNo: teacherForm.mobileNo,
            subjectIds: teacherForm.selectedSubjects.map(s => s.value),
            assignedClasses: teacherForm.assignedClasses.map(c => c.value)
        };

        try {
            if (isEditing) {
                await api.put(`/teachers/${teacherForm.id}`, payload);
            } else {
                await api.post('/teachers', payload);
            }
            setShowTeacherModal(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save trainer record.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTeacher = async (id: string) => {
        try {
            await api.delete(`/teachers/${id}`);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Error deleting trainer');
        }
    };

    const handleToggleTimetablePermission = async (teacherProfileId: string, current: boolean) => {
        try {
            await api.put(`/timetable/permission/${teacherProfileId}`, { canEditTimetable: !current });
            // Update local state instantly
            setTeachers(prev => prev.map(t =>
                t.profile?.id === teacherProfileId
                    ? { ...t, profile: { ...t.profile, canEditTimetable: !current } }
                    : t
            ));
        } catch (e) {
            console.error('Permission toggle failed', e);
        }
    };

    const handleAddSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/subjects', { name: newSubject });
            setNewSubject('');
            // Refetch subjects to update the dropdown list instantly
            const subjectsRes = await api.get('/subjects');
            setSubjects(subjectsRes.data.map((s: any) => ({ value: s.id, label: s.name })));
            setShowSubjectModal(false);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Error creating subject');
        } finally {
            setSubmitting(false);
        }
    };

    const openAddModal = () => {
        setIsEditing(false);
        setTeacherForm({
            id: '', email: '', password: '', firstName: '', middleName: '', lastName: '', mobileNo: '',
            selectedSubjects: [], assignedClasses: []
        });
        setShowTeacherModal(true);
    };

    const openEditModal = (teacher: any) => {
        setIsEditing(true);
        const profile = teacher.profile || {};

        // Map native comma-separated strings back to React-Select array-object structures
        const buildOptionsList = (csvString: string | null) => {
            if (!csvString) return [];
            return csvString.split(',').map(v => ({ value: v.trim(), label: `${v.trim()}` }));
        };

        const existingSubjectList = profile.subjects ? profile.subjects.map((s: any) => ({ value: s.id, label: s.name })) : [];

        setTeacherForm({
            id: teacher.id,
            email: teacher.email,
            password: '', // Blank out password on edit
            firstName: profile.firstName || teacher.name.split(' ')[0], // fallback
            middleName: profile.middleName || '',
            lastName: profile.lastName || teacher.name.split(' ')[1] || '', // fallback
            mobileNo: profile.mobileNo || '',
            selectedSubjects: existingSubjectList,
            assignedClasses: buildOptionsList(profile.assignedClasses)
        });
        setShowTeacherModal(true);
    };

    const filteredTeachers = teachers.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Training Staff</h1>
                    <p className="text-slate-500">View and manage all active mentors and trainers</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowSubjectModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors font-medium">
                        <BookOpen size={18} /> Manage Subjects
                    </button>
                    <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors font-medium">
                        <Plus size={18} /> Add Trainer
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search trainers by name or email..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-500">Loading directory...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeachers.map((teacher, index) => (
                        <motion.div
                            key={teacher.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative group"
                        >
                            {/* Action Buttons top right */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => navigate(`/teacher/${teacher.id}`)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Profile">
                                    <Eye size={16} />
                                </button>
                                <button onClick={() => openEditModal(teacher)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit Trainer">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteTeacher(teacher.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg" title="Delete Profile">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-indigo-600 font-bold text-lg">
                                        {teacher.name.charAt(0)}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 pr-12">{teacher.name}</h3>
                                    <p className="text-sm font-medium text-indigo-600">
                                        {teacher.profile?.assignedClasses ? `Lead: ${teacher.profile.assignedClasses.split(',')[0]}...` : 'Training Faculty'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-3 text-slate-600 text-sm">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    {teacher.email}
                                </div>
                                <div className="flex items-center gap-3 text-slate-600 text-sm">
                                    <BookOpen className="w-4 h-4 text-slate-400" />
                                    <span className="truncate">
                                        Subjects: {teacher.profile?.subjects?.map((s: any) => s.name).join(', ') || 'Unassigned'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600 text-sm">
                                    <Users className="w-4 h-4 text-slate-400" />
                                    <span className="truncate">
                                        Batches: {teacher.profile?.assignedClasses || 'Unassigned'}
                                    </span>
                                </div>
                            </div>

                            {/* Timetable Edit Permission Toggle */}
                            {teacher.profile && (
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Shield size={12} className={teacher.profile.canEditTimetable ? 'text-indigo-600' : 'text-slate-400'} />
                                        <span className="text-xs font-semibold text-slate-600">Timetable Editor</span>
                                    </div>
                                    <button
                                        onClick={() => handleToggleTimetablePermission(teacher.profile.id, teacher.profile.canEditTimetable)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${teacher.profile.canEditTimetable ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        title={teacher.profile.canEditTimetable ? 'Click to revoke timetable edit permission' : 'Click to grant timetable edit permission'}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${teacher.profile.canEditTimetable ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ))}

                    {filteredTeachers.length === 0 && (
                        <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
                            No trainers found matching your search.
                        </div>
                    )}
                </div>
            )}

            {/* Full Teacher Add/Edit Modal */}
            <AnimatePresence>
                {showTeacherModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
                                <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Trainer Profile' : 'Add New Trainer'}</h2>
                                <button onClick={() => setShowTeacherModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleTeacherSubmit} className="p-6">
                                {error && <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-lg text-sm">{error}</div>}

                                <div className="space-y-6">
                                    {/* Personal Info Grid */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800 uppercase mb-4 tracking-wider border-b pb-2">Personal Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                                                <input required type="text" value={teacherForm.firstName} onChange={e => setTeacherForm({ ...teacherForm, firstName: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name</label>
                                                <input type="text" value={teacherForm.middleName} onChange={e => setTeacherForm({ ...teacherForm, middleName: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                                                <input required type="text" value={teacherForm.lastName} onChange={e => setTeacherForm({ ...teacherForm, lastName: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact & Auth Grid */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800 uppercase mb-4 tracking-wider border-b pb-2">Contact & Login</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile No</label>
                                                <input type="tel" value={teacherForm.mobileNo} onChange={e => setTeacherForm({ ...teacherForm, mobileNo: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Email ID (Login) *</label>
                                                <input required disabled={isEditing} type="email" value={teacherForm.email} onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500" />
                                            </div>
                                            {!isEditing && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                                                    <input required type="password" value={teacherForm.password} onChange={e => setTeacherForm({ ...teacherForm, password: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Educational Mapping */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800 uppercase mb-4 tracking-wider border-b pb-2">Academic Assignments</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Teaching Subjects (Multiple)</label>
                                                <Select
                                                    isMulti
                                                    options={subjects}
                                                    value={teacherForm.selectedSubjects}
                                                    onChange={(selected) => setTeacherForm({ ...teacherForm, selectedSubjects: selected as any[] })}
                                                    placeholder="Select subjects..."
                                                    className="react-select-container"
                                                    classNamePrefix="react-select"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Specializations (Training)</label>
                                                <Select
                                                    isMulti
                                                    options={specializations}
                                                    value={teacherForm.assignedClasses}
                                                    onChange={(selected) => setTeacherForm({ ...teacherForm, assignedClasses: selected as any[] })}
                                                    placeholder="Specializations assigned to trainer..."
                                                    className="react-select-container"
                                                    classNamePrefix="react-select"
                                                />
                                            </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                                    <button type="button" onClick={() => setShowTeacherModal(false)} className="px-6 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                                    <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 transition-colors shadow-sm">
                                        {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Trainer Record')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Quick Add Subject Modal */}
            <AnimatePresence>
                {showSubjectModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-800">Add Academic Subject</h2>
                                <button onClick={() => setShowSubjectModal(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleAddSubject} className="p-5">
                                <p className="text-xs text-slate-500 mb-4">You can map these subjects dynamically when assigning Trainer profiles.</p>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject Name *</label>
                                    <input required type="text" placeholder="e.g. Advanced Mathematics" value={newSubject} onChange={e => setNewSubject(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <button type="submit" disabled={submitting || !newSubject} className="w-full mt-5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 shadow-sm">
                                    {submitting ? 'Saving...' : 'Add Topic to Global List'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}
