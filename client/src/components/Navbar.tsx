import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

const applyThemeClass = (theme: "light" | "dark") => {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

const getInitialTheme = (): "light" | "dark" => {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return "light";
};

const Navbar = () => {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme());
  const { user } = useUser();

  const displayName = user?.fullName || user?.emailAddresses[0]?.emailAddress || 'User';

  useEffect(() => {
    applyThemeClass(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center gap-4 px-4">
        <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="h-6 w-6" />
            <Link to="/" className="text-sm font-semibold tracking-tight">Dev Prep</Link>
        </div>

        <nav className="flex items-center gap-4">
          <Link to="/" className="text-sm hover:underline">Home</Link>
          <Link to="/jobs" className="text-sm hover:underline">Jobs</Link>
          <Link to="/interview" className="text-sm hover:underline">Interview Prep</Link>
          <Link to="/candidates" className="text-sm hover:underline">For Candidates</Link>
          <Link to="/employers" className="text-sm hover:underline">For Employers</Link>
          <Link to="/contact" className="text-sm hover:underline">Contact Us</Link>
        </nav>


        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" className="px-2" aria-label="Toggle theme" onClick={toggleTheme}>
            {theme === "dark" ? (
              // Sun icon
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              // Moon icon
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </Button>
          {
            user ?
              (<>
                <Link to="/dashboard" className="text-sm hover:underline">
                  Dashboard
                </Link>
                <span className="text-sm">Hello, {displayName}!</span>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                      userButtonPopoverCard: "shadow-lg border",
                    }
                  }}
                />
              </>)
            : (<>
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </SignUpButton>
              </>)
          }
        </div>
      </div>
    </header>
  );
};

export default Navbar;
