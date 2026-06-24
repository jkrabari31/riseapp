import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, User, Building, Lock, ShieldAlert, Users, Trash2, Clock, Calendar, Plus, AlertTriangle, ArrowRight, Bell, Mail } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import api from '../utils/api';

export default function Settings() {
    const user = useAuthStore((state) => state.user);
    const [activeTab, setActiveTab] = useState('PROFILE');
    const [years, setYears] = useState<any[]>([]); // To populate the dropdown in profile tab

    const [settings, setSettings] = useState({
        instituteName: '',
        registrationCode: '',
        academicYear: '',
        contactEmail: '',
        address: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [adminResetData, setAdminResetData] = useState({
        targetEmail: '',
        newPassword: ''
    });

    const [ceoData, setCeoData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const [ceos, setCeos] = useState<any[]>([]);
    const [officers, setOfficers] = useState<any[]>([]);
    const [officerData, setOfficerData] = useState({ name: '', email: '', password: '' });

    const [message, setMessage] = useState({ text: '', type: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });

    // Notification Settings State
    const [notificationConfig, setNotificationConfig] = useState<any>(null);

    useEffect(() => {
        if (user?.role === 'INTERN' || user?.role === 'TRAINER') {
            setActiveTab('SECURITY');
        } else if (activeTab === 'PROFILE') {
            fetchSettings();
            fetchYearsForDropdown();
        } else if (activeTab === 'ACCESS_ASSIGN') {
            fetchCeos();
            fetchOfficers();
        } else if (activeTab === 'NOTIFICATIONS') {
            fetchNotificationConfig();
        }
    }, [activeTab, user?.role]);

    const fetchCeos = async () => {
        try {
            const res = await api.get('/settings/ceos');
            setCeos(res.data);
        } catch (error) {
            console.error('Failed to load CEOs', error);
        }
    };

    const fetchOfficers = async () => {
        try {
            const res = await api.get('/settings/admission-officers');
            setOfficers(res.data);
        } catch (error) {
            console.error('Failed to load Admission Officers', error);
        }
    };

    const fetchYearsForDropdown = async () => {
        try {
            const res = await api.get('/academic-years');
            setYears(res.data);
        } catch (error) {
            console.error('Failed to load years for dropdown', error);
        }
    };

    const fetchNotificationConfig = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/settings/notifications');
            setNotificationConfig(res.data);
        } catch (error) {
            console.error('Failed to load notifications config', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            if (res.data) setSettings(res.data);
        } catch (error) {
            console.error('Failed to load settings', error);
        }
    };

    const handleProfileSave = async () => {
        setIsLoading(true);
        try {
            await api.put('/settings', settings);
            setMessage({ text: 'Settings saved successfully!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            setMessage({ text: 'Failed to save settings. Must be SUPER_ADMIN.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleNotificationSave = async () => {
        setIsLoading(true);
        try {
            await api.put('/settings/notifications', notificationConfig);
            setMessage({ text: 'Notification preferences updated!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            setMessage({ text: 'Failed to update notifications.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordSave = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ text: 'New passwords do not match!', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            await api.put('/auth/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setMessage({ text: 'Password encrypted and updated successfully!', type: 'success' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error: any) {
            setMessage({ text: error.response?.data?.message || 'Failed to update password.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdminReset = async () => {
        if (!adminResetData.targetEmail.trim() || !adminResetData.newPassword.trim()) {
            setMessage({ text: 'Please fill in both email and new password.', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.post('/auth/reset-password-admin', adminResetData);
            setMessage({ text: res.data.message, type: 'success' });
            setAdminResetData({ targetEmail: '', newPassword: '' });
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        } catch (error: any) {
            setMessage({ text: error.response?.data?.message || 'Failed to override password.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCeo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await api.post('/settings/ceo', ceoData);
            setMessage({ text: res.data.message || 'CEO User created successfully', type: 'success' });
            setCeoData({ name: '', email: '', password: '' });
            fetchCeos();
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        } catch (error: any) {
            setMessage({ text: error.response?.data?.message || 'Failed to create CEO user.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateOfficer = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await api.post('/settings/admission-officer', officerData);
            setMessage({ text: res.data.message || 'Admission Officer created successfully', type: 'success' });
            setOfficerData({ name: '', email: '', password: '' });
            fetchOfficers();
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        } catch (error: any) {
            setMessage({ text: error.response?.data?.message || 'Failed to create Admission Officer.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const getSaveHandler = () => {
        if (activeTab === 'PROFILE') return handleProfileSave;
        if (activeTab === 'SECURITY') return handlePasswordSave;
        if (activeTab === 'ADMIN_RESET') return handleAdminReset;
        if (activeTab === 'NOTIFICATIONS') return handleNotificationSave;
        return undefined;
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
                    <p className="text-slate-500">Configure global profile and individual security preferences.</p>
                </div>
                {['PROFILE', 'SECURITY', 'ADMIN_RESET', 'NOTIFICATIONS'].includes(activeTab) && (
                    <button
                        onClick={getSaveHandler()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <Save size={18} /> {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                )}
            </div>

            {message.text && (
                <div className={`p-4 rounded-lg font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Settings Navigation */}
                <div className="md:col-span-1 space-y-1">
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMISSION_OFFICER') && (
                        <button
                            onClick={() => setActiveTab('PROFILE')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'PROFILE' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <Building size={18} /> Institute Profile
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('SECURITY')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'SECURITY' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Lock size={18} /> Security
                    </button>
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMISSION_OFFICER') && (
                        <button
                            onClick={() => setActiveTab('NOTIFICATIONS')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'NOTIFICATIONS' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <Bell size={18} /> Notifications
                        </button>
                    )}
                    
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMISSION_OFFICER') && (
                        <>
                            <div className="pt-4 pb-2 px-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Training Management</p>
                            </div>
                            <button
                                onClick={() => setActiveTab('ROOMS')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'ROOMS' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <Building size={18} /> Classrooms / Rooms
                            </button>
                            <button
                                onClick={() => setActiveTab('BATCHES')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'BATCHES' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <Users size={18} /> Training Batches
                            </button>
                            <button
                                onClick={() => setActiveTab('SPECIALIZATIONS')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'SPECIALIZATIONS' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <ShieldAlert size={18} /> Specializations
                            </button>
                            <button
                                onClick={() => setActiveTab('SLOTS')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'SLOTS' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <Clock size={18} /> Fixed Time Slots
                            </button>
                            <button
                                onClick={() => setActiveTab('YEARS')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'YEARS' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <Calendar size={18} /> Academic Years
                            </button>
                            <button
                                onClick={() => setActiveTab('ADMIN_RESET')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'ADMIN_RESET' ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 hover:text-rose-700'}`}
                            >
                                <ShieldAlert size={18} /> Admin Override
                            </button>
                            <button
                                onClick={() => setActiveTab('ACCESS_ASSIGN')}
                                className={`w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'ACCESS_ASSIGN' ? 'bg-indigo-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Users size={18} /> Access Assignment
                            </button>
                        </>
                    )}

                    <div className="pt-6 mt-6 border-t border-slate-200/50 px-4">
                        <p className="text-xs font-semibold tracking-wider text-slate-400 mb-2 uppercase">Account Info</p>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <User size={14} /> {user?.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 ml-6">{user?.email}</div>
                        <div className="text-xs font-medium text-indigo-500 mt-1 ml-6">{user?.role}</div>
                    </div>
                </div>

                {/* Settings Content */}
                <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

                    {activeTab === 'NOTIFICATIONS' && notificationConfig && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100">Notification Preferences</h3>
                            
                            <div className="bg-indigo-50 p-4 rounded-xl flex items-start gap-3 mb-6">
                                <Mail className="text-indigo-600 mt-1" size={20} />
                                <div>
                                    <p className="text-sm font-semibold text-indigo-900">Email System Configuration</p>
                                    <p className="text-xs text-indigo-700 mt-0.5">Note: Ensure SMTP credentials are set in the server environment (.env) for email notifications to function.</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {[
                                    { label: 'Assignments', key: 'assignment', desc: 'Notify interns when new assignments are created or released.' },
                                    { label: 'Assessments / Quizzes', key: 'assessment', desc: 'Notify interns when tests are scheduled or results published.' },
                                    { label: 'Fee Payments', key: 'fee', desc: 'Notify interns about payment success and send automated reminders.' },
                                    { label: 'Admissions', key: 'admission', desc: 'Notify admins of new requests and interns of approval status.' }
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="flex-1 pr-4">
                                            <h4 className="font-bold text-slate-800">{item.label}</h4>
                                            <p className="text-sm text-slate-500">{item.desc}</p>
                                        </div>
                                        <div className="flex gap-6">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">In-App</span>
                                                <button
                                                    onClick={() => setNotificationConfig({ ...notificationConfig, [`${item.key}InApp`]: !notificationConfig[`${item.key}InApp`] })}
                                                    className={`w-12 h-6 rounded-full transition-colors relative ${notificationConfig[`${item.key}InApp`] ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notificationConfig[`${item.key}InApp`] ? 'right-1' : 'left-1'}`} />
                                                </button>
                                            </div>
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
                                                <button
                                                    onClick={() => setNotificationConfig({ ...notificationConfig, [`${item.key}Email`]: !notificationConfig[`${item.key}Email`] })}
                                                    className={`w-12 h-6 rounded-full transition-colors relative ${notificationConfig[`${item.key}Email`] ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notificationConfig[`${item.key}Email`] ? 'right-1' : 'left-1'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'PROFILE' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <h3 className="text-lg font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100">Global System Details</h3>
                            {user?.role !== 'SUPER_ADMIN' && (
                                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg text-sm">
                                    <strong>Notice:</strong> Only `SUPER_ADMIN` accounts are authorized to modify these global parameters.
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Institute Name</label>
                                        <input
                                            type="text"
                                            value={settings.instituteName}
                                            onChange={(e) => setSettings({ ...settings, instituteName: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Registration Code (Immutable)</label>
                                        <input type="text" value={settings.registrationCode} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-500" readOnly />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
                                        <select
                                            value={settings.academicYear}
                                            onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        >
                                            <option value="">Select Year</option>
                                            {years.map(y => (
                                                <option key={y.id} value={y.name}>{y.name}</option>
                                            ))}
                                            {!years.some(y => y.name === settings.academicYear) && settings.academicYear && (
                                                <option value={settings.academicYear}>{settings.academicYear} (Legacy)</option>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                                        <input
                                            type="email"
                                            value={settings.contactEmail}
                                            onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Institute Address</label>
                                        <textarea
                                            rows={3}
                                            value={settings.address}
                                            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'SECURITY' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <h3 className="text-lg font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100">Update Secure Password</h3>
                            <div className="max-w-md space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="pt-2 border-t border-slate-100">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password (Bcrypt Hash)</label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'ADMIN_RESET' && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMISSION_OFFICER') && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-100">
                                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                                    <ShieldAlert size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Admin Password Override</h3>
                                    <p className="text-sm text-slate-500">Forcefully reset any user's credential by their registered email.</p>
                                </div>
                            </div>

                            <div className="max-w-md space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Account Email</label>
                                    <input
                                        type="email"
                                        placeholder="e.g. intern@rise.in"
                                        value={adminResetData.targetEmail}
                                        onChange={(e) => setAdminResetData({ ...adminResetData, targetEmail: e.target.value.toLowerCase().trim() })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none placeholder:text-slate-300"
                                    />
                                </div>
                                <div className="pt-2 border-t border-slate-100">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Force New Password</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. password123"
                                        value={adminResetData.newPassword}
                                        onChange={(e) => setAdminResetData({ ...adminResetData, newPassword: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none font-mono text-sm placeholder:text-slate-300 placeholder:font-sans"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'ACCESS_ASSIGN' && user?.role === 'SUPER_ADMIN' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                                    <Users size={20} />
                                </div>
                                <div>
                                <h3 className="text-lg font-bold text-slate-800">Role & Access Assignment</h3>
                                    <p className="text-sm text-slate-500">Create accounts for CEO and Admission Officer roles.</p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateCeo} className="max-w-md space-y-5 bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. John Doe"
                                        value={ceoData.name}
                                        onChange={(e) => setCeoData({ ...ceoData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="ceo@rise.in"
                                        value={ceoData.email}
                                        onChange={(e) => setCeoData({ ...ceoData, email: e.target.value.toLowerCase().trim() })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Initial Password</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Secure password"
                                        value={ceoData.password}
                                        onChange={(e) => setCeoData({ ...ceoData, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                    />
                                </div>
                                
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="mt-6 w-full py-3 bg-indigo-900 text-white rounded-xl font-black shadow-lg shadow-indigo-900/20 disabled:opacity-50 hover:bg-slate-900 transition-colors"
                                >
                                    {isLoading ? 'Processing...' : 'Provision CEO Account'}
                                </button>
                            </form>

                            <div className="max-w-md">
                                <h4 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Users size={18} className="text-indigo-600" />
                                    Assigned Executives
                                </h4>
                                {ceos.length > 0 ? (
                                    <div className="space-y-3">
                                        {ceos.map(ceo => (
                                            <div key={ceo.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-between hover:border-indigo-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                                                        {ceo.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{ceo.name}</div>
                                                        <div className="text-xs text-slate-500">{ceo.email}</div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setConfirmModal({
                                                            isOpen: true,
                                                            title: 'Remove CEO Account',
                                                            message: 'Are you sure you want to remove this CEO account?',
                                                            isDanger: true,
                                                            onConfirm: async () => {
                                                                setConfirmModal({ isOpen: false });
                                                                try {
                                                                    await api.delete(`/settings/ceos/${ceo.id}`);
                                                                    fetchCeos();
                                                                } catch (err) {
                                                                    alert('Failed to remove CEO');
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Remove Account"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-slate-500 bg-slate-50 border border-slate-100 border-dashed rounded-xl text-sm font-medium">
                                        No executive accounts currently assigned.
                                    </div>
                                )}
                            </div>

                            {/* ── Admission Officer Section ── */}
                            <div className="mt-12 pt-8 border-t-2 border-slate-200">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Admission Officers</h3>
                                        <p className="text-sm text-slate-500">Manage telecalling and admission staff accounts.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleCreateOfficer} className="max-w-md space-y-5 bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. Priya Sharma"
                                            value={officerData.name}
                                            onChange={(e) => setOfficerData({ ...officerData, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                                        <input
                                            required
                                            type="email"
                                            placeholder="officer@rise.in"
                                            value={officerData.email}
                                            onChange={(e) => setOfficerData({ ...officerData, email: e.target.value.toLowerCase().trim() })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Initial Password</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Secure password"
                                            value={officerData.password}
                                            onChange={(e) => setOfficerData({ ...officerData, password: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                        />
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="mt-6 w-full py-3 bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-700/20 disabled:opacity-50 hover:bg-emerald-800 transition-colors"
                                    >
                                        {isLoading ? 'Processing...' : 'Create Admission Officer'}
                                    </button>
                                </form>

                                <div className="max-w-md">
                                    <h4 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Users size={18} className="text-emerald-600" />
                                        Active Admission Officers
                                    </h4>
                                    {officers.length > 0 ? (
                                        <div className="space-y-3">
                                            {officers.map(officer => (
                                                <div key={officer.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-between hover:border-emerald-100 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
                                                            {officer.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-sm">{officer.name}</div>
                                                            <div className="text-xs text-slate-500">{officer.email}</div>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                title: 'Remove Admission Officer',
                                                                message: 'Are you sure you want to remove this Admission Officer account?',
                                                                isDanger: true,
                                                                onConfirm: async () => {
                                                                    setConfirmModal({ isOpen: false });
                                                                    try {
                                                                        await api.delete(`/settings/admission-officers/${officer.id}`);
                                                                        fetchOfficers();
                                                                    } catch (err) {
                                                                        alert('Failed to remove Admission Officer');
                                                                    }
                                                                }
                                                            });
                                                        }}
                                                        className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Remove Account"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center text-slate-500 bg-slate-50 border border-slate-100 border-dashed rounded-xl text-sm font-medium">
                                            No admission officer accounts currently assigned.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'YEARS' && <YearManager />}
                    
                    {activeTab === 'ROOMS' && <MetadataManager type="rooms" title="Classroom / Room" />}
                    {activeTab === 'BATCHES' && <BatchManager />}
                    {activeTab === 'SPECIALIZATIONS' && <MetadataManager type="specializations" title="Specialization" />}
                    {activeTab === 'SLOTS' && <MetadataManager type="slots" title="Time Slot" />}

                </div>
            </div>

            <ConfirmModal 
                isOpen={confirmModal.isOpen} 
                title={confirmModal.title} 
                message={confirmModal.message} 
                isDanger={confirmModal.isDanger} 
                onConfirm={confirmModal.onConfirm} 
                onCancel={() => setConfirmModal({ isOpen: false })} 
            />
        </motion.div>
    );
}

function YearManager() {
    const [years, setYears] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ show: boolean, id: string, name: string, confirmCount: number }>({
        show: false, id: '', name: '', confirmCount: 0
    });
    const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
    const { fetchSettings } = useSettingsStore();

    useEffect(() => { fetchYears(); }, []);
    const fetchYears = async () => {
        try {
            const res = await api.get('/academic-years');
            setYears(res.data);
        } catch (error) { console.error('Error fetching academic years:', error); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingId) await api.patch(`/academic-years/${editingId}`, formData);
            else await api.post('/academic-years', formData);
            setShowCreateModal(false);
            setEditingId(null);
            setFormData({ name: '', startDate: '', endDate: '', isCurrent: false });
            fetchYears();
            fetchSettings();
        } catch (error: any) { alert(error.response?.data?.message || 'Failed to save academic year'); }
        finally { setIsSubmitting(false); }
    };

    const handleSetCurrent = async (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Set Active Year',
            message: `Are you sure you want to set "${name}" as the active academic year?`,
            isDanger: false,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                try {
                    await api.patch(`/academic-years/${id}`, { isCurrent: true });
                    fetchYears();
                    fetchSettings();
                } catch (error) { console.error('Error setting current year:', error); }
            }
        });
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
        } catch (error: any) { alert(error.response?.data?.message || 'Failed to delete year'); }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading academic years...</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Manage Academic Years</h3>
                <button onClick={() => { setShowCreateModal(true); setEditingId(null); setFormData({ name: '', startDate: '', endDate: '', isCurrent: false }); }} className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-indigo-700 transition-all">
                    <Plus size={14} /> Create New
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {years.map((y) => (
                    <div key={y.id} className={`p-4 bg-white border rounded-2xl transition-all ${y.isCurrent ? 'border-indigo-400 shadow-md ring-2 ring-indigo-50' : 'border-slate-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-xl ${y.isCurrent ? 'bg-indigo-50' : 'bg-slate-50'} flex items-center justify-center`}>
                                <Calendar className={y.isCurrent ? 'text-indigo-600' : 'text-slate-400'} size={20} />
                            </div>
                            {y.isCurrent && <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Active</span>}
                        </div>
                        <h4 className="font-bold text-slate-800 mb-1">{y.name}</h4>
                        <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-4">
                            {y.startDate ? new Date(y.startDate).toLocaleDateString() : '—'} <ArrowRight size={10} /> {y.endDate ? new Date(y.endDate).toLocaleDateString() : '—'}
                        </div>
                        <div className="flex gap-2 mt-auto pt-2">
                            {!y.isCurrent ? (
                                <>
                                    <button onClick={() => handleSetCurrent(y.id, y.name)} className="flex-1 py-2 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-[10px] hover:bg-indigo-100 uppercase tracking-widest">Set Active</button>
                                    <button onClick={() => setDeleteModal({ show: true, id: y.id, name: y.name, confirmCount: 0 })} className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                                </>
                            ) : (
                                <button className="flex-1 py-2 rounded-lg bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest" disabled>Currently Active</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Create New Year</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Session Name</label>
                                    <input type="text" required placeholder="e.g. 2025 - 2026" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
                                        <input type="date" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}/>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
                                        <input type="date" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})}/>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <input type="checkbox" id="isCurrent" className="w-4 h-4 accent-indigo-600" checked={formData.isCurrent} onChange={e => setFormData({...formData, isCurrent: e.target.checked})}/>
                                    <label htmlFor="isCurrent" className="text-xs font-bold text-slate-700">Set as current active year</label>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 font-bold text-slate-400 uppercase tracking-widest text-[10px] hover:bg-slate-50 rounded-xl">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-md"> {isSubmitting ? 'Saving...' : 'Save Year'} </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {deleteModal.show && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center">
                            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle size={32} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-2">Delete {deleteModal.name}?</h2>
                            <p className="text-xs text-slate-500 font-medium mb-8">
                                This will permanently delete ALL data associated with this year. Confirmation: {deleteModal.confirmCount}/2
                            </p>
                            <div className="flex flex-col gap-3">
                                {deleteModal.confirmCount < 2 ? (
                                    <button onClick={handleDelete} className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg">Yes, Delete it</button>
                                ) : (
                                    <button onClick={handleDelete} className="w-full py-3 bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg animate-pulse">CONFIRM FINAL DELETE</button>
                                )}
                                <button onClick={() => setDeleteModal({ show: false, id: '', name: '', confirmCount: 0 })} className="w-full py-3 bg-slate-50 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-widest">Cancel</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal 
                isOpen={confirmModal.isOpen} 
                title={confirmModal.title} 
                message={confirmModal.message} 
                isDanger={confirmModal.isDanger} 
                onConfirm={confirmModal.onConfirm} 
                onCancel={() => setConfirmModal({ isOpen: false })} 
            />
        </motion.div>
    );
}

function BatchManager() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState('');
    const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
    const { fetchBatches } = useSettingsStore();

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await api.get('/scheduler/batches');
            setItems(res.data);
            fetchBatches(); // Sync global store
        } catch (error) {
            console.error('Failed to fetch batches', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/scheduler/batches', { name: newItemName });
            setNewItemName('');
            fetchItems();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error creating batch');
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Batch',
            message: 'Are you sure you want to delete this batch? All associated schedules will be lost.',
            isDanger: true,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                try {
                    await api.delete(`/scheduler/batches/${id}`);
                    fetchItems();
                } catch (error) {
                    alert('Error deleting batch');
                }
            }
        });
    };

    const handleSetActive = async (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Set Active Batch',
            message: `Set ${name} as the globally active batch? This will hide previous interns from daily views.`,
            isDanger: false,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                try {
                    await api.put(`/scheduler/batches/${id}/current`);
                    fetchItems();
                } catch (error) {
                    alert('Failed to set active batch');
                }
            }
        });
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading batches...</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-lg font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100">Manage Training Batches</h3>
            <form onSubmit={handleCreate} className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Batch Name</label>
                    <input required type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="e.g. Batch 2024-A" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                    Add Batch
                </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {items.length === 0 && !loading && (
                    <div className="col-span-full p-8 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No batches found. Create your first one above.
                    </div>
                )}
                {items.map((b: any) => (
                    <div key={b.id} className={`p-4 bg-white border rounded-2xl transition-all ${b.isCurrent ? 'border-indigo-400 shadow-md ring-2 ring-indigo-50' : 'border-slate-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-xl ${b.isCurrent ? 'bg-indigo-50' : 'bg-slate-50'} flex items-center justify-center`}>
                                <Users className={b.isCurrent ? 'text-indigo-600' : 'text-slate-400'} size={20} />
                            </div>
                            {b.isCurrent && <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Active</span>}
                        </div>
                        <h4 className="font-bold text-slate-800 mb-1">{b.name}</h4>
                        
                        <div className="flex gap-2 mt-4 pt-2">
                            {!b.isCurrent ? (
                                <>
                                    <button onClick={() => handleSetActive(b.id, b.name)} className="flex-1 py-2 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-[10px] hover:bg-indigo-100 uppercase tracking-widest">Set Active</button>
                                    <button onClick={() => handleDelete(b.id)} className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                                </>
                            ) : (
                                <button className="flex-1 py-2 rounded-lg bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest" disabled>Currently Active</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmModal 
                isOpen={confirmModal.isOpen} 
                title={confirmModal.title} 
                message={confirmModal.message} 
                isDanger={confirmModal.isDanger} 
                onConfirm={confirmModal.onConfirm} 
                onCancel={() => setConfirmModal({ isOpen: false })} 
            />
        </motion.div>
    );
}

function MetadataManager({ type, title }: { type: string, title: string }) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState('');
    const [newItemCapacity, setNewItemCapacity] = useState('');
    const [newItemStartTime, setNewItemStartTime] = useState('09:00 AM');
    const [newItemEndTime, setNewItemEndTime] = useState('10:00 AM');
    const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });

    useEffect(() => {
        fetchItems();
    }, [type]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/scheduler/${type}`);
            setItems(res.data);
        } catch (error) {
            console.error(`Failed to fetch ${type}`, error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data: any = {};
            if (type !== 'slots') data.name = newItemName;
            
            if (type === 'rooms') data.capacity = parseInt(newItemCapacity) || 0;
            if (type === 'slots') {
                data.startTime = newItemStartTime;
                data.endTime = newItemEndTime;
                data.slotOrder = items.length > 0 ? Math.max(...items.map(i => i.slotOrder)) + 1 : 1;
                data.durationHours = 1.0;
            }
            
            await api.post(`/scheduler/${type}`, data);
            setNewItemName('');
            setNewItemCapacity('');
            setNewItemStartTime('09:00 AM');
            setNewItemEndTime('10:00 AM');
            fetchItems();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error creating item');
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: `Delete ${title}`,
            message: `Are you sure you want to delete this ${title.toLowerCase()}?`,
            isDanger: true,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                try {
                    await api.delete(`/scheduler/${type}/${id}`);
                    fetchItems();
                } catch (error) {
                    alert('Error deleting item');
                }
            }
        });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-lg font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100">Manage {title}s</h3>
            <form onSubmit={handleCreate} className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap gap-4 items-end">
                {type !== 'slots' ? (
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{title} Name</label>
                        <input required type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder={`e.g. ${type === 'rooms' ? 'Nalanda' : 'Batch 2024'}`} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                ) : (
                    <>
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Start Time</label>
                            <input required type="text" value={newItemStartTime} onChange={e => setNewItemStartTime(e.target.value)} placeholder="09:00 AM" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">End Time</label>
                            <input required type="text" value={newItemEndTime} onChange={e => setNewItemEndTime(e.target.value)} placeholder="10:00 AM" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </>
                )}
                {type === 'rooms' && (
                    <div className="w-32">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Capacity</label>
                        <input required type="number" value={newItemCapacity} onChange={e => setNewItemCapacity(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                )}
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                    Add {title}
                </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {items.length === 0 && !loading && (
                    <div className="col-span-full p-8 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No {type} found. Create your first one above.
                    </div>
                )}
                {items.map((item: any) => (
                    <div key={item.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex justify-between items-center hover:border-indigo-100 group transition-all">
                        <div>
                            <div className="font-bold text-slate-800">
                                {type === 'slots' ? `${item.startTime} - ${item.endTime}` : item.name}
                            </div>
                            {type === 'rooms' && <div className="text-xs text-slate-500 font-medium">Capacity: {item.capacity} seats</div>}
                            {type === 'slots' && <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Order: {item.slotOrder}</div>}
                        </div>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <ConfirmModal 
                isOpen={confirmModal.isOpen} 
                title={confirmModal.title} 
                message={confirmModal.message} 
                isDanger={confirmModal.isDanger} 
                onConfirm={confirmModal.onConfirm} 
                onCancel={() => setConfirmModal({ isOpen: false })} 
            />
        </motion.div>
    );
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, isDanger = false }: any) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${isDanger ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
                <p className="text-sm text-slate-500 font-medium mb-8">{message}</p>
                <div className="flex flex-col gap-3">
                    <button onClick={onConfirm} className={`w-full py-3 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg ${isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                        Confirm
                    </button>
                    <button onClick={onCancel} className="w-full py-3 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-xs uppercase tracking-widest">
                        Cancel
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
