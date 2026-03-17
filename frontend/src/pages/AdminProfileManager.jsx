import React, { useState, useEffect } from 'react';
import api from '../api';
import { Search, Upload, User, Save, X, Filter, ChevronRight, ChevronDown } from 'lucide-react';

const AdminProfileManager = () => {
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Filters
    const [batches, setBatches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [groupedBatches, setGroupedBatches] = useState({});

    // Filter State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null); // For hover/expand
    const [activeFilter, setActiveFilter] = useState({ department: null, batch: null });


    // Modal State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterStudents();
    }, [searchQuery, students, activeFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stuRes, batchRes, deptRes] = await Promise.all([
                api.get('/students/'),
                api.get('/batches/'),
                api.get('/departments/')
            ]);

            setStudents(stuRes.data);
            setBatches(batchRes.data);
            setDepartments(deptRes.data);

            // Group Batches by Department
            const groups = {};
            // Initialize with all departments
            deptRes.data.forEach(d => {
                groups[d.code] = [];
            });

            // Fill with batches
            batchRes.data.forEach(b => {
                const deptCode = b.department; // String code
                if (!groups[deptCode]) groups[deptCode] = [];
                groups[deptCode].push(b);
            });
            setGroupedBatches(groups);

            setFilteredStudents(stuRes.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const filterStudents = () => {
        let result = students;

        // 1. Filter by Batch / Department
        if (activeFilter.batch) {
            result = result.filter(s => s.batch === activeFilter.batch.id);
        } else if (activeFilter.department) {
            // If only department selected (e.g. all CSE), we need to check if student's batch belongs to that department
            // But student.batch is just an ID. We need to find the batch obj.
            result = result.filter(s => {
                const batch = batches.find(b => b.id === s.batch);
                return batch && batch.department === activeFilter.department.code;
            });
        }

        // 2. Search
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            result = result.filter(s =>
                s.name.toLowerCase().includes(lower) ||
                s.roll_number.toLowerCase().includes(lower)
            );
        }

        setFilteredStudents(result);
    };

    // Helper to get batch name safely
    const getBatchName = (batchId) => {
        const batch = batches.find(b => b.id === batchId);
        return batch ? `${batch.department} - ${batch.section} (${batch.year})` : batchId;
    };

    const handleOpenModal = (student) => {
        setSelectedStudent(student);
        setPreviewUrl(student.profile_photo);
        setSelectedFile(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedStudent(null);
        setPreviewUrl(null);
        setSelectedFile(null);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSavePhoto = async () => {
        if (!selectedFile || !selectedStudent) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('profile_photo', selectedFile);

        try {
            const response = await api.patch(`/students/${selectedStudent.id}/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Update local state
            const updatedStudent = response.data;
            const updatedList = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
            setStudents(updatedList);
            handleCloseModal();
            // Optional: Show success toast
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload photo");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in text-gray-900 dark:text-gray-100">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                    Student Profile Management
                </h1>
            </div>

            {/* Filters & Search Row */}
            <div className="flex flex-col sm:flex-row gap-4">

                {/* Filter Dropdown */}
                <div className="relative z-20 w-full sm:w-auto">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        onBlur={() => setTimeout(() => setIsFilterOpen(false), 200)}
                        className={`w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-4 py-2 rounded-lg border transition-all
                            ${isFilterOpen || activeFilter.department
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-400 dark:text-indigo-300'
                                : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            <span className="truncate max-w-[200px]">
                                {activeFilter.batch
                                    ? `${activeFilter.batch.department} - ${activeFilter.batch.section}`
                                    : activeFilter.department
                                        ? activeFilter.department.code
                                        : "Filter Class"
                                }
                            </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Filter Menu */}
                    {isFilterOpen && (
                        <div className="absolute top-full left-0 mt-2 w-full sm:w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 animate-fade-in z-50">
                            <div className="flex flex-col max-h-[60vh] overflow-y-auto">
                                <button
                                    className="px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 text-sm border-b border-gray-100 dark:border-gray-700 shrink-0"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setActiveFilter({ department: null, batch: null });
                                        setIsFilterOpen(false);
                                    }}
                                >
                                    Reset Filter
                                </button>

                                {departments.map(dept => (
                                    <div
                                        key={dept.id}
                                        className="group relative"
                                        onMouseEnter={() => setSelectedDepartment(dept)}
                                        onMouseLeave={() => setSelectedDepartment(null)}
                                    >
                                        <div
                                            className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                                                ${activeFilter.department?.id === dept.id ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20' : ''}
                                            `}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setActiveFilter({ department: dept, batch: null });
                                                setIsFilterOpen(false);
                                            }}
                                        >
                                            <span className="font-medium">{dept.name} ({dept.code})</span>
                                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-500" />
                                        </div>

                                        {/* Nested Menu (Sections) - Responsive Logic */}
                                        {/* On mobile, we might want to show this differently, but keeping hover for now as requested previously. 
                                            Mobile hover is tricky, but 'onMouseEnter' works on tap often. 
                                            However, a better mobile UX would be an accordion, but user asked for hover.
                                            I will ensure it doesn't overflow horizontally off-screen on small devices if possible, 
                                            but 'absolute left-full' is inherently bad for mobile. 
                                            
                                            FIX: For mobile (small screens), position it below or accordion style?
                                            Let's use a media query trick: on SM+ use left-full, on mobile use static/block.
                                         */}
                                        <div className={`
                                            sm:absolute sm:left-full sm:top-0 sm:w-48 sm:h-full sm:min-h-[40px]
                                            w-full relative bg-gray-50 dark:bg-gray-900 
                                            sm:bg-white sm:dark:bg-gray-900 sm:rounded-r-xl sm:shadow-xl sm:border sm:border-gray-100 sm:dark:border-gray-700
                                            ${selectedDepartment?.id === dept.id ? 'block' : 'hidden'}
                                        `}>
                                            <div className="py-1">
                                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase sm:block hidden">Sections</div>
                                                {groupedBatches[dept.code]?.length > 0 ? (
                                                    groupedBatches[dept.code].map(batch => (
                                                        <button
                                                            key={batch.id}
                                                            className={`w-full text-left px-8 sm:px-4 py-2 text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 transition-colors
                                                                ${activeFilter.batch?.id === batch.id ? 'bg-indigo-100 text-indigo-600' : ''}
                                                            `}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setActiveFilter({ department: dept, batch: batch });
                                                                setIsFilterOpen(false);
                                                            }}
                                                        >
                                                            Section {batch.section} ({batch.year})
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-2 text-sm text-gray-400 italic">No sections found</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Search by name or roll number..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-center py-10">Loading students...</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredStudents.map(student => (
                        <div key={student.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
                            <div className="p-6 flex flex-col items-center flex-grow">
                                <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 mb-4 border-2 border-indigo-100 dark:border-indigo-900">
                                    {student.profile_photo ? (
                                        <img src={student.profile_photo} alt={student.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                                            <User className="h-10 w-10" />
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg text-center leading-tight mb-1">{student.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{student.roll_number}</p>
                                <span className="inline-block px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-md">
                                    Batch: {getBatchName(student.batch)}
                                </span>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => handleOpenModal(student)}
                                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                                >
                                    <Upload className="h-4 w-4" />
                                    <span>Manage Photo</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up mx-4">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Update Photo</h2>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 flex flex-col items-center space-y-6">
                            <div className="relative">
                                <div className="h-40 w-40 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-4 border-indigo-500 shadow-lg">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                                            <User className="h-16 w-16" />
                                        </div>
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 p-3 bg-indigo-600 rounded-full text-white cursor-pointer hover:bg-indigo-700 shadow-md transition-transform hover:scale-105">
                                    <Upload className="h-5 w-5" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>
                            </div>

                            <div className="text-center">
                                <h3 className="font-bold text-lg">{selectedStudent.name}</h3>
                                <p className="text-sm text-gray-500">{selectedStudent.roll_number}</p>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-gray-750 flex justify-end space-x-3">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePhoto}
                                disabled={!selectedFile || uploading}
                                className={`flex items-center space-x-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all transform active:scale-95 font-medium ${(!selectedFile || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {uploading ? (
                                    <span>Uploading...</span>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        <span>Save Photo</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProfileManager;
