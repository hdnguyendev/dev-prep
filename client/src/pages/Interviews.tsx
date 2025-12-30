import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type Interview } from "@/lib/api";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { getCurrentUser } from "@/lib/auth";
import { Loader2, Video } from "lucide-react";

const statusColor: Record<Interview["status"], "default" | "outline" | "success"> = {
  PENDING: "outline",
  IN_PROGRESS: "default",
  PROCESSING: "outline",
  COMPLETED: "success",
  FAILED: "outline",
  EXPIRED: "outline",
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

const Interviews = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 8;
  
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Check authentication - both Clerk (candidate) and custom (recruiter/admin)
  const { getToken } = useAuth();
  const customUser = getCurrentUser();
  const isAuthenticated = customUser !== null;

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        setLoading(true);
        setError(null);

        const headers: Record<string, string> = {};

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

        const response = await fetch(`${API_BASE}/api/interviews?page=${page}&pageSize=${pageSize}`, {
          headers,
        });

        const data = await response.json();

        if (data.success) {
          setInterviews(data.data);
          setTotal(data.meta?.total ?? data.data.length);
        } else {
          setError(data.message || "Failed to fetch interviews");
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, [page, pageSize, customUser?.id, getToken]);

  if (loading) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold">Loading interviews...</div>
          <div className="text-sm text-muted-foreground">Fetching interview schedule and results.</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold text-red-600">Error loading interviews</div>
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
                  <Video className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-center">Login Required</CardTitle>
                <CardDescription className="text-center">
                  Please login to view your interviews
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
          <InterviewsList 
            interviews={interviews}
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
    <InterviewsList 
      interviews={interviews}
      page={page}
      totalPages={totalPages}
      total={total}
      setPage={setPage}
    />
  );
};

interface InterviewsListProps {
  interviews: Interview[];
  page: number;
  totalPages: number;
  total: number;
  setPage: (page: number | ((prev: number) => number)) => void;
}

const InterviewsList = ({ interviews, page, totalPages, total, setPage }: InterviewsListProps) => {
  const navigate = useNavigate();
  return (
    <main className="container mx-auto min-h-dvh px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Interviews</h1>
          <p className="text-sm text-muted-foreground">
            Manage AI interview sessions synced from the backend.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {total} interviews • page {page}/{totalPages}
        </div>
      </header>

      {interviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No interviews scheduled</h3>
            <p className="text-sm text-muted-foreground">
              Your interview sessions will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {interviews.map((iv) => (
              <Card key={iv.id} className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {iv.title} <span className="text-xs font-normal text-muted-foreground">({iv.id.slice(0, 6)})</span>
                  </CardTitle>
                  <CardDescription>
                    {iv.application?.job?.title || iv.job?.title || (iv.applicationId ? iv.applicationId : "Standalone mock")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusColor[iv.status] || "default"}>{iv.status}</Badge>
                    <Badge variant="outline">{iv.type}</Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div><span className="font-medium text-foreground">Access code:</span> {iv.accessCode}</div>
                    <div><span className="font-medium text-foreground">Expires:</span> {new Date(iv.expiresAt).toLocaleString()}</div>
                    {iv.sessionUrl && <div className="truncate"><span className="font-medium text-foreground">Session URL:</span> {iv.sessionUrl}</div>}
                  </div>
                  {iv.overallScore !== null && iv.overallScore !== undefined && (
                    <div className="font-medium text-foreground">Score: {iv.overallScore}</div>
                  )}
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/interviews/${iv.id}/feedback`)}
                    >
                      {iv.status === "COMPLETED" ? (
                        "View feedback"
                      ) : (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          View feedback
                        </span>
                      )}
                    </Button>
                  </div>
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

export default Interviews;
