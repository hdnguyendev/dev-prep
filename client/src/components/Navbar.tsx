import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Home as HomeIcon,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Mic,
  ShieldCheck,
  Sun,
  Moon,
  Sparkles,
  Users,
} from "lucide-react";

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

        <nav className="flex items-center gap-3 text-sm">
          <Link to="/" className="flex items-center gap-1 hover:underline">
            <HomeIcon className="h-4 w-4" /> Home
          </Link>
          <Link to="/jobs" className="flex items-center gap-1 hover:underline">
            <BriefcaseBusiness className="h-4 w-4" /> Jobs
          </Link>
          <Link to="/companies" className="flex items-center gap-1 hover:underline">
            <Building2 className="h-4 w-4" /> Companies
          </Link>
          <Link to="/applications" className="flex items-center gap-1 hover:underline">
            <ClipboardList className="h-4 w-4" /> Applications
          </Link>
          <Link to="/interviews" className="flex items-center gap-1 hover:underline">
            <Mic className="h-4 w-4" /> Interviews
          </Link>
          <Link to="/interview" className="flex items-center gap-1 hover:underline">
            <Sparkles className="h-4 w-4" /> Prep
          </Link>
          {user && (
            <>
              <Link to="/recruiter" className="flex items-center gap-1 hover:underline">
                <Users className="h-4 w-4" /> Recruiter
              </Link>
              <Link to="/admin" className="flex items-center gap-1 hover:underline">
                <ShieldCheck className="h-4 w-4" /> Admin
              </Link>
            </>
          )}
        </nav>


        <div className="ml-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" className="px-2" aria-label="Toggle theme" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {
            user ?
              (<>
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
