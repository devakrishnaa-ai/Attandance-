import React, { useState, useEffect } from 'react';
import api from '../api';

const StudentProfile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/student/dashboard/');
            setProfile(response.data);
        } catch (error) {
            console.error("Failed to fetch profile", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center dark:text-gray-300">Loading profile...</div>;
    if (!profile) return <div className="p-8 text-center text-red-500">Failed to load profile.</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
                <div className="md:flex">
                    <div className="md:flex-shrink-0 bg-gray-100 dark:bg-gray-700 md:w-1/3 flex items-center justify-center p-8">
                        {profile.profile_photo ? (
                            <img
                                className="h-48 w-48 rounded-full object-cover border-4 border-indigo-500 shadow-lg"
                                src={profile.profile_photo}
                                alt={profile.name}
                            />
                        ) : (
                            <div className="h-48 w-48 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-500 dark:text-indigo-300 text-5xl font-bold border-4 border-indigo-200 dark:border-indigo-700">
                                {profile.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="p-8 md:w-2/3">
                        <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold mb-1">
                            Student Details
                        </div>
                        <h2 className="block mt-1 text-2xl leading-tight font-bold text-gray-900 dark:text-white">
                            {profile.name}
                        </h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-300">
                            {profile.department?.name} ({profile.department?.code})
                        </p>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Roll Number</h3>
                                <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-200">{profile.roll_number}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Batch</h3>
                                <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-200">{profile.batch}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Attendance</h3>
                                <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                                    {profile.stats?.percentage}%
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Status</h3>
                                <span className="mt-1 px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
