import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isRecruiterLoggedIn, getCurrentUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type Application = {
  id: string;
  status: string;
  appliedAt: string;
  resumeUrl?: string;
  coverLetter?: string;
  candidate?: {
    id: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      avatarUrl: string | null;
    };
  };
  job?: {
    id: string;
    title: string;
    company?: {
      name: string;
    };
  };
};

type Job = {
  id: string;
  title: string;
  status: string;
  company?: {
    name: string;
  };
};

const statusConfig: Record<string, { label: string; variant: "default" | "outline" | "success"; icon: React.ReactNode }> = {
  APPLIED: {
    label: "Applied",
    variant: "outline",
    icon: <Clock className="h-3 w-3" />,
  },
  REVIEWING: {
    label: "Reviewing",
    variant: "outline",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  SHORTLISTED: {
    label: "Shortlisted",
    variant: "success",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  INTERVIEW_SCHEDULED: {
    label: "Interview Scheduled",
    variant: "default",
    icon: <Calendar className="h-3 w-3" />,
  },
  INTERVIEWED: {
    label: "Interviewed",
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  OFFER_SENT: {
    label: "Offer Sent",
    variant: "success",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  HIRED: {
    label: "Hired",
    variant: "success",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  REJECTED: {
    label: "Rejected",
    variant: "outline",
    icon: <XCircle className="h-3 w-3" />,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    variant: "outline",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const RecruiterJobApplications = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const currentUser = getCurrentUser();
  const userId = currentUser?.id;
  
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [updating, setUpdating] = useState(false);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Check auth
  useEffect(() => {
    if (!isRecruiterLoggedIn()) {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch job and applications
  useEffect(() => {
    let abort = false;
    const fetchData = async () => {
      if (!userId || !jobId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const headers: Record<string, string> = {
          "Authorization": `Bearer ${userId}`,
        };
        
        const jobResponse = await fetch(`${API_BASE}/jobs/${jobId}`, { headers });
        const jobData = await jobResponse.json();
        
        if (!jobData.success) {
          setError("Job not found");
          return;
        }
        
        if (!abort) setJob(jobData.data);
        
        const appsResponse = await fetch(
          `${API_BASE}/applications?jobId=${jobId}&pageSize=100&include=candidate,job`,
          { headers }
        );
        const appsData = await appsResponse.json();
        
        if (appsData.success) {
          if (!abort) setApplications(appsData.data || []);
        } else {
          if (!abort) setError(appsData.message || "Failed to fetch applications");
        }
      } catch (err) {
        if (abort) return;
        console.error("Failed to fetch data:", err);
        setError("Network error");
      } finally {
        if (!abort) setLoading(false);
      }
    };

    fetchData();
    return () => {
      abort = true;
    };
  }, [userId, jobId]);

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || { 
      label: status, 
      variant: "outline" as const,
      icon: <Clock className="h-3 w-3" />
    };
  };

  const handleInlineStatusUpdate = async (applicationId: string, nextStatus: string) => {
    if (!currentUser) return;
    try {
      setUpdating(true);
      setInlineEditingId(applicationId);
      setError(null);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentUser.id}`,
      };
      const response = await fetch(
        `${API_BASE}/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setApplications((prev) =>
          prev.map((app) =>
            app.id === applicationId ? { ...app, status: nextStatus } : app
          )
        );
        setInlineEditingId(null);
      } else {
        setError(data.message || "Failed to update status");
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      setError("Network error");
    } finally {
      setUpdating(false);
      setInlineEditingId(null);
    }
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      setPage(1);
      return next;
    });
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const candidateName = app.candidate?.user
        ? `${app.candidate.user.firstName || ''} ${app.candidate.user.lastName || ''}`.trim()
        : "";
      const email = app.candidate?.user?.email || "";
      const haystack = `${candidateName} ${email}`.toLowerCase();

      if (searchTerm && !haystack.includes(searchTerm.toLowerCase().trim())) {
        return false;
      }

      if (statusFilters.size > 0 && !statusFilters.has(app.status)) {
        return false;
      }

      if (dateFrom) {
        const applied = new Date(app.appliedAt).getTime();
        if (applied < new Date(dateFrom).getTime()) return false;
      }
      if (dateTo) {
        const applied = new Date(app.appliedAt).getTime();
        if (applied > new Date(dateTo).getTime()) return false;
      }

      return true;
    });
  }, [applications, searchTerm, statusFilters, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApplications.slice(start, start + pageSize);
  }, [filteredApplications, currentPage, pageSize]);

  if (!isRecruiterLoggedIn()) {
    return null;
  }

  if (!jobId) {
    return (
      <main className="min-h-dvh bg-muted/40 py-8">
        <div className="container mx-auto px-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>Job not found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This page requires a valid jobId in the URL.
              </p>
              <Button onClick={() => navigate("/recruiter/jobs")}>Back to jobs</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-muted/40 py-8">
      <div className="container mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/recruiter/jobs")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        </div>

        {job && (
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">{job.title}</h1>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>{job.company?.name}</span>
              <span>•</span>
              <span>
                {applications.length} application{applications.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <Card className="border-dashed">
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Name or email"
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
                {Object.keys(statusConfig).map((key) => {
                  const active = statusFilters.has(key);
                  return (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="gap-1"
                      onClick={() => toggleStatusFilter(key)}
                    >
                      {statusConfig[key].icon}
                      {statusConfig[key].label}
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

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading applications...</p>
          </div>
        ) : pagedApplications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No applications found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting filters to see more results.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {pagedApplications.map((app) => {
              const config = getStatusConfig(app.status);
              const candidateName = app.candidate?.user
                ? `${app.candidate.user.firstName || ''} ${app.candidate.user.lastName || ''}`.trim() || app.candidate.user.email
                : "Unknown";
              
              return (
                <Card
                  key={app.id}
                  className="hover:shadow-md transition cursor-pointer"
                  onClick={() => setSelectedApplication(app)}
                >
                  <CardHeader className="pb-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-4">
                      <div className="flex items-start gap-3">
                        {app.candidate?.user?.avatarUrl ? (
                          <img
                            src={app.candidate.user.avatarUrl}
                            alt={candidateName}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <CardTitle className="text-base">{candidateName}</CardTitle>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {app.candidate?.user?.email || "No email"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Applied {new Date(app.appliedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Badge variant={config.variant} className="gap-1">
                          {config.icon}
                          {config.label}
                        </Badge>
                        <select
                          value={app.status}
                          onChange={(e) => handleInlineStatusUpdate(app.id, e.target.value)}
                          className="flex h-9 rounded-md border border-input bg-background px-2 py-1 text-xs min-w-[150px]"
                          disabled={updating && inlineEditingId === app.id}
                        >
                          {Object.keys(statusConfig).map((key) => (
                            <option key={key} value={key}>
                              {statusConfig[key].label}
                            </option>
                          ))}
                        </select>
                        {updating && inlineEditingId === app.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    {app.resumeUrl && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={app.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Resume
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {app.coverLetter && (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {app.coverLetter}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && (
        <div className="container mx-auto px-4 pt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Page {currentPage} / {totalPages} • {filteredApplications.length} result
              {filteredApplications.length !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div className="flex items-center gap-3">
                {selectedApplication.candidate?.user?.avatarUrl ? (
                  <img
                    src={selectedApplication.candidate.user.avatarUrl}
                    alt="Avatar"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <CardTitle>
                    {selectedApplication.candidate?.user
                      ? `${selectedApplication.candidate.user.firstName || ''} ${selectedApplication.candidate.user.lastName || ''}`.trim() || selectedApplication.candidate.user.email
                      : "Unknown"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {selectedApplication.candidate?.user?.email}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedApplication(null)}
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Status */}
              <div>
                <div className="text-sm font-medium mb-2">Status</div>
                <Badge variant={getStatusConfig(selectedApplication.status).variant} className="gap-1">
                  {getStatusConfig(selectedApplication.status).icon}
                  {getStatusConfig(selectedApplication.status).label}
                </Badge>
              </div>

              {/* Applied Date */}
              <div>
                <div className="text-sm font-medium mb-2">Applied Date</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(selectedApplication.appliedAt).toLocaleString()}
                </div>
              </div>

              {/* Resume */}
              {selectedApplication.resumeUrl && (
                <div>
                  <div className="text-sm font-medium mb-2">Resume</div>
                  <a
                    href={selectedApplication.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    View Resume
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Cover Letter */}
              {selectedApplication.coverLetter && (
                <div>
                  <div className="text-sm font-medium mb-2">Cover Letter</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 rounded-lg p-4">
                    {selectedApplication.coverLetter}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedApplication(null)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
};

export default RecruiterJobApplications;
