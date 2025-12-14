import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type Application } from "@/lib/api";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { getCurrentUser } from "@/lib/auth";
import { Briefcase } from "lucide-react";

const statusVariants: Record<Application["status"], "default" | "outline" | "success"> = {
  APPLIED: "outline",
  REVIEWING: "outline",
  SHORTLISTED: "success",
  INTERVIEW_SCHEDULED: "default",
  INTERVIEWED: "default",
  OFFER_SENT: "success",
  HIRED: "success",
  REJECTED: "outline",
  WITHDRAWN: "outline",
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

const Applications = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 8;
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Check authentication - both Clerk (candidate) and custom (recruiter/admin)
  const { getToken } = useAuth();
  const customUser = getCurrentUser();
  const isAuthenticated = customUser !== null;

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        setError(null);

        let headers: Record<string, string> = {};

        // Try Clerk token first (for candidates)
        try {
          const clerkToken = await getToken();
          if (clerkToken) {
            headers["Authorization"] = `Bearer ${clerkToken}`;
          }
        } catch {
          // Clerk not available
        }

        // Try custom auth (for recruiter/admin)  
        if (!headers["Authorization"] && customUser) {
          headers["Authorization"] = `Bearer ${customUser.id}`;
        }

        const response = await fetch(`${API_BASE}/api/applications?page=${page}&pageSize=${pageSize}`, {
          headers,
        });

        const data = await response.json();

        if (data.success) {
          setApplications(data.data);
          setTotal(data.meta?.total ?? data.data.length);
        } else {
          setError(data.message || "Failed to fetch applications");
        }
      } catch (err) {
        console.error("Error fetching applications:", err);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [page, pageSize, customUser?.id, getToken]);

  if (loading) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold">Loading applications...</div>
          <div className="text-sm text-muted-foreground">Fetching your applications from the backend.</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold text-red-600">Error loading applications</div>
          <div className="mb-4 text-sm text-muted-foreground">{error}</div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </main>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // If not authenticated at all, show login prompt
  if (!isAuthenticated) {
    return (
      <>
        <SignedOut>
          <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
            <Card className="max-w-md">
              <CardHeader>
                <div className="mb-4 flex justify-center">
                  <Briefcase className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-center">Login Required</CardTitle>
                <CardDescription className="text-center">
                  Please login to view your applications
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center gap-3">
                <Button onClick={() => navigate("/login")} variant="default">
                  Staff Login
                </Button>
                <Button onClick={() => navigate("/login")} variant="outline">
                  Candidate Login
                </Button>
              </CardContent>
            </Card>
          </main>
        </SignedOut>
        <SignedIn>
          {/* This will render for Clerk-authenticated candidates */}
          <ApplicationsList 
            applications={applications}
            page={page}
            totalPages={totalPages}
            total={total}
            setPage={setPage}
          />
        </SignedIn>
      </>
    );
  }

  return (
    <ApplicationsList 
      applications={applications}
      page={page}
      totalPages={totalPages}
      total={total}
      setPage={setPage}
    />
  );
};

interface ApplicationsListProps {
  applications: Application[];
  page: number;
  totalPages: number;
  total: number;
  setPage: (page: number | ((prev: number) => number)) => void;
}

const ApplicationsList = ({ applications, page, totalPages, total, setPage }: ApplicationsListProps) => {
  return (
    <main className="container mx-auto min-h-dvh px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-muted-foreground">
            Track application status with live data from the API.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {total} applications • page {page}/{totalPages}
        </div>
      </header>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No applications yet</h3>
            <p className="text-sm text-muted-foreground">
              Your job applications will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {applications.map((app) => (
              <Card key={app.id} className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {app.job?.title || "Job"}{" "}
                    <span className="text-xs font-normal text-muted-foreground">({app.id.slice(0, 6)})</span>
                  </CardTitle>
                  <CardDescription>
                    {app.job?.company?.name || app.job?.slug || "Company not set"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariants[app.status] || "default"}>{app.status}</Badge>
                    <span>Applied at {new Date(app.appliedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div><span className="font-medium text-foreground">Resume:</span> {app.resumeUrl || "—"}</div>
                  </div>
                  {app.coverLetter && (
                    <div>
                      <div className="mb-1 font-medium text-foreground">Cover Letter</div>
                      <p className="line-clamp-3 whitespace-pre-line">{app.coverLetter}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </main>
  );
};

export default Applications;
