import Navbar from "@/components/Navbar";
import { Home, Interview, Jobs, Dashboard, Companies, Applications, Interviews, Admin, AdminDetail, RecruiterDashboard } from "@/pages";
import { BrowserRouter, Route, Routes } from "react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

function App() {
	return (
		<BrowserRouter>
			<Navbar />
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/jobs" element={<Jobs />} />
				<Route path="/companies" element={<Companies />} />
				<Route path="/applications" element={<Applications />} />
				<Route path="/interview" element={<Interview />} />
				<Route path="/interviews" element={<Interviews />} />
				<Route path="/admin" element={<Admin />} />
        <Route path="/admin/:resource/:id" element={<AdminDetail />} />
				<Route path="/recruiter" element={<RecruiterDashboard />} />
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
