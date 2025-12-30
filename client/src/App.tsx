import Navbar from "@/components/Navbar";
import {
  Home,
  Interview,
  InterviewFeedback,
  Jobs,
  JobDetail,
  Companies,
  CompanyDetail,
  Interviews,
  Admin,
  AdminDetail,
  Login,
  CandidatesDirectory,
  CandidatePublicProfile,
  Subscription,
  RecruiterRegister,
} from "@/pages";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import CandidateLayout from "@/pages/candidate/CandidateLayout";
import CandidateDashboard from "@/pages/candidate/CandidateDashboard";
import CandidateApplications from "@/pages/candidate/CandidateApplications";
import CandidateInterviews from "@/pages/candidate/CandidateInterviews";
import CandidateQuickAccess from "@/pages/candidate/CandidateQuickAccess";
import CandidateProfile from "@/pages/candidate/CandidateProfile";
import CandidateSavedJobs from "@/pages/candidate/CandidateSavedJobs";
import CandidateFollowedCompanies from "@/pages/candidate/CandidateFollowedCompanies";
import CandidateRecommendedJobs from "@/pages/candidate/CandidateRecommendedJobs";
import CandidateMembership from "@/pages/candidate/CandidateMembership";
import AdminLayout from "@/pages/admin/AdminLayout";
import RecruiterLayout from "@/pages/recruiter/RecruiterLayout";
import RecruiterDashboard from "@/pages/recruiter/RecruiterDashboard";
import RecruiterJobs from "@/pages/recruiter/RecruiterJobs";
import RecruiterApplications from "@/pages/recruiter/RecruiterApplications";
import RecruiterCompany from "@/pages/recruiter/RecruiterCompany";
import RecruiterJobApplications from "@/pages/recruiter/RecruiterJobApplications";
import RecruiterJobForm from "@/pages/recruiter/RecruiterJobForm";
import RecruiterJobDetail from "@/pages/recruiter/RecruiterJobDetail";
import RecruiterMembership from "@/pages/recruiter/RecruiterMembership";
import RecruiterCandidateProfile from "@/pages/recruiter/RecruiterCandidateProfile";
import NotFound from "@/pages/NotFound";

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
          <Route path="recommended-jobs" element={<CandidateRecommendedJobs />} />
          <Route path="applications" element={<CandidateApplications />} />
          <Route path="interviews" element={<CandidateInterviews />} />
          <Route path="profile" element={<CandidateProfile />} />
          <Route path="saved-jobs" element={<CandidateSavedJobs />} />
          <Route path="followed-companies" element={<CandidateFollowedCompanies />} />
          <Route path="membership" element={<CandidateMembership />} />
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
          <Route path="applications" element={<RecruiterApplications />} />
          <Route path="company" element={<RecruiterCompany />} />
          <Route path="membership" element={<RecruiterMembership />} />
          <Route path="jobs/new" element={<RecruiterJobForm />} />
          <Route path="jobs/:jobId" element={<RecruiterJobDetail />} />
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
				<Route path="/interviews" element={<Interviews />} />
        <Route path="/candidates/:candidateProfileId" element={<CandidatePublicProfile />} />

				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<RecruiterRegister />} />
				<Route path="/subscription" element={<Subscription />} />
				<Route path="/pricing" element={<Subscription />} />
        
        {/* 404 - Catch all unmatched routes */}
        <Route path="*" element={<NotFound />} />
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
