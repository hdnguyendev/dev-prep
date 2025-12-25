import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DashboardTopbar from "@/components/DashboardTopbar";
import { isRecruiterLoggedIn, logout } from "@/lib/auth";
import { LayoutPanelLeft, Briefcase, ClipboardList, Building2, LogOut, Menu, X } from "lucide-react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router";
import { useEffect, useState } from "react";

const NavItem = ({ to, label, icon, onNavigate, mobileMenuOpen }: { to: string; label: string; icon: React.ReactNode; onNavigate?: () => void; mobileMenuOpen?: boolean }) => {
  const location = useLocation();
  // Check if current path exactly matches or starts with the nav item path
  const isActive = location.pathname === to || (to !== "/recruiter/dashboard" && location.pathname.startsWith(to + "/"));
  
  return (
    <NavLink to={to} onClick={onNavigate} end={to === "/recruiter/dashboard"}>
      {() => (
        <Button 
          variant={isActive ? "default" : "ghost"} 
          size={mobileMenuOpen ? "lg" : "sm"}
          className={`w-full justify-start gap-3 ${mobileMenuOpen ? "h-14 text-base" : ""}`}
        >
          {icon}
          {label}
        </Button>
      )}
    </NavLink>
  );
};

export default function RecruiterLayout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isRecruiterLoggedIn()) navigate("/login");
  }, [navigate]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate("/login");
  };


  return (
    <>
      <DashboardTopbar title="Recruiter dashboard" />
      <main className="min-h-dvh bg-muted/40">
      <div className="container mx-auto px-4 py-4 lg:py-6">
        {/* Mobile Menu Button */}
        <div className="lg:hidden mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="gap-2"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            Menu
          </Button>
        </div>

        <div className="flex gap-4">
          <aside className={`space-y-4 flex flex-col ${
            mobileMenuOpen
              ? "fixed inset-0 bg-background z-50 p-6 overflow-y-auto lg:relative lg:inset-auto lg:top-0 lg:w-[260px] lg:z-auto lg:p-0 lg:space-y-3"
              : "hidden lg:flex lg:w-[260px] lg:flex-shrink-0 lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)]"
          }`}>
            {mobileMenuOpen && (
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <div>
                  <div className="text-lg font-semibold">Recruiter</div>
                  <div className="text-sm text-muted-foreground">Dashboard</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-10 w-10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}
            <Card className={`${mobileMenuOpen ? "p-4" : "p-3"}`}>
              <div className={`${mobileMenuOpen ? "text-base" : "text-sm"} font-semibold`}>Recruiter</div>
              <div className={`${mobileMenuOpen ? "text-sm" : "text-xs"} text-muted-foreground`}>Dashboard</div>
            </Card>

            <Card className={`${mobileMenuOpen ? "p-4 space-y-3" : "p-2 space-y-1"} flex-1`}>
              <NavItem 
                to="/recruiter/dashboard" 
                label="Overview" 
                icon={<LayoutPanelLeft className={mobileMenuOpen ? "h-5 w-5" : "h-4 w-4"} />} 
                onNavigate={() => setMobileMenuOpen(false)}
                mobileMenuOpen={mobileMenuOpen}
              />
              <NavItem 
                to="/recruiter/jobs" 
                label="Jobs" 
                icon={<Briefcase className={mobileMenuOpen ? "h-5 w-5" : "h-4 w-4"} />} 
                onNavigate={() => setMobileMenuOpen(false)}
                mobileMenuOpen={mobileMenuOpen}
              />
              <NavItem 
                to="/recruiter/applications" 
                label="Applications" 
                icon={<ClipboardList className={mobileMenuOpen ? "h-5 w-5" : "h-4 w-4"} />} 
                onNavigate={() => setMobileMenuOpen(false)}
                mobileMenuOpen={mobileMenuOpen}
              />
              <NavItem 
                to="/recruiter/company" 
                label="Company" 
                icon={<Building2 className={mobileMenuOpen ? "h-5 w-5" : "h-4 w-4"} />} 
                onNavigate={() => setMobileMenuOpen(false)}
                mobileMenuOpen={mobileMenuOpen}
              />
            </Card>

            <Button 
              variant="outline" 
              size={mobileMenuOpen ? "lg" : "sm"} 
              onClick={handleLogout} 
              className={`gap-3 w-full ${mobileMenuOpen ? "h-14 text-base" : ""}`}
            >
              <LogOut className={mobileMenuOpen ? "h-5 w-5" : "h-4 w-4"} />
              Logout
            </Button>
          </aside>

          <section className="flex-1 min-w-0 w-full lg:w-auto">
            <Outlet />
          </section>
        </div>
      </div>
      </main>
    </>
  );
}


