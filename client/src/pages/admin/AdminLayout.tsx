import DashboardTopbar from "@/components/DashboardTopbar";
import { isAdminLoggedIn } from "@/lib/auth";
import { Outlet, useNavigate } from "react-router";
import { useEffect } from "react";

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
            <Outlet />
      </div>
      </main>
    </>
  );
}


