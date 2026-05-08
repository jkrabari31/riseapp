import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, AlertCircle, Hash, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function AddStudent() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [savedGR, setSavedGR] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

    const [batches, setBatches] = useState<any[]>([]);
    const [specializations, setSpecializations] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        firstName: '', middleName: '', lastName: '',
        dateOfBirth: '', gender: 'Male',
        education: '', collegeName: '', universityName: '',
        mobileNo: '', email: '', parentsMobileNo: '',
        fatherOccupation: '', cgpa: '', passingYear: '', 
        address: '', city: '', source: '',
        batchId: '',
        specializationId: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [bRes, sRes] = await Promise.all([
                    api.get('/scheduler/batches'),
                    api.get('/scheduler/specializations')
                ]);
                setBatches(bRes.data);
                setSpecializations(sRes.data);
                
                if (bRes.data.length > 0) setFormData(prev => ({ ...prev, batchId: bRes.data[0].id }));
                if (sRes.data.length > 0) setFormData(prev => ({ ...prev, specializationId: sRes.data[0].id }));
            } catch (err) {
                console.error('Failed to fetch metadata', err);
            }
        };
        fetchData();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setFilePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const submitData = new FormData();
            
            // Basic Info
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();
            const classLevel = specializations.find(s => s.id === formData.specializationId)?.name || 'General';

            // Append all fields to FormData
            Object.entries(formData).forEach(([key, value]) => {
                submitData.append(key, value);
            });
            submitData.append('name', fullName);
            submitData.append('parentEmail', formData.email);
            submitData.append('classLevel', classLevel);

            if (selectedFile) {
                submitData.append('photo', selectedFile);
            }

            const res = await api.post('/students', submitData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSavedGR(res.data.admissionNumber);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Error adding intern');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSavedGR('');
        setFormData({
            firstName: '', middleName: '', lastName: '',
            dateOfBirth: '', gender: 'Male',
            education: '', collegeName: '', universityName: '',
            mobileNo: '', email: '', parentsMobileNo: '',
            fatherOccupation: '', cgpa: '', passingYear: '',
            address: '', city: '', source: '',
            batchId: batches[0]?.id || '',
            specializationId: specializations[0]?.id || '',
        });
    };

    if (savedGR) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto mt-20 text-center space-y-5">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={40} className="text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Intern Enrolled!</h2>
                <p className="text-slate-500">The intern has been registered successfully.</p>

                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                    <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">
                        Assigned Registration Number
                    </p>
                    <p className="text-3xl font-black text-indigo-700 tracking-widest">{savedGR}</p>
                </div>

                <div className="flex gap-3 justify-center">
                    <button onClick={() => navigate('/students')}
                        className="px-5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium text-sm">
                        View All Interns
                    </button>
                    <button onClick={resetForm}
                        className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium text-sm">
                        Add Another Intern
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 max-w-5xl mx-auto pb-12">

            <div className="flex items-center gap-4">
                <button type="button" onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Enroll New Intern</h1>
                    <p className="text-slate-500">Create a new intern record manually for the training program.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-lg flex items-center gap-2 border border-rose-100">
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 space-y-12">
                        {/* ID Notice */}
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                            <Hash size={18} className="text-slate-400 shrink-0" />
                            <p className="text-sm font-medium text-slate-600">ID / Registration Number will be generated automatically as <span className="text-indigo-600 font-bold">Int_XXXX</span></p>
                        </div>

                        {/* section 1: Personal Details */}
                        <section>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded flex items-center justify-center text-[10px]">01</span>
                                Personal Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" placeholder="John" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name</label>
                                    <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" placeholder="Quincy" value={formData.middleName} onChange={e => setFormData({ ...formData, middleName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" placeholder="Doe" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
                                    <input required type="date" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                                    <select required className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="border-t pt-10">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded flex items-center justify-center text-[10px]">01.1</span>
                                Profile Photo (Optional)
                            </h3>
                            <div className="flex items-center gap-6 p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl hover:border-indigo-300 transition-colors">
                                <div className="w-20 h-20 bg-white rounded-xl overflow-hidden flex-shrink-0 border-2 border-slate-100 shadow-sm flex items-center justify-center">
                                    {filePreview ? (
                                        <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">No Photo</div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="photo-upload" />
                                    <label htmlFor="photo-upload" className="inline-block px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm transition-all mb-1">
                                        {selectedFile ? 'Change Photo' : 'Choose Photo'}
                                    </label>
                                    <p className="text-[11px] text-slate-400">JPG, PNG or WEBP. Max 5MB.</p>
                                </div>
                            </div>
                        </section>

                        {/* section 2: Academic Background */}
                        <section className="border-t pt-10">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded flex items-center justify-center text-[10px]">02</span>
                                Academic Background
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Education Qualifications *</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" placeholder="e.g. B.E Computer Science" value={formData.education} onChange={e => setFormData({ ...formData, education: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">College Name *</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" value={formData.collegeName} onChange={e => setFormData({ ...formData, collegeName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">University Name *</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" value={formData.universityName} onChange={e => setFormData({ ...formData, universityName: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">CGPA / %</label>
                                        <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" value={formData.cgpa} onChange={e => setFormData({ ...formData, cgpa: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Passing Year</label>
                                        <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" value={formData.passingYear} onChange={e => setFormData({ ...formData, passingYear: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 3: Training Assignment */}
                        <section className="border-t pt-10">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded flex items-center justify-center text-[10px]">03</span>
                                Training Assignment
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Specialization *</label>
                                    <select required className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none" value={formData.specializationId} onChange={e => setFormData({ ...formData, specializationId: e.target.value })}>
                                        {specializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Assign Batch *</label>
                                    <select required className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none" value={formData.batchId} onChange={e => setFormData({ ...formData, batchId: e.target.value })}>
                                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Section 4: Contact & Guardian */}
                        <section className="border-t pt-10">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded flex items-center justify-center text-[10px]">04</span>
                                Contact & Guardian
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Personal Mobile *</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" value={formData.mobileNo} onChange={e => setFormData({ ...formData, mobileNo: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Registered Email *</label>
                                    <input required type="email" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Father's Occupation</label>
                                    <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.fatherOccupation} onChange={e => setFormData({ ...formData, fatherOccupation: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Guardian Contact *</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.parentsMobileNo} onChange={e => setFormData({ ...formData, parentsMobileNo: e.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Residential Address *</label>
                                    <textarea required rows={3} className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                                    <input type="text" className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="LinkedIn, Referral, etc." value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} />
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" onClick={() => navigate(-1)} className="px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 font-bold transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="flex items-center gap-2 px-10 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-bold shadow-xl shadow-indigo-100 transition-all disabled:opacity-50">
                            {loading ? 'Registering Intern...' : <><Save size={20} /> Register & Enroll Intern</>}
                        </button>
                    </div>
                </div>
            </form>
        </motion.div>
    );
}
