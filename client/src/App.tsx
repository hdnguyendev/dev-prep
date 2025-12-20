import Navbar from "@/components/Navbar";
import {
  Home,
  Interview,
  InterviewFeedback,
  Jobs,
  JobDetail,
  SavedJobs,
  Companies,
  CompanyDetail,
  Applications,
  Interviews,
  Admin,
  AdminDetail,
  Login,
  Profile,
  CandidatesDirectory,
  CandidatePublicProfile,
  RecruiterCandidateProfile,
  RecruiterDashboard,
  RecruiterRegister,
  RecruiterJobs,
  RecruiterJobApplications,
  RecruiterJobForm,
} from "@/pages";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import CandidateLayout from "@/pages/candidate/CandidateLayout";
import CandidateDashboard from "@/pages/candidate/CandidateDashboard";
import CandidateApplications from "@/pages/candidate/CandidateApplications";
import CandidateInterviews from "@/pages/candidate/CandidateInterviews";
import CandidateQuickAccess from "@/pages/candidate/CandidateQuickAccess";
import CandidateProfile from "@/pages/candidate/CandidateProfile";
import CandidateSavedJobs from "@/pages/candidate/CandidateSavedJobs";
import AdminLayout from "@/pages/admin/AdminLayout";
import RecruiterLayout from "@/pages/recruiter/RecruiterLayout";

function AppRoutes() {
  const location = useLocation();
  const pathname = location.pathname || "/";
  const hideMainNavbar =
    pathname.startsWith("/candidate") || pathname.startsWith("/admin") || pathname.startsWith("/recruiter");

	return (
    <>
      {!hideMainNavbar && <Navbar />}
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/jobs" element={<Jobs />} />
				<Route path="/jobs/:jobId" element={<JobDetail />} />
				<Route path="/companies" element={<Companies />} />
				<Route path="/companies/:slug" element={<CompanyDetail />} />

        <Route path="/candidate" element={<CandidateLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CandidateDashboard />} />
          <Route path="applications" element={<CandidateApplications />} />
          <Route path="interviews" element={<CandidateInterviews />} />
          <Route path="profile" element={<CandidateProfile />} />
          <Route path="saved-jobs" element={<CandidateSavedJobs />} />
          <Route path="quick-access" element={<CandidateQuickAccess />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Admin embedded />} />
          <Route path="manage" element={<Admin embedded />} />
          <Route path="candidates" element={<CandidatesDirectory />} />
          <Route path=":resource/:id" element={<AdminDetail />} />
        </Route>

        <Route path="/recruiter" element={<RecruiterLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<RecruiterDashboard />} />
          <Route path="jobs" element={<RecruiterJobs />} />
          <Route path="jobs/new" element={<RecruiterJobForm />} />
          <Route path="jobs/:jobId/edit" element={<RecruiterJobForm />} />
          <Route path="jobs/:jobId/applications" element={<RecruiterJobApplications />} />
          <Route path="candidates" element={<CandidatesDirectory />} />
          <Route path="candidates/:candidateProfileId" element={<RecruiterCandidateProfile />} />
        </Route>

        {/* Legacy / candidate pages */}
        <Route path="/interview" element={<Interview />} />
        <Route path="/interviews/:id/feedback" element={<InterviewFeedback />} />
        <Route path="/profile" element={<Navigate to="/candidate/profile" replace />} />
        <Route path="/saved-jobs" element={<Navigate to="/candidate/saved-jobs" replace />} />

        {/* Keep these legacy routes for now; not shown in main navbar */}
				<Route path="/applications" element={<Applications />} />
				<Route path="/interviews" element={<Interviews />} />
        <Route path="/candidates/:candidateProfileId" element={<CandidatePublicProfile />} />

				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<RecruiterRegister />} />
      </Routes>
    </>
  );
}

function App() {
	return (
		<BrowserRouter>
      <AppRoutes />
		</BrowserRouter>
	);
}

export default App;
