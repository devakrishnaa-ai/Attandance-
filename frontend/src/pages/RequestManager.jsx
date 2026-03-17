import { useState, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import api from '../api';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, FileText, User, Paperclip, Eye, X } from 'lucide-react';

const RequestManager = () => {
    const { user } = useContext(AuthContext);
    const [requests, setRequests] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('attendance');
    const [loading, setLoading] = useState(true);
    const [previewFile, setPreviewFile] = useState(null); // { url, name, type }

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await api.get('change-requests/');
            setRequests(res.data);

            // Mock Fetch Leave Requests
            /*
            const leaveRes = await api.get('leave/requests/'); // Verify endpoint
            setLeaveRequests(leaveRes.data);
            */


            // Fetch Leave Requests from LocalStorage (Shared DB simulation)
            const storedLeaves = JSON.parse(localStorage.getItem('mock_leave_requests') || '[]');
            // Add some dummy if empty for demo
            if (storedLeaves.length === 0) {
                const dummy = [
                    { id: 101, faculty_name: "Dr. Smith", type: "Sick Leave", from: "2024-03-20", to: "2024-03-21", reason: "Viral Fever", status: "pending", created_at: "2024-03-18" },
                    { id: 102, faculty_name: "Prof. Jane", type: "Casual Leave", from: "2024-04-05", to: "2024-04-06", reason: "Personal Work", status: "pending", created_at: "2024-03-19" }
                ];
                localStorage.setItem('mock_leave_requests', JSON.stringify(dummy));
                setLeaveRequests(dummy);
            } else {
                setLeaveRequests(storedLeaves);
            }

        } catch (error) {
            toast.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        try {
            await api.post(`change-requests/${id}/${action}/`);
            toast.success(`Request ${action}ed`);
            fetchRequests();
        } catch (error) {
            toast.error(`Action failed`);
        }
    };



    const processLeaveApproval = async (request) => {
        // This function simulates the backend logic that would run after approval
        // It finds timetable slots for the faculty during the leave period and marks them 'vacant'

        try {
            // 1. Fetch Timetable
            const tRes = await api.get('timetable/');
            const timetable = tRes.data;

            // 2. Determine Days (Robust Logic)
            const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            // Parse YYYY-MM-DD safely without timezone offset issues
            const parseDate = (dateStr) => {
                if (!dateStr) return new Date();
                const parts = dateStr.split('-');
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            };

            const start = parseDate(request.from);
            const end = parseDate(request.to);
            const involvedDays = [];

            // Loop from start to end
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayName = daysMap[d.getDay()];
                if (!involvedDays.includes(dayName)) {
                    involvedDays.push(dayName);
                }
            }

            console.log("Analyzing Leave for:", request.faculty_name, "Days:", involvedDays);

            // 3. Find Affected Slots
            const affectedSlots = timetable.filter(t => {
                // Check if faculty ID matches (loose equality for string vs number)
                // OR if faculty Name matches (fallback)
                const isFacultyMatch = (t.faculty == request.user_id) || (t.faculty_name === request.faculty_name);
                const isDayMatch = involvedDays.includes(t.day);
                return isFacultyMatch && isDayMatch;
            });

            if (affectedSlots.length === 0) {
                console.log("No class slots found for this faculty on the requested days.");
                return;
            }

            // 4. Create Modification Records
            const modifications = affectedSlots.map(slot => ({
                id: Date.now() + Math.random(), // Unique ID
                original_slot_id: slot.id,
                day: slot.day,
                period: slot.period,
                batch: slot.batch,
                original_faculty: slot.faculty,
                status: 'vacant', // Mark as vacant
                date: request.from, // simplified
                leave_id: request.id
            }));

            // 5. Save to LocalStorage (Shared DB simulation)
            const existingMods = JSON.parse(localStorage.getItem('mock_timetable_modifications') || '[]');

            // Cleanup: If we are approving a leave, remove any OLD mods for these same slots to avoid duplicates
            // Or better, just append and let the latest one win if we handled that, but distinct list is cleaner
            const filteredOldMods = existingMods.filter(em => !modifications.some(nm => nm.original_slot_id === em.original_slot_id));
            const newMods = [...modifications, ...filteredOldMods];

            localStorage.setItem('mock_timetable_modifications', JSON.stringify(newMods));

            console.log("Processed Leave Approval: Marked slots vacant", modifications);
            toast.success(`Marked ${modifications.length} class(es) as vacant`);

        } catch (e) {
            console.error("Failed to process leave approval substitution logic", e);
        }
    };

    const handleLeaveAction = async (id, action) => {
        const newStatus = action === 'approve' ? 'Approved' : 'Rejected'; // Capitalized for display

        // Update Local State
        const updatedRequests = leaveRequests.map(req =>
            req.id === id ? { ...req, status: newStatus } : req
        );
        setLeaveRequests(updatedRequests);

        // Update Local Storage
        localStorage.setItem('mock_leave_requests', JSON.stringify(updatedRequests));

        if (newStatus === 'Approved') {
            const request = leaveRequests.find(r => r.id === id);
            if (request) {
                await processLeaveApproval(request);
            }
        }

        toast.success(`Leave Request ${newStatus}`);
    };


    const handleViewAttachment = (req) => {
        if (!req.attachment_data) {
            toast.error("File not available in demo history");
            return;
        }

        // Determine type roughly by data header or extension if name has it
        // For base64 we can check the prefix
        // data:image... or data:application/pdf...

        setPreviewFile({
            url: req.attachment_data,
            name: req.attachment_name
        });
    };

    const closePreview = () => setPreviewFile(null);

    if (loading) return <div className="p-10 text-center">Loading requests...</div>;

    const pendingRequests = requests.filter(r => r.status === 'pending');
    console.log(pendingRequests)
    const pendingLeaveRequests = leaveRequests.filter(r => r.status === 'pending');

    // Combine histories for simplified view or keep separate? Let's show separate for now.
    const pastRequests = requests.filter(r => r.status !== 'pending');
    const pastLeaveRequests = leaveRequests.filter(r => r.status !== 'pending');

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Attendance Change Requests</h1>

            {/* TABS */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-6">
                <button
                    onClick={() => setActiveTab('attendance')}
                    className={`pb-3 px-2 font-bold text-sm transition-all border-b-2 
                    ${activeTab === 'attendance' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Attendance Unlocks ({pendingRequests.length})
                </button>
                <button
                    onClick={() => setActiveTab('leave')}
                    className={`pb-3 px-2 font-bold text-sm transition-all border-b-2 
                    ${activeTab === 'leave' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Leave Requests ({pendingLeaveRequests.length})
                </button>
            </div>

            {/* ATTENDANCE REQUESTS CONTENT */}
            {activeTab === 'attendance' && (
                <>
                    {pendingRequests.length === 0 && (
                        <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-8 flex items-center gap-2">
                            <CheckCircle size={20} />
                            <span className="font-bold">No pending attendance unlock requests!</span>
                        </div>
                    )}

                    <div className="space-y-4 mb-10">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-yellow-400">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg dark:text-white">{req.faculty_name}</h3>
                                            <p className="text-sm text-gray-500">
                                                Requested for: <span className="font-semibold text-gray-700 dark:text-gray-300">
                                                    {req.session_details?.batch_name} - {req.session_details?.subject_name}
                                                </span>
                                            </p>
                                            <p className="text-xs text-gray-400">{req.session_details?.date} (Period {req.session_details?.period})</p>
                                        </div>
                                    </div>
                                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                        Pending
                                    </span>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl mb-4">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                                        <FileText size={12} /> Reason
                                    </h4>
                                    <p className="text-gray-700 dark:text-gray-300 italic">"{req.reason}"</p>
                                </div>

                                {['admin', 'hod'].includes(user?.role) && (
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => handleAction(req.id, 'reject')}
                                            className="px-5 py-2 text-red-600 font-bold hover:bg-red-50 rounded-lg transition"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleAction(req.id, 'approve')}
                                            className="px-5 py-2 bg-green-600 text-white font-bold rounded-lg shadow-lg shadow-green-500/30 hover:bg-green-700 transition"
                                        >
                                            Approve & Unlock
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* LEAVE REQUESTS CONTENT */}
            {activeTab === 'leave' && (
                <>
                    {pendingLeaveRequests.length === 0 && (
                        <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-8 flex items-center gap-2">
                            <CheckCircle size={20} />
                            <span className="font-bold">No pending leave requests!</span>
                        </div>
                    )}

                    <div className="space-y-4 mb-10">
                        {pendingLeaveRequests.map(req => (
                            <div key={req.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-indigo-400">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg dark:text-white">{req.faculty_name}</h3>
                                            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                {req.type}
                                            </p>
                                            <p className="text-xs text-gray-400">{req.from} to {req.to}</p>
                                        </div>
                                    </div>
                                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                        Pending
                                    </span>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl mb-4">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                                        <FileText size={12} /> Reason
                                    </h4>
                                    <p className="text-gray-700 dark:text-gray-300 italic">"{req.reason}"</p>

                                    {req.attachment_name && (
                                        <div
                                            onClick={() => handleViewAttachment(req)}
                                            className="mt-3 flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/30 dark:border-indigo-800 rounded-lg w-fit cursor-pointer hover:bg-indigo-100 transition-colors group"
                                        >
                                            <Paperclip size={16} className="text-indigo-600 dark:text-indigo-400" />
                                            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{req.attachment_name}</span>
                                            <span className="text-xs text-indigo-400 ml-2 flex items-center gap-1 group-hover:text-indigo-600">
                                                <Eye size={12} /> View
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {['admin', 'hod'].includes(user?.role) && (
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => handleLeaveAction(req.id, 'reject')}
                                            className="px-5 py-2 text-red-600 font-bold hover:bg-red-50 rounded-lg transition"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleLeaveAction(req.id, 'approve')}
                                            className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition"
                                        >
                                            Approve Leave
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'attendance' && pastRequests.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-gray-500 mb-4 flex items-center gap-2">
                        <Clock size={18} /> Attendance Request History
                    </h2>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {pastRequests.map((req, i) => (
                            <div key={req.id} className={`p-4 flex items-center justify-between ${i !== pastRequests.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
                                <div>
                                    <p className="font-bold text-sm dark:text-white">
                                        {req.faculty_name}
                                        <span className="text-gray-400 font-normal"> requested for </span>
                                        {req.session_details?.batch_name}
                                    </p>
                                    <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</p>
                                </div>
                                <span className={`
                                    px-3 py-1 rounded-full text-xs font-bold uppercase
                                    ${req.status?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                                `}>
                                    {req.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'leave' && pastLeaveRequests.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-gray-500 mb-4 flex items-center gap-2">
                        <Clock size={18} /> Leave Request History
                    </h2>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {pastLeaveRequests.map((req, i) => (
                            <div key={req.id} className={`p-4 flex items-center justify-between ${i !== pastLeaveRequests.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
                                <div>
                                    <p className="font-bold text-sm dark:text-white">
                                        {req.faculty_name}
                                        <span className="text-gray-400 font-normal"> - </span>
                                        {req.type}
                                    </p>
                                    <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</p>
                                </div>
                                <span className={`
                                    px-3 py-1 rounded-full text-xs font-bold uppercase
                                    ${req.status?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                                `}>
                                    {req.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* PREVIEW MODAL */}
            {previewFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={closePreview}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2 truncate">
                                <Paperclip size={18} /> {previewFile.name}
                            </h3>
                            <button
                                onClick={closePreview}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                            {previewFile.url.startsWith('data:image') ? (
                                <img src={previewFile.url} alt="Preview" className="max-w-full max-h-[70vh] rounded shadow-lg object-contain" />
                            ) : previewFile.url.startsWith('data:application/pdf') ? (
                                <iframe src={previewFile.url} className="w-full h-[70vh] rounded shadow-lg" title="PDF Preview"></iframe>
                            ) : (
                                <div className="text-center p-10">
                                    <div className="mb-4 text-gray-400"><FileText size={48} className="mx-auto" /></div>
                                    <p className="text-gray-500 mb-4">Preview not available for this file type.</p>
                                    <a
                                        href={previewFile.url}
                                        download={previewFile.name}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        Download File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestManager;
