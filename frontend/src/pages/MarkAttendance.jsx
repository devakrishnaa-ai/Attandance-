import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { Search, CheckCircle, XCircle, Save, Calendar, Users, Filter, Clock, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';

const MarkAttendance = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Get params from URL
    const paramBatch = searchParams.get('batch');
    const paramSubject = searchParams.get('subject');
    const paramPeriod = searchParams.get('period');

    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(paramBatch || '');
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(paramSubject || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [period, setPeriod] = useState(paramPeriod || 1);

    // ... State ...
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
        // Fetch Metadata
        fetchBatches();
        fetchSubjects();

        // If params provided, trust them and load data
        if (paramBatch) {
            setSelectedBatch(paramBatch);
        }
        if (paramSubject) {
            setSelectedSubject(paramSubject);
        }
        if (paramPeriod) {
            setPeriod(paramPeriod);
        } else {
            // Auto-select current period if not provided
            const hour = new Date().getHours();
            const currentP = hour - 8;
            if (currentP >= 1 && currentP <= 8) {
                setPeriod(currentP);
            }
        }
    }, [paramBatch, paramSubject, paramPeriod]);

    const fetchBatches = async () => {
        try {
            const res = await api.get('batches/');
            setBatches(res.data);
            if (!paramBatch && res.data.length > 0) setSelectedBatch(res.data[0].id);
        } catch (err) { console.error(err); }
    };

    const fetchSubjects = async () => {
        try {
            const res = await api.get('subjects/');
            setSubjects(res.data);
            if (res.data.length > 0 && !selectedSubject && !paramSubject) setSelectedSubject(res.data[0].id);
        } catch (err) { console.error(err); }
    };

    // Load Data when dependencies change
    useEffect(() => {
        if (selectedBatch) {
            fetchStudentsAndAttendance();
        }
    }, [selectedBatch, date, period, selectedSubject]);

    const fetchStudentsAndAttendance = async () => {
        if (!selectedBatch) return;
        setLoading(true);
        setIsLockedOnLoad(false);

        try {
            // 1. Check if Session Exists & Is Locked
            // Ensure we use the selected values
            const sessionRes = await api.get(`attendance/sessions/?batch_id=${selectedBatch}&date=${date}&period=${period}`);
            if (sessionRes.data.length > 0) {
                const session = sessionRes.data[0];
                if (!session.is_editable) {
                    // Lock only if not admin or hod
                    if (user?.role !== 'admin' && user?.role !== 'hod' && !user?.is_superuser) {
                        setIsLockedOnLoad(true);
                        setRequestModal({ isOpen: false, sessionId: session.id });
                    }
                }
            }

            const studentsRes = await api.get('students/');
            const filteredStudents = studentsRes.data.filter(s => s.batch == selectedBatch);
            filteredStudents.sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true }));
            setStudents(filteredStudents);

            // Fetch existing attendance
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
        // If locked, do nothing (should be disabled in UI anyway)
        if (isLockedOnLoad) return;
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const markAllPresent = () => {
        if (isLockedOnLoad) return;
        const newAtt = { ...attendance };
        students.forEach(s => newAtt[s.id] = 'present');
        setAttendance(newAtt);
    };


    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const initiateSubmit = () => {
        if (!selectedSubject) {
            toast.error("Invalid Subject");
            return;
        }
        setShowConfirmModal(true);
    };

    const executeSubmit = async () => {
        setShowConfirmModal(false);
        setSaving(true);
        try {
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

            await api.post('attendance/submit/', payload);
            fetchStudentsAndAttendance();

            // Enhanced Success Alert
            toast.success("Attendance Submitted Successfully!");
        } catch (err) {
            console.error("Attendance Submit Error:", err);
            if (err.response && err.response.status === 403 && err.response.data.is_locked) {
                if (user?.role === 'admin' || user?.is_superuser) {
                    toast.error("System Error: Admin should bypass.");
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
            toast.success("Change Request Sent");
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

    const attendancePercentage = useMemo(() => {
        if (stats.total === 0) return 100;
        return Math.round(((stats.present + stats.od) / stats.total) * 100);
    }, [stats]);

    const filteredList = useMemo(() => {
        return students.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-32">

            {/* Navbar / Header for Standalone Page */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-30 px-4 py-4 md:px-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Mark Attendance</h1>
                        {/* Show Batch Name if available */}
                        {batches.find(b => b.id == selectedBatch) && (
                            <p className="text-sm text-gray-500 font-medium">
                                {batches.find(b => b.id == selectedBatch)?.name}
                                {subjects.find(s => s.id == selectedSubject) && (
                                    <span className="text-indigo-600 dark:text-indigo-400"> • {subjects.find(s => s.id == selectedSubject)?.name}</span>
                                )}
                            </p>
                        )}
                    </div>
                </div>

                {/* Date Picker & Period (simplified) */}
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-500 hidden md:block">
                        {new Date(date).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-bold text-gray-500 block">
                        Period {period}
                    </span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats Card */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden flex items-center justify-between">
                        <div className="relative z-10">
                            <h2 className="text-indigo-100 font-medium text-lg mb-1">Session Overview</h2>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4">
                                <div className="bg-white/20 backdrop-blur-md px-3 sm:px-4 py-2 rounded-xl flex-1 sm:flex-none min-w-[80px]">
                                    <p className="text-xs text-indigo-100 uppercase font-bold">Total</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                                <div className="bg-green-500/20 backdrop-blur-md px-4 py-2 rounded-xl">
                                    <p className="text-xs text-green-100 uppercase font-bold">Present</p>
                                    <p className="text-2xl font-bold text-green-100">{stats.present}</p>
                                </div>
                                <div className="bg-red-500/20 backdrop-blur-md px-4 py-2 rounded-xl">
                                    <p className="text-xs text-red-100 uppercase font-bold">Absent</p>
                                    <p className="text-2xl font-bold text-red-100">{stats.absent}</p>
                                </div>
                            </div>
                        </div>

                        {/* Circle */}
                        <div className="relative w-32 h-32 hidden sm:flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/10" />
                                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white transition-all duration-1000 ease-out"
                                    strokeDasharray={351}
                                    strokeDashoffset={351 - (351 * attendancePercentage) / 100}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-2xl font-bold">{attendancePercentage}%</span>
                        </div>
                    </div>
                </div>

                {/* Filters Row - Only show if not fixed in URL or user wants to change?? 
                    Usually for Faculty Dashboard flow, these are fixed.
                    But allowed to change DATE.
                */}
                {/* Filters Row - Hide if all params are fixed (Faculty Mode) */}
                {(!paramBatch || !paramSubject || !paramPeriod) && (
                    <div className="flex flex-wrap items-center gap-4 mb-8 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        {/* Batch Selector */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Batch</label>
                            <select
                                className={`w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg font-bold ${paramBatch ? 'opacity-50 cursor-not-allowed' : ''}`}
                                value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
                                disabled={!!paramBatch}
                            >
                                <option value="">Select Batch</option>
                                {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Subject Selector */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Subject</label>
                            <select
                                className={`w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg font-bold ${paramSubject ? 'opacity-50 cursor-not-allowed' : ''}`}
                                value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                                disabled={!!paramSubject}
                            >
                                <option value="">Select Subject</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Date</label>
                            <input
                                type="date"
                                max={new Date().toISOString().split('T')[0]}
                                className={`w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg font-bold ${paramBatch ? 'opacity-50 cursor-not-allowed' : ''}`}
                                value={date} onChange={e => setDate(e.target.value)}
                                disabled={!!paramBatch}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Period</label>
                            <select
                                className={`w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg font-bold ${paramPeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                value={period} onChange={e => setPeriod(e.target.value)}
                                disabled={!!paramPeriod}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                                    <option key={p} value={p}>Period {p}</option>
                                ))}
                            </select>
                        </div>
                        {/* Search */}
                        <div className="flex-[2] min-w-[300px]">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Search Student</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Name or Roll Number..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Bar for Fixed Mode (when filters are hidden) */}
                {(paramBatch && paramSubject && paramPeriod) && (
                    <div className="mb-6">
                        <div className="relative w-full md:w-96 md:ml-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search student..."
                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border-transparent focus:border-blue-500 rounded-2xl shadow-sm text-gray-700 dark:text-white outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* Student List */}
                <div className="space-y-3">
                    {filteredList.map(s => {
                        const status = attendance[s.id] || 'present';
                        // ... Same card logic ...
                        let containerClass = "bg-white dark:bg-gray-800 border-l-4 border-transparent";
                        if (status === 'present') containerClass = "bg-white dark:bg-gray-800 border-l-4 border-green-500";
                        if (status === 'absent') containerClass = "bg-red-50/30 dark:bg-red-900/10 border-l-4 border-red-500";
                        if (status === 'OD') containerClass = "bg-yellow-50/30 dark:bg-yellow-900/10 border-l-4 border-yellow-500";

                        return (
                            <div key={s.id} className={`p-4 rounded-xl shadow-sm hover:shadow-md transition-all ${containerClass}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base shrink-0 overflow-hidden border-2 
                                                ${status === 'present' ? 'bg-blue-100 text-blue-600 border-blue-200' : ''}
                                                ${status === 'absent' ? 'bg-red-100 text-red-600 border-red-200' : ''}
                                                ${status === 'OD' ? 'bg-yellow-100 text-yellow-600 border-yellow-200' : ''}
                                             `}>
                                            {s.profile_photo ? (
                                                <img
                                                    src={s.profile_photo}
                                                    alt={s.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                s.name.charAt(0)
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">{s.name}</h3>
                                            <p className="text-xs text-gray-500 font-mono">{s.roll_number}</p>
                                        </div>
                                    </div>

                                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-full sm:w-auto">
                                        {['present', 'absent', 'OD'].map(st => (
                                            <button
                                                key={st}
                                                onClick={() => handleStatusChange(s.id, st)}
                                                disabled={isLockedOnLoad}
                                                className={`
                                                        flex-1 sm:flex-none px-2 sm:px-4 py-2 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold capitalize transition-all
                                                        ${attendance[s.id] === st
                                                        ? st === 'present' ? 'bg-white shadow text-green-600'
                                                            : st === 'absent' ? 'bg-white shadow text-red-600'
                                                                : 'bg-white shadow text-yellow-600'
                                                        : 'text-gray-400 hover:text-gray-600'
                                                    }
                                                        ${isLockedOnLoad ? 'opacity-50 cursor-not-allowed' : ''}
                                                    `}
                                            >
                                                {st}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 inset-x-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-100 dark:border-gray-800 z-40 flex justify-end items-center max-w-full">
                <div className="flex gap-4 w-full sm:w-auto">
                    {isLockedOnLoad ? (
                        <button onClick={() => setRequestModal({ ...requestModal, isOpen: true })} className="flex-1 w-full sm:w-auto px-8 py-3 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20">
                            Request Unlock
                        </button>
                    ) : (
                        <button onClick={initiateSubmit} disabled={saving} className="flex-1 w-full sm:w-auto px-12 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
                            {saving ? "Saving..." : "Save Attendance"}
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
            {/* Confirmation Modal (Banner Style) */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                        {/* Banner Header */}
                        <div className="bg-indigo-600 p-6 text-white text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-white/10 transform -skew-y-6 origin-top-left scale-150"></div>
                            <CheckCircle size={48} className="mx-auto mb-2 relative z-10" />
                            <h2 className="text-2xl font-bold relative z-10">Confirm Submission</h2>
                            <p className="text-indigo-100 relative z-10">Period {period} • {new Date(date).toLocaleDateString()}</p>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                                Please review the attendance summary before locking the session.
                            </p>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl text-center border border-green-100 dark:border-green-800">
                                    <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">Present</p>
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.present}</p>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-center border border-red-100 dark:border-red-800">
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Absent</p>
                                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.absent}</p>
                                </div>
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl text-center border border-yellow-100 dark:border-yellow-800">
                                    <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase">OD</p>
                                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.od}</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeSubmit}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition transform active:scale-95"
                                >
                                    Confirm & Submit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarkAttendance;
