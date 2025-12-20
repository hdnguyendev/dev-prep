import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DashboardTopbar from "@/components/DashboardTopbar";
import { isAdminLoggedIn } from "@/lib/auth";
import { LayoutDashboard, Settings, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useEffect } from "react";

const NavItem = ({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) => {
  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <Button variant={isActive ? "default" : "ghost"} className="w-full justify-start gap-2">
          {icon}
          {label}
        </Button>
      )}
    </NavLink>
  );
};

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdminLoggedIn()) navigate("/login");
  }, [navigate]);

  return (
    <>
      <DashboardTopbar title="Admin dashboard" />
      <main className="min-h-dvh bg-muted/40">
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-3">
            <Card className="p-3">
              <div className="text-sm font-semibold">Admin</div>
              <div className="text-xs text-muted-foreground">Dashboard</div>
            </Card>

            <Card className="p-2 space-y-1">
              <NavItem to="/admin/dashboard" label="Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
              <NavItem to="/admin/manage" label="Manage" icon={<Settings className="h-4 w-4" />} />
              <NavItem to="/admin/candidates" label="Candidates" icon={<Users className="h-4 w-4" />} />
            </Card>
          </aside>

          <section className="min-w-0">
            <Outlet />
          </section>
        </div>
      </div>
      </main>
    </>
  );
}


