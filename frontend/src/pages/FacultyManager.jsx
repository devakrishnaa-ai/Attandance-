import { useState, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import api from '../api';
import { toast } from 'react-hot-toast';
import { Users, Plus, BookOpen, Trash2, X, GraduationCap, Edit, MoreVertical } from 'lucide-react';

const FacultyManager = () => {
    const { user } = useContext(AuthContext);
    const [faculty, setFaculty] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [batches, setBatches] = useState([]);
    const [assignments, setAssignments] = useState([]); // All assignments
    const [loading, setLoading] = useState(true);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);

    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [errors, setErrors] = useState({});

    const [newFaculty, setNewFaculty] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        department: '',
        phone_number: '',
        role: 'faculty'
    });

    const [editForm, setEditForm] = useState({
        id: '',
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        department: '',
        phone_number: '',
        role: 'faculty'
    });

    const [newAssignment, setNewAssignment] = useState({
        faculty: '',
        subject: '',
        batch: ''
    });

    const [selectedAssignmentDept, setSelectedAssignmentDept] = useState("AI");
    const [selectedAssignmentSection, setSelectedAssignmentSection] = useState("A");

    // Filter States (Moved up to fix Hook Error)
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");

    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [fRes, sRes, bRes, aRes, dRes] = await Promise.all([
                api.get('faculty/'),
                api.get('subjects/'),
                api.get('batches/'),
                api.get('assignments/'),
                api.get('departments/')
            ]);
            setFaculty(fRes.data);
            setSubjects(sRes.data);
            setBatches(bRes.data);
            setAssignments(aRes.data);
            setDepartments(dRes.data);
        } catch {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const validateNewFaculty = () => {
        const newErrors = {};
        if (!newFaculty.username.trim()) newErrors.username = "Username is required";
        else if (newFaculty.username.length < 3) newErrors.username = "Username must be at least 3 characters";

        if (!newFaculty.email.trim()) newErrors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(newFaculty.email)) newErrors.email = "Invalid email format";

        if (!newFaculty.password) newErrors.password = "Password is required";
        else if (newFaculty.password.length < 6) newErrors.password = "Password must be at least 6 characters";

        if (!newFaculty.department) newErrors.department = "Department is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateEditFaculty = () => {
        const newErrors = {};
        if (!editForm.username.trim()) newErrors.username = "Username is required";
        if (!editForm.email.trim()) newErrors.email = "Email is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreateFaculty = async (e) => {
        e.preventDefault();
        if (!validateNewFaculty()) return;

        try {
            await api.post('faculty/', newFaculty);
            toast.success("Faculty created");
            setIsAddOpen(false);
            toast.success("Faculty created");
            setIsAddOpen(false);
            setNewFaculty({ username: '', email: '', password: '', first_name: '', last_name: '', department: '', phone_number: '', role: 'faculty' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Creation failed");
        }
    };

    const handleUpdateFaculty = async (e) => {
        e.preventDefault();
        if (!validateEditFaculty()) return;

        try {
            await api.put(`faculty/${editForm.id}/`, editForm);
            toast.success("Faculty updated");
            setIsEditOpen(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Update failed");
        }
    };

    const handleDeleteFaculty = async (id, name) => {
        if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
        try {
            await api.delete(`faculty/${id}/`);
            toast.success("Faculty deleted");
            setFaculty(faculty.filter(f => f.id !== id));
        } catch {
            toast.error("Failed to delete faculty");
        }
    };

    const openEditModal = (fac) => {
        setErrors({}); // Clear errors
        // Split full name assumes "First Last" format as fallback
        const nameParts = (fac.full_name || "").split(' ');
        setEditForm({
            id: fac.id,
            username: fac.username,
            email: fac.email,
            first_name: nameParts[0] || "",
            last_name: nameParts.slice(1).join(' ') || "",
            department: fac.department,
            phone_number: fac.phone_number || "",
            role: fac.role || 'faculty'
        });
        setIsEditOpen(true);
    };

    const handleAssign = async (e) => {
        e.preventDefault();

        const targetBatch = batches.find(b => b.department === selectedAssignmentDept && b.section === selectedAssignmentSection);
        if (!targetBatch) {
            toast.error("Selected Batch (Dept+Section) not found!");
            return;
        }

        try {
            await api.post('assignments/', {
                ...newAssignment,
                faculty: selectedFaculty.id,
                batch: targetBatch.id
            });
            toast.success("Subject Assigned");
            setIsAssignOpen(false);
            fetchData();
        } catch {
            toast.error("Assignment failed");
        }
    };

    const handleDeleteAssignment = async (id) => {
        if (!confirm("Remove this assignment?")) return;
        try {
            await api.delete(`assignments/${id}/`);
            toast.success("Assignment removed");
            setAssignments(assignments.filter(a => a.id !== id));
        } catch {
            toast.error("Failed to remove");
        }
    };

    const openAssignModal = (fac) => {
        setSelectedFaculty(fac);
        setNewAssignment({ faculty: fac.id, subject: '', batch: '' });
        setIsAssignOpen(true);
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    // Helper: Filter Logic
    const filteredFaculty = faculty.filter(f => {
        const matchesSearch = (f.full_name || f.username).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = selectedDeptFilter === "All" || f.department === selectedDeptFilter;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Faculty Management</h1>
                    <p className="text-gray-500">Manage faculty accounts and subject assignments.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search faculty..."
                            className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <Users size={16} />
                        </div>
                    </div>

                    {/* Dept Filter */}
                    <select
                        className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        value={selectedDeptFilter}
                        onChange={e => setSelectedDeptFilter(e.target.value)}
                    >
                        <option value="All">All Departments</option>
                        {departments.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                    </select>

                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setIsAddOpen(true)}
                            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                        >
                            <Plus size={18} /> Add
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredFaculty.map(f => (
                    <div key={f.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full hover:shadow-md transition-shadow group/card relative">

                        {/* Edit/Delete Actions */}
                        {user?.role === 'admin' && (
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(f)}
                                    className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                                    title="Edit Faculty"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleDeleteFaculty(f.id, f.full_name)}
                                    className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                    title="Delete Faculty"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-4 pr-16">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg
                                    ${f.department === 'AI' ? 'bg-purple-500' : ''}
                                    ${f.department === 'EEE' ? 'bg-yellow-500' : ''}
                                    ${f.department === 'ECE' ? 'bg-blue-500' : ''}
                                    ${f.department === 'MECH' ? 'bg-red-500' : ''}
                                    ${f.department === 'CIVIL' ? 'bg-green-500' : ''}
                                    ${f.department === 'IOT' ? 'bg-cyan-500' : ''}
                                    ${!['AI', 'EEE', 'ECE', 'MECH', 'CIVIL', 'IOT'].includes(f.department) ? 'bg-gray-500' : ''}
                                `}>
                                    {f.full_name[0] || f.username[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">
                                        {f.full_name || f.username}
                                        {f.role === 'hod' && (
                                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded border border-purple-200">HOD</span>
                                        )}
                                    </h3>
                                    <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-500">{f.department}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 flex-1 flex flex-col min-h-[200px]">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                    <BookOpen size={12} /> Assigned Classes
                                </h4>
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => openAssignModal(f)}
                                        className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold hover:bg-blue-200 transition"
                                    >
                                        + Assign
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2 overflow-y-auto max-h-[180px] pr-2 custom-scrollbar">
                                {assignments.filter(a => a.faculty === f.id).map(a => (
                                    <div key={a.id} className="group flex justify-between items-center bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <div className="text-xs">
                                            <div className="font-bold text-gray-800 dark:text-gray-200 line-clamp-1" title={a.subject_name}>{a.subject_name}</div>
                                            <div className="text-gray-500 mt-0.5 flex items-center gap-1">
                                                <span className="bg-gray-100 px-1.5 rounded text-[10px]">{a.batch_name}</span>
                                            </div>
                                        </div>
                                        {user?.role === 'admin' && (
                                            <button
                                                onClick={() => handleDeleteAssignment(a.id)}
                                                className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remove Assignment"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {assignments.filter(a => a.faculty === f.id).length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 italic text-xs py-8">
                                        <GraduationCap size={24} className="mb-2 opacity-50" />
                                        No classes assigned
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ADD FACULTY MODAL */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">New Faculty</h2>
                            <button onClick={() => setIsAddOpen(false)}><X /></button>
                        </div>
                        <form onSubmit={handleCreateFaculty} className="space-y-4">
                            {/* Role Toggle */}
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/30 p-2 rounded-xl">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="role"
                                        value="faculty"
                                        checked={newFaculty.role === 'faculty'}
                                        onChange={() => setNewFaculty({ ...newFaculty, role: 'faculty' })}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm font-bold">Faculty</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="role"
                                        value="hod"
                                        checked={newFaculty.role === 'hod'}
                                        onChange={() => setNewFaculty({ ...newFaculty, role: 'hod' })}
                                        className="w-4 h-4 text-purple-600"
                                    />
                                    <span className="text-sm font-bold text-purple-600">Head of Dept (HOD)</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="First Name" className="input-field" value={newFaculty.first_name} onChange={e => setNewFaculty({ ...newFaculty, first_name: e.target.value })} />
                                <input placeholder="Last Name" className="input-field" value={newFaculty.last_name} onChange={e => setNewFaculty({ ...newFaculty, last_name: e.target.value })} />
                            </div>

                            <div>
                                <input placeholder="Username *" className={`input-field w-full ${errors.username ? 'border-red-500' : ''}`} value={newFaculty.username} onChange={e => setNewFaculty({ ...newFaculty, username: e.target.value })} />
                                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                            </div>

                            <div>
                                <input type="text" placeholder="Email *" className={`input-field w-full ${errors.email ? 'border-red-500' : ''}`} value={newFaculty.email} onChange={e => setNewFaculty({ ...newFaculty, email: e.target.value })} />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                            </div>

                            <div>
                                <input type="password" placeholder="Password *" className={`input-field w-full ${errors.password ? 'border-red-500' : ''}`} value={newFaculty.password} onChange={e => setNewFaculty({ ...newFaculty, password: e.target.value })} />
                                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <select className={`input-field w-full ${errors.department ? 'border-red-500' : ''}`} value={newFaculty.department} onChange={e => setNewFaculty({ ...newFaculty, department: e.target.value })}>
                                        <option value="">Select Dept</option>
                                        {departments.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                                    </select>
                                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                                </div>
                                <input placeholder="Phone" className="input-field" value={newFaculty.phone_number} onChange={e => setNewFaculty({ ...newFaculty, phone_number: e.target.value })} />
                            </div>
                            <button className="btn-primary w-full">Create Account</button>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT FACULTY MODAL */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Edit Faculty</h2>
                            <button onClick={() => setIsEditOpen(false)}><X /></button>
                        </div>
                        <form onSubmit={handleUpdateFaculty} className="space-y-4">
                            {/* Role Toggle Edit */}
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/30 p-2 rounded-xl">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="role_edit"
                                        value="faculty"
                                        checked={editForm.role === 'faculty'}
                                        onChange={() => setEditForm({ ...editForm, role: 'faculty' })}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm font-bold">Faculty</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="role_edit"
                                        value="hod"
                                        checked={editForm.role === 'hod'}
                                        onChange={() => setEditForm({ ...editForm, role: 'hod' })}
                                        className="w-4 h-4 text-purple-600"
                                    />
                                    <span className="text-sm font-bold text-purple-600">Head of Dept (HOD)</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">First Name</label>
                                    <input className="input-field w-full" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Last Name</label>
                                    <input className="input-field w-full" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Username</label>
                                <input className={`input-field w-full ${errors.username ? 'border-red-500' : ''}`} value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} />
                                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
                                <input type="text" className={`input-field w-full ${errors.email ? 'border-red-500' : ''}`} value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Department</label>
                                    <select className="input-field w-full" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })}>
                                        <option value="">Select Dept</option>
                                        {departments.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Phone</label>
                                    <input className="input-field w-full" value={editForm.phone_number} onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })} />
                                </div>
                            </div>
                            <button className="btn-primary w-full bg-indigo-600 hover:bg-indigo-700">Update Profile</button>
                        </form>
                    </div>
                </div>
            )}

            {/* ASSIGN MODAL */}
            {isAssignOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Assign Class & Subject</h2>
                            <button onClick={() => setIsAssignOpen(false)}><X /></button>
                        </div>
                        <form onSubmit={handleAssign} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Department</label>
                                    <select
                                        className="input-field w-full"
                                        value={selectedAssignmentDept}
                                        onChange={e => setSelectedAssignmentDept(e.target.value)}
                                    >
                                        {departments.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Section</label>
                                    <select
                                        className="input-field w-full"
                                        value={selectedAssignmentSection}
                                        onChange={e => setSelectedAssignmentSection(e.target.value)}
                                    >
                                        {['A', 'B'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                                Target: {selectedAssignmentDept} - {selectedAssignmentSection}
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">Subject</label>
                                <select
                                    className="input-field w-full"
                                    value={newAssignment.subject}
                                    onChange={e => setNewAssignment({ ...newAssignment, subject: e.target.value })}
                                    required
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <button className="btn-primary w-full">Assign</button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .input-field {
                    padding: 0.75rem;
                    border-radius: 0.75rem;
                    border: 1px solid #e5e7eb;
                    outline: none;
                    transition: all 0.2s;
                }
                .input-field:focus {
                    border-color: #4f46e5;
                    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
                }
                .btn-primary {
                    padding: 0.75rem;
                    background-color: #2563eb;
                    color: white;
                    font-weight: bold;
                    border-radius: 0.75rem;
                    transition: background-color 0.2s;
                }
                .btn-primary:hover {
                    background-color: #1d4ed8;
                }
            `}</style>
        </div>
    );
};

export default FacultyManager;
