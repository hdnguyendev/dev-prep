import Navbar from "@/components/Navbar";
import { Home, Interview, Jobs, Dashboard } from "@/pages";
import { BrowserRouter, Route, Routes } from "react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

function App() {
	return (
		<BrowserRouter>
			<Navbar />
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/jobs" element={<Jobs />} />
				<Route path="/interview" element={<Interview />} />
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
