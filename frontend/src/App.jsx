import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

import StudentList from './pages/StudentList';
import Attendance from './pages/Attendance';


import Overview from './pages/Overview';
import FacultyLayout from './pages/FacultyLayout';
import FacultyClasses from './pages/FacultyClasses';
import FacultySchedule from './pages/FacultySchedule';
import FacultyHistory from './pages/FacultyHistory';

import StudentDashboard from './pages/StudentDashboard';
import StudentLayout from './pages/StudentLayout';
import StudentTimetable from './pages/StudentTimetable';

import FacultyDashboard from './pages/FacultyDashboard';
import MarkAttendance from './pages/MarkAttendance';
import StudentCredentials from './pages/StudentCredentials';
import FacultyManager from './pages/FacultyManager';
import FacultyLeaveApplication from './pages/FacultyLeaveApplication';
import RequestManager from './pages/RequestManager';
import TimetableManager from './pages/TimetableManager';
import SubjectManager from './pages/SubjectManager';
import FacultyCredentials from './pages/FacultyCredentials';

import DepartmentManager from './pages/DepartmentManager';
import ReportAnalysis from './pages/ReportAnalysis';
import StudentProfile from './pages/StudentProfile';
import AdminProfileManager from './pages/AdminProfileManager';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          containerStyle={{ zIndex: 99999 }}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#363636',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              borderRadius: '16px',
              padding: '16px 24px',
              fontSize: '15px',
              fontWeight: '500',
              backdropFilter: 'blur(8px)',
            },
            success: {
              style: {
                background: 'rgba(236, 253, 245, 0.9)', // green-50 with opacity
                color: '#065f46',
                border: '1px solid rgba(167, 243, 208, 0.5)',
              },
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              style: {
                background: 'rgba(254, 242, 242, 0.9)', // red-50 with opacity
                color: '#991b1b',
                border: '1px solid rgba(254, 202, 202, 0.5)',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* STUDENT ROUTES */}
          <Route element={
            <ProtectedRoute>
              <StudentLayout />
            </ProtectedRoute>
          }>
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/student/timetable" element={<StudentTimetable />} />
            <Route path="/student/profile" element={<StudentProfile />} />
          </Route>

          {/* FACULTY ROUTES */}
          <Route element={
            <ProtectedRoute>
              <FacultyLayout />
            </ProtectedRoute>
          }>
            <Route path="/faculty-dashboard" element={<FacultyDashboard />} />
            <Route path="/faculty/classes" element={<FacultyClasses />} />
            <Route path="/faculty/schedule" element={<FacultySchedule />} />
            <Route path="/faculty/classes" element={<FacultyClasses />} />
            <Route path="/faculty/schedule" element={<FacultySchedule />} />
            <Route path="/faculty/history" element={<FacultyHistory />} />
            <Route path="/faculty/leave" element={<FacultyLeaveApplication />} />
          </Route>

          <Route path="/attendance/mark" element={
            <ProtectedRoute>
              <MarkAttendance />
            </ProtectedRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }>
            <Route index element={<Overview />} />
            <Route path="students" element={<StudentList />} />
            <Route path="attendance" element={<MarkAttendance />} />
            <Route path="manage-profiles" element={<AdminProfileManager />} />

            <Route path="credentials" element={<StudentCredentials />} />
            <Route path="faculty" element={<FacultyManager />} />
            <Route path="requests" element={<RequestManager />} />
            <Route path="timetable" element={<TimetableManager />} />
            <Route path="subjects" element={<SubjectManager />} />
            <Route path="departments" element={<DepartmentManager />} />
            <Route path="faculty-credentials" element={<FacultyCredentials />} />
            <Route path="reports" element={<ReportAnalysis />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
