import { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import ThemeContext from '../context/ThemeContext';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    Menu,
    X,
    Sun,
    Moon,
    Calendar,
    Users,
    GraduationCap,
    Briefcase,
    FileText
} from 'lucide-react';

const FacultyLayout = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const location = useLocation();

    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Faculty-specific Navigation
    const navItems = [
        { path: '/faculty-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/faculty/classes', label: 'My Classes', icon: Briefcase },
        { path: '/faculty/leave', label: 'Apply Leave', icon: FileText },
    ];

    // Helper for active state
    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex relative transition-colors duration-300">

            {/* Mobile Overlay */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Faculty Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 shadow-xl lg:shadow-none
                transform transition-transform duration-300 ease-in-out w-64
                ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                                <GraduationCap size={24} />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">Faculty<br /><span className="text-indigo-600 text-sm">Portal</span></h2>
                            </div>
                        </div>
                        <button onClick={() => setIsMobileSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-900">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
                        {navItems.map(item => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileSidebarOpen(false)}
                                className={`
                                    flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200
                                    ${isActive(item.path)
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}
                                `}
                            >
                                <item.icon size={20} />
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* User Profile & Actions */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="w-full flex items-center justify-between px-4 py-2 mb-4 bg-white dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-600 shadow-sm hover:bg-gray-50 transition"
                        >
                            <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
                            {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>

                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                {user?.name?.[0] || 'F'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name || 'Faculty'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                            </div>
                            <button onClick={logout} className="text-gray-400 hover:text-red-500 transition">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-64 min-h-screen transition-all duration-300">
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {/* Mobile Header */}
                    <div className="lg:hidden mb-6 flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                                <GraduationCap size={18} />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">Faculty Portal</span>
                        </div>
                        <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <Menu size={24} className="text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>

                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default FacultyLayout;
