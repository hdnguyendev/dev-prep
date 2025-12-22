import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, UserButton, useAuth, useUser } from "@clerk/clerk-react";
import { getCurrentUser, logout } from "@/lib/auth";
import { Briefcase, Building2, Home, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo.svg";

type DashboardTopbarProps = {
  title: string;
};

/**
 * Top navigation for dashboard areas (candidate/admin/recruiter).
 * Keeps dashboard UX consistent even when the main navbar is hidden.
 */
export default function DashboardTopbar({ title }: DashboardTopbarProps) {
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const customUser = getCurrentUser();
  const [candidateNameFromDB, setCandidateNameFromDB] = useState<{ firstName?: string | null; lastName?: string | null } | null>(null);

  const isStaff = Boolean(customUser);

  const handleStaffLogout = () => {
    logout();
    navigate("/login");
  };

  // Fetch candidate name from database
  useEffect(() => {
    if (!isSignedIn) return;
    const fetchCandidateName = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:9999"}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data?.success) {
          setCandidateNameFromDB({
            firstName: data.firstName,
            lastName: data.lastName,
          });
        }
      } catch (err) {
        // Ignore errors
      }
    };
    fetchCandidateName();
  }, [isSignedIn, getToken]);

  const candidateDisplayName = useMemo(() => {
    if (candidateNameFromDB?.firstName && candidateNameFromDB?.lastName) {
      return `${candidateNameFromDB.firstName} ${candidateNameFromDB.lastName}`;
    }
    if (clerkUser?.firstName && clerkUser?.lastName) {
      return `${clerkUser.firstName} ${clerkUser.lastName}`;
    }
    return "Account";
  }, [candidateNameFromDB, clerkUser]);

  return (
    <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <img src={logo} alt="Logo" className="h-7 w-7" />
            <span className="hidden sm:inline font-semibold">DevPrep</span>
          </Link>
          <span className="hidden sm:inline text-sm text-muted-foreground">/</span>
          <span className="text-sm font-medium">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden lg:inline">Home</span>
            </Button>
          </Link>
          <Link to="/jobs">
            <Button variant="ghost" size="sm" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden lg:inline">Jobs</span>
            </Button>
          </Link>
          <Link to="/companies">
            <Button variant="ghost" size="sm" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden lg:inline">Companies</span>
            </Button>
          </Link>

          {/* Candidate (Clerk) */}
          <SignedIn>
            <div className="flex items-center gap-2">
              <span className="hidden lg:inline text-sm font-medium">
                Hi, <span className="text-primary">{candidateDisplayName}</span>
              </span>
              <ThemeToggle />
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          {/* Staff (custom auth) */}
          {isStaff && !isSignedIn && (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-xs font-medium">
                  {customUser?.firstName} {customUser?.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{customUser?.role}</span>
              </div>
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={handleStaffLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Logout</span>
              </Button>
            </div>
          )}

          <SignedOut>
            {!isStaff && (
              <>
                <ThemeToggle />
                <Link to="/login">
                  <Button size="sm" variant="default">
                    Login
                  </Button>
                </Link>
              </>
            )}
          </SignedOut>
        </div>
      </div>
    </div>
  );
}


