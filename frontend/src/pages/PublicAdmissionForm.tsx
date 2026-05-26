import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Send, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import api from '../utils/api';

export default function PublicAdmissionForm() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const instituteName = useSettingsStore(state => state.instituteName);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

    const [specializations, setSpecializations] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        firstName: '', middleName: '', lastName: '',
        dateOfBirth: '', gender: 'Male',
        education: '', collegeName: '', universityName: '',
        mobileNo: '', email: '', parentsMobileNo: '',
        interestedCourse: '', 
        fatherOccupation: '', cgpa: '', passingYear: '', 
        address: '', city: '', source: ''
    });

    useEffect(() => {
        const fetchSpecs = async () => {
            try {
                const res = await api.get('/scheduler/specializations');
                setSpecializations(res.data);
                if (res.data.length > 0) {
                    setFormData(prev => ({ ...prev, interestedCourse: res.data[0].name }));
                }
            } catch (error) {
                console.error('Failed to fetch specializations', error);
            }
        };
        fetchSpecs();
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
        setError(null);
        try {
            const submitData = new FormData();
            // Append all JSON fields
            Object.entries(formData).forEach(([key, value]) => {
                submitData.append(key, value);
            });
            // Append photo if exists
            if (selectedFile) {
                submitData.append('photo', selectedFile);
            }

            const response = await api.post('/admissions/apply', submitData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSuccess(`Registration submitted! Your Reference No. is: ${response.data.referenceNumber}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error submitting application');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <School className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900">{instituteName} — Internship Application</h1>
                    <p className="mt-2 text-lg text-slate-600">Join the RISE internship program and accelerate your career.</p>
                </div>

                {success ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl p-12 text-center border-t-4 border-emerald-500">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Received!</h2>
                        <p className="text-slate-600 mb-6 text-lg">{success}</p>
                        <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">Please save this reference number. Our admission officer will review your application and contact you shortly at <strong>{formData.email}</strong>.</p>
                        <button onClick={() => navigate('/login')} className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                            Return to Home
                        </button>
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                        {error && (
                            <div className="m-8 p-4 bg-rose-50 rounded-lg flex items-center gap-3 text-rose-700 border border-rose-100">
                                <AlertCircle /> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="p-8 md:p-12">
                            {/* Personal Details */}
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-sm">01</span>
                                Personal Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">First Name *</label>
                                    <input required type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="John" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Middle Name</label>
                                    <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="Quincy" value={formData.middleName} onChange={e => setFormData({ ...formData, middleName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name *</label>
                                    <input required type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="Doe" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth *</label>
                                    <input required type="date" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Gender *</label>
                                    <select required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none bg-white" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mb-10">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Profile Photo (Optional)</label>
                                <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 hover:border-indigo-400 transition-colors">
                                    <div className="w-20 h-20 bg-slate-200 rounded-xl overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                                        {filePreview ? (
                                            <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Photo</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="photo-upload" />
                                        <label htmlFor="photo-upload" className="inline-block px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm transition-all mb-1">
                                            {selectedFile ? 'Change Photo' : 'Choose Photo'}
                                        </label>
                                        <p className="text-xs text-slate-500">JPG, PNG or WEBP. Max 5MB.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Academic Background */}
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-sm">02</span>
                                Academic Background
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Education Qualifications *</label>
                                    <input required type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="e.g. B.E Computer Science" value={formData.education} onChange={e => setFormData({ ...formData, education: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">College Name *</label>
                                    <input required type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="GIT College" value={formData.collegeName} onChange={e => setFormData({ ...formData, collegeName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">University Name *</label>
                                    <input required type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="Gujarat University" value={formData.universityName} onChange={e => setFormData({ ...formData, universityName: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">CGPA / % *</label>
                                        <input required type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="8.5" value={formData.cgpa} onChange={e => setFormData({ ...formData, cgpa: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Passing Year *</label>
                                        <input required type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="2024" value={formData.passingYear} onChange={e => setFormData({ ...formData, passingYear: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Details */}
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-sm">03</span>
                                Contact Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Mobile Number *</label>
                                    <input required type="tel" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="+91 99999 99999" value={formData.mobileNo} onChange={e => setFormData({ ...formData, mobileNo: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email ID *</label>
                                    <input required type="email" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="john.doe@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Full Residential Address *</label>
                                    <textarea required rows={3} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="Plot No. 123, Innovation Lane..." value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">City (Hometown) *</label>
                                    <input required type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="Vadodara" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">How did you know about us?</label>
                                    <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="LinkedIn, Referral, etc." value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} />
                                </div>
                            </div>

                            {/* Additional Information */}
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-sm">04</span>
                                Additional Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Parent's Mobile Number *</label>
                                    <input required type="tel" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="+91 88888 88888" value={formData.parentsMobileNo} onChange={e => setFormData({ ...formData, parentsMobileNo: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Father's Occupation *</label>
                                    <input required type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="Business / Service" value={formData.fatherOccupation} onChange={e => setFormData({ ...formData, fatherOccupation: e.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Interested to join in (Course) *</label>
                                    <select required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none bg-white" value={formData.interestedCourse} onChange={e => setFormData({ ...formData, interestedCourse: e.target.value })}>
                                        {specializations.length > 0 ? (
                                            specializations.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                                        ) : (
                                            <option disabled value="">No specializations available</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <button disabled={loading} type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70 group">
                                {loading ? 'Processing Application...' : <><Send size={22} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Submit My Application</>}
                            </button>

                            <p className="mt-6 text-center text-slate-400 text-sm italic">
                                * Information collected is used for internship assessment and communication purposes only.
                            </p>
                        </form>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
