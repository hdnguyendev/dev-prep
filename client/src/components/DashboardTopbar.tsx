import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, UserButton, useAuth, useUser } from "@clerk/clerk-react";
import { getCurrentUser, logout } from "@/lib/auth";
import { Briefcase, Building2, Home, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router";
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
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const customUser = getCurrentUser();

  const isStaff = Boolean(customUser);

  const handleStaffLogout = () => {
    logout();
    navigate("/login");
  };

  const candidateDisplayName =
    `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim() || "Account";

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
              <span className="hidden lg:inline text-sm text-muted-foreground">{candidateDisplayName}</span>
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
              <Button variant="ghost" size="sm" onClick={handleStaffLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Logout</span>
              </Button>
            </div>
          )}

          <SignedOut>
            {!isStaff && (
              <Link to="/login">
                <Button size="sm" variant="default">
                  Login
                </Button>
              </Link>
            )}
          </SignedOut>
        </div>
      </div>
    </div>
  );
}


