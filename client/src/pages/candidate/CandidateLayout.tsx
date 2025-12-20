import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DashboardTopbar from "@/components/DashboardTopbar";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { Calendar, ClipboardList, FileText, Heart, LayoutDashboard, UserRound, Zap } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";

const NavItem = ({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
}) => {
  return (
    <NavLink to={to} end={false}>
      {({ isActive }) => (
        <Button
          variant={isActive ? "default" : "ghost"}
          className="w-full justify-start gap-2"
        >
          {icon}
          {label}
        </Button>
      )}
    </NavLink>
  );
};

export default function CandidateLayout() {
  const navigate = useNavigate();

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <DashboardTopbar title="Candidate dashboard" />
        <main className="min-h-dvh bg-muted/40">
          <div className="container mx-auto px-4 py-6">
            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
              <aside className="space-y-3">
                <Card className="p-3">
                  <div className="text-sm font-semibold">Candidate</div>
                  <div className="text-xs text-muted-foreground">Dashboard</div>
                </Card>

                <Card className="p-2 space-y-1">
                  <NavItem
                    to="/candidate/dashboard"
                    label="Dashboard"
                    icon={<LayoutDashboard className="h-4 w-4" />}
                  />
                  <NavItem
                    to="/candidate/applications"
                    label="Applications"
                    icon={<ClipboardList className="h-4 w-4" />}
                  />
                  <NavItem
                    to="/candidate/interviews"
                    label="Interviews"
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  <NavItem
                    to="/candidate/profile"
                    label="Profile"
                    icon={<UserRound className="h-4 w-4" />}
                  />
                  <NavItem
                    to="/candidate/saved-jobs"
                    label="Saved jobs"
                    icon={<Heart className="h-4 w-4" />}
                  />
                  <NavItem
                    to="/candidate/quick-access"
                    label="Quick access"
                    icon={<Zap className="h-4 w-4" />}
                  />
                </Card>

                <Card className="p-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Quick</div>
                  <div className="grid gap-2">
                    <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/interview")}>
                      <FileText className="h-4 w-4" />
                      Prep
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/candidate/saved-jobs")}>
                      <Heart className="h-4 w-4" />
                      Saved jobs
                    </Button>
                  </div>
                </Card>
              </aside>

              <section className="min-w-0">
                <Outlet />
              </section>
            </div>
          </div>
        </main>
      </SignedIn>
    </>
  );
}


