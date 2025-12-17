import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type Application, type Interview } from "@/lib/api";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { getCurrentUser } from "@/lib/auth";
import { Briefcase, Calendar, Mail, FileText, ExternalLink, Sparkles } from "lucide-react";

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
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Application | null>(null);

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

  // Fetch related interviews for current user's applications
  useEffect(() => {
    const fetchInterviews = async () => {
      if (applications.length === 0) return;
      try {
        let headers: Record<string, string> = {};
        try {
          const clerkToken = await getToken();
          if (clerkToken) headers["Authorization"] = `Bearer ${clerkToken}`;
        } catch {}
        if (!headers["Authorization"] && customUser) {
          headers["Authorization"] = `Bearer ${customUser.id}`;
        }
        const response = await fetch(`${API_BASE}/api/interviews?page=1&pageSize=200`, {
          headers,
        });
        const data = await response.json();
        if (data.success) {
          setInterviews(data.data || []);
        }
      } catch (err) {
        console.error("Error fetching interviews:", err);
      }
    };
    fetchInterviews();
  }, [applications, customUser, getToken]);

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
            interviews={interviews}
            page={page}
            pageSize={pageSize}
            total={total}
            setPage={setPage}
            selected={selected}
            onSelect={setSelected}
          />
        </SignedIn>
      </>
    );
  }

  return (
    <ApplicationsList 
      applications={applications}
      interviews={interviews}
      page={page}
      pageSize={pageSize}
      total={total}
      setPage={setPage}
      selected={selected}
      onSelect={setSelected}
    />
  );
};

interface ApplicationsListProps {
  applications: Application[];
  interviews?: Interview[];
  page: number;
  pageSize: number;
  total: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  onSelect: (app: Application | null) => void;
  selected: Application | null;
}

const ApplicationsList = ({ applications, interviews = [], page, pageSize, total, setPage, onSelect, selected }: ApplicationsListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<Set<Application["status"]>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const navigate = useNavigate();

  const interviewsByApp = useMemo(() => {
    const map: Record<string, Interview[]> = {};
    interviews.forEach((iv) => {
      const appId = iv.applicationId;
      if (!map[appId]) map[appId] = [];
      map[appId].push(iv);
    });
    return map;
  }, [interviews]);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const haystack = `${app.job?.title || ""} ${app.job?.company?.name || ""}`.toLowerCase();
      if (searchTerm && !haystack.includes(searchTerm.toLowerCase().trim())) return false;
      if (statusFilters.size > 0 && !statusFilters.has(app.status)) return false;
      const applied = new Date(app.appliedAt).getTime();
      if (dateFrom && applied < new Date(dateFrom).getTime()) return false;
      if (dateTo && applied > new Date(dateTo).getTime()) return false;
      return true;
    });
  }, [applications, searchTerm, statusFilters, dateFrom, dateTo]);

  const colTemplate = "minmax(260px,1.2fr) minmax(140px,0.8fr) minmax(220px,1fr) minmax(140px,0.7fr) minmax(120px,0.6fr)";

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const toggleStatus = (s: Application["status"]) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      setPage(1);
      return next;
    });
  };

  return (
    <main className="container mx-auto min-h-dvh px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-muted-foreground">
            Xem nhanh trạng thái ứng tuyển và các buổi phỏng vấn liên quan.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {totalFiltered}/{total} applications • page {currentPage}/{totalPages}
        </div>
      </header>

      {/* Filters */}
      <Card className="border-dashed">
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Job or company"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Applied from</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Applied to</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(statusVariants).map((key) => {
                const active = statusFilters.has(key as Application["status"]);
                return (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className="gap-1"
                    onClick={() => toggleStatus(key as Application["status"])}
                  >
                        {key.replace(/_/g, " ")}
                  </Button>
                );
              })}
              {statusFilters.size > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setStatusFilters(new Set());
                    setPage(1);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {paged.length === 0 ? (
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
          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="max-h-[70vh] overflow-auto" role="table">
              <div
                className="grid items-center gap-3 px-5 py-3 text-xs font-semibold uppercase text-muted-foreground sticky top-0 bg-card border-b min-w-[1080px]"
                style={{ gridTemplateColumns: colTemplate }}
                role="row"
              >
                <div role="columnheader">Job / Company</div>
                <div className="text-center" role="columnheader">Status</div>
                <div className="text-center" role="columnheader">Interviews</div>
                <div className="text-right" role="columnheader">Applied</div>
                <div className="text-right" role="columnheader">Interview</div>
              </div>
              <div className="divide-y min-w-[1080px]">
                {paged.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => onSelect(app)}
                    className="grid gap-3 px-5 py-3 text-left hover:bg-muted/60 transition items-center"
                    style={{ gridTemplateColumns: colTemplate }}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{app.job?.title || "Job"}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {app.job?.company?.name || app.job?.slug || "Company not set"}
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant={statusVariants[app.status] || "default"}>{app.status}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground min-w-0">
                      {(interviewsByApp[app.id] || []).length === 0 ? (
                        <span>None</span>
                      ) : (
                        interviewsByApp[app.id].slice(0, 3).map((iv) => (
                          <Badge key={iv.id} variant="outline" className="gap-1">
                            {iv.type} • {iv.status}
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          const questions = app.job?.interviewQuestions?.filter((q) => q && q.trim().length > 0) || [];
                          navigate("/interview", {
                            state: {
                              questions,
                              jobTitle: app.job?.title,
                            },
                          });
                        }}
                        disabled={!app.job?.interviewQuestions || app.job.interviewQuestions.length === 0}
                      >
                        <Sparkles className="h-4 w-4" />
                        Practice
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </>
      )}
      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div>
                <CardTitle>{selected.job?.title || "Job"}</CardTitle>
                <CardDescription>{selected.job?.company?.name || selected.job?.slug || "Company"}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Badge variant={statusVariants[selected.status] || "default"}>{selected.status}</Badge>
                <span>Applied {new Date(selected.appliedAt).toLocaleString()}</span>
              </div>

              {selected.resumeUrl && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={selected.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View resume
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {selected.coverLetter && (
                <div>
                  <div className="mb-1 font-medium text-foreground">Cover letter</div>
                  <p className="whitespace-pre-line leading-relaxed">{selected.coverLetter}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="font-medium text-foreground">Interviews</div>
                <div className="flex flex-col gap-2">
                  {(interviewsByApp[selected.id] || []).length === 0 ? (
                    <p className="text-muted-foreground text-sm">No interviews scheduled yet.</p>
                  ) : (
                    (interviewsByApp[selected.id] || []).map((iv) => (
                      <div key={iv.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
                        <Badge variant="outline">{iv.type}</Badge>
                        <Badge variant="outline">{iv.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Expires: {new Date(iv.expiresAt).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
};

export default Applications;
