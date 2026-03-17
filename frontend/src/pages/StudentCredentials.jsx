import { useState, useEffect } from 'react';
import api from '../api';
import { Loader2, Key, Search, Copy, Check, AlertTriangle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StudentCredentials = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        studentId: null,
        studentName: '',
        currentStatus: false
    });

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await api.get('students/');
                setStudents(res.data);
            } catch (err) {
                console.error("Failed to fetch students", err);
                toast.error("Failed to load credentials");
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Password copied!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const initiateToggle = (student) => {
        setConfirmModal({
            isOpen: true,
            studentId: student.id,
            studentName: student.name,
            currentStatus: student.is_active
        });
    };

    const confirmToggle = async () => {
        const { studentId } = confirmModal;
        try {
            const res = await api.post(`students/${studentId}/toggle_active/`);
            setStudents(students.map(s =>
                s.id === studentId ? { ...s, is_active: res.data.is_active } : s
            ));
            toast.success(`Student ${res.data.status} successfully`);
        } catch (err) {
            console.error("Failed to toggle status", err);
            toast.error("Failed to update status");
        } finally {
            setConfirmModal({ isOpen: false, studentId: null, studentName: '', currentStatus: false });
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="text-center md:text-left">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center justify-center md:justify-start gap-2">
                        Student Credentials
                    </h2>
                    
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search student..."
                        className="w-full pl-9 pr-4 py-2 border dark:border-gray-600 rounded-lg text-sm outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Desktop Table View (Large Screens) */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Roll No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold text-xs mr-3">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 font-mono">
                                        {student.roll_number}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-mono font-bold">
                                        {student.username || "N/A"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {student.plain_password ? (
                                            <div className="flex items-center gap-2 group">
                                                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-red-500 font-bold">
                                                    {student.plain_password}
                                                </code>
                                                <button
                                                    onClick={() => handleCopy(student.plain_password, student.id)}
                                                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                                    title="Copy Password"
                                                >
                                                    {copiedId === student.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs italic text-gray-400">Not available (Old Account)</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {student.user ? (
                                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
                                                <button
                                                    onClick={() => !student.is_active && initiateToggle(student)}
                                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${student.is_active
                                                            ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm'
                                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                                        }`}
                                                >
                                                    Active
                                                </button>
                                                <button
                                                    onClick={() => student.is_active && initiateToggle(student)}
                                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${!student.is_active
                                                            ? 'bg-white dark:bg-gray-600 text-red-600 shadow-sm'
                                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                                        }`}
                                                >
                                                    Inactive
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                                                No User
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile/Tablet Card View (< Large Screens) */}
            <div className="lg:hidden flex flex-col gap-4">
                {filteredStudents.map((student) => (
                    <div key={student.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                    {student.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{student.name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{student.roll_number}</p>
                                </div>
                            </div>
                            {student.user ? (
                                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                    <button
                                        onClick={() => !student.is_active && initiateToggle(student)}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${student.is_active
                                                ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                            }`}
                                    >
                                        Active
                                    </button>
                                    <button
                                        onClick={() => student.is_active && initiateToggle(student)}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${!student.is_active
                                                ? 'bg-white dark:bg-gray-600 text-red-600 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                            }`}
                                    >
                                        Inactive
                                    </button>
                                </div>
                            ) : (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                                    No User
                                </span>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Username</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                                    {student.username || "N/A"}
                                </span>
                            </div>

                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Password</span>
                                {student.plain_password ? (
                                    <div className="flex items-center gap-2">
                                        <code className="text-red-500 font-bold text-sm">{student.plain_password}</code>
                                        <button
                                            onClick={() => handleCopy(student.plain_password, student.id)}
                                            className="p-1.5 bg-white dark:bg-gray-600 rounded-md shadow-sm text-gray-400 hover:text-blue-500 transition-colors"
                                        >
                                            {copiedId === student.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-xs italic text-gray-400">Hidden</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {filteredStudents.length === 0 && (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                        No students found.
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 opacity-100">
                        <div className="flex flex-col items-center text-center">
                            <div className={`p-3 rounded-full mb-4 ${confirmModal.currentStatus
                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                }`}>
                                <AlertTriangle size={32} />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {confirmModal.currentStatus ? 'Deactivate Student?' : 'Activate Student?'}
                            </h3>

                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Are you sure you want to <strong>{confirmModal.currentStatus ? 'deactivate' : 'activate'}</strong> <span className="text-gray-900 dark:text-white font-semibold">{confirmModal.studentName}</span>?
                                {confirmModal.currentStatus && (
                                    <span className="block mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                        They will lose access to the portal immediately.
                                    </span>
                                )}
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setConfirmModal({ isOpen: false, studentId: null, studentName: '', currentStatus: false })}
                                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmToggle}
                                    className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${confirmModal.currentStatus
                                        ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                                        : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'
                                        } shadow-lg`}
                                >
                                    {confirmModal.currentStatus ? 'Yes, Deactivate' : 'Yes, Activate'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentCredentials;
