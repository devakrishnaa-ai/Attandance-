import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, Loader2 } from "lucide-react";
import api from "../api";
import { toast } from "react-hot-toast";

const StudentTimetable = () => {
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTimetable();
    }, []);

    const fetchTimetable = async () => {
        try {
            const res = await api.get("timetable/");
            setTimetable(res.data);
        } catch (err) {
            console.error("Failed to fetch timetable", err);
            toast.error("Failed to load timetable");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
    );

    // Group by Day
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const groupedData = days.map(day => ({
        day,
        classes: timetable.filter(t => t.day === day).sort((a, b) => a.period - b.period)
    }));

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Calendar className="text-blue-600" />
                My Weekly Timetable
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {groupedData.map(({ day, classes }) => (
                    <div key={day} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div className={`p-4 font-bold border-b border-gray-100 dark:border-gray-700 flex justify-between items-center
                            ${day === new Date().toLocaleDateString('en-US', { weekday: 'long' })
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}
                        `}>
                            <span>{day}</span>
                            <span className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded-lg shadow-sm">
                                {classes.length} Classes
                            </span>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {classes.length > 0 ? (
                                classes.map((cls, idx) => (
                                    <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-4">
                                        {/* Period Badge */}
                                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                                            <span className="text-xs font-bold uppercase">Per</span>
                                            <span className="text-lg font-bold leading-none">{cls.period}</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 dark:text-white truncate">
                                                {cls.subject_name}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {9 + cls.period - 1}:00 - {9 + cls.period}:00
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={12} />
                                                    {cls.batch_name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    No classes scheduled
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StudentTimetable;
