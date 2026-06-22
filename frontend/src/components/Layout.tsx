import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

export default function Layout() {
    const { isAuthenticated, token, logout } = useAuthStore();
    const navigate = useNavigate();
    const [validating, setValidating] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        // If there is no token at all, immediately redirect to login
        if (!isAuthenticated || !token) {
            setValidating(false);
            return;
        }

        // Validate the stored JWT against the backend
        // This prevents stale/expired tokens from granting access
        api.get('/auth/me')
            .then(() => {
                // Token is valid — allow access
                setValidating(false);
            })
            .catch(() => {
                // Token is expired or invalid — force logout and redirect
                logout();
                navigate('/login', { replace: true });
            });
    }, []);

    // Show nothing while validating to prevent a flash of protected content
    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans relative overflow-hidden">
            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" 
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Wrapper */}
            <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar onClose={() => setIsSidebarOpen(false)} />
            </div>

            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <Header onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full max-w-[1600px] mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
