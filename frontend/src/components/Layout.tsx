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
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Header />
                <main className="flex-1 p-6 overflow-y-auto w-full max-w-[1600px] mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
