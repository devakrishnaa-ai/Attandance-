import { useState, useEffect } from 'react';
import api from '../api';
import { Loader2, Key, Search, Copy, Check, AlertTriangle, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

const FacultyCredentials = () => {
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        id: null,
        name: '',
        currentStatus: false
    });

    useEffect(() => {
        fetchFaculty();
    }, []);

    const fetchFaculty = async () => {
        try {
            const res = await api.get('faculty/');
            setFaculty(res.data);
        } catch (err) {
            console.error("Failed to fetch faculty", err);
            toast.error("Failed to load credentials");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Password copied!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const initiateToggle = (fac) => {
        setConfirmModal({
            isOpen: true,
            id: fac.id,
            name: fac.full_name,
            currentStatus: fac.is_active
        });
    };

    const confirmToggle = async () => {
        const { id } = confirmModal;
        try {
            const res = await api.post(`faculty/${id}/toggle_active/`);
            setFaculty(faculty.map(f =>
                f.id === id ? { ...f, is_active: res.data.is_active } : f
            ));
            toast.success(`Faculty ${res.data.status} successfully`);
        } catch (err) {
            console.error("Failed to toggle status", err);
            toast.error("Failed to update status");
        } finally {
            setConfirmModal({ isOpen: false, id: null, name: '', currentStatus: false });
        }
    };

    const filteredFaculty = faculty.filter(f =>
        (f.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.username || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                        Faculty Credentials
                    </h2>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search faculty..."
                        className="w-full pl-9 pr-4 py-2 border dark:border-gray-600 rounded-lg text-sm outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Faculty</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredFaculty.map((fac) => (
                                <tr key={fac.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3">
                                                {fac.full_name?.[0] || 'F'}
                                            </div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {fac.full_name}
                                                {fac.role === 'hod' && (
                                                    <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                                                        HOD
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 font-mono">
                                        {fac.department}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-mono font-bold">
                                        {fac.username}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {fac.plain_password ? (
                                            <div className="flex items-center gap-2 group">
                                                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-red-500 font-bold">
                                                    {fac.plain_password}
                                                </code>
                                                <button
                                                    onClick={() => handleCopy(fac.plain_password, fac.id)}
                                                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                                    title="Copy Password"
                                                >
                                                    {copiedId === fac.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs italic text-gray-400 cursor-help" title="Password was not saved in readable format. Reset password to view.">Not Available</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
                                            <button
                                                onClick={() => !fac.is_active && initiateToggle(fac)}
                                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${fac.is_active
                                                    ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                                    }`}
                                            >
                                                Active
                                            </button>
                                            <button
                                                onClick={() => fac.is_active && initiateToggle(fac)}
                                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${!fac.is_active
                                                    ? 'bg-white dark:bg-gray-600 text-red-600 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                                    }`}
                                            >
                                                Inactive
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden space-y-4">
                {filteredFaculty.map(fac => (
                    <div key={fac.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold">
                                    {fac.full_name?.[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">
                                        {fac.full_name}
                                        {fac.role === 'hod' && (
                                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded border border-purple-200">HOD</span>
                                        )}
                                    </h3>
                                    <p className="text-xs text-gray-500">{fac.department}</p>
                                </div>
                            </div>
                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                <button onClick={() => !fac.is_active && initiateToggle(fac)} className={`px-2 py-0.5 text-[10px] font-bold rounded ${fac.is_active ? 'bg-white text-green-600 shadow' : 'text-gray-500'}`}>ON</button>
                                <button onClick={() => fac.is_active && initiateToggle(fac)} className={`px-2 py-0.5 text-[10px] font-bold rounded ${!fac.is_active ? 'bg-white text-red-600 shadow' : 'text-gray-500'}`}>OFF</button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg mb-2">
                            <span className="text-xs text-gray-500">Username</span>
                            <span className="font-mono font-bold text-blue-600 text-sm">{fac.username}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <span className="text-xs text-gray-500">Password</span>
                            <code className="text-red-500 font-bold text-sm">{fac.plain_password || <span className="text-gray-400 font-normal italic text-xs">Not Available</span>}</code>
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className={`p-3 rounded-full mb-4 ${confirmModal.currentStatus ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{confirmModal.currentStatus ? 'Deactivate Account?' : 'Activate Account?'}</h3>
                            <p className="text-gray-500 mb-6">Are you sure regarding <strong>{confirmModal.name}</strong>?</p>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold">Cancel</button>
                                <button onClick={confirmToggle} className={`flex-1 py-2 text-white rounded-lg font-bold ${confirmModal.currentStatus ? 'bg-red-600' : 'bg-green-600'}`}>Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyCredentials;
