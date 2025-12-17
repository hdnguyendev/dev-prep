import { SignedIn, SignedOut, UserButton, useAuth } from "@clerk/clerk-react";
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
  Heart,
  Menu,
  X
} from "lucide-react";
import { Button } from "./ui/button";

const Navbar = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { getToken, isSignedIn } = useAuth();
  
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

  // Sync candidate profile when Clerk user signs in (run once per sessionStorage flag)
  useEffect(() => {
    const syncClerkCandidate = async () => {
      if (!isSignedIn) return;
      const syncedKey = "clerk_candidate_synced";
      if (sessionStorage.getItem(syncedKey)) return;
      try {
        const token = await getToken();
        if (!token) return;
        await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:9999"}/auth/sync-candidate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        sessionStorage.setItem(syncedKey, "1");
      } catch (err) {
        console.error("Failed to sync candidate", err);
      }
    };
    syncClerkCandidate();
  }, [getToken, isSignedIn]);

  // Handle staff logout
  const handleLogout = () => {
    logout();
    navigate("/login");
    setMobileMenuOpen(false);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [navigate]);

  // Navigation links component (reusable)
  const NavLinks = ({ mobile = false, onLinkClick }: { mobile?: boolean; onLinkClick?: () => void }) => (
    <>
      {/* Public Links (Everyone can see) */}
      <Link to="/" onClick={onLinkClick}>
        <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
          <Home className="h-4 w-4" />
          <span className={mobile ? "" : "hidden md:inline"}>Home</span>
        </Button>
      </Link>

      <Link to="/jobs" onClick={onLinkClick}>
        <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
          <Briefcase className="h-4 w-4" />
          <span className={mobile ? "" : "hidden md:inline"}>Jobs</span>
        </Button>
      </Link>

      <Link to="/companies" onClick={onLinkClick}>
        <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
          <Building2 className="h-4 w-4" />
          <span className={mobile ? "" : "hidden md:inline"}>Companies</span>
        </Button>
      </Link>

      {/* Candidate-only Links (Clerk authenticated) */}
      <SignedIn>
        <Link to="/saved-jobs" onClick={onLinkClick}>
          <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
            <Heart className="h-4 w-4" />
            <span className={mobile ? "" : "hidden md:inline"}>Saved</span>
          </Button>
        </Link>

        <Link to="/interview" onClick={onLinkClick}>
          <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
            <FileText className="h-4 w-4" />
            <span className={mobile ? "" : "hidden md:inline"}>Prep</span>
          </Button>
        </Link>

        <Link to="/applications" onClick={onLinkClick}>
          <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
            <ClipboardList className="h-4 w-4" />
            <span className={mobile ? "" : "hidden md:inline"}>Applications</span>
          </Button>
        </Link>

        <Link to="/interviews" onClick={onLinkClick}>
          <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
            <Calendar className="h-4 w-4" />
            <span className={mobile ? "" : "hidden md:inline"}>Interviews</span>
          </Button>
        </Link>

        <Link to="/dashboard" onClick={onLinkClick}>
          <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
            <LayoutDashboard className="h-4 w-4" />
            <span className={mobile ? "" : "hidden md:inline"}>Dashboard</span>
          </Button>
        </Link>
      </SignedIn>

      {/* Recruiter Links (Custom auth) */}
      {isRecruiter && (
        <Link to="/recruiter" onClick={onLinkClick}>
          <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
            <Users className="h-4 w-4" />
            <span className={mobile ? "" : "hidden md:inline"}>Recruiter</span>
          </Button>
        </Link>
      )}

      {/* Admin Links (Custom auth) */}
      {isAdmin && (
        <Link to="/admin" onClick={onLinkClick}>
          <Button variant="ghost" size={mobile ? "default" : "sm"} className={`gap-2 ${mobile ? "w-full justify-start" : ""}`}>
            <Shield className="h-4 w-4" />
            <span className={mobile ? "" : "hidden md:inline"}>Admin</span>
          </Button>
        </Link>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition">
          <img src={logo} alt="Logo" className="h-8 w-8" />
          <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent hidden sm:inline">
            DevPrep
          </span>
        </Link>

        {/* Desktop Navigation Links - Hidden on mobile */}
        <div className="hidden lg:flex items-center gap-1">
          <NavLinks />
        </div>

        {/* Auth Section - Desktop */}
        <div className="hidden md:flex items-center gap-3">
          {/* Clerk User (Candidate) */}
          <SignedIn>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden lg:inline">Candidate</span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          {/* Staff User (Admin/Recruiter) */}
          {isStaffLoggedIn && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 bg-primary/5">
                <div className="flex flex-col items-end hidden lg:flex">
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
                <span className="hidden lg:inline">Logout</span>
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

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Auth - Show UserButton or Login */}
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          {isStaffLoggedIn && (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold">
                {customUser.firstName?.[0]}{customUser.lastName?.[0]}
              </span>
            </div>
          )}
          <SignedOut>
            {!isStaffLoggedIn && (
              <Link to="/login">
                <Button size="sm" variant="default">
                  Login
                </Button>
              </Link>
            )}
          </SignedOut>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 space-y-2">
            <NavLinks mobile={true} onLinkClick={() => setMobileMenuOpen(false)} />
            
            {/* Mobile Staff Logout */}
            {isStaffLoggedIn && (
              <Button 
                variant="ghost" 
                size="default" 
                onClick={handleLogout}
                className="w-full justify-start gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
