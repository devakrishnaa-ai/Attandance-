import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { Search, CheckCircle, XCircle, Save, Calendar, Users, Filter, Clock, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Attendance = () => {
    const { user } = useAuth();
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [period, setPeriod] = useState(1);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [attendanceIds, setAttendanceIds] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);

    // Lock States
    const [requestModal, setRequestModal] = useState({ isOpen: false, sessionId: null });
    const [requestReason, setRequestReason] = useState('');
    const [requesting, setRequesting] = useState(false);
    const [isLockedOnLoad, setIsLockedOnLoad] = useState(false);

    useEffect(() => {
        fetchBatches();
        fetchSubjects();

        // Auto-select current period
        const hour = new Date().getHours();
        const currentP = hour - 8;
        if (currentP >= 1 && currentP <= 8) {
            setPeriod(currentP);
        }
    }, []);

    // Auto-Select Subject based on Timetable
    useEffect(() => {
        if (selectedBatch && date && period) {
            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
            // Fetch timetable for this slot
            api.get(`timetable/?batch_id=${selectedBatch}&day=${dayName}&period=${period}`)
                .then(res => {
                    if (res.data.length > 0) {
                        const scheduledSubjectId = res.data[0].subject;
                        setSelectedSubject(scheduledSubjectId);
                        // toast.success(`Auto-selected: ${res.data[0].subject_name}`);
                    }
                })
                .catch(err => console.error("Failed to fetch timetable for auto-select", err));
        }
    }, [selectedBatch, date, period]);

    const fetchBatches = async () => {
        try {
            const res = await api.get('batches/');
            setBatches(res.data);
            if (res.data.length > 0) setSelectedBatch(res.data[0].id);
        } catch (err) { console.error(err); }
    };

    const fetchSubjects = async () => {
        try {
            const res = await api.get('subjects/');
            setSubjects(res.data);
            // Default select handled by Timetable effect now, but keep fallback?
            if (res.data.length > 0 && !selectedSubject) setSelectedSubject(res.data[0].id);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (selectedBatch) {
            fetchStudentsAndAttendance();
        }
    }, [selectedBatch, date, period, selectedSubject]);

    const fetchStudentsAndAttendance = async () => {
        if (!selectedBatch) return;
        setLoading(true);
        setIsLockedOnLoad(false); // Reset lock state

        try {
            // 1. Check if Session Exists & Is Locked
            const sessionRes = await api.get(`attendance/sessions/?batch_id=${selectedBatch}&date=${date}&period=${period}`);
            if (sessionRes.data.length > 0) {
                const session = sessionRes.data[0];
                if (!session.is_editable) {
                    // Only lock for non-admins (Faculty)
                    // Admins bypass lock and can edit/save directly
                    if (user?.role !== 'admin' && !user?.is_superuser) {
                        setIsLockedOnLoad(true);
                        setRequestModal({ isOpen: false, sessionId: session.id });
                    }
                }
            }

            const studentsRes = await api.get('students/');
            const filteredStudents = studentsRes.data.filter(s => s.batch == selectedBatch);
            filteredStudents.sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true }));
            setStudents(filteredStudents);

            // Fetch existing attendance for this Batch+Date+Period
            const attRes = await api.get(`attendance/?date=${date}&period=${period}&batch_id=${selectedBatch}`);
            const attMap = {};
            const idMap = {};

            filteredStudents.forEach(s => {
                const record = attRes.data.find(a => a.student === s.id);
                if (record) {
                    attMap[s.id] = record.status;
                    idMap[s.id] = record.id;
                } else {
                    attMap[s.id] = 'present';
                }
            });
            setAttendance(attMap);
            setAttendanceIds(idMap);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const markAllPresent = () => {
        const newAtt = { ...attendance };
        students.forEach(s => newAtt[s.id] = 'present');
        setAttendance(newAtt);
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            if (!selectedSubject) {
                toast.error("Please select a subject");
                setSaving(false);
                return;
            }

            const payload = {
                batch_id: selectedBatch,
                date: date,
                period: period,
                subject_id: selectedSubject,
                records: students.map(s => ({
                    student_id: s.id,
                    status: attendance[s.id]
                }))
            };

            // Use the BULK SUBMIT endpoint
            await api.post('attendance/submit/', payload);

            fetchStudentsAndAttendance();
            toast.success("Attendance Saved!");
        } catch (err) {
            console.error("Attendance Submit Error:", err);

            // If Admin, this shouldn't happen for Locks anymore (backend fixed). 
            // But if it does (e.g. some other rule), or for Faculty:
            if (err.response && err.response.status === 403 && err.response.data.is_locked) {
                // For Admin, we shouldn't really see this if backend is fixed. 
                // But just in case, or for testing:
                if (user?.role === 'admin' || user?.is_superuser) {
                    toast.error("System Error: Admin should bypass lock.");
                } else {
                    toast.error("Attendance is Locked!");
                    setRequestModal({ isOpen: true, sessionId: err.response.data.session_id });
                }
            } else {
                toast.error(err.response?.data?.error || "Submission Failed");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSendRequest = async () => {
        if (!requestReason.trim()) return toast.error("Please provide a reason");
        setRequesting(true);
        try {
            await api.post('change-requests/', {
                session: requestModal.sessionId,
                reason: requestReason
            });
            toast.success("Change Request Sent to Admin");
            setRequestModal({ isOpen: false, sessionId: null });
            setRequestReason('');
        } catch (err) {
            toast.error("Failed to send request");
        } finally {
            setRequesting(false);
        }
    };

    const stats = useMemo(() => {
        let p = 0, a = 0, od = 0;
        Object.values(attendance).forEach(status => {
            if (status === 'present') p++;
            else if (status === 'absent') a++;
            else if (status === 'OD') od++;
        });
        return { present: p, absent: a, od, total: students.length };
    }, [attendance, students]);

    // Calculate percentage for progress circle
    const attendancePercentage = useMemo(() => {
        if (stats.total === 0) return 100;
        return Math.round(((stats.present + stats.od) / stats.total) * 100);
    }, [stats]);

    // Filter logic was also missing?
    const filteredList = useMemo(() => {
        return students.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    return (
        <div className="pb-32 min-h-screen">
            {/* Morphism Background Blob */}
            <div className="fixed top-20 right-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl -z-10 pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl -z-10 pointer-events-none" />

            {/* Top Stats Section */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Progress Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex items-center justify-between">
                    <div className="relative z-10">
                        <h2 className="text-blue-100 font-medium text-lg mb-1">Attendance Overview</h2>
                        <h1 className="text-4xl font-bold mb-2">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h1>
                        <div className="flex items-center gap-3 text-sm font-medium bg-white/20 backdrop-blur-md px-4 py-2 rounded-full w-fit">
                            <Users size={16} /> <span>{stats.total} Students</span>
                        </div>
                    </div>

                    {/* Progress Circle Visual */}
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-blue-500/30" />
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white transition-all duration-1000 ease-out"
                                strokeDasharray={351}
                                strokeDashoffset={351 - (351 * attendancePercentage) / 100}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-3xl font-bold">{attendancePercentage}%</span>
                            <span className="text-xs text-blue-100 uppercase">Present</span>
                        </div>
                    </div>
                </div>

                {/* Filters & Actions Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Select Batch</label>
                        <div className="relative">
                            <select
                                className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                                value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
                            >
                                {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} ({b.year})</option>
                                ))}
                            </select>
                            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Select Period</label>
                        <div className="relative">
                            <select
                                className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                                value={period} onChange={e => setPeriod(e.target.value)}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(p => {
                                    // Calculate if period is in the future
                                    const now = new Date();
                                    const selectedDate = new Date(date);
                                    const isToday = selectedDate.toDateString() === now.toDateString();

                                    // Assumption: Period 1 starts at 9:00 AM, Period 2 at 10:00 AM, etc.
                                    // Current Hour: 9 -> Period 1 allowed. 
                                    // Current Hour: 8 -> No periods allowed (or maybe P1 if lenient).
                                    // Let's use strict: can't mark P2 (10am) until 10:00am.
                                    // currentHour >= 9 + (p - 1) => Valid
                                    // e.g. For P2 (starts 10am): Need 10 >= 10.
                                    const currentHour = now.getHours();
                                    const isFuture = isToday && (currentHour < 9 + (p - 1));

                                    if (isFuture) return null; // Hide future periods

                                    return <option key={p} value={p}>Period {p}</option>
                                })}
                            </select>
                            <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Select Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                value={date} onChange={e => setDate(e.target.value)}
                            />
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 px-2">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or roll no..."
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl shadow-sm text-gray-700 dark:text-white outline-none transition-all placeholder:text-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden md:flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mr-4">
                        <span className="px-3 py-1 rounded-lg text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20">{stats.present} P</span>
                        <span className="px-3 py-1 rounded-lg text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20">{stats.absent} A</span>
                        <span className="px-3 py-1 rounded-lg text-xs font-bold text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">{stats.od} OD</span>
                    </div>

                    <button
                        onClick={markAllPresent}
                        className="px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Mark All Present
                    </button>
                </div>
            </div>

            {/* Student List View */}
            <div className="space-y-3">
                {filteredList.map(s => {
                    const status = attendance[s.id] || 'present';
                    let containerClass = "bg-white dark:bg-gray-800 border-l-4 border-transparent";
                    if (status === 'present') containerClass = "bg-white dark:bg-gray-800 border-l-4 border-green-500";
                    if (status === 'absent') containerClass = "bg-red-50/30 dark:bg-red-900/10 border-l-4 border-red-500";
                    if (status === 'OD') containerClass = "bg-yellow-50/30 dark:bg-yellow-900/10 border-l-4 border-yellow-500";

                    return (
                        <div key={s.id} className={`group relative p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 ${containerClass}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Student Info */}
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-inner 
                                        ${status === 'present' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                                        ${status === 'absent' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : ''}
                                        ${status === 'OD' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                                    `}>
                                        {s.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-tight">{s.name}</h3>
                                        <p className="text-gray-400 font-mono text-xs mt-0.5 tracking-wide">{s.roll_number}</p>
                                    </div>
                                </div>

                                {/* Status Toggles - Segmented Control */}
                                <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1.5 rounded-xl self-start md:self-center w-full md:w-auto">
                                    <label className={`
                                        flex-1 py-1.5 text-center rounded-lg cursor-pointer transition-all text-xs font-bold flex items-center justify-center gap-1
                                        ${attendance[s.id] === 'present'
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shadow-sm'
                                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
                                        ${isLockedOnLoad ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}>
                                        <input
                                            type="radio"
                                            name={`att-${s.id}`}
                                            value="present"
                                            checked={attendance[s.id] === 'present'}
                                            onChange={() => handleStatusChange(s.id, 'present')}
                                            className="hidden"
                                            disabled={isLockedOnLoad}
                                        />
                                        <CheckCircle size={14} /> P
                                    </label>
                                    <label className={`
                                        flex-1 py-1.5 text-center rounded-lg cursor-pointer transition-all text-xs font-bold flex items-center justify-center gap-1
                                        ${attendance[s.id] === 'absent'
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 shadow-sm'
                                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
                                        ${isLockedOnLoad ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}>
                                        <input
                                            type="radio"
                                            name={`att-${s.id}`}
                                            value="absent"
                                            checked={attendance[s.id] === 'absent'}
                                            onChange={() => handleStatusChange(s.id, 'absent')}
                                            className="hidden"
                                            disabled={isLockedOnLoad}
                                        />
                                        <XCircle size={14} /> A
                                    </label>
                                    <label className={`
                                        flex-1 py-1.5 text-center rounded-lg cursor-pointer transition-all text-xs font-bold flex items-center justify-center gap-1
                                        ${attendance[s.id] === 'OD'
                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shadow-sm'
                                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
                                        ${isLockedOnLoad ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}>
                                        <input
                                            type="radio"
                                            name={`att-${s.id}`}
                                            value="OD"
                                            checked={attendance[s.id] === 'OD'}
                                            onChange={() => handleStatusChange(s.id, 'OD')}
                                            className="hidden"
                                            disabled={isLockedOnLoad}
                                        />
                                        <Clock size={14} /> OD
                                    </label>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredList.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="text-gray-400" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">No students found</h3>
                        <p className="text-gray-400">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="fixed bottom-0 left-0 lg:left-20 right-0 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 flex justify-between items-center z-40 transition-all duration-300">
                <div className="flex gap-4 text-sm font-bold text-gray-500 dark:text-gray-400 hidden sm:flex">
                    <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500" /> Present: {Object.values(attendance).filter(v => v === 'present').length}</span>
                    <span className="flex items-center gap-1"><XCircle size={16} className="text-red-500" /> Absent: {Object.values(attendance).filter(v => v === 'absent').length}</span>
                    <span className="flex items-center gap-1"><Clock size={16} className="text-amber-500" /> OD: {Object.values(attendance).filter(v => v === 'OD').length}</span>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    {isLockedOnLoad ? (
                        <>
                            {/* LOCKED STATE ACTIONS */}
                            <button
                                onClick={() => setRequestModal({ ...requestModal, isOpen: true })}
                                className="flex-1 sm:flex-none px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                <Lock size={18} /> Request Unlock
                            </button>
                            <button
                                disabled
                                className="flex-1 sm:flex-none px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-500 font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Saved (Locked)
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={saving || !selectedSubject}
                            className={`
                                flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2
                                ${saving ? 'opacity-70 cursor-wait' : ''}
                            `}
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} /> Save Attendance
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Change Request Modal */}
            {requestModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full mb-4">
                                <Clock size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2 dark:text-white">Attendance Locked</h3>
                            <p className="text-gray-500 mb-6 text-sm">
                                This session is locked. To make changes, please provide a reason and request an unlock from the admin.
                            </p>

                            <textarea
                                className="w-full p-3 border rounded-lg mb-4 bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none focus:border-blue-500"
                                placeholder="Reason for change (e.g., entered incorrectly)..."
                                value={requestReason}
                                onChange={e => setRequestReason(e.target.value)}
                                rows={3}
                            />

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setRequestModal({ isOpen: false, sessionId: null })}
                                    className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendRequest}
                                    disabled={requesting}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                                >
                                    {requesting ? 'Sending...' : 'Send Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Attendance;
