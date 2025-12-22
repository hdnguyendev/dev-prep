import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { isRecruiterLoggedIn, getCurrentUser } from "@/lib/auth";
import {
  BriefcaseBusiness,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  MapPin,
  Building2,
  ClipboardList,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type Job = {
  id: string;
  title: string;
  slug: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  interviewQuestions?: string[];
  location?: string;
  locationType?: string;
  employmentType?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  status: string;
  companyId: string;
  recruiterId: string;
  createdAt: string;
  company?: {
    id: string;
    name: string;
    logo?: string;
  };
};

const RecruiterJobs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationsCounts, setApplicationsCounts] = useState<Record<string, number>>({});

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);

  // List UI state
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string>("");
  const [locationTypeFilter, setLocationTypeFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const hasProcessedState = useRef(false);
  const userIdRef = useRef<string | null>(null);

  // Get user ID once and cache it
  useEffect(() => {
    const user = getCurrentUser();
    userIdRef.current = user?.id || null;
  }, []);

  // Check auth
  useEffect(() => {
    if (!isRecruiterLoggedIn()) {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch jobs with search from server
  useEffect(() => {
    const fetchJobs = async () => {
      const userId = userIdRef.current;
      if (!userId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const headers: Record<string, string> = {
          "Authorization": `Bearer ${userId}`,
        };
        
        const searchParam = search.trim() ? `&q=${encodeURIComponent(search.trim())}` : "";
        const response = await fetch(`${API_BASE}/api/jobs?pageSize=100${searchParam}`, { headers });
        const data = await response.json();
        
        if (data.success) {
          const fetchedJobs = data.data || [];
          setJobs(fetchedJobs);
          
          // Fetch applications count for each job
          const counts: Record<string, number> = {};
          await Promise.all(
            fetchedJobs.map(async (job: Job) => {
              try {
                const appsRes = await fetch(`${API_BASE}/api/applications?jobId=${job.id}&pageSize=1`, { headers });
                const appsData = await appsRes.json();
                if (appsData.success && appsData.meta) {
                  counts[job.id] = appsData.meta.total || 0;
                } else {
                  counts[job.id] = 0;
                }
              } catch {
                counts[job.id] = 0;
              }
            })
          );
          setApplicationsCounts(counts);
        } else {
          setError(data.message || "Failed to fetch jobs");
        }
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [search]);

  // Support being opened from dashboard (navigate to create/edit page)
  useEffect(() => {
    if (hasProcessedState.current) return;
    if (loading) return;

    const state = location.state as { openJobId?: string; mode?: "create" } | undefined;
    if (!state) {
      hasProcessedState.current = true;
      return;
    }

    // Mark as processed immediately to prevent infinite loop
    hasProcessedState.current = true;

    if (state.mode === "create") {
      navigate("/recruiter/jobs/new", { replace: true });
      return;
    }

    if (state.openJobId) {
      navigate(`/recruiter/jobs/${state.openJobId}/edit`, { replace: true });
    }
  }, [loading, location.state, navigate]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, employmentTypeFilter, locationTypeFilter, sortBy]);

  // Client-side filtering only for status, employment type, location type (search is done on server)
  const filteredJobs = useMemo(() => {
    const next = jobs.filter((j) => {
      if (statusFilter && String(j.status) !== statusFilter) return false;
      if (employmentTypeFilter && String(j.employmentType ?? "") !== employmentTypeFilter) return false;
      if (locationTypeFilter && String(j.locationType ?? "") !== locationTypeFilter) return false;
      return true;
    });

    next.sort((a, b) => {
      if (sortBy === "title") return String(a.title ?? "").localeCompare(String(b.title ?? ""));
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? bt - at : at - bt;
    });
    return next;
  }, [employmentTypeFilter, jobs, locationTypeFilter, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [currentPage, filteredJobs]);

  const employmentTypeOptions = useMemo(() => {
    const base = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"];
    const extra = Array.from(new Set(jobs.map((j) => j.employmentType).filter(Boolean) as string[]));
    return Array.from(new Set([...base, ...extra]));
  }, [jobs]);

  const locationTypeOptions = useMemo(() => {
    const base = ["REMOTE", "ONSITE", "HYBRID"];
    const extra = Array.from(new Set(jobs.map((j) => j.locationType).filter(Boolean) as string[]));
    return Array.from(new Set([...base, ...extra]));
  }, [jobs]);

  // Navigate to create page
  const handleCreate = () => {
    navigate("/recruiter/jobs/new");
  };

  // Navigate to edit page
  const handleEdit = (job: Job) => {
    navigate(`/recruiter/jobs/${job.id}/edit`);
  };

  // Delete job
  const handleDeleteClick = (job: Job) => {
    setJobToDelete(job);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete || !userIdRef.current) return;
    
    try {
      setDeleting(true);
      const response = await fetch(`${API_BASE}/jobs/${jobToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${userIdRef.current}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setJobs((prev) => prev.filter((j) => j.id !== jobToDelete.id));
        setDeleteConfirmOpen(false);
        setJobToDelete(null);
      } else {
        setError(data.message || "Failed to delete job");
      }
    } catch (err) {
      console.error("Failed to delete job:", err);
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  };

  // View applications for a job
  const handleViewApplications = (job: Job) => {
    navigate(`/recruiter/jobs/${job.id}/applications`);
  };

  if (!isRecruiterLoggedIn()) {
    return null;
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Jobs</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage your job postings
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Job
          </Button>
        </div>

        {/* Quick Actions */}
        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/30 via-background to-background dark:from-amber-950/10">
          <CardHeader>
            <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Button 
                variant="outline" 
                className="h-auto flex-col gap-2 py-4 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors" 
                onClick={() => navigate("/recruiter/dashboard")}
              >
                <BriefcaseBusiness className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium">Overview</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                onClick={() => navigate("/recruiter/applications")}
              >
                <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium">Review Applications</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex-col gap-2 py-4 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors" 
                onClick={() => navigate("/recruiter/company")}
              >
                <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium">Edit Company</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                onClick={handleCreate}
              >
                <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-medium">Create New Job</span>
              </Button>
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
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BriefcaseBusiness className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No jobs yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Create your first job posting to start recruiting
              </p>
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
                <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg">Jobs</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {filteredJobs.length} result{filteredJobs.length === 1 ? "" : "s"}
                        </div>
                </div>

                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                  <div className="relative w-full lg:w-[360px] flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Search by title, slug, company..."
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={handleSearch} size="sm">
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">All status</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>

                    <select
                      value={employmentTypeFilter}
                      onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">All employment</option>
                      {employmentTypeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <select
                      value={locationTypeFilter}
                      onChange={(e) => setLocationTypeFilter(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">All location</option>
                      {locationTypeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "title")}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="title">Title</option>
                    </select>

                    {(search || statusFilter || employmentTypeFilter || locationTypeFilter) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setStatusFilter("");
                          setEmploymentTypeFilter("");
                          setLocationTypeFilter("");
                        }}
                      >
                        Clear
                      </Button>
                      )}
                    </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/70 text-muted-foreground">
                    <tr className="border-b text-xs font-semibold uppercase tracking-wide">
                      <th className="px-4 py-3 text-left w-[40%]">Job</th>
                      <th className="px-4 py-3 text-center w-[14%]">Status</th>
                      <th className="px-4 py-3 text-left w-[14%]">Type</th>
                      <th className="px-4 py-3 text-left w-[18%]">Location</th>
                      <th className="px-4 py-3 text-right w-[14%]">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pagedJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="hover:bg-muted/40 transition cursor-pointer"
                        onClick={() => handleEdit(job)}
                      >
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="font-semibold break-words">{job.title}</div>
                            <div className="text-xs text-muted-foreground break-words">
                              <span className="inline-flex items-center gap-2">
                                <Building2 className="h-3 w-3" />
                                {job.company?.name || "Company"}
                              </span>
                              <span className="mx-2">•</span>
                              <span className="font-mono">{job.slug}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                    <Badge
                      variant={
                        job.status === "PUBLISHED"
                          ? "default"
                          : job.status === "DRAFT"
                          ? "outline"
                          : "outline"
                      }
                              className="inline-flex h-8 items-center gap-2 px-3 text-sm font-medium"
                    >
                      {job.status === "PUBLISHED" ? (
                                <CheckCircle2 className="h-4 w-4" />
                      ) : job.status === "DRAFT" ? (
                                <Clock className="h-4 w-4" />
                      ) : (
                                <XCircle className="h-4 w-4" />
                      )}
                      {job.status}
                    </Badge>
                  </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="space-y-1">
                            <div>{job.employmentType || "—"}</div>
                            <div className="text-xs">{job.experienceLevel || ""}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                              <span className="break-words">{job.location || "—"}</span>
                      </div>
                            <div className="text-xs">{job.locationType || ""}</div>
                      </div>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2 justify-end">
                    <Button
                      variant="default"
                      size="sm"
                              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => handleViewApplications(job)}
                    >
                              <Eye className="h-4 w-4" />
                      Applications
                      {applicationsCounts[job.id] !== undefined && applicationsCounts[job.id] > 0 && (
                        <Badge variant="outline" className="ml-1 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                          {applicationsCounts[job.id]}
                        </Badge>
                      )}
                    </Button>
                            <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleEdit(job)}>
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(job)}
                    >
                              <Trash2 className="h-4 w-4" />
                              Delete
                    </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pagedJobs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                          No jobs match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  Page {currentPage} / {totalPages}
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
                </CardContent>
              </Card>
        )}

      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Job?"
        description={jobToDelete ? `Are you sure you want to delete "${jobToDelete.title}"? This action cannot be undone.` : "This action cannot be undone."}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
};

export default RecruiterJobs;
