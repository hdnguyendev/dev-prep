import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APPLICATION_STATUS_META } from "@/constants/applications";
import { type Application, type Interview } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { Briefcase, ExternalLink, FileText, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

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
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b text-xs font-semibold uppercase text-muted-foreground">
                    <th className="w-[44%] px-5 py-3 text-left">Job / Company</th>
                    <th className="w-[16%] px-5 py-3 text-center">Status</th>
                    <th className="w-[22%] px-5 py-3 text-center">Practice</th>
                    <th className="w-[18%] px-5 py-3 text-right">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paged.map((app) => {
                    const questions =
                      app.job?.interviewQuestions?.filter((q) => q && q.trim().length > 0) || [];

                    return (
                      <tr
                    key={app.id}
                        className="align-top hover:bg-muted/60 transition cursor-pointer"
                    onClick={() => onSelect(app)}
                      >
                        <td className="px-5 py-3">
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground break-words">
                              {app.job?.title || "Job"}
                            </div>
                            <div className="text-sm text-muted-foreground break-words">
                        {app.job?.company?.name || app.job?.slug || "Company not set"}
                      </div>
                    </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-start justify-center">
                            {(() => {
                              const meta = APPLICATION_STATUS_META[app.status];
                              const Icon = meta.Icon;
                              return (
                                <Badge
                                  variant={statusVariants[app.status] || "default"}
                                  className="inline-flex h-8 items-center gap-2 px-3 text-sm font-medium"
                                >
                                  <Icon className="h-4 w-4" />
                                  <span>{meta.label}</span>
                          </Badge>
                              );
                            })()}
                    </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/interview", {
                            state: {
                                    applicationId: app.id,
                                    jobId: app.jobId,
                              questions,
                              jobTitle: app.job?.title,
                            },
                          });
                        }}
                      >
                        <Sparkles className="h-4 w-4" />
                        Practice
                      </Button>
                    </div>
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(app.appliedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                {(() => {
                  const meta = APPLICATION_STATUS_META[selected.status];
                  const Icon = meta.Icon;
                  return (
                    <Badge
                      variant={statusVariants[selected.status] || "default"}
                      className="inline-flex h-8 items-center gap-2 px-3 text-sm font-medium"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{meta.label}</span>
                    </Badge>
                  );
                })()}
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
