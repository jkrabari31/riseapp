import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, User, Calendar, DollarSign, Settings, LogOut, FileSpreadsheet, BookOpen, ClipboardList, BarChart3, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

export default function Sidebar() {
    const navigate = useNavigate();
    const logout = useAuthStore((state) => state.logout);
    const userRole = useAuthStore((state) => state.user?.role);
    const instituteName = useSettingsStore(state => state.instituteName);
    const initials = instituteName ? instituteName.charAt(0) : 'R';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getMenuItems = () => {
        if (userRole === 'ADMISSION_OFFICER') {
            return [
                { icon: FileSpreadsheet, label: 'Admissions', path: '/admissions' },
                { icon: Users, label: 'Interns', path: '/students' },
                { icon: Calendar, label: 'Scheduler', path: '/scheduler' },
                { icon: Calendar, label: 'Attendance', path: '/attendance' },
                { icon: DollarSign, label: 'Fees', path: '/fees' },
                { icon: User, label: 'Trainers', path: '/teachers' },
                { icon: BarChart3, label: 'Analytics', path: '/reports' },
                { icon: Download, label: 'Data Export', path: '/export' },
            ];
        }

        // Base items for admin
        const items = [
            { icon: Home, label: 'Dashboard', path: '/dashboard' },
            { icon: FileSpreadsheet, label: 'Admissions', path: '/admissions' },
            { icon: Users, label: 'Interns', path: '/students' },
            { icon: Calendar, label: 'Scheduler', path: '/scheduler' },
            { icon: Calendar, label: 'Attendance', path: '/attendance' },
            { icon: DollarSign, label: 'Fees', path: '/fees' },
            { icon: User, label: 'Trainers', path: '/teachers' },
            { icon: BarChart3, label: 'Analytics', path: '/reports' },
            { icon: Download, label: 'Data Export', path: '/export' },
            { icon: Settings, label: 'Settings', path: '/settings' },
        ];

        if (userRole === 'TRAINER') {
            return [
                { icon: Home, label: 'Dashboard', path: '/trainer-dashboard' },
                { icon: Users, label: 'My Interns', path: '/my-interns' },
                { icon: BookOpen, label: 'Assignments', path: '/assignments' },
                { icon: ClipboardList, label: 'Assessments', path: '/quiz-builder' },
                { icon: Calendar, label: 'Scheduler', path: '/scheduler' },
                { icon: Calendar, label: 'Attendance', path: '/attendance' },
                { icon: BarChart3, label: 'Analytics', path: '/reports' },
                { icon: Settings, label: 'Settings', path: '/settings' },
            ];
        }

        if (userRole === 'INTERN') {
            return [
                { icon: Home, label: 'Dashboard', path: '/intern-dashboard' },
                { icon: BookOpen, label: 'My Assignments', path: '/my-assignments' },
                { icon: ClipboardList, label: 'Assessments', path: '/take-quiz' },
                { icon: Calendar, label: 'My Schedule', path: '/scheduler' },
                { icon: DollarSign, label: 'Fees', path: '/fees' },
                { icon: Settings, label: 'Settings', path: '/settings' },
            ];
        }

        return items;
    };

    const menuItems = getMenuItems();

    return (
        <motion.aside
            animate={{ x: 0 }}
            className="w-64 bg-slate-900 border-r border-slate-700/50 flex flex-col h-screen sticky top-0"
        >
            <div className="h-16 flex items-center px-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                        <span className="text-white font-bold text-xl leading-none">{initials}</span>
                    </div>
                    <span className="text-white font-bold text-xl tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{instituteName}</span>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto no-scrollbar">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`
                        }
                    >
                        <item.icon size={20} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-white/10">
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                    <LogOut size={20} />
                    Logout
                </button>
            </div>
        </motion.aside>
    );
}
