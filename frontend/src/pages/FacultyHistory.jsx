import { ClipboardList } from "lucide-react";

const FacultyHistory = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance History</h1>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600 dark:text-purple-400">
                    <ClipboardList size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Past Records</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    View and export past attendance records here. This feature is coming soon!
                </p>
            </div>
        </div>
    );
};

export default FacultyHistory;
