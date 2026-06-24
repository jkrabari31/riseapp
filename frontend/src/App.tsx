import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import { useSettingsStore } from './store/settingsStore.ts';
import { useEffect, lazy, Suspense } from 'react';

// Lazy-load all pages — each page is loaded on-demand instead of in a single bundle
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const CEODashboard = lazy(() => import('./pages/CEODashboard.tsx'));
const Login = lazy(() => import('./pages/Login.tsx'));
const Students = lazy(() => import('./pages/Students.tsx'));
const AddStudent = lazy(() => import('./pages/AddStudent.tsx'));
const Attendance = lazy(() => import('./pages/Attendance.tsx'));
const Fees = lazy(() => import('./pages/Fees.tsx'));
const Settings = lazy(() => import('./pages/Settings.tsx'));
const TrainerDashboard = lazy(() => import('./pages/TrainerDashboard.tsx'));
const InternDashboard = lazy(() => import('./pages/InternDashboard.tsx'));
const PublicAdmissionForm = lazy(() => import('./pages/PublicAdmissionForm.tsx'));
const PendingAdmissions = lazy(() => import('./pages/PendingAdmissions.tsx'));
const Teachers = lazy(() => import('./pages/Teachers.tsx'));
const MyInterns = lazy(() => import('./pages/MyInterns.tsx'));
const TimetableBuilder = lazy(() => import('./pages/TimetableBuilder.tsx'));
const AssignmentBuilder = lazy(() => import('./pages/AssignmentBuilder.tsx'));
const MyAssignments = lazy(() => import('./pages/MyAssignments.tsx'));
const QuizBuilder = lazy(() => import('./pages/QuizBuilder.tsx'));
const TakeQuiz = lazy(() => import('./pages/TakeQuiz.tsx'));
const InternTimetable = lazy(() => import('./pages/InternTimetable.tsx'));
const AssessmentRecords = lazy(() => import('./pages/AssessmentRecords.tsx'));
const InternProfile = lazy(() => import('./pages/InternProfile.tsx'));
const TrainerProfile = lazy(() => import('./pages/TrainerProfile.tsx'));
const TeacherContribution = lazy(() => import('./pages/TeacherContribution.tsx'));
const SchedulerGrid = lazy(() => import('./pages/SchedulerGrid'));
const ReportingDashboard = lazy(() => import('./pages/ReportingDashboard'));
const ExportReports = lazy(() => import('./pages/ExportReports'));
const ReadingMaterials = lazy(() => import('./pages/ReadingMaterials.tsx'));
const LeadsDashboard = lazy(() => import('./pages/LeadsDashboard'));
const LeadsList = lazy(() => import('./pages/LeadsList'));
const ProgressReports = lazy(() => import('./pages/ProgressReports.tsx'));

// Minimal loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
  </div>
);

function App() {
  const fetchSettings = useSettingsStore(state => state.fetchSettings);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/apply" element={<PublicAdmissionForm />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="ceo-dashboard" element={<CEODashboard />} />
            <Route path="trainer-dashboard" element={<TrainerDashboard />} />
            <Route path="intern-dashboard" element={<InternDashboard />} />
            <Route path="leads/dashboard" element={<LeadsDashboard />} />
            <Route path="leads" element={<LeadsList />} />
            <Route path="admissions" element={<PendingAdmissions />} />
            <Route path="students" element={<Students />} />
            <Route path="student/:id" element={<InternProfile />} />
            <Route path="students/add" element={<AddStudent />} />
            <Route path="my-interns" element={<MyInterns />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="teacher/:id" element={<TrainerProfile />} />
            <Route path="timetables" element={<TimetableBuilder />} />
            <Route path="assignments" element={<AssignmentBuilder />} />
            <Route path="my-assignments" element={<MyAssignments />} />
            <Route path="quiz-builder" element={<QuizBuilder />} />
            <Route path="take-quiz" element={<TakeQuiz />} />
            <Route path="intern-timetable" element={<InternTimetable />} />
            <Route path="assessment-records" element={<AssessmentRecords />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="teacher-contribution" element={<TeacherContribution />} />
             <Route path="fees" element={<Fees />} />
            <Route path="scheduler" element={<SchedulerGrid />} />
            <Route path="reports" element={<ReportingDashboard />} />
            <Route path="export" element={<ExportReports />} />
            <Route path="reading-materials" element={<ReadingMaterials />} />
            <Route path="progress-reports" element={<ProgressReports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
