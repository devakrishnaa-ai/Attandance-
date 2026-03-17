import { useState, useEffect, useContext } from 'react';
import { toast } from 'react-hot-toast';
import { FileText, Send, Clock, CheckCircle, XCircle, AlertCircle, Calendar, UploadCloud, Paperclip } from 'lucide-react';
import AuthContext from '../context/AuthContext';

const FacultyLeaveApplication = () => {
    const { user } = useContext(AuthContext);

    // State
    const [leaveType, setLeaveType] = useState('sick');
    const [leaveDates, setLeaveDates] = useState({ from: '', to: '' });
    const [leaveReason, setLeaveReason] = useState('');
    const [attachment, setAttachment] = useState(null); // New state for file
    const [leaveHistory, setLeaveHistory] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('apply'); // 'apply' or 'history'

    useEffect(() => {
        loadLeaveHistory();
    }, []);

    const loadLeaveHistory = () => {
        // Mock Implementation: Loading from LocalStorage (Simulated Shared DB)
        const storedLeaves = JSON.parse(localStorage.getItem('mock_leave_requests') || '[]');
        // Filter by current user if necessary, for now we assume simple separation
        // In a real app we would use user.id to filter
        const myLeaves = storedLeaves.filter(l => l.faculty_name === (user?.name || "Professor"));
        setLeaveHistory(myLeaves);
    };

    const handleLeaveSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Validation
            if (!leaveDates.from || !leaveDates.to) {
                toast.error("Please select both From and To dates");
                setIsSubmitting(false);
                return;
            }

            // Process Attachment if exists
            let attachmentData = null;
            if (attachment) {
                const reader = new FileReader();
                attachmentData = await new Promise((resolve, reject) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsDataURL(attachment);
                });
            }

            // Create new request object
            const newRequest = {
                id: Date.now(),
                faculty_name: user?.name,
                user_id: user?.id,
                type: leaveType === 'sick' ? 'Sick Leave' : 'Casual Leave',
                from: leaveDates.from,
                to: leaveDates.to,
                status: 'pending',
                reason: leaveReason,
                attachment_name: attachment ? attachment.name : null,
                attachment_data: attachmentData, // Store Base64 data
                created_at: new Date().toISOString()
            };

            // Simulate Network Delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Save to LocalStorage (Shared DB simulation)
            const existingRequests = JSON.parse(localStorage.getItem('mock_leave_requests') || '[]');
            const updatedRequests = [newRequest, ...existingRequests];

            // Handle LocalStorage Quota Exceeded locally
            try {
                localStorage.setItem('mock_leave_requests', JSON.stringify(updatedRequests));
            } catch (e) {
                toast.error("File details too large for local demo storage. Request saved without attachment body.");
                // Fallback: save without big data
                newRequest.attachment_data = null;
                const fallbackRequests = [newRequest, ...existingRequests];
                localStorage.setItem('mock_leave_requests', JSON.stringify(fallbackRequests));
            }

            toast.success("Leave Request Sent Successfully");

            // Reset Form
            setLeaveDates({ from: '', to: '' });
            setLeaveDates({ from: '', to: '' });
            setLeaveReason('');
            setAttachment(null);
            setLeaveType('sick');

            // Refresh History & Switch Tab
            loadLeaveHistory();
            setActiveTab('history');

        } catch (error) {
            console.error(error);
            toast.error("Failed to submit request");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved': return <CheckCircle size={16} />;
            case 'rejected': return <XCircle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                        <FileText className="text-indigo-600" size={32} />
                        Leave Application
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Apply for leave and track your request status.
                    </p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mb-8">
                <button
                    onClick={() => setActiveTab('apply')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2
                    ${activeTab === 'apply'
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                    <Send size={18} /> Apply New
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2
                    ${activeTab === 'history'
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                    <Clock size={18} /> History
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">

                {/* LEFT CONTENT AREA */}
                <div className="lg:col-span-2">
                    {activeTab === 'apply' ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <form onSubmit={handleLeaveSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Leave Type</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['sick', 'casual', 'duty'].map((type) => (
                                            <div
                                                key={type}
                                                onClick={() => setLeaveType(type)}
                                                className={`cursor-pointer border rounded-xl p-4 text-center transition-all
                                                ${leaveType === type
                                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200'
                                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-indigo-300'}`}
                                            >
                                                <div className="capitalize font-bold text-sm">{type} Leave</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">From Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                                            <input
                                                type="date"
                                                className="w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all border-gray-200 dark:border-gray-700"
                                                value={leaveDates.from}
                                                onChange={(e) => setLeaveDates({ ...leaveDates, from: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">To Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                                            <input
                                                type="date"
                                                className="w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all border-gray-200 dark:border-gray-700"
                                                value={leaveDates.to}
                                                onChange={(e) => setLeaveDates({ ...leaveDates, to: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Reason for Leave</label>
                                    <textarea
                                        rows="4"
                                        placeholder="Please provide a valid reason..."
                                        className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all border-gray-200 dark:border-gray-700 resize-none"
                                        value={leaveReason}
                                        onChange={(e) => setLeaveReason(e.target.value)}
                                        required
                                    ></textarea>
                                </div>

                                {/* Attachment Input */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Attachment (Medical Cert / Letter)
                                    </label>
                                    <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 transition-all hover:border-indigo-400 dark:hover:border-indigo-500 bg-gray-50 dark:bg-gray-700/30 text-center cursor-pointer group">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={(e) => setAttachment(e.target.files[0])}
                                        />
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            {attachment ? (
                                                <>
                                                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                                                        <FileText size={24} />
                                                    </div>
                                                    <p className="font-bold text-gray-800 dark:text-white truncate max-w-xs">{attachment.name}</p>
                                                    <p className="text-xs text-green-600 font-bold">File Selected</p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-400 group-hover:text-indigo-500 transition-colors rounded-full">
                                                        <UploadCloud size={24} />
                                                    </div>
                                                    <p className="text-sm text-gray-500 font-medium">Click to upload or drag and drop</p>
                                                    <p className="text-xs text-gray-400">PDF, JPG, PNG (Max 5MB)</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <>Processing...</>
                                        ) : (
                                            <>
                                                <Send size={20} /> Submit Request
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {leaveHistory.length === 0 ? (
                                <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                        <FileText size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No applications yet</h3>
                                    <p className="text-gray-500 mt-1">Your leave requests will appear here.</p>
                                    <button
                                        onClick={() => setActiveTab('apply')}
                                        className="mt-4 text-indigo-600 font-bold hover:underline"
                                    >
                                        Apply for one now
                                    </button>
                                </div>
                            ) : (
                                leaveHistory.map(leave => (
                                    <div key={leave.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{leave.type}</h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <Calendar size={14} />
                                                    <span>{leave.from}</span>
                                                    <span>to</span>
                                                    <span>{leave.to}</span>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 uppercase tracking-wide ${getStatusColor(leave.status)}`}>
                                                {getStatusIcon(leave.status)}
                                                {leave.status}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                            <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{leave.reason}"</p>
                                            {leave.attachment_name && (
                                                <div className="mt-2 flex items-center gap-2 text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg w-fit">
                                                    <Paperclip size={12} />
                                                    {leave.attachment_name}
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 text-right">
                                            <p className="text-xs text-gray-400">Applied on {new Date(leave.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT INFO AREA */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-900/20">
                        <h3 className="font-bold text-xl mb-2">Leave Policy</h3>
                        <ul className="space-y-3 text-indigo-100 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="bg-white/20 p-0.5 rounded-full mt-0.5"><CheckCircle size={10} /></span>
                                <span>Casual leaves must be applied at least 2 days in advance.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-white/20 p-0.5 rounded-full mt-0.5"><CheckCircle size={10} /></span>
                                <span>Sick leaves require a medical certificate if exceeding 2 days.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-white/20 p-0.5 rounded-full mt-0.5"><CheckCircle size={10} /></span>
                                <span>On Duty (OD) requires prior approval from the Principal.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <AlertCircle size={18} className="text-orange-500" /> Stats Overview
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Leaves Taken</span>
                                <span className="font-bold text-gray-900 dark:text-white">{leaveHistory.filter(l => l.status === 'approved').length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending Requests</span>
                                <span className="font-bold text-yellow-600">{leaveHistory.filter(l => l.status === 'pending').length}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div >
        </div >
    );
};

export default FacultyLeaveApplication;
