import { useState, useEffect, useContext } from "react";
import AuthContext from '../context/AuthContext';
import { Plus, Pencil, Trash2, X, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter } from "lucide-react";
import api from "../api";
import { toast } from "react-hot-toast";

// Removed DEPARTMENTS constant
const SECTIONS = ['A', 'B'];

const StudentList = () => {
    const { user } = useContext(AuthContext);
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterYear, setFilterYear] = useState("");

    const [filterBatch, setFilterBatch] = useState("");
    const [filterDept, setFilterDept] = useState("All");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const [studentForm, setStudentForm] = useState({
        name: "",
        roll_number: "",
        email: "",
        batch: "",
    });

    const [selectedDept, setSelectedDept] = useState("");
    const [selectedSection, setSelectedSection] = useState("");
    const [selectedYear, setSelectedYear] = useState("");

    const [deleteId, setDeleteId] = useState(null);
    const [batchToDelete, setBatchToDelete] = useState(null);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [newBatch, setNewBatch] = useState({ name: "", year: new Date().getFullYear(), department: "", section: "A" });

    // Validation States
    const [errors, setErrors] = useState({});
    const [batchErrors, setBatchErrors] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [sRes, bRes, dRes] = await Promise.all([
                api.get("students/"),
                api.get("batches/"),
                api.get("departments/")
            ]);
            setStudents(sRes.data);
            setBatches(bRes.data);
            setDepartments(dRes.data);
        } catch {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const validateStudent = () => {
        const newErrors = {};
        const nameRegex = /^[A-Za-z\s]+$/;
        const rollRegex = /^[0-9]+$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!studentForm.name.trim()) {
            newErrors.name = "Name is required";
        } else if (!nameRegex.test(studentForm.name)) {
            newErrors.name = "Name must contain only alphabets";
        }

        if (!studentForm.roll_number.trim()) {
            newErrors.roll_number = "Roll Number is required";
        } else if (!rollRegex.test(studentForm.roll_number)) {
            newErrors.roll_number = "Roll Number must be numeric";
        }

        if (!studentForm.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!emailRegex.test(studentForm.email)) {
            newErrors.email = "Invalid email format";
        } else if (!studentForm.email.endsWith('@gmail.com')) {
            newErrors.email = "Only @gmail.com addresses are allowed";
        }

        // Find Batch from Dept + Section + Year
        const targetBatch = batches.find(b =>
            b.department === selectedDept &&
            b.section === selectedSection &&
            String(b.year) === String(selectedYear)
        );

        if (!targetBatch) {
            newErrors.batch = `No batch found for ${selectedDept} - ${selectedSection} (${selectedYear})`;
        } else {
            studentForm.batch = targetBatch.id;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateBatch = () => {
        const newErrors = {};
        const yearRegex = /^\d{4}$/;

        if (!newBatch.name.trim()) newErrors.name = "Batch Name is required";
        if (!newBatch.department) newErrors.department = "Department is required";
        if (!newBatch.section) newErrors.section = "Section is required";

        if (!String(newBatch.year).trim()) {
            newErrors.year = "Year is required";
        } else if (!yearRegex.test(newBatch.year)) {
            newErrors.year = "Year must be a 4-digit number";
        }

        setBatchErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // History Modal State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchHistory = async (student) => {
        setSelectedStudent(student);
        setIsHistoryOpen(true);
        setHistoryLoading(true);
        try {
            const res = await api.get(`attendance/?student_id=${student.id}`);
            // Sort by date descending
            const sorted = res.data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setAttendanceHistory(sorted);
        } catch {
            toast.error("Failed to load attendance history");
        } finally {
            setHistoryLoading(false);
        }
    };

    // Derived Lists for Dropdowns
    const uniqueYears = [...new Set(batches.map(b => b.year))].sort((a, b) => b - a);

    const getYearLabel = (batchYear) => {
        const currentYear = new Date().getFullYear();
        const diff = currentYear - batchYear + 1;
        if (diff === 1) return "1st Yr";
        if (diff === 2) return "2nd Yr";
        if (diff === 3) return "3rd Yr";
        if (diff === 4) return "4th Yr";
        return batchYear; // Fallback for alumni or future
    };

    const filteredStudents = students.filter((s) => {
        // 1. Search (Name or Roll No)
        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.roll_number.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchSearch) return false;

        // 2. Department Filter
        if (filterDept !== "All") {
            const b = batches.find(b => b.id === s.batch);
            if (!b || b.department !== filterDept) return false;
        }

        // 3. Year Filter
        if (filterYear) {
            const b = batches.find(b => b.id === s.batch);
            if (!b || String(b.year) !== filterYear) return false;
        }

        // 4. Specific Batch Filter (Optional, strict)
        if (filterBatch) {
            if (String(s.batch) !== filterBatch) return false;
        }

        return true;
    });

    const openAdd = () => {
        setIsEditing(false);
        setErrors({});
        setStudentForm({
            name: "",
            roll_number: "",
            email: "",
            batch: "",
        });
        setSelectedDept("");
        setSelectedSection("A");
        setSelectedYear(uniqueYears[0] || "");
        setIsFormOpen(true);
    };

    const openEdit = (s) => {
        setIsEditing(true);
        setEditId(s.id);
        setErrors({}); // Clear errors
        setStudentForm(s);
        // Attempt to pre-fill dept/section from existing batch
        const b = batches.find(b => b.id === s.batch);
        if (b) {
            setSelectedDept(b.department);
            setSelectedSection(b.section);
            setSelectedYear(b.year);
        }
        setIsFormOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStudent()) return;

        try {
            if (isEditing) {
                await api.put(`students/${editId}/`, studentForm);
                toast.success("Student updated");
            } else {
                await api.post("students/", studentForm);
                toast.success("Student added");
            }
            setIsFormOpen(false);
            fetchData();
        } catch (error) {
            console.error("Submission failed", error);
            if (error.response && error.response.data) {
                setErrors(error.response.data);
                const firstError = Object.values(error.response.data)[0];
                if (Array.isArray(firstError)) {
                    toast.error(firstError[0]);
                } else if (typeof firstError === 'string') {
                    toast.error(firstError);
                } else {
                    toast.error("Operation failed. Please check your inputs.");
                }
            } else {
                toast.error("Operation failed");
            }
        }
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`students/${deleteId}/`);
            toast.success("Student deleted");
            setDeleteId(null);
            fetchData();
        } catch {
            toast.error("Delete failed");
        }
    };

    const confirmDeleteBatch = async () => {
        if (!batchToDelete) return;
        try {
            await api.delete(`batches/${batchToDelete.id}/`);
            toast.success("Batch deleted");
            setBatchToDelete(null);
            if (filterBatch == batchToDelete.id) setFilterBatch("");
            fetchData();
        } catch {
            toast.error("Failed to delete batch");
        }
    };

    const handleAddBatch = async (e) => {
        e.preventDefault();
        if (!validateBatch()) return;

        try {
            const res = await api.post("batches/", newBatch);
            setBatches([...batches, res.data]);
            setNewBatch({ name: "", year: new Date().getFullYear(), department: "", section: "A" });
            setIsBatchModalOpen(false);
            toast.success("Batch/Year created");

            // If opened from Student Form, select the new year
            if (isFormOpen && selectedDept === res.data.department && selectedSection === res.data.section) {
                setSelectedYear(res.data.year);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to create batch");
        }
    };

    const handleYearChange = (e) => {
        if (e.target.value === 'ADD_NEW') {
            setIsBatchModalOpen(true);
            // Pre-fill batch modal with current selection
            setNewBatch(prev => ({
                ...prev,
                department: selectedDept || "",
                section: selectedSection || "A",
                year: new Date().getFullYear() // Default
            }));
        } else {
            setSelectedYear(e.target.value);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-3 sm:px-6 pb-28 transition-colors duration-300">

            {/* HEADER & CONTROLS */}
            <div className="max-w-7xl mx-auto pt-6 sm:pt-10 mb-8 space-y-6">

                {/* Title & Action */}
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Student Management
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Total Students: <span className="font-bold text-indigo-600 dark:text-indigo-400">{students.length}</span>
                        </p>
                    </div>

                    {user?.role === 'admin' && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsBatchModalOpen(true)}
                                className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-5 py-3 rounded-xl font-bold transition-all shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95"
                            >
                                <Plus size={18} /> Add Class/Year
                            </button>
                            <button
                                onClick={openAdd}
                                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
                            >
                                <Plus size={18} /> Add Student
                            </button>
                        </div>
                    )}
                </div>

                {/* SEARCH & FILTER BAR */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">

                    {/* Search Input (Larger space) */}
                    <div className="md:col-span-5 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or roll number..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filters */}
                    <div className="md:col-span-7 flex flex-wrap gap-3">
                        {/* Department */}
                        <div className="relative flex-1 min-w-[140px]">
                            <select
                                className="w-full pl-3 pr-8 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 border-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                                value={filterDept}
                                onChange={(e) => setFilterDept(e.target.value)}
                            >
                                <option value="All">All Depts</option>
                                {departments.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>

                        {/* Year */}
                        <div className="relative flex-1 min-w-[120px]">
                            <select
                                className="w-full pl-3 pr-8 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 border-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                            >
                                <option value="">All Years</option>
                                {uniqueYears.map(y => <option key={y} value={y}>{getYearLabel(y)} ({y})</option>)}
                            </select>
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>

                        {/* Batch (Dynamic) */}
                        <div className="relative flex-1 min-w-[160px]">
                            <select
                                className="w-full pl-3 pr-8 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 border-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                                value={filterBatch}
                                onChange={(e) => setFilterBatch(e.target.value)}
                            >
                                <option value="">All Batches</option>
                                {batches
                                    .filter(b => (filterDept === "All" || b.department === filterDept) && (!filterYear || String(b.year) === filterYear))
                                    .map(b => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.year})</option>
                                    ))}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>

                        {(searchTerm || filterDept !== "All" || filterYear || filterBatch) && (
                            <button
                                onClick={() => { setSearchTerm(""); setFilterDept("All"); setFilterYear(""); setFilterBatch(""); }}
                                className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                title="Clear Filters"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* STUDENT CARDS */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((s) => (
                    <div
                        key={s.id}
                        onClick={() => fetchHistory(s)}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{s.name}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">Roll: {s.roll_number}</p>
                                    {batches.find(b => b.id === s.batch) && (
                                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md font-bold">
                                            {getYearLabel(batches.find(b => b.id === s.batch).year)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800">
                                {s.class_name}
                            </span>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-gray-300 break-all mb-3">
                            {s.email}
                        </p>

                        <div className="flex justify-between items-center">
                            <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-100 dark:border-purple-800">
                                {batches.find((b) => b.id === s.batch)?.name}
                            </span>

                            {user?.role === 'admin' && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                                        className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
                                        className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ATTENDANCE HISTORY MODAL */}
            {isHistoryOpen && selectedStudent && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[85vh] flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="font-bold text-xl text-gray-900 dark:text-white">
                                    Attendance History
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {selectedStudent.name} ({selectedStudent.roll_number})
                                </p>
                            </div>
                            <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* SUMMARY STATS */}
                        {!historyLoading && attendanceHistory.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl text-center border border-indigo-100 dark:border-indigo-800">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-300 font-bold uppercase">Total</p>
                                    <p className="text-xl font-bold text-indigo-700 dark:text-indigo-200">{attendanceHistory.length}</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl text-center border border-green-100 dark:border-green-800">
                                    <p className="text-xs text-green-600 dark:text-green-300 font-bold uppercase">Present</p>
                                    <p className="text-xl font-bold text-green-700 dark:text-green-200">
                                        {attendanceHistory.filter(r => r.status === 'present').length}
                                    </p>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-center border border-red-100 dark:border-red-800">
                                    <p className="text-xs text-red-600 dark:text-red-300 font-bold uppercase">Absent</p>
                                    <p className="text-xl font-bold text-red-700 dark:text-red-200">
                                        {attendanceHistory.filter(r => r.status === 'absent').length}
                                    </p>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl text-center border border-amber-100 dark:border-amber-800">
                                    <p className="text-xs text-amber-600 dark:text-amber-300 font-bold uppercase">OD</p>
                                    <p className="text-xl font-bold text-amber-700 dark:text-amber-200">
                                        {attendanceHistory.filter(r => r.status === 'OD').length}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto pr-2">
                            {historyLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                                    Loading history...
                                </div>
                            ) : attendanceHistory.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    No attendance records found.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {attendanceHistory.map((record) => (
                                        <div key={record.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-gray-500 dark:text-gray-400 shadow-sm">
                                                    <Calendar size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                        {record.date}
                                                    </p>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                        <Clock size={12} />
                                                        <span>Period {record.period}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`
                                                px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5
                                                ${record.status === 'present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    record.status === 'absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}
                                            `}>
                                                {record.status === 'present' && <CheckCircle size={12} />}
                                                {record.status === 'absent' && <XCircle size={12} />}
                                                {record.status === 'OD' && <AlertCircle size={12} />}
                                                {record.status.toUpperCase()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL (Add/Edit Student) */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="font-bold text-xl text-gray-900 dark:text-white">
                                {isEditing ? "Edit Student" : "Add Student"}
                            </h2>
                            <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Name</label>
                                <input
                                    className={`w-full px-4 py-2 border rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                                    placeholder="e.g. John Doe"
                                    value={studentForm.name}
                                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Department</label>
                                    <select
                                        className="w-full px-4 py-2 border rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={selectedDept}
                                        onChange={(e) => setSelectedDept(e.target.value)}
                                    >
                                        <option value="">Select Dept</option>
                                        {departments.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Section</label>
                                    <select
                                        className="w-full px-4 py-2 border rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={selectedSection}
                                        onChange={(e) => setSelectedSection(e.target.value)}
                                    >
                                        {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Year</label>
                                    <select
                                        className="w-full px-4 py-2 border rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={selectedYear}
                                        onChange={handleYearChange}
                                    >
                                        <option value="">Select Year</option>
                                        {uniqueYears.map(y => <option key={y} value={y}>{getYearLabel(y)} ({y})</option>)}
                                        <option value="ADD_NEW" className="font-bold text-indigo-600">+ Add New Year</option>
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <div className="w-full text-xs text-center p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-lg">
                                        Batch: {selectedDept} {selectedSection} {selectedYear}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Email</label>
                                <input
                                    className={`w-full px-4 py-2 border rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                                    placeholder="john@example.com"
                                    value={studentForm.email}
                                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                                />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                            </div>

                            {errors.batch && <p className="text-red-500 text-xs mt-1 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{errors.batch}</p>}
                            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-center">
                                <span className="text-xs text-gray-500 uppercase font-bold">Selected Class:</span>
                                <p className="font-bold text-indigo-600 dark:text-indigo-400">
                                    {selectedDept} - {selectedSection} (2024)
                                </p>
                            </div>

                            <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all mt-2">
                                {isEditing ? 'Save Changes' : 'Create Student'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* BATCH CREATE MODAL */}
            {isBatchModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">New Batch</h3>
                            <button onClick={() => setIsBatchModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddBatch} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Batch Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Class 10 A"
                                    className={`w-full px-4 py-2 border rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${batchErrors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                                    value={newBatch.name}
                                    onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                                />
                                {batchErrors.name && <p className="text-red-500 text-xs mt-1">{batchErrors.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Department</label>
                                    <select
                                        className="w-full px-4 py-2 border rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={newBatch.department}
                                        onChange={(e) => setNewBatch({ ...newBatch, department: e.target.value })}
                                    >
                                        <option value="">Select Dept</option>
                                        {departments.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                                    </select>
                                    {batchErrors.department && <p className="text-red-500 text-xs mt-1">{batchErrors.department}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Section</label>
                                    <select
                                        className="w-full px-4 py-2 border rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={newBatch.section}
                                        onChange={(e) => setNewBatch({ ...newBatch, section: e.target.value })}
                                    >
                                        {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    {batchErrors.section && <p className="text-red-500 text-xs mt-1">{batchErrors.section}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Year</label>
                                <input
                                    type="number"
                                    className={`w-full px-4 py-2 border rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${batchErrors.year ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                                    value={newBatch.year}
                                    onChange={(e) => setNewBatch({ ...newBatch, year: e.target.value })}
                                />
                                {batchErrors.year && <p className="text-red-500 text-xs mt-1">{batchErrors.year}</p>}
                            </div>

                            <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all">
                                Create Batch
                            </button>
                        </form>
                    </div>
                </div >
            )}

            {/* BATCH DELETE MODAL */}
            {
                batchToDelete && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 text-center">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Delete Batch?</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                                Deleting <b className="text-gray-800 dark:text-gray-200">{batchToDelete.name}</b> will also remove all associated data. Are you sure?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setBatchToDelete(null)}
                                    className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteBatch}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* STUDENT DELETE MODAL */}
            {
                deleteId && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 text-center">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                                <Trash2 size={24} />
                            </div>
                            <p className="font-bold text-lg text-gray-900 dark:text-white mb-6">Delete this student?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default StudentList;
