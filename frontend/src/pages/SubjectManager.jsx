import { useState, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import api from '../api';
import { toast } from 'react-hot-toast';
import { BookOpen, Plus, Trash2, Search, Filter } from 'lucide-react';

const SubjectManager = () => {
    const { user } = useContext(AuthContext);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('');

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newSubject, setNewSubject] = useState({
        name: '',
        code: '',
        department: 'AI',
        semester: 1,
        credits: 3
    });
    const [errors, setErrors] = useState({});

    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        fetchSubjects();
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('departments/');
            setDepartments(res.data);
        } catch {
            console.error("Failed to load departments");
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await api.get('subjects/');
            setSubjects(res.data);
        } catch {
            toast.error("Failed to load subjects");
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!newSubject.name.trim()) newErrors.name = "Subject Name is required";
        if (!newSubject.code.trim()) newErrors.code = "Subject Code is required";
        if (!newSubject.department) newErrors.department = "Department is required";
        if (newSubject.semester < 1 || newSubject.semester > 8) newErrors.semester = "Semester must be 1-8";
        if (newSubject.credits < 1 || newSubject.credits > 5) newErrors.credits = "Credits must be 1-5";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            await api.post('subjects/', newSubject);
            toast.success("Subject Added");
            setIsAddOpen(false);
            setNewSubject({ name: '', code: '', department: 'AI', semester: 1, credits: 3 });
            fetchSubjects();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to add subject");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this subject?")) return;
        try {
            await api.delete(`subjects/${id}/`);
            toast.success("Subject Deleted");
            setSubjects(subjects.filter(s => s.id !== id));
        } catch {
            toast.error("Failed to delete");
        }
    };

    const filteredSubjects = subjects.filter(s =>
        (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterDept ? s.department === filterDept : true)
    );

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subject Management</h1>
                    <p className="text-gray-500">Add and manage curriculum subjects.</p>
                </div>
                {user?.role === 'admin' && (
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition"
                    >
                        <Plus size={18} /> Add Subject
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Search subjects..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative w-40">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        value={filterDept}
                        onChange={e => setFilterDept(e.target.value)}
                    >
                        <option value="">All Depts</option>
                        {departments.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubjects.map(s => (
                    <div key={s.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 group hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                <BookOpen size={20} />
                            </div>
                            {user?.role === 'admin' && (
                                <button onClick={() => handleDelete(s.id)} className="text-gray-300 hover:text-red-500 transition">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-2">{s.name}</h3>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-mono">{s.code}</span>
                            </div>

                            <div className="flex gap-2 text-xs font-medium">
                                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                                    Dept: {s.department}
                                </span>
                                <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-md border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300">
                                    Class: Sem {s.semester} (Year {Math.ceil(s.semester / 2)})
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider border-t border-gray-100 dark:border-gray-700 pt-3">
                            <span>{s.credits} Credits</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ADD COMPONENT OVERLAY */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Add New Subject</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Subject Name</label>
                                <input
                                    className={`input-field w-full ${errors.name ? 'border-red-500' : ''}`}
                                    value={newSubject.name}
                                    onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Subject Code</label>
                                <input
                                    className={`input-field w-full ${errors.code ? 'border-red-500' : ''}`}
                                    value={newSubject.code}
                                    onChange={e => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })}
                                />
                                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Department</label>
                                    <select
                                        className={`input-field w-full ${errors.department ? 'border-red-500' : ''}`}
                                        value={newSubject.department}
                                        onChange={e => setNewSubject({ ...newSubject, department: e.target.value })}
                                    >
                                        <option value="">Select Dept</option>
                                        {departments.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                                    </select>
                                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Semester</label>
                                    <input
                                        type="number" min="1" max="8"
                                        className={`input-field w-full ${errors.semester ? 'border-red-500' : ''}`}
                                        value={newSubject.semester}
                                        onChange={e => setNewSubject({ ...newSubject, semester: e.target.value })}
                                    />
                                    {errors.semester && <p className="text-red-500 text-xs mt-1">{errors.semester}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Credits</label>
                                <input
                                    type="number" min="1" max="5"
                                    className={`input-field w-full ${errors.credits ? 'border-red-500' : ''}`}
                                    value={newSubject.credits}
                                    onChange={e => setNewSubject({ ...newSubject, credits: e.target.value })}
                                />
                                {errors.credits && <p className="text-red-500 text-xs mt-1">{errors.credits}</p>}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
                                <button type="submit" className="flex-1 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700">Add Subject</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style>{`
                .input-field {
                    padding: 0.6rem;
                    border-radius: 0.5rem;
                    border: 1px solid #e5e7eb;
                    outline: none;
                    background: transparent;
                }
                .input-field:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
                }
            `}</style>
        </div>
    );
};

export default SubjectManager;
