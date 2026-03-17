import { useState, useEffect, useContext } from 'react';
import api from '../api';
import AuthContext from '../context/AuthContext';
import { Users, CheckCircle, XCircle, Clock, Calendar, ArrowRight, UserPlus, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Overview = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {

                const res = await api.get('attendance/analysis/');
                setStats(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-gray-500">Loading overview...</div>;

    const { summary, trend, target_date } = stats || { summary: {}, trend: [], target_date: new Date() };
    const dateStr = new Date(target_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });


    const totalForRate = summary.total_marked || summary.total_students;
    const presentPercent = totalForRate > 0
        ? Math.round((summary.present / totalForRate) * 100)
        : 0;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Validated Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Hello, {user?.name || user?.username}!</h2>
                    <h3 className="text-xl text-gray-500 mt-2">Dashboard Overview</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                        <Calendar size={16} /> {dateStr}
                    </p>
                </div>
                <div className="flex gap-3">
                    {user?.role === 'admin' && stats?.pending_requests > 0 && (
                        <Link to="/requests" className="flex items-center gap-2 bg-red-100 text-red-600 px-3 py-2 rounded-lg font-bold animate-pulse hover:bg-red-200 transition-colors">
                            <Clock size={18} />
                            <span>{stats.pending_requests} Attendance Requests</span>
                        </Link>
                    )}
                    <Link to="/attendance" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm flex items-center gap-2">
                        <CheckCircle size={18} /> Mark Attendance
                    </Link>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</p>
                            <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{summary.total_students}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Users size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Present Today</p>
                            <h3 className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{summary.present}</h3>
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full mt-1 inline-block">
                                {presentPercent}% Rate
                            </span>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Absent</p>
                            <h3 className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{summary.absent}</h3>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
                            <XCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">On Duty</p>
                            <h3 className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{summary.od}</h3>
                        </div>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl">
                            <Clock size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts & Actions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg">Weekly Attendance Trend</h3>
                        <Link to="/reports" className="text-sm text-blue-600 hover:underline flex items-center">
                            View Full Report <ArrowRight size={14} className="ml-1" />
                        </Link>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { weekday: 'short' })}
                                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: '#f3f4f6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="present" fill="#3b82f6" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="od" fill="#eab308" stackId="a" maxBarSize={40} />
                                <Bar dataKey="absent" fill="#ef4444" stackId="a" maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">

                    <div className="space-y-4">
                        <Link to="/students" className="block w-full p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                                    <UserPlus size={20} />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-semibold text-gray-800 dark:text-white">Add New Student</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Register new admissions</p>
                                </div>
                            </div>
                        </Link>

                        {user?.role === 'admin' && (
                            <Link to="/reports" className="block w-full p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg group-hover:scale-110 transition-transform">
                                        <FileText size={20} />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-800 dark:text-white">Generate Reports</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Export attendance data</p>
                                    </div>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Overview;
