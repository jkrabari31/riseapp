import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import api from '../utils/api';

export default function Login() {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);
    const instituteName = useSettingsStore((state) => state.instituteName);
    const initials = instituteName ? instituteName.charAt(0) : 'R';

    // If already logged in, skip the login page and go directly to the right dashboard
    useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === 'TRAINER') navigate('/trainer-dashboard', { replace: true });
            else if (user.role === 'INTERN') navigate('/intern-dashboard', { replace: true });
            else if (user.role === 'CEO') navigate('/ceo-dashboard', { replace: true });
            else navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { email, password });
            const { user, token } = response.data;

            login(user, token);

            // Role-based routing
            if (user.role === 'TRAINER') {
                navigate('/trainer-dashboard');
            } else if (user.role === 'INTERN') {
                navigate('/intern-dashboard');
            } else if (user.role === 'CEO') {
                navigate('/ceo-dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="absolute inset-0 bg-indigo-500/5 mix-blend-multiply" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 relative z-10 glass"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                        <span className="text-white text-3xl font-bold">{initials}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Welcome to {instituteName}</h1>
                    <p className="text-slate-500 mt-2">Sign in to manage your internship operations</p>
                </div>

                {error && (
                    <div className="p-3 mb-4 text-sm text-rose-600 bg-rose-50 rounded-lg flex items-center gap-2 border border-rose-100">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email / Username</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-slate-700">Password</label>
                            <a href="#" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">Forgot password?</a>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 group"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                        {!loading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
                    </button>
                </form>

                <div className="mt-6 text-right">
                    <Link to="/apply" className="text-indigo-600 hover:text-indigo-500 font-medium text-sm transition-colors decoration-indigo-200">
                        Apply Now
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
