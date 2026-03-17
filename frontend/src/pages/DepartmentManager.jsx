import { useState, useEffect } from 'react';
import api from '../api';
import { toast } from 'react-hot-toast';
import { Building2, Plus, Trash2, Search, User, Pencil, Layers } from 'lucide-react';

const DepartmentManager = () => {
    const [departments, setDepartments] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // Section Management State
    const [isSectionOpen, setIsSectionOpen] = useState(false);
    const [selectedDept, setSelectedDept] = useState(null);
    const [sections, setSections] = useState([]);
    const [newSection, setNewSection] = useState({ year: new Date().getFullYear(), section: 'A' });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
    const [errors, setErrors] = useState({});
    const [sectionErrors, setSectionErrors] = useState({});

    const [newDepartment, setNewDepartment] = useState({
        name: '',
        code: '',
        description: '',
        head_of_department: ''
    });

    useEffect(() => {
        fetchDepartments();
        fetchFaculties();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('departments/');
            setDepartments(res.data);
        } catch {
            toast.error("Failed to load departments");
        } finally {
            setLoading(false);
        }
    };

    const fetchFaculties = async () => {
        try {
            const res = await api.get('faculty/');
            setFaculties(res.data);
        } catch {
            // Silently fail or log, as it's just for HOD selection
            console.error("Failed to load faculties");
        }
    };

    const handleOpenAdd = () => {
        setNewDepartment({ name: '', code: '', description: '', head_of_department: '' });
        setIsEditMode(false);
        setCurrentId(null);
        setIsAddOpen(true);
    };

    const handleOpenEdit = (dept) => {
        setNewDepartment({
            name: dept.name,
            code: dept.code,
            description: dept.description || '',
            head_of_department: dept.head_of_department || ''
        });
        setIsEditMode(true);
        setCurrentId(dept.id);
        setIsAddOpen(true);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!newDepartment.name.trim()) newErrors.name = "Department Name is required";
        if (!newDepartment.code.trim()) newErrors.code = "Department Code is required";
        else if (/\s/.test(newDepartment.code)) newErrors.code = "Code must be a single word (no spaces)";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateSection = () => {
        const newErrors = {};
        if (!newSection.year) newErrors.year = "Year is required";
        else if (newSection.year < 2000 || newSection.year > 2100) newErrors.year = "Enter a valid year";

        setSectionErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const payload = { ...newDepartment };
            if (!payload.head_of_department) payload.head_of_department = null;

            if (isEditMode) {
                await api.put(`departments/${currentId}/`, payload);
                toast.success("Department Updated");
            } else {
                await api.post('departments/', payload);
                toast.success("Department Added");
            }

            setIsAddOpen(false);
            setNewDepartment({ name: '', code: '', description: '', head_of_department: '' });
            fetchDepartments();
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'add'} department`);
        }
    };

    const handleDeleteClick = (dept) => {
        setDeleteModal({ isOpen: true, id: dept.id, name: dept.name });
    };

    const confirmDelete = async () => {
        if (!deleteModal.id) return;
        try {
            await api.delete(`departments/${deleteModal.id}/`);
            toast.success("Department Deleted");
            setDepartments(departments.filter(d => d.id !== deleteModal.id));
        } catch (error) {
            console.error("Delete failed:", error);
            const msg = error.response?.data?.error || error.response?.data?.detail || "Failed to delete department";
            toast.error(msg);
        } finally {
            setDeleteModal({ isOpen: false, id: null, name: '' });
        }
    };

    const handleOpenSections = async (dept) => {
        setSelectedDept(dept);
        setIsSectionOpen(true);
        // Fetch sections (Batches) for this department
        try {
            const res = await api.get(`batches/?department=${dept.code}`);
            setSections(res.data);
        } catch {
            toast.error("Failed to load sections");
        }
    };

    const handleAddSection = async (e) => {
        e.preventDefault();
        if (!selectedDept) return;
        if (!validateSection()) return;

        try {
            const payload = {
                ...newSection,
                department: selectedDept.code, // Matching the CharField choice
                name: `${selectedDept.code} - ${newSection.section} (${newSection.year})` // Optional Display Name
            };

            await api.post('batches/', payload);
            toast.success("Section Added");

            // Refresh sections
            const res = await api.get(`batches/?department=${selectedDept.code}`);
            setSections(res.data);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add section");
        }
    };

    const handleDeleteSection = async (id) => {
        if (!confirm("Delete this section/batch?")) return;
        try {
            await api.delete(`batches/${id}/`);
            setSections(sections.filter(s => s.id !== id));
            toast.success("Section Deleted");
        } catch {
            toast.error("Failed to delete section");
        }
    };

    const filteredDepartments = departments.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Department Management</h1>
                    <p className="text-gray-500">Manage academic departments and their heads.</p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition"
                >
                    <Plus size={18} /> Add Department
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    className="w-full md:w-96 pl-10 pr-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search departments..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDepartments.map(d => (
                    <div key={d.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 group hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                <Building2 size={24} />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleOpenSections(d)} title="Manage Sections" className="text-gray-300 hover:text-green-500 transition">
                                    <Layers size={18} />
                                </button>
                                <button onClick={() => handleOpenEdit(d)} className="text-gray-300 hover:text-blue-500 transition">
                                    <Pencil size={18} />
                                </button>
                                <button onClick={() => handleDeleteClick(d)} className="text-gray-300 hover:text-red-500 transition">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="mb-2">
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono font-bold text-gray-600 dark:text-gray-300">
                                {d.code}
                            </span>
                        </div>

                        <h3 className="font-bold text-xl text-gray-900 dark:text-white leading-tight mb-2">{d.name}</h3>

                        {d.description && (
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{d.description}</p>
                        )}

                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3 mt-auto">
                            <User size={16} />
                            <span className="font-medium">HOD:</span>
                            <span>{d.head_of_department_name || "Not Assigned"}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 dark:text-white">Delete Department?</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Are you sure you want to delete <strong>{deleteModal.name}</strong>? This action cannot be undone and may affect associated data.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD COMPONENT OVERLAY */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">{isEditMode ? 'Edit Department' : 'Add New Department'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Department Name</label>
                                <input
                                    className={`input-field w-full ${errors.name ? 'border-red-500' : ''}`}
                                    value={newDepartment.name}
                                    onChange={e => setNewDepartment({ ...newDepartment, name: e.target.value })}
                                    placeholder="e.g. Computer Science"
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Department Code</label>
                                <input
                                    className={`input-field w-full ${errors.code ? 'border-red-500' : ''}`}
                                    value={newDepartment.code}
                                    onChange={e => setNewDepartment({ ...newDepartment, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. CS"
                                />
                                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Description</label>
                                <textarea className="input-field w-full h-24 resize-none" value={newDepartment.description} onChange={e => setNewDepartment({ ...newDepartment, description: e.target.value })} placeholder="Optional description..." />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Head of Department</label>
                                <select className="input-field w-full" value={newDepartment.head_of_department} onChange={e => setNewDepartment({ ...newDepartment, head_of_department: e.target.value })}>
                                    <option value="">-- Select Faculty --</option>
                                    {faculties.map(f => (
                                        <option key={f.id} value={f.id}>{f.full_name} ({f.username})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200">Cancel</button>
                                <button type="submit" className="flex-1 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700">
                                    {isEditMode ? 'Update' : 'Add'} Department
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SECTION MANAGEMENT MODAL */}
            {isSectionOpen && selectedDept && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl h-[600px] flex flex-col">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                            <div>
                                <h2 className="text-xl font-bold dark:text-white">Manage Sections</h2>
                                <p className="text-gray-500 text-sm">for {selectedDept.name} ({selectedDept.code})</p>
                            </div>
                            <button onClick={() => setIsSectionOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">Close</button>
                        </div>

                        {/* Sections List */}
                        <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                            {sections.length === 0 ? (
                                <p className="text-center text-gray-400 py-10">No sections found for this department.</p>
                            ) : (
                                sections.map(s => (
                                    <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center font-bold text-gray-700 dark:text-gray-300 shadow-sm">
                                                {s.section}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-white">Year {s.year}</h4>
                                                <p className="text-xs text-gray-500">{s.name}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSection(s.id)}
                                            className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Section Form */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-sm mb-3">Add New Section</h3>
                            <form onSubmit={handleAddSection} className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold mb-1 ml-1 text-gray-500">Year</label>
                                    <input
                                        type="number"
                                        required
                                        className={`input-field w-full bg-white dark:bg-gray-800 ${sectionErrors.year ? 'border-red-500' : ''}`}
                                        value={newSection.year}
                                        onChange={e => setNewSection({ ...newSection, year: e.target.value })}
                                    />
                                    {sectionErrors.year && <p className="absolute text-red-500 text-[10px] whitespace-nowrap">{sectionErrors.year}</p>}
                                </div>
                                <div className="w-32">
                                    <label className="block text-xs font-bold mb-1 ml-1 text-gray-500">Section</label>
                                    <select
                                        className="input-field w-full bg-white dark:bg-gray-800"
                                        value={newSection.section}
                                        onChange={e => setNewSection({ ...newSection, section: e.target.value })}
                                    >
                                        {['A', 'B', 'C', 'D', 'E'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button type="submit" className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-green-700 transition flex items-center gap-2">
                                        <Plus size={18} /> Add
                                    </button>
                                </div>
                            </form>
                        </div>
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
                .dark .input-field {
                   border-color: #374151;
                   color: white;
                }
            `}</style>
        </div>
    );
};

export default DepartmentManager;
