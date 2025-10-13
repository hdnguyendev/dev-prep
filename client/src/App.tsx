import { BrowserRouter, Routes, Route } from "react-router";
import { Home, Applications } from "./pages";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/applications" element={<Applications />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
