import { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import ThemeContext from '../context/ThemeContext';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardCheck, BarChart3, LogOut, Menu, X, Sun, Moon, Key, Calendar, BookOpen, Building2, UserCog } from 'lucide-react';


const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const location = useLocation();

    // Mobile sidebar state
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    // Desktop sidebar state (default open)
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: '/', label: 'Overview', icon: LayoutDashboard },
        { path: '/students', label: 'Students', icon: Users },
        { path: '/attendance', label: 'Mark Attendance', icon: ClipboardCheck },
        { path: '/manage-profiles', label: 'Manage Profiles', icon: UserCog },

        { path: '/credentials', label: 'Student Creds', icon: Key },
        { path: '/faculty-credentials', label: 'Faculty Creds', icon: Key },
        { path: '/faculty', label: 'Faculty', icon: Users },
        { path: '/departments', label: 'Departments', icon: Building2 },
        { path: '/subjects', label: 'Subjects', icon: BookOpen },
        { path: '/timetable', label: 'Timetable', icon: Calendar },
        { path: '/reports', label: 'Reports', icon: BarChart3 },
        { path: '/requests', label: 'Requests', icon: ClipboardCheck },
        { path: '/faculty/leave', label: 'Apply Leave'},
    ];

    const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
    const toggleDesktopSidebar = () => setIsDesktopSidebarOpen(!isDesktopSidebarOpen);

    return (
        <div className="min-h-screen bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))] from-gray-100 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex relative overflow-hidden transition-colors duration-300">
            {/* Background Decorations */}
            <div className="fixed top-20 right-20 w-96 h-96 bg-blue-200/20 dark:bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="fixed bottom-20 left-64 w-96 h-96 bg-purple-200/20 dark:bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Sidebar with Premium Glassmorphism & Gradient Border */}
            <aside className={`
                fixed inset-y-0 left-0 z-40  border-r border-white/5 shadow-2xl
                transform transition-all duration-300 ease-in-out flex flex-col
                bg-[#0f1014] text-white
                ${isMobileSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'}
                lg:translate-x-0 ${isDesktopSidebarOpen ? 'lg:w-72' : 'lg:w-24'}
            `}>
                {/* Header with Subtle Gradient */}
                <div className="h-24 flex items-center justify-between px-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                    <div className={`flex items-center gap-4 transition-all duration-300 ${!isDesktopSidebarOpen && 'lg:hidden'}`}>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative w-11 h-11 rounded-xl bg-black flex items-center justify-center border border-white/10 shadow-2xl">
                                <span className="font-black text-2xl bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">P</span>
                            </div>
                        </div>
                        <div>
                            <h1 className="font-bold text-xl tracking-wide text-white">PSD</h1>
                            <p className="text-[10px] text-gray-400 font-medium tracking-[0.2em] uppercase">
                                {user?.role === 'hod' ? 'HOD Panel' :
                                    user?.role === 'faculty' ? 'Faculty Panel' :
                                        user?.role === 'student' ? 'Student Panel' : 'Admin Panel'}
                            </p>
                        </div>
                    </div>

                    {/* Desktop Toggle */}
                    <button
                        onClick={toggleDesktopSidebar}
                        className={`hidden lg:flex p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white ${!isDesktopSidebarOpen && 'mx-auto'}`}
                    >
                        {isDesktopSidebarOpen ? <Menu size={20} /> : <span className="font-black text-xl bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">P</span>}
                    </button>

                    {/* Mobile Close */}
                    <button onClick={() => setIsMobileSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation with Neon Glow Effects */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-800">
                    {navItems.filter(item => {
                        if (['/departments', '/credentials', '/manage-profiles'].includes(item.path)) return user?.role === 'admin';
                        if (['/faculty', '/subjects', '/reports', '/faculty-credentials', '/requests'].includes(item.path)) return user?.role === 'admin' || user?.role === 'hod';
                        if (item.path === '/faculty/leave') return user?.role === 'faculty';
                        return true;
                    }).map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileSidebarOpen(false)}
                            title={!isDesktopSidebarOpen ? item.label : ''}
                            className={`
                                flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 group relative overflow-hidden
                                ${isActive(item.path)
                                    ? 'text-white shadow-lg shadow-violet-900/20'
                                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'}
                                ${!isDesktopSidebarOpen && 'lg:justify-center lg:px-2'}
                            `}
                        >
                            {/* Active Gradient Background */}
                            {isActive(item.path) && (
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 rounded-xl"></div>
                            )}

                            {/* Hover Gradient Overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none ${isActive(item.path) ? 'hidden' : 'block'}`}></div>

                            <item.icon
                                size={22}
                                className={`relative z-10 transition-transform duration-300 group-hover:scale-110 drop-shadow-md ${isActive(item.path) ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}
                            />

                            {isDesktopSidebarOpen && (
                                <span className="relative z-10 tracking-wide text-sm">{item.label}</span>
                            )}

                            {/* Active Indicator Glow */}
                            {!isDesktopSidebarOpen && isActive(item.path) && (
                                <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Footer User Profile with Frosted Glass */}
                <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-xl">
                    {isDesktopSidebarOpen ? (
                        <div className="space-y-4">
                            <button
                                onClick={toggleTheme}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-white/5 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-all border border-white/5 hover:border-white/10 group"
                            >
                                <span className="flex items-center gap-2">
                                    {theme === 'light' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-blue-400" />}
                                    <span className="group-hover:translate-x-1 transition-transform">{theme === 'light' ? 'Light' : 'Dark'} Mode</span>
                                </span>
                            </button>

                            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-white/5">
                                <div className="relative">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                    <div className="relative w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold text-lg border border-white/10">
                                        {user?.username?.[0]?.toUpperCase()}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate group-hover:text-violet-300 transition-colors">{user?.name || user?.username}</p>
                                    <p className="text-[10px] text-gray-500 truncate uppercase tracking-wider">{user?.role || 'Admin'}</p>
                                </div>
                                <button
                                    onClick={logout}
                                    className="p-2 text-gray-600 hover:text-red-400 transition-colors hover:bg-white/5 rounded-lg"
                                    title="Sign Out"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6 items-center py-2">
                            <button onClick={toggleTheme} className="text-gray-500 hover:text-white transition-colors">
                                {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <div
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-black"
                                title={user?.username}
                            >
                                {user?.username?.[0]?.toUpperCase()}
                            </div>
                            <button onClick={logout} className="text-gray-600 hover:text-red-400 transition-colors" title="Sign Out">
                                <LogOut size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className={`
                flex-1 min-h-screen transition-all duration-300 animate-fade-in
                ${isDesktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}
            `}>
                <div className="max-w-7xl mx-auto p-4 md:p-8">
                    {/* Mobile/Tablet Header Toggle */}
                    <div className="lg:hidden mb-6 flex items-center justify-between">
                        <button
                            onClick={toggleMobileSidebar}
                            className="p-2 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600">
                            {user?.role === 'hod' ? 'PSD HOD' :
                                user?.role === 'faculty' ? 'PSD Faculty' :
                                    user?.role === 'student' ? 'PSD Student' : 'PSD Admin'}
                        </span>
                        <div className="w-10" /> {/* Spacer */}
                    </div>

                    <Outlet />
                </div>
            </main>
        </div >
    );
};

export default Dashboard;
