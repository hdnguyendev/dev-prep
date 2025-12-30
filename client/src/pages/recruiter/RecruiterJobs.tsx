import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { isRecruiterLoggedIn, getCurrentUser } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Crown, AlertTriangle, Lock } from "lucide-react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  MapPin,
  Building2,
  DollarSign,
  Filter,
  X,
  ArrowUpDown,
  Eye,
  MousePointerClick,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

const jobStatusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  DRAFT: {
    label: "Draft",
    icon: <Clock className="h-4 w-4" />,
    color: "bg-slate-100 dark:bg-slate-950/30 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800",
  },
  PUBLISHED: {
    label: "Published",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  CLOSED: {
    label: "Closed",
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  },
  ARCHIVED: {
    label: "Archived",
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
};

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
  viewsCount?: number;
  clicksCount?: number;
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
  const [membershipUsage, setMembershipUsage] = useState<{
    jobsPosted?: number;
    jobsLimit?: number | null;
    jobsRemaining?: number | null;
    planType?: "FREE" | "VIP";
  } | null>(null);
  const [isVIP, setIsVIP] = useState<boolean>(false);

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

  // Fetch membership usage
  useEffect(() => {
    const fetchMembershipUsage = async () => {
      const userId = userIdRef.current;
      if (!userId) return;

      try {
        const statusRes = await apiClient.getMembershipStatus(userId);
        if (statusRes.success && statusRes.data?.usage) {
          const planType = statusRes.data.usage.planType;
          setIsVIP(planType === "VIP");
          setMembershipUsage({
            jobsPosted: statusRes.data.usage.jobsPosted,
            jobsLimit: statusRes.data.usage.jobsLimit,
            jobsRemaining: statusRes.data.usage.jobsRemaining,
            planType,
          });
        }
      } catch {
      }
    };

    fetchMembershipUsage();
  }, []);

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

          // Refresh membership usage after jobs are loaded
          try {
            const statusRes = await apiClient.getMembershipStatus(userId);
            if (statusRes.success && statusRes.data?.usage) {
              setMembershipUsage({
                jobsPosted: statusRes.data.usage.jobsPosted,
                jobsLimit: statusRes.data.usage.jobsLimit,
                jobsRemaining: statusRes.data.usage.jobsRemaining,
                planType: statusRes.data.usage.planType,
              });
            }
          } catch {
          }
        } else {
          setError(data.message || "Failed to fetch jobs");
        }
      } catch {
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
    } catch {
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  };

  // View applications for a job
  const handleViewApplications = (job: Job) => {
    navigate(`/recruiter/jobs/${job.id}/applications`);
  };

  // Helper functions
  const formatSalary = (job: Job): string => {
    if (!job.salaryMin && !job.salaryMax) return "—";
    const currency = job.salaryCurrency || "USD";
    const format = (amount: number) => {
      if (currency === "VND") {
        return `${(amount / 1000000).toFixed(0)}M VND`;
      }
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        maximumFractionDigits: 0,
      }).format(amount);
    };
    if (job.salaryMin && job.salaryMax) {
      return `${format(job.salaryMin)} - ${format(job.salaryMax)}`;
    }
    if (job.salaryMin) return `From ${format(job.salaryMin)}`;
    if (job.salaryMax) return `Up to ${format(job.salaryMax)}`;
    return "—";
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
          <Button 
            onClick={handleCreate} 
            className="gap-2"
            disabled={membershipUsage?.jobsRemaining === 0 && membershipUsage?.planType === "FREE"}
          >
            <Plus className="h-4 w-4" />
            Create Job
          </Button>
        </div>

        {/* Membership Usage Alert */}
        {membershipUsage && membershipUsage.jobsLimit !== null && membershipUsage.planType === "FREE" && (
          <Alert className={membershipUsage.jobsRemaining === 0 
            ? "border-destructive bg-destructive/10" 
            : membershipUsage.jobsRemaining && membershipUsage.jobsRemaining <= 2
            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
            : "border-primary/50 bg-primary/5"
          }>
            {membershipUsage.jobsRemaining === 0 ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Crown className="h-4 w-4 text-primary" />
            )}
            <AlertDescription>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-1">
                    {membershipUsage.jobsRemaining === 0
                      ? "You've reached your job posting limit"
                      : `${membershipUsage.jobsRemaining} job${membershipUsage.jobsRemaining !== 1 ? "s" : ""} remaining`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {membershipUsage.jobsPosted || 0} / {membershipUsage.jobsLimit} jobs posted
                    {membershipUsage.jobsRemaining === 0
                      ? ". Upgrade to VIP for unlimited job postings."
                      : membershipUsage.jobsRemaining && membershipUsage.jobsRemaining <= 2
                      ? ". Consider upgrading to VIP for unlimited postings."
                      : ""}
                  </p>
                </div>
                {membershipUsage.jobsRemaining === 0 && (
                  <Button
                    size="sm"
                    onClick={() => navigate("/recruiter/membership")}
                    className="gap-2 whitespace-nowrap"
                  >
                    <Crown className="h-4 w-4" />
                    Upgrade to VIP
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

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
          <>
            {/* Search and Filters Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Search & Filters
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      {filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"} found
                    </div>
                  </div>
                  {(search || statusFilter || employmentTypeFilter || locationTypeFilter) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setSearchInput("");
                        setStatusFilter("");
                        setEmploymentTypeFilter("");
                        setLocationTypeFilter("");
                        setSortBy("newest");
                      }}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Jobs</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Search by title, company name..."
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={handleSearch} size="default">
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>

                {/* Filters Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All Status</option>
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="CLOSED">Closed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>

                  {/* Employment Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Employment Type</label>
                    <select
                      value={employmentTypeFilter}
                      onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All Types</option>
                      {employmentTypeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location Type</label>
                    <select
                      value={locationTypeFilter}
                      onChange={(e) => setLocationTypeFilter(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All Locations</option>
                      {locationTypeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "title")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="title">Title (A-Z)</option>
                    </select>
                  </div>
                </div>

                {/* Active Filters */}
                {(search || statusFilter || employmentTypeFilter || locationTypeFilter) && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                    <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
                    {search && (
                      <Badge variant="outline" className="gap-1">
                        Search: {search}
                        <button
                          onClick={() => {
                            setSearch("");
                            setSearchInput("");
                          }}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {statusFilter && (
                      <Badge variant="outline" className="gap-1">
                        Status: {statusFilter}
                        <button
                          onClick={() => setStatusFilter("")}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {employmentTypeFilter && (
                      <Badge variant="outline" className="gap-1">
                        Type: {employmentTypeFilter.replace(/_/g, " ")}
                        <button
                          onClick={() => setEmploymentTypeFilter("")}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {locationTypeFilter && (
                      <Badge variant="outline" className="gap-1">
                        Location: {locationTypeFilter.replace(/_/g, " ")}
                        <button
                          onClick={() => setLocationTypeFilter("")}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Jobs Table Card */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Jobs List</CardTitle>
              </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/70 text-muted-foreground">
                    <tr className="border-b text-xs font-semibold uppercase tracking-wide">
                      <th className="px-4 py-3 text-left w-[25%]">Job</th>
                      <th className="px-4 py-3 text-center w-[8%]">Status</th>
                      <th className="px-4 py-3 text-left w-[10%]">Type</th>
                      <th className="px-4 py-3 text-left w-[10%]">Location</th>
                      <th className="px-4 py-3 text-left w-[10%]">Salary</th>
                      <th className="px-4 py-3 text-center w-[12%]">Engagement</th>
                      <th className={`px-4 py-3 text-right ${isVIP ? "w-[10%]" : "w-[15%]"}`}>Created</th>
                      <th className={`px-4 py-3 text-right ${isVIP ? "w-[15%]" : "w-[20%]"}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pagedJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="hover:bg-muted/40 transition cursor-pointer"
                        onClick={() => navigate(`/recruiter/jobs/${job.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            <div className="font-semibold break-words text-foreground">{job.title}</div>
                            <div className="text-xs text-muted-foreground break-words">
                              <span className="inline-flex items-center gap-2">
                                <Building2 className="h-3 w-3" />
                                {job.company?.name || "Company"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <Badge className={`inline-flex h-8 items-center gap-2 px-3 text-sm font-medium border ${jobStatusConfig[job.status]?.color || "bg-muted text-muted-foreground border-border"}`}>
                              {jobStatusConfig[job.status]?.icon ?? <Clock className="h-4 w-4" />}
                              {jobStatusConfig[job.status]?.label || job.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="space-y-1">
                            {job.employmentType && (
                              <div className="font-medium">{job.employmentType}</div>
                            )}
                            {job.experienceLevel && (
                              <div className="text-xs">{job.experienceLevel}</div>
                            )}
                            {!job.employmentType && !job.experienceLevel && (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="break-words">{job.location || "—"}</span>
                            </div>
                            <div className="text-xs">{job.locationType || ""}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <DollarSign className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-xs font-medium">{formatSalary(job)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isVIP ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="flex items-center gap-2 text-xs">
                                <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                <span className="font-semibold text-foreground">
                                  {job.viewsCount?.toLocaleString() || 0}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <MousePointerClick className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                <span className="font-semibold text-foreground">
                                  {job.clicksCount?.toLocaleString() || 0}
                                </span>
                              </div>
                              {job.viewsCount && job.viewsCount > 0 ? (
                                <div className="text-[10px] text-muted-foreground">
                                  CTR: {((job.clicksCount || 0) / job.viewsCount * 100).toFixed(1)}%
                                </div>
                              ) : (
                                <div className="text-[10px] text-muted-foreground/50 italic">
                                  No data
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">VIP Only</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap text-xs">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2 justify-end">
                            <Button
                              variant="default"
                              size="sm"
                              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm min-w-[140px] justify-center"
                              onClick={() => handleViewApplications(job)}
                            >
                              <span>Applications</span>
                              <Badge 
                                variant="outline" 
                                className="ml-1 bg-primary-foreground/30 text-primary-foreground border-0 font-bold min-w-[24px] h-5 flex items-center justify-center"
                              >
                                {applicationsCounts[job.id] ?? 0}
                              </Badge>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(job)}
                              title="Delete Job"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pagedJobs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
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
            </>
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
        loading={deleting}
      />
    </div>
  );
};

export default RecruiterJobs;
