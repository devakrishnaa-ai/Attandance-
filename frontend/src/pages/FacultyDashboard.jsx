import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import {
    Loader2,
    Calendar,
    Clock,
    BookOpen,
    LogOut,
    Lock,
    Unlock,
    CheckCircle,
    FileText,
    Send
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const FacultyDashboard = () => {
    const { logout, user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [selectedDay, setSelectedDay] = useState(new Date().toLocaleDateString("en-US", { weekday: "long" }));
    const [loading, setLoading] = useState(true);

    // Leave Module State - Moved to FacultyLeaveApplication.jsx

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [sessionRes, timeRes] = await Promise.all([
                api.get("attendance/sessions/"),
                api.get("timetable/")
            ]);
            setSessions(sessionRes.data);
            setTimetable(timeRes.data);
        } catch {
            toast.error("Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
            </div>
        );
    }



    // Load modifications
    const modifications = JSON.parse(localStorage.getItem('mock_timetable_modifications') || '[]');

    // 1. Filter standard timetable for today
    let todaysClasses = timetable
        .filter(t => t.day === selectedDay)
        .map(t => ({ ...t, isSubstitution: false })); // Default flag

    // 2. Remove classes where THIS faculty is absent (has a modification marking it vacant/subbed)
    todaysClasses = todaysClasses.filter(t => {
        const myAbsence = modifications.find(m => m.original_slot_id === t.id && m.status !== 'active');
        return !myAbsence;
    });

    // 3. Add classes where THIS faculty is the SUBSTITUTE
    const mySubstitutions = modifications.filter(m =>
        m.day === selectedDay &&
        parseInt(m.new_faculty_id) === user?.id && // Ensure type match
        m.status === 'substituted'
    ).map(m => {
        // We need to reconstruct the "class" object from the original slot details
        // Find the original slot to get Subject/Batch names 
        // (In a real app, the backend would join this data)
        const originalSlot = timetable.find(t => t.id === m.original_slot_id) || {};

        return {
            ...originalSlot, // Inherit subject/batch info
            id: m.original_slot_id, // Keep ID linkage
            period: m.period,
            day: m.day,
            isSubstitution: true, // Flag for UI
            original_faculty: m.original_faculty // Track who we are replacing
        };
    });

    // Merge and Sort
    todaysClasses = [...todaysClasses, ...mySubstitutions].sort((a, b) => a.period - b.period);

    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Helper: Get next class
    // Helper: Get next class
    const currentHour = new Date().getHours();
    const nextClass = todaysClasses.find(c => (9 + c.period) > currentHour);

    // Leave logic moved to FacultyLeaveApplication.jsx

    return (
        <div className="font-sans">

            {/* 1. HERO SECTION */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                        Hello, {user?.name || "Professor"}!
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Here's what's happening today, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Session</div>
                        <div className="font-bold text-gray-900 dark:text-white">2024-2025 Even Sem</div>
                    </div>
                </div>
            </div>

            {/* 2. STATS OVERVIEW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-32 hover:border-blue-100 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Calendar size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md">Today</span>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white">{todaysClasses.length}</div>
                        <div className="text-xs font-semibold text-gray-500 mt-1">Scheduled Classes</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-32 hover:border-purple-100 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <CheckCircle size={20} />
                        </div>
                        <span className="text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md line-clamp-1">Active</span>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white">{sessions.length}</div>
                        <div className="text-xs font-semibold text-gray-500 mt-1">Sessions Conducted</div>
                    </div>
                </div>

                {/* Next Class Teaser */}
                <div className="col-span-2 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-fullblur-3xl -mr-10 -mt-10"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                            <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-sm">Up Next</span>
                            <Clock className="text-white/60" size={20} />
                        </div>
                        <div className="mt-2">
                            {nextClass ? (
                                <>
                                    <h3 className="text-xl font-bold truncate">{nextClass.subject_name}</h3>
                                    <div className="flex items-center gap-3 mt-1 text-blue-100 text-sm font-medium">
                                        <span>Period {nextClass.period}</span>
                                        <span>•</span>
                                        <span>{nextClass.batch_name}</span>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <h3 className="text-xl font-bold text-white/90">All Caught Up!</h3>
                                    <p className="text-blue-100 text-sm mt-1">No more classes scheduled for today.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-start">

                {/* 3. TIMELINE (Left Column - 2/3 width on large) */}
                <div className="lg:col-span-2 space-y-6">



                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="text-gray-400" size={24} /> {selectedDay}'s Schedule
                        </h2>
                        <select
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value)}
                            className="text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-white px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {weekDays.map(day => (
                                <option key={day} value={day}>{day}</option>
                            ))}
                        </select>
                    </div>

                    {todaysClasses.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <Calendar size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Classes on {selectedDay}</h3>
                            <p className="text-gray-500 text-sm mt-1">Enjoy your free time!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {todaysClasses.map((cls, idx) => {
                                const isPast = (9 + cls.period) < currentHour;
                                const isCurrent = (9 + cls.period - 1) <= currentHour && (9 + cls.period) > currentHour;

                                return (
                                    <div key={idx} className={`relative flex items-center p-5 rounded-2xl border transition-all duration-300
                                ${cls.isSubstitution
                                            ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                                            : (isCurrent
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20 scale-[1.02]'
                                                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800')
                                        }
                            `}>
                                        {/* Status Badge for Substitution */}
                                        {cls.isSubstitution && (
                                            <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-bl-xl rounded-tr-xl shadow-sm">
                                                Substitution
                                            </div>
                                        )}
                                        {/* Time Pillar */}
                                        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl mr-5 shrink-0 
                                    ${cls.isSubstitution
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                                : (isCurrent ? 'bg-white/20 text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white')
                                            }
                                `}>
                                            <span className="text-lg font-bold">{9 + cls.period - 1}:00</span>
                                            <span className={`text-[10px] font-bold uppercase ${isCurrent && !cls.isSubstitution ? 'text-blue-100' : 'text-gray-400'}`}>AM</span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md 
                                            ${cls.isSubstitution
                                                        ? 'bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                                        : (isCurrent ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300')
                                                    }
                                        `}>
                                                    Period {cls.period}
                                                </span>
                                                {isPast && <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><CheckCircle size={10} /> Done</span>}
                                                {isCurrent && <span className="text-xs font-bold text-white flex items-center gap-1 animate-pulse">● Live Now</span>}
                                            </div>
                                            <h3 className={`text-lg font-bold truncate ${isCurrent && !cls.isSubstitution ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                                {cls.subject_name}
                                            </h3>
                                            <p className={`text-sm font-medium ${isCurrent && !cls.isSubstitution ? 'text-blue-100' : 'text-gray-500'}`}>
                                                {cls.batch_name}
                                            </p>
                                        </div>

                                        {/* Action */}
                                        <div className="ml-4">
                                            <Link
                                                to={`/attendance/mark?batch=${cls.batch}&subject=${cls.subject}&period=${cls.period}`}
                                                className={`flex items-center justify-center w-12 h-12 rounded-full transition-all
                                            ${isCurrent
                                                        ? 'bg-white text-blue-600 hover:scale-110 shadow-lg'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-blue-600 hover:text-white'
                                                    }
                                        `}
                                                title="Mark Attendance"
                                            >
                                                <CheckCircle size={24} />
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 4. RECENT HISTORY (Right Column) */}
                <div className="space-y-6 sticky top-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="text-gray-400" size={24} /> Recent Activity
                    </h2>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {sessions.slice(0, 5).map(s => (
                                <div key={s.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-10 rounded-full ${s.is_editable ? 'bg-amber-400' : 'bg-green-500'}`}></div>
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{s.subject_name}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <span>{s.date}</span>
                                                <span>•</span>
                                                <span className="bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-[10px]">{s.batch_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {s.is_editable ? (
                                            <Link to={`/attendance/mark?session=${s.id}`} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                                                <Unlock size={14} />
                                            </Link>
                                        ) : (
                                            <div className="p-2 text-gray-300">
                                                <Lock size={14} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {sessions.length === 0 && (
                                <div className="p-8 text-center text-gray-400 text-sm">No recent activity</div>
                            )}
                        </div>
                        {sessions.length > 5 && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-700/30 text-center border-t border-gray-100 dark:border-gray-700">
                                <span className="text-xs font-bold text-blue-600 cursor-pointer hover:underline">View All History</span>
                            </div>
                        )}
                    </div>


                </div>



            </div>


        </div >
    );
};

export default FacultyDashboard;
