import { Calendar, Clock } from "lucide-react";

const FacultySchedule = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Schedule</h1>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                    <Calendar size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Weekly Timetable</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Your full weekly schedule will be displayed here soon. For now, check the Dashboard for today's classes.
                </p>
            </div>
        </div>
    );
};

export default FacultySchedule;
