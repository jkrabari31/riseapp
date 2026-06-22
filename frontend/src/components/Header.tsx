import { useState, useEffect, useRef } from 'react';
import { Bell, Search, UserCircle, Loader2, CheckCircle, GraduationCap, User, AlertCircle, X, Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ students: any[], teachers: any[] } | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<any | null>(null);

    const searchRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    // Fetch notifications initially and then poll every 60s (only when tab is visible)
    useEffect(() => {
        if (!user) return;
        fetchNotifications();

        let interval: ReturnType<typeof setInterval>;

        const startPolling = () => {
            interval = setInterval(() => {
                if (!document.hidden) fetchNotifications();
            }, 60000);
        };

        const handleVisibility = () => {
            if (!document.hidden) fetchNotifications(); // Refresh immediately on tab focus
        };

        startPolling();
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [user]);

    // Handle clicking outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowSearch(false);
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifications(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search Debouncer
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults(null);
            setShowSearch(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await api.get(`/search?q=${searchQuery}`);
                setSearchResults(res.data);
                setShowSearch(true);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (error) {
            console.error("Failed to load notifications", error);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) { /* Empty */ }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        } catch (error) { /* Empty */ }
    };

    const handleNotificationClick = async (n: any) => {
        setSelectedNotification(n);
        if (!n.isRead) {
            try {
                await api.put(`/notifications/${n.id}/read`);
                setNotifications(notifications.map(notif => notif.id === n.id ? { ...notif, isRead: true } : notif));
            } catch (error) { /* Empty */ }
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const topPriorityNotification = notifications.find(n => !n.isRead && (n.priority === 'URGENT' || n.priority === 'HIGH'));

    return (
        <div className="sticky top-0 z-30 flex flex-col w-full">
            <AnimatePresence>
                {topPriorityNotification && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`w-full px-6 py-2.5 flex items-center justify-between border-b ${topPriorityNotification.priority === 'URGENT' ? 'bg-rose-600 text-white border-rose-700' : 'bg-amber-500 text-amber-950 border-amber-600'}`}
                    >
                        <div className="flex items-center gap-3">
                            <AlertCircle size={18} className={topPriorityNotification.priority === 'URGENT' ? 'text-rose-200' : 'text-amber-900'} />
                            <div className="text-sm">
                                <span className="font-bold mr-2 uppercase tracking-wide">[{topPriorityNotification.priority}]</span>
                                <span className="font-semibold mr-1">{topPriorityNotification.title}:</span>
                                <span className="opacity-90">{topPriorityNotification.message}</span>
                            </div>
                        </div>
                        <button onClick={() => markAsRead(topPriorityNotification.id)} className={`px-4 py-1 rounded text-xs font-bold transition-colors ${topPriorityNotification.priority === 'URGENT' ? 'bg-white text-rose-600 hover:bg-rose-50' : 'bg-amber-900 text-amber-50 hover:bg-amber-800'}`}>
                            Acknowledge
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            <header className="h-16 bg-white/70 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-4 md:px-6 transition-colors">
                <div className="flex items-center gap-2 md:gap-4 flex-1">
                    {onMenuClick && (
                        <button 
                            onClick={onMenuClick} 
                            className="md:hidden p-2 text-slate-500 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
                        >
                            <Menu size={24} />
                        </button>
                    )}
                    {user?.role !== 'INTERN' && (
                        <div className="relative w-96 hidden md:block" ref={searchRef}>
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search interns, trainers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
                                className="w-full pl-10 pr-10 py-2 bg-slate-100 border-none rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all outline-none placeholder:text-slate-400"
                            />
                            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" size={16} />}

                            {/* Search Dropdown */}
                            <AnimatePresence>
                                {showSearch && searchResults && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-12 left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto"
                                    >
                                        {searchResults.students.length === 0 && searchResults.teachers.length === 0 ? (
                                            <div className="p-4 text-center text-slate-500 text-sm">No results found for "{searchQuery}"</div>
                                        ) : (
                                            <div className="py-2">
                                                {searchResults.students.length > 0 && (
                                                    <div className="mb-2">
                                                        <h4 className="px-4 py-1 text-xs font-bold tracking-wider text-slate-400 uppercase">Interns</h4>
                                                        {searchResults.students.map((s, i) => (
                                                            <div key={i} onClick={() => { navigate(`/student/${s.id}`); setShowSearch(false); setSearchQuery(''); }} className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500"><GraduationCap size={16} /></div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-700">{s.name}</p>
                                                                    <p className="text-xs text-slate-500">{s.classLevel} - {s.section} | {s.admissionNumber}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {searchResults.teachers.length > 0 && (
                                                    <div>
                                                        <h4 className="px-4 py-1 text-xs font-bold tracking-wider text-slate-400 uppercase border-t border-slate-100 pt-3">Trainers</h4>
                                                        {searchResults.teachers.map((t, i) => (
                                                            <div key={i} onClick={() => { navigate(`/teacher/${t.user?.id || t.id}`); setShowSearch(false); setSearchQuery(''); }} className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><User size={16} /></div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-700">{t.firstName} {t.lastName}</p>
                                                                    <p className="text-xs text-slate-500">{t.user.email}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-6">
                    <div className="relative" ref={notifRef}>
                        <button onClick={() => setShowNotifications(!showNotifications)} className="text-slate-500 hover:text-slate-700 relative transition-colors p-2 rounded-full hover:bg-slate-100">
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
                            )}
                        </button>

                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 flex flex-col max-h-[400px]"
                                >
                                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <h3 className="font-bold text-slate-800">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllAsRead} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Mark all read</button>
                                        )}
                                    </div>
                                    <div className="overflow-y-auto flex-1 p-2">
                                        {notifications.length === 0 ? (
                                            <div className="p-6 text-center text-slate-500 text-sm">
                                                <CheckCircle className="mx-auto mb-2 text-slate-300" size={32} />
                                                You're all caught up!
                                            </div>
                                        ) : (
                                            notifications.map((n) => {
                                                const isUrgent = n.priority === 'URGENT';
                                                const isHigh = n.priority === 'HIGH';

                                                let bgClass = n.isRead ? 'hover:bg-slate-50 opacity-70' : 'bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100';
                                                let dotClass = n.isRead ? 'bg-transparent' : 'bg-indigo-500';
                                                let titleClass = n.isRead ? 'text-slate-700' : 'text-indigo-900 font-semibold';

                                                if (!n.isRead) {
                                                    if (isUrgent) {
                                                        bgClass = 'bg-rose-50 hover:bg-rose-100 border border-rose-200';
                                                        dotClass = 'bg-rose-600 animate-pulse';
                                                        titleClass = 'text-rose-900 font-bold';
                                                    } else if (isHigh) {
                                                        bgClass = 'bg-amber-50 hover:bg-amber-100 border border-amber-200';
                                                        dotClass = 'bg-amber-500';
                                                        titleClass = 'text-amber-900 font-bold';
                                                    }
                                                }

                                                return (
                                                    <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-3 rounded-lg flex gap-3 cursor-pointer transition-colors ${bgClass}`}>
                                                        <div className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${dotClass}`}></div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <p className={`text-sm leading-tight ${titleClass}`}>{n.title}</p>
                                                                {(!n.isRead && (isUrgent || isHigh)) && (
                                                                    <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-sm uppercase ${isUrgent ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'}`}>
                                                                        {n.priority}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`text-xs mt-1 leading-snug ${n.isRead ? 'text-slate-500' : (isUrgent ? 'text-rose-700' : isHigh ? 'text-amber-700' : 'text-slate-600')}`}>{n.message}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                        <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                            <UserCircle className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-bold text-slate-700 leading-tight">{user?.name || 'Loading Account...'}</p>
                            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider">{user?.role?.replace('_', ' ') || 'GUEST'}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Notification Modal */}
            <AnimatePresence>
                {selectedNotification && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                        >
                            <div className={`p-4 sm:p-6 flex justify-between items-start ${selectedNotification.priority === 'URGENT' ? 'bg-rose-50' : selectedNotification.priority === 'HIGH' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                                <div className="flex gap-4">
                                   <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedNotification.priority === 'URGENT' ? 'bg-rose-100 text-rose-600' : selectedNotification.priority === 'HIGH' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                        <Bell size={20} />
                                   </div>
                                   <div>
                                       <div className="flex items-center gap-2 mb-1">
                                           {(selectedNotification.priority === 'URGENT' || selectedNotification.priority === 'HIGH') && (
                                               <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md uppercase ${selectedNotification.priority === 'URGENT' ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'}`}>
                                                    {selectedNotification.priority}
                                               </span>
                                           )}
                                       </div>
                                       <h3 className="text-lg font-bold text-slate-800 leading-tight">{selectedNotification.title}</h3>
                                       <p className="text-xs text-slate-500 mt-1">{selectedNotification.createdAt ? new Date(selectedNotification.createdAt).toLocaleString() : ''}</p>
                                   </div>
                                </div>
                                <button onClick={() => setSelectedNotification(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/50 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-4 sm:p-6">
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedNotification.message}</p>
                                <div className="mt-6 flex justify-end">
                                    <button onClick={() => setSelectedNotification(null)} className="px-5 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors text-sm">
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
