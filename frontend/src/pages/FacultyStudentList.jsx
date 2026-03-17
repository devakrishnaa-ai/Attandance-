import { useState, useEffect } from "react";
import { Search, Filter, Calendar, Users } from "lucide-react";
import api from "../api";
import { toast } from "react-hot-toast";

const FacultyStudentList = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDept, setFilterDept] = useState("All");

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const res = await api.get("students/");
            setStudents(res.data);
        } catch {
            toast.error("Failed to load students");
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.roll_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === "All" || s.class_name.includes(filterDept); // Simple Dept filter based on class name
        return matchesSearch && matchesDept;
    });

    if (loading) return <div className="p-8 text-center text-gray-500">Loading students...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Students</h1>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search students..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map(student => (
                    <div key={student.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                            {student.name[0]}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">{student.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{student.roll_number}</p>
                            <span className="inline-block mt-2 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md">
                                {student.class_name}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FacultyStudentList;
