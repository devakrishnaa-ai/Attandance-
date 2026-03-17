import { useState, useEffect } from "react";
import { Search, Info, Calendar, Users, Briefcase } from "lucide-react";
import api from "../api";
import { toast } from "react-hot-toast";

const FacultyClasses = () => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            // Fetch assignments for the logged-in faculty
            // Assuming the faculty/assignments/ endpoint exists or we filter from a general list
            // Based on previous work, we might need to filter manually or use a specific endpoint.
            // Let's try to get assignments from the faculty profile or a dedicated endpoint.
            // If direct endpoint doesn't exist, we can use the 'assignments' property from the user profile if expanded,
            // or fetch all assignments and filter.
            // Given the previous sync_assignments script, we know FacultyAssignments exist.

            // Let's try a dedicated endpoint approach first, or fall back to filtering.
            // Checking FacultyManager, it fetches 'faculty/' which lists faculty. 
            // We need 'my' assignments. 
            // Let's assume there is a way to get 'my' profile or just use the filtered list approach if needed.
            // Actually, we can fetch /faculty/me/ or similar if it exists, but for now let's try a safe approach:
            // Fetching all assignments might be restricted.
            // Let's try fetching the dashboard data again which might have it, OR just assume we can add an endpoint.
            // Wait, FacultyDashboard loads 'timetable'. 
            // Let's create a simple view to list unique classes from the timetable or assignments.

            // Re-using the logic from FacultyDashboard might be best: get existing sessions or timetable.
            // But "My Classes" usually implies the static list of assigned subjects/batches.
            // Let's try: api.get('faculty/assignments/') if we made it. If not, we might need to rely on the backend.
            // Let's check api.js or backend views if unsure. 
            // For now, I'll mock it with what I know works or fetch timetable and extract unique classes.

            // BETTER APPROACH: Fetch timetable and extract unique Subject+Batch combinations.
            const res = await api.get("timetable/");
            // Extract unique classes
            const uniqueClasses = [];
            const seen = new Set();

            res.data.forEach(t => {
                const key = `${t.subject_name}-${t.batch_name}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueClasses.push({
                        id: t.id, // Timetable ID, slightly hacky but works for key
                        subject: t.subject_name,
                        batch: t.batch_name,
                        department: t.batch_name.split(' ')[0], // Approx dept from batch name
                        // We can add more info if available
                    });
                }
            });

            setAssignments(uniqueClasses);
        } catch {
            toast.error("Failed to load classes");
        } finally {
            setLoading(false);
        }
    };

    const filteredClasses = assignments.filter(c =>
        c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.batch.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Classes</h1>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search subjects or batches..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClasses.length > 0 ? (
                    filteredClasses.map((cls, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                    <Briefcase size={24} />
                                </div>
                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg text-xs font-bold uppercase">
                                    {cls.department || 'Class'}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {cls.subject}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-4">
                                {cls.batch}
                            </p>

                            <div className="flex items-center gap-4 text-sm text-gray-400 border-t border-gray-50 dark:border-gray-700/50 pt-4">
                                <div className="flex items-center gap-1">
                                    <Users size={16} />
                                    <span>Students</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar size={16} />
                                    <span>Schedule</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 text-gray-400">
                        No classes found.
                    </div>
                )}
            </div>

            <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 flex gap-4 items-start">
                <Info className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
                <div>
                    <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">About My Classes</h4>
                    <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                        These are the subjects and batches assigned to you based on the timetable. If you see any discrepancies, please contact the administrator.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FacultyClasses;
