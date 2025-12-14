import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import logo from "@/assets/logo.svg";
import { getCurrentUser, logout } from "@/lib/auth";
import { 
  Briefcase, 
  Building2, 
  ClipboardList, 
  Calendar, 
  LayoutDashboard,
  Shield,
  Users,
  Home,
  FileText,
  LogOut,
  Heart
} from "lucide-react";
import { Button } from "./ui/button";

const Navbar = () => {
  const navigate = useNavigate();
  
  // Use state to force re-render when auth changes
  const [customUser, setCustomUser] = useState(getCurrentUser());
  const isStaffLoggedIn = customUser !== null;
  const isAdmin = customUser?.role === "ADMIN";
  const isRecruiter = customUser?.role === "RECRUITER"; // Only RECRUITER, not ADMIN

  // Listen for auth changes
  useEffect(() => {
    const checkAuth = () => {
      setCustomUser(getCurrentUser());
    };

    // Check auth on mount
    checkAuth();

    // Listen for custom auth change event (same-tab updates)
    window.addEventListener("auth_changed", checkAuth);
    
    // Listen for storage events (cross-tab updates)
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("auth_changed", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  // Handle staff logout
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition">
          <img src={logo} alt="Logo" className="h-8 w-8" />
          <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            DevPrep
          </span>
        </Link>

        {/* Navigation Links - Adaptive based on role */}
        <div className="flex items-center gap-1">
          {/* Public Links (Everyone can see) */}
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              Home
            </Button>
          </Link>

          <Link to="/jobs">
            <Button variant="ghost" size="sm" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs
            </Button>
          </Link>

          <Link to="/companies">
            <Button variant="ghost" size="sm" className="gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </Button>
          </Link>

          {/* Candidate-only Links (Clerk authenticated) */}
          <SignedIn>
            <Link to="/saved-jobs">
              <Button variant="ghost" size="sm" className="gap-2">
                <Heart className="h-4 w-4" />
                Saved
              </Button>
            </Link>

            <Link to="/interview">
              <Button variant="ghost" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                Prep
              </Button>
            </Link>

            <Link to="/applications">
              <Button variant="ghost" size="sm" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Applications
              </Button>
            </Link>

            <Link to="/interviews">
              <Button variant="ghost" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                Interviews
              </Button>
            </Link>

            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </SignedIn>

          {/* Recruiter Links (Custom auth) */}
          {isRecruiter && (
            <Link to="/recruiter">
              <Button variant="ghost" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                Recruiter
              </Button>
            </Link>
          )}

          {/* Admin Links (Custom auth) */}
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-2">
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}
        </div>

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          {/* Clerk User (Candidate) */}
          <SignedIn>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Candidate</span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          {/* Staff User (Admin/Recruiter) */}
          {isStaffLoggedIn && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 bg-primary/5">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium">{customUser.firstName} {customUser.lastName}</span>
                  <span className="text-xs text-muted-foreground">{customUser.role}</span>
                </div>
                {customUser.avatarUrl ? (
                  <img 
                    src={customUser.avatarUrl} 
                    alt="Avatar" 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold">
                      {customUser.firstName?.[0]}{customUser.lastName?.[0]}
                    </span>
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          )}

          {/* Login Button (Guests) */}
          <SignedOut>
            {!isStaffLoggedIn && (
              <Link to="/login">
                <Button size="sm" variant="default">
                  Login
                </Button>
              </Link>
            )}
          </SignedOut>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
