import { useState, useEffect, useContext } from 'react';
import api from '../api';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, Award, Calendar, AlertCircle, CheckCircle, User, Building2, Users } from 'lucide-react';

const StudentDashboard = () => {
    const [data, setData] = useState(null);
    const [timetable, setTimetable] = useState([]); // Added state
    const [loading, setLoading] = useState(true);
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const [res, tRes] = await Promise.all([
                    api.get('student/dashboard/'),
                    api.get('timetable/')
                ]);
                setData(res.data);
                setTimetable(tRes.data);
            } catch (err) {
                console.error("Failed to fetch dashboard", err);
                // If 404/400, maybe they are admin? redirect home
                if (err.response?.status >= 400) {
                    // toast.error("Could not load student profile");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);



    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300">
                <AlertCircle size={48} className="text-red-500" />
                <h2 className="text-xl font-bold">Details Not Found</h2>
                <p>Could not retrieve your student details.</p>
                <button onClick={handleLogout} className="text-blue-500 underline">Logout</button>
            </div>
        );
    }

    const { stats } = data;
    const chartData = [
        { name: 'Present', value: stats.present_days, color: '#22c55e' }, // green-500
        { name: 'Absent', value: stats.absent_days, color: '#ef4444' }, // red-500
        { name: 'OD', value: stats.od_days, color: '#eab308' }, // yellow-500
    ];

    // Remove 0 values for cleaner chart
    const activeChartData = chartData.filter(d => d.value > 0);

    // Remove 0 values for cleaner chart


    return (
        <div className="font-sans space-y-8">
            {/* Profile Header */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{data.name?.split(' ')[0]}</span>! 👋
                    </h1>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                        <span className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-full">
                            <User size={14} className="text-blue-500" />
                            {data.roll_number}
                        </span>
                        <span className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-full">
                            <Building2 size={14} className="text-purple-500" />
                            {data.department?.name}
                        </span>
                        <span className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-full">
                            <Users size={14} className="text-orange-500" />
                            {data.batch}
                        </span>
                    </div>
                </div>
                {/* Decorative background visual */}
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-50/50 to-transparent dark:from-blue-900/10 pointer-events-none" />
            </div>

            {/* Hero Section: Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Circular Progress */}
                <div className="md:col-span-2 relative overflow-hidden bg-white dark:bg-gray-800 rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border border-white/50 dark:border-gray-700">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                        <Award size={200} />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                        {/* Circular Progress */}
                        <div className="relative w-40 h-40 flex-shrink-0">
                            <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl">
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100 dark:text-gray-700" />
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent"
                                    className={`${stats.percentage >= 75 ? 'text-blue-500' : 'text-orange-500'} transition-all duration-1000 ease-out`}
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - (440 * stats.percentage) / 100}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-gray-800 dark:text-white">{stats.percentage}%</span>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overall</span>
                            </div>
                        </div>

                        <div className="text-center sm:text-left">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                                {stats.percentage >= 90 ? "Outstanding Performance! 🌟" :
                                    stats.percentage >= 75 ? "Good Attendance! 👍" :
                                        "Attention Needed ⚠️"}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
                                {stats.percentage >= 75
                                    ? "You are maintaining a great attendance record. Keep updating your skills!"
                                    : "Your attendance is below the recommended 75%. Please try to attend more classes to avoid penalties."}
                            </p>

                            <div className="flex flex-wrap gap-3 mt-6 justify-center sm:justify-start">
                                <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-sm font-bold flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    {stats.present_days} Present
                                </div>
                                <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl text-sm font-bold flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    {stats.absent_days} Absent
                                </div>
                                <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-xl text-sm font-bold flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    {stats.od_days} OD
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-rows-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Classes</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">{stats.total_days}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <Award size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Current Rank</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">Top 10%</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Leaves Left</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">~4 Days</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subject Wise & Timeline Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Subject Wise Stats */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-6 flex items-center gap-2">
                            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                            Subject-wise Performance
                        </h3>

                        <div className="space-y-6">
                            {data.subject_stats && data.subject_stats.map((sub, idx) => (
                                <div key={idx} className="group">
                                    <div className="flex justify-between items-end mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-700 dark:text-gray-200">{sub.subject}</h4>
                                            <p className="text-xs text-gray-400 font-mono">{sub.code}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-lg font-bold ${sub.percentage >= 75 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                                {sub.percentage}%
                                            </span>
                                            <p className="text-xs text-gray-400">{sub.present}/{sub.total} Classes</p>
                                        </div>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out relative ${sub.percentage >= 75 ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-red-400 to-red-600'}`}
                                            style={{ width: `${sub.percentage}%` }}
                                        >
                                            {/* Shine Effect */}
                                            <div className="absolute top-0 left-0 bottom-0 w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Absent Timeline */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-full">
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-6 flex items-center gap-2">
                            <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                            Recent Absences
                        </h3>

                        {data.absent_history && data.absent_history.length > 0 ? (
                            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-700">
                                {data.absent_history.map((record, idx) => (
                                    <div key={idx} className="relative pl-8">
                                        {/* Timeline Dot */}
                                        <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-gray-800 bg-red-500 shadow-md"></div>

                                        <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-800/30">
                                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">{record.date}</p>
                                            <h5 className="font-bold text-gray-800 dark:text-white text-sm">{record.subject}</h5>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs font-medium text-gray-500">Period {record.period}</span>
                                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-[10px] font-bold rounded uppercase">
                                                    {record.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-500 mb-3">
                                    <CheckCircle size={24} />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">No recent absences!</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
};

export default StudentDashboard;
