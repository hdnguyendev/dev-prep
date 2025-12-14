import Navbar from "@/components/Navbar";
import { Home, Interview, Jobs, JobDetail, SavedJobs, Dashboard, Companies, CompanyDetail, Applications, Interviews, Admin, AdminDetail, Login, RecruiterDashboard, RecruiterRegister, RecruiterJobs, RecruiterJobApplications } from "@/pages";
import { BrowserRouter, Route, Routes } from "react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

function App() {
	return (
		<BrowserRouter>
			<Navbar />
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/jobs" element={<Jobs />} />
				<Route path="/jobs/:jobId" element={<JobDetail />} />
				<Route path="/saved-jobs" element={<SavedJobs />} />
				<Route path="/companies" element={<Companies />} />
				<Route path="/companies/:slug" element={<CompanyDetail />} />
				<Route path="/applications" element={<Applications />} />
				<Route path="/interview" element={<Interview />} />
				<Route path="/interviews" element={<Interviews />} />
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<RecruiterRegister />} />
				<Route path="/admin" element={<Admin />} />
        <Route path="/admin/:resource/:id" element={<AdminDetail />} />
				<Route path="/recruiter" element={<RecruiterDashboard />} />
				<Route path="/recruiter/jobs" element={<RecruiterJobs />} />
				<Route path="/recruiter/jobs/:jobId/applications" element={<RecruiterJobApplications />} />
				<Route path="/dashboard" element={
					<>
						<SignedIn>
							<Dashboard />
						</SignedIn>
						<SignedOut>
							<RedirectToSignIn />
						</SignedOut>
					</>
				} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
