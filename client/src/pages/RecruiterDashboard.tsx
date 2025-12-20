import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isRecruiterLoggedIn, logout, getCurrentUser } from "@/lib/auth";
import {
  BriefcaseBusiness,
  Users,
  ClipboardList,
  Calendar,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Search,
  MapPin,
  Globe,
  Edit,
  Save,
  X,
  Plus,
} from "lucide-react";
import { getCompanySizeOptions, getFoundedYearOptions } from "@/constants/company";

type Stats = {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  totalInterviews: number;
  pendingApplications: number;
  upcomingInterviews: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatShortDate(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function daysBack(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function toDayKey(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

function SparklineArea({
  points,
  height = 60,
  stroke = "#2563eb",
  fill = "rgba(37, 99, 235, 0.12)",
}: {
  points: number[];
  height?: number;
  stroke?: string;
  fill?: string;
}) {
  const width = 220;
  const pad = 6;
  const max = Math.max(1, ...points);
  const min = Math.min(0, ...points);
  const range = Math.max(1, max - min);
  const step = points.length <= 1 ? 0 : (width - pad * 2) / (points.length - 1);

  const coords = points.map((v, i) => {
    const x = pad + i * step;
    const y = pad + ((max - v) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const area = `${d} L ${(pad + (points.length - 1) * step).toFixed(2)} ${(height - pad).toFixed(2)} L ${pad.toFixed(2)} ${(height - pad).toFixed(2)} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="trend">
      <path d={area} fill={fill} stroke="none" />
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Donut({
  segments,
  size = 84,
  thickness = 10,
}: {
  segments: Array<{ value: number; color: string }>;
  size?: number;
  thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = Math.max(1, segments.reduce((acc, s) => acc + s.value, 0));

  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="breakdown">
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(148, 163, 184, 0.25)" strokeWidth={thickness} />
      {segments.map((s, idx) => {
        const len = (s.value / total) * circumference;
        const dasharray = `${len} ${circumference - len}`;
        const dashoffset = -offset;
        offset += len;
        return (
          <circle
            key={idx}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${c} ${c})`}
          />
        );
      })}
    </svg>
  );
}

type Job = {
  id: string;
  title: string;
  status: string;
  location?: string;
  locationType?: string;
  employmentType?: string;
  experienceLevel?: string;
  applicationsCount: number;
  createdAt: string;
};

type RecruiterApplication = {
  id: string;
  jobId: string;
  status: string;
  appliedAt: string;
  job?: { title?: string; company?: { name?: string } };
  candidate?: { user?: { firstName?: string | null; lastName?: string | null; email?: string } };
};

type RecruiterInterview = {
  scheduledAt?: string | null;
  status?: string | null;
};

type Company = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  website?: string | null;
  industry?: string | null;
  companySize?: string | null;  // Backend uses "companySize" not "size"
  foundedYear?: number | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;  // Backend uses "coverUrl" not "coverImageUrl"
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Normalize optional integer field from form state to avoid sending invalid types to API.
 * - "" / null => null
 * - "2020" => 2020
 * - number => number
 * - undefined => undefined (omit)
 */
function normalizeOptionalInt(value: unknown): number | null | undefined {
  if (typeof value === "undefined") return undefined;
  if (value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    totalInterviews: 0,
    pendingApplications: 0,
    upcomingInterviews: 0,
  });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [allApplications, setAllApplications] = useState<RecruiterApplication[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);

  const tabFromUrl = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    const t = (qs.get("tab") || "overview").toLowerCase();
    return ["overview", "jobs", "applications", "company"].includes(t) ? t : "overview";
  }, [location.search]);
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    // Only allow RECRUITER role (Admin has their own dashboard)
    const user = getCurrentUser();
    console.log("RecruiterDashboard - Current user:", user);
    
    if (!isRecruiterLoggedIn()) {
      console.log("Not logged in as recruiter, redirecting to /login");
      navigate("/login");
    } else {
      console.log("Recruiter authenticated");
      setIsAuthenticated(true);
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentUser = getCurrentUser();
  const recruiterUserId = currentUser?.id;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";
        
        // Get auth header
        const headers: Record<string, string> = {};
        if (recruiterUserId) headers["Authorization"] = `Bearer ${recruiterUserId}`;
        
        // Fetch recruiter profile with company info
        const meRes = await fetch(`${apiBase}/auth/me`, { headers });
        const meData = await meRes.json();
        console.log("Auth /me response:", meData);
        if (meData.success && meData.recruiterProfile?.company) {
          console.log("Setting company:", meData.recruiterProfile.company);
          setCompany(meData.recruiterProfile.company);
        } else {
          console.log("No company found in response");
        }
        
        // Fetch jobs (use filtered API endpoint to get only recruiter's jobs)
        const jobsRes = await fetch(`${apiBase}/api/jobs?pageSize=100`, { headers });
        const jobsData = await jobsRes.json();
        const jobs = jobsData.data || [];
        setAllJobs(jobs);
        
        // Fetch applications (use filtered API endpoint)
        const appsRes = await fetch(`${apiBase}/api/applications?pageSize=100`, { headers });
        const appsData = await appsRes.json();
        const applications: RecruiterApplication[] = appsData.data || [];
        setAllApplications(applications);
        
        // Fetch interviews (use filtered API endpoint)
        const interviewsRes = await fetch(`${apiBase}/api/interviews?pageSize=100`, { headers });
        const interviewsData = await interviewsRes.json();
        const interviews: RecruiterInterview[] = interviewsData.data || [];

        // Calculate stats
        const activeJobs = jobs.filter((j: Job) => j.status === "PUBLISHED").length;
        const pendingApps = applications.filter((a) => a.status === "APPLIED" || a.status === "REVIEWING").length;
        const upcoming = interviews.filter((i) =>
          i.scheduledAt && new Date(i.scheduledAt) > new Date() && i.status === "SCHEDULED"
        ).length;

        setStats({
          totalJobs: jobs.length,
          activeJobs,
          totalApplications: applications.length,
          totalInterviews: interviews.length,
          pendingApplications: pendingApps,
          upcomingInterviews: upcoming,
        });

        // Recent jobs
        setRecentJobs(jobs.slice(0, 5));
      } catch (err) {
        console.error("Failed to load recruiter data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && recruiterUserId) {
      loadData();
    }
  }, [isAuthenticated, recruiterUserId]);

  const setTab = (tab: string) => {
    const qs = new URLSearchParams(location.search);
    qs.set("tab", tab);
    navigate(`/recruiter?${qs.toString()}`);
  };

  // Jobs panel state
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("");
  const [jobEmploymentFilter, setJobEmploymentFilter] = useState<string>("");
  const [jobLocationTypeFilter, setJobLocationTypeFilter] = useState<string>("");
  const [jobSortBy, setJobSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [jobPage, setJobPage] = useState(1);
  const jobPageSize = 10;

  useEffect(() => {
    setJobPage(1);
  }, [jobSearch, jobStatusFilter, jobEmploymentFilter, jobLocationTypeFilter, jobSortBy]);

  const employmentTypeOptions = useMemo(() => {
    const base = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"];
    const extra = Array.from(new Set(allJobs.map((j) => j.employmentType).filter(Boolean) as string[]));
    return Array.from(new Set([...base, ...extra]));
  }, [allJobs]);

  const locationTypeOptions = useMemo(() => {
    const base = ["REMOTE", "ONSITE", "HYBRID"];
    const extra = Array.from(new Set(allJobs.map((j) => j.locationType).filter(Boolean) as string[]));
    return Array.from(new Set([...base, ...extra]));
  }, [allJobs]);

  const filteredJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    const next = (allJobs || []).filter((j) => {
      if (q) {
        const hay = `${j.title ?? ""} ${j.location ?? ""} ${j.status ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (jobStatusFilter && String(j.status) !== jobStatusFilter) return false;
      if (jobEmploymentFilter && String(j.employmentType ?? "") !== jobEmploymentFilter) return false;
      if (jobLocationTypeFilter && String(j.locationType ?? "") !== jobLocationTypeFilter) return false;
      return true;
    });
    next.sort((a, b) => {
      if (jobSortBy === "title") return String(a.title ?? "").localeCompare(String(b.title ?? ""));
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      return jobSortBy === "newest" ? bt - at : at - bt;
    });
    return next;
  }, [allJobs, jobEmploymentFilter, jobLocationTypeFilter, jobSearch, jobSortBy, jobStatusFilter]);

  const jobTotalPages = Math.max(1, Math.ceil(filteredJobs.length / jobPageSize));
  const jobCurrentPage = Math.min(jobPage, jobTotalPages);
  const pagedJobs = useMemo(() => {
    const start = (jobCurrentPage - 1) * jobPageSize;
    return filteredJobs.slice(start, start + jobPageSize);
  }, [filteredJobs, jobCurrentPage]);

  // Applications panel state
  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("");
  const [appPage, setAppPage] = useState(1);
  const appPageSize = 10;

  useEffect(() => {
    setAppPage(1);
  }, [appSearch, appStatusFilter]);

  const filteredApps = useMemo(() => {
    const q = appSearch.trim().toLowerCase();
    const next = (allApplications || []).filter((a) => {
      if (appStatusFilter && String(a.status) !== appStatusFilter) return false;
      if (q) {
        const candidateName = `${a?.candidate?.user?.firstName ?? ""} ${a?.candidate?.user?.lastName ?? ""}`.trim();
        const email = a?.candidate?.user?.email ?? "";
        const jobTitle = a?.job?.title ?? "";
        const hay = `${candidateName} ${email} ${jobTitle}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    next.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
    return next;
  }, [allApplications, appSearch, appStatusFilter]);

  const appTotalPages = Math.max(1, Math.ceil(filteredApps.length / appPageSize));
  const appCurrentPage = Math.min(appPage, appTotalPages);
  const pagedApps = useMemo(() => {
    const start = (appCurrentPage - 1) * appPageSize;
    return filteredApps.slice(start, start + appPageSize);
  }, [filteredApps, appCurrentPage]);

  // Charts
  const applicationStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (allApplications || []).forEach((a) => {
      const k = String(a?.status ?? "UNKNOWN");
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [allApplications]);

  const jobStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (allJobs || []).forEach((j) => {
      const k = String(j?.status ?? "UNKNOWN");
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [allJobs]);

  const last14Days = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => daysBack(13 - i));
    const byDay: Record<string, number> = {};
    days.forEach((d) => (byDay[toDayKey(d)] = 0));
    (allApplications || []).forEach((a) => {
      const ts = a?.appliedAt ? new Date(a.appliedAt) : null;
      if (!ts || Number.isNaN(ts.getTime())) return;
      const key = toDayKey(ts);
      if (key in byDay) byDay[key] += 1;
    });
    return {
      labels: days.map((d) => formatShortDate(d)),
      values: days.map((d) => byDay[toDayKey(d)] || 0),
      total: Object.values(byDay).reduce((acc, v) => acc + v, 0),
    };
  }, [allApplications]);

  const donutSegments = useMemo(() => {
    const get = (k: string) => applicationStatusCounts[k] || 0;
    return [
      { label: "Applied", value: get("APPLIED"), color: "#60a5fa" },
      { label: "Reviewing", value: get("REVIEWING"), color: "#f59e0b" },
      { label: "Shortlisted", value: get("SHORTLISTED"), color: "#a78bfa" },
      { label: "Interview", value: get("INTERVIEW_SCHEDULED") + get("INTERVIEWED"), color: "#22c55e" },
      { label: "Rejected", value: get("REJECTED") + get("WITHDRAWN"), color: "#f87171" },
    ].filter((s) => s.value > 0);
  }, [applicationStatusCounts]);

  const donutTotal = useMemo(() => donutSegments.reduce((a, s) => a + s.value, 0), [donutSegments]);

  const handleEditCompany = () => {
    if (company) {
      setEditForm(company);
      setShowEditModal(true);
    }
  };

  const handleSaveCompany = async () => {
    if (!company || !currentUser) return;

    try {
      setSaving(true);
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";

      const payload: Partial<Company> = {
        ...editForm,
        foundedYear: normalizeOptionalInt(editForm.foundedYear),
      };
      
      const response = await fetch(`${apiBase}/companies/${company.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        setCompany(data.data);
        setShowEditModal(false);
        // Show success message (you can add a toast here)
      } else {
        alert(data.message || "Failed to update company");
      }
    } catch (err) {
      console.error("Failed to save company:", err);
      alert("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const foundedYearOptions = getFoundedYearOptions();
  const companySizeOptions = getCompanySizeOptions(editForm.companySize ?? company?.companySize ?? null);

  if (!isAuthenticated) {
    return (
      <main className="min-h-dvh bg-muted/40 py-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Redirecting to Login...</h2>
          <p className="text-muted-foreground">Please log in as a Recruiter</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-muted/40 py-8">
      <div className="container mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {currentUser?.email || "Manage recruitment pipeline"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <BriefcaseBusiness className="h-3 w-3" />
              {currentUser?.role || "Recruiter"}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse space-y-4">
                  <p className="text-muted-foreground text-lg">Loading dashboard...</p>
                  <div className="flex justify-center gap-2">
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Tabs value={activeTab} onValueChange={(v) => setTab(v)} className="space-y-4">
                  <TabsList className="flex flex-wrap h-auto">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="jobs">Jobs</TabsTrigger>
                    <TabsTrigger value="applications">Applications</TabsTrigger>
                    <TabsTrigger value="company">Company</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    {/* Visual Insights */}
                    <div className="grid gap-4 lg:grid-cols-3">
                      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Applications (last 14 days)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-end justify-between">
                          <div>
                              <div className="text-2xl font-bold">{last14Days.total}</div>
                              <div className="text-xs text-muted-foreground">Total received</div>
                          </div>
                            <div className="rounded-lg border bg-background/70 px-2 py-1 text-xs text-muted-foreground">
                              {last14Days.labels[0]} → {last14Days.labels[last14Days.labels.length - 1]}
                        </div>
                      </div>
                          <div className="flex items-center justify-between gap-3">
                            <SparklineArea points={last14Days.values} />
                            <div className="hidden sm:block text-xs text-muted-foreground">
                              Peak:{" "}
                              <span className="font-medium text-foreground">
                                {Math.max(0, ...last14Days.values)}
                              </span>
                              <br />
                              Avg/day:{" "}
                              <span className="font-medium text-foreground">
                                {(last14Days.total / 14).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-emerald-500/10 via-background to-background">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Application breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center gap-4">
                          <Donut segments={donutSegments.map((s) => ({ value: s.value, color: s.color }))} />
                          <div className="flex-1 space-y-1">
                            <div className="text-xs text-muted-foreground">
                              Total: <span className="font-medium text-foreground">{donutTotal}</span>
                            </div>
                            {donutSegments.length === 0 ? (
                              <div className="text-sm text-muted-foreground">No applications yet.</div>
                            ) : (
                              <div className="space-y-1">
                                {donutSegments.slice(0, 5).map((s) => (
                                  <div key={s.label} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: s.color }}
                                      />
                                      <span className="text-muted-foreground">{s.label}</span>
                        </div>
                                    <span className="font-medium">{s.value}</span>
                            </div>
                                ))}
                            </div>
                          )}
                            </div>
                        </CardContent>
                      </Card>

                      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-indigo-500/10 via-background to-background">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Job status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {(() => {
                            const rows = [
                              { key: "PUBLISHED", label: "Published", color: "bg-emerald-500" },
                              { key: "DRAFT", label: "Draft", color: "bg-slate-400" },
                              { key: "CLOSED", label: "Closed", color: "bg-amber-500" },
                              { key: "ARCHIVED", label: "Archived", color: "bg-rose-500" },
                            ];
                            const total = Math.max(
                              1,
                              rows.reduce((acc, r) => acc + (jobStatusCounts[r.key] || 0), 0)
                            );
                            return (
                              <div className="space-y-2">
                                {rows.map((r) => {
                                  const v = jobStatusCounts[r.key] || 0;
                                  const pct = clamp((v / total) * 100, 0, 100);
                                  return (
                                    <div key={r.key} className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">{r.label}</span>
                                        <span className="font-medium">{v}</span>
                        </div>
                                      <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                                        <div className={`h-full ${r.color}`} style={{ width: `${pct}%` }} />
                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                    </CardContent>
                  </Card>
                    </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                      <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalJobs}</div>
                          <p className="text-xs text-muted-foreground">{stats.activeJobs} active</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Applications</CardTitle>
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalApplications}</div>
                          <p className="text-xs text-muted-foreground">{stats.pendingApplications} pending review</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Interviews</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalInterviews}</div>
                          <p className="text-xs text-muted-foreground">{stats.upcomingInterviews} upcoming</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                          <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => setTab("jobs")}>
                      <BriefcaseBusiness className="h-5 w-5" />
                      <span className="text-sm">Manage Jobs</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-2 py-4"
                            onClick={() => setTab("applications")}
                    >
                      <ClipboardList className="h-5 w-5" />
                            <span className="text-sm">Review Applications</span>
                    </Button>
                          <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => setTab("company")}>
                            <Building2 className="h-5 w-5" />
                            <span className="text-sm">Edit Company</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-2 py-4"
                            onClick={() => navigate("/recruiter/jobs", { state: { mode: "create" } })}
                    >
                      <Users className="h-5 w-5" />
                      <span className="text-sm">Create New Job</span>
                    </Button>
                  </div>
                  </CardContent>
                </Card>

                {/* Recent Jobs */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Job Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentJobs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No jobs posted yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {recentJobs.map((job) => (
                          <div
                            key={job.id}
                            className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition cursor-pointer"
                            onClick={() => navigate(`/recruiter/jobs/${job.id}/applications`)}
                          >
                            <div className="flex-1">
                              <h3 className="font-medium">{job.title}</h3>
                              <p className="text-xs text-muted-foreground">
                                {job.location || "Remote"} • Posted {new Date(job.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm font-medium">{job.applicationsCount || 0}</div>
                                <div className="text-xs text-muted-foreground">applications</div>
                              </div>
                                  <Badge variant={job.status === "PUBLISHED" ? "default" : "outline"} className="gap-1">
                                {job.status === "PUBLISHED" ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : job.status === "DRAFT" ? (
                                  <Clock className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                {job.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Overview */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Hiring Pipeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>New Applications</span>
                          <span className="font-medium">{stats.pendingApplications}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Scheduled Interviews</span>
                          <span className="font-medium">{stats.upcomingInterviews}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Active Job Posts</span>
                          <span className="font-medium">{stats.activeJobs}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Quick Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Review pending applications daily</li>
                        <li>• Schedule interviews within 48 hours</li>
                        <li>• Keep job descriptions updated</li>
                        <li>• Respond to candidate inquiries promptly</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                  </TabsContent>

                  <TabsContent value="jobs" className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <CardTitle className="text-lg">Jobs</CardTitle>
                            <div className="text-xs text-muted-foreground">
                              {filteredJobs.length} result{filteredJobs.length === 1 ? "" : "s"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button onClick={() => navigate("/recruiter/jobs", { state: { mode: "create" } })}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div className="relative w-full lg:w-[420px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={jobSearch}
                              onChange={(e) => setJobSearch(e.target.value)}
                              placeholder="Search jobs..."
                              className="pl-9"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={jobStatusFilter}
                              onChange={(e) => setJobStatusFilter(e.target.value)}
                              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="">All status</option>
                              <option value="DRAFT">DRAFT</option>
                              <option value="PUBLISHED">PUBLISHED</option>
                              <option value="CLOSED">CLOSED</option>
                              <option value="ARCHIVED">ARCHIVED</option>
                            </select>
                            <select
                              value={jobEmploymentFilter}
                              onChange={(e) => setJobEmploymentFilter(e.target.value)}
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
                              value={jobLocationTypeFilter}
                              onChange={(e) => setJobLocationTypeFilter(e.target.value)}
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
                              value={jobSortBy}
                              onChange={(e) => setJobSortBy(e.target.value as "newest" | "oldest" | "title")}
                              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="newest">Newest</option>
                              <option value="oldest">Oldest</option>
                              <option value="title">Title</option>
                            </select>
                            {(jobSearch || jobStatusFilter || jobEmploymentFilter || jobLocationTypeFilter) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setJobSearch("");
                                  setJobStatusFilter("");
                                  setJobEmploymentFilter("");
                                  setJobLocationTypeFilter("");
                                }}
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border">
                          <table className="min-w-full text-sm">
                            <thead className="bg-muted/70 text-muted-foreground">
                              <tr className="border-b text-xs font-semibold uppercase tracking-wide">
                                <th className="px-4 py-3 text-left w-[46%]">Job</th>
                                <th className="px-4 py-3 text-center w-[18%]">Status</th>
                                <th className="px-4 py-3 text-left w-[18%]">Type</th>
                                <th className="px-4 py-3 text-right w-[18%]">Created</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {pagedJobs.map((j) => (
                                <tr
                                  key={j.id}
                                  className="hover:bg-muted/40 transition cursor-pointer"
                                  onClick={() => navigate("/recruiter/jobs", { state: { openJobId: j.id } })}
                                >
                                  <td className="px-4 py-3">
                                    <div className="font-semibold break-words">{j.title}</div>
                                    <div className="text-xs text-muted-foreground break-words">
                                      <span className="inline-flex items-center gap-2">
                                        <MapPin className="h-3 w-3" />
                                        {j.location || "—"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex justify-center">
                                      <Badge
                                        variant={j.status === "PUBLISHED" ? "default" : "outline"}
                                        className="inline-flex h-8 items-center gap-2 px-3 text-sm font-medium"
                                      >
                                        {j.status === "PUBLISHED" ? (
                                          <CheckCircle2 className="h-4 w-4" />
                                        ) : j.status === "DRAFT" ? (
                                          <Clock className="h-4 w-4" />
                                        ) : (
                                          <XCircle className="h-4 w-4" />
                                        )}
                                        {j.status}
                                      </Badge>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                    <div className="space-y-1">
                                      <div>{j.employmentType || "—"}</div>
                                      <div className="text-xs">{j.experienceLevel || ""}</div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                                    {new Date(j.createdAt).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                              {pagedJobs.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                                    No jobs match your filters.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div>
                            Page {jobCurrentPage} / {jobTotalPages}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setJobPage((p) => Math.max(1, p - 1))} disabled={jobCurrentPage === 1}>
                              Prev
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setJobPage((p) => Math.min(jobTotalPages, p + 1))} disabled={jobCurrentPage === jobTotalPages}>
                              Next
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="applications" className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <CardTitle className="text-lg">Applications</CardTitle>
                            <div className="text-xs text-muted-foreground">
                              {filteredApps.length} result{filteredApps.length === 1 ? "" : "s"}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div className="relative w-full lg:w-[420px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={appSearch}
                              onChange={(e) => setAppSearch(e.target.value)}
                              placeholder="Search by candidate, email, job..."
                              className="pl-9"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={appStatusFilter}
                              onChange={(e) => setAppStatusFilter(e.target.value)}
                              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="">All status</option>
                              <option value="APPLIED">APPLIED</option>
                              <option value="REVIEWING">REVIEWING</option>
                              <option value="SHORTLISTED">SHORTLISTED</option>
                              <option value="INTERVIEW_SCHEDULED">INTERVIEW_SCHEDULED</option>
                              <option value="INTERVIEWED">INTERVIEWED</option>
                              <option value="OFFER_SENT">OFFER_SENT</option>
                              <option value="HIRED">HIRED</option>
                              <option value="REJECTED">REJECTED</option>
                              <option value="WITHDRAWN">WITHDRAWN</option>
                            </select>
                            {(appSearch || appStatusFilter) && (
                              <Button size="sm" variant="ghost" onClick={() => { setAppSearch(""); setAppStatusFilter(""); }}>
                                Clear
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border">
                          <table className="min-w-full text-sm">
                            <thead className="bg-muted/70 text-muted-foreground">
                              <tr className="border-b text-xs font-semibold uppercase tracking-wide">
                                <th className="px-4 py-3 text-left w-[32%]">Candidate</th>
                                <th className="px-4 py-3 text-left w-[36%]">Job</th>
                                <th className="px-4 py-3 text-center w-[18%]">Status</th>
                                <th className="px-4 py-3 text-right w-[14%]">Applied</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {pagedApps.map((a) => {
                                const candidateName = `${a?.candidate?.user?.firstName ?? ""} ${a?.candidate?.user?.lastName ?? ""}`.trim() || (a?.candidate?.user?.email ?? "Candidate");
                                return (
                                  <tr
                                    key={a.id}
                                    className="hover:bg-muted/40 transition cursor-pointer"
                                    onClick={() => navigate(`/recruiter/jobs/${a.jobId}/applications`, { state: { applicationId: a.id } })}
                                  >
                                    <td className="px-4 py-3">
                                      <div className="font-semibold break-words">{candidateName}</div>
                                      <div className="text-xs text-muted-foreground break-words">{a?.candidate?.user?.email ?? ""}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="font-semibold break-words">{a?.job?.title ?? "Job"}</div>
                                      <div className="text-xs text-muted-foreground break-words">{a?.job?.company?.name ?? ""}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex justify-center">
                                        <Badge variant="outline" className="inline-flex h-8 items-center px-3 text-sm font-medium">
                                          {a.status}
                                        </Badge>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                                      {new Date(a.appliedAt).toLocaleDateString()}
                                    </td>
                                  </tr>
                                );
                              })}
                              {pagedApps.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                                    No applications match your filters.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div>
                            Page {appCurrentPage} / {appTotalPages}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setAppPage((p) => Math.max(1, p - 1))} disabled={appCurrentPage === 1}>
                              Prev
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setAppPage((p) => Math.min(appTotalPages, p + 1))} disabled={appCurrentPage === appTotalPages}>
                              Next
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="company" className="space-y-4">
                    {company ? (
                      <Card className="border-primary/20">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              {company.logoUrl ? (
                                <img src={company.logoUrl} alt={company.name} className="h-16 w-16 rounded-lg object-cover border" />
                              ) : (
                                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Building2 className="h-8 w-8 text-primary" />
                                </div>
                              )}
                              <div>
                                <CardTitle className="text-2xl">{company.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">{company.industry || "No industry specified"}</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleEditCompany} className="gap-2">
                              <Edit className="h-4 w-4" />
                              Edit Company
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-3">
                              {company.description && (
                                <div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">{company.description}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{company.city || company.country || "Location not set"}</span>
                              </div>
                              {company.website && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    {company.website}
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="space-y-3">
                              {company.companySize && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span>{company.companySize} employees</span>
                                </div>
                              )}
                              {company.foundedYear && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>Founded {company.foundedYear}</span>
                                </div>
                              )}
                              {company.address && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{company.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">No company found.</CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>

        {/* Edit Company Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Company Information</DialogTitle>
              <DialogDescription>
                Update your company details. These changes will be reflected across all job postings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={editForm.industry || ""}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    placeholder="Technology"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Brief description of your company..."
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={editForm.city || ""}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="San Francisco"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={editForm.country || ""}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    placeholder="United States"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={editForm.address || ""}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="123 Main St, Suite 100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={editForm.website || ""}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <select
                    id="companySize"
                    value={editForm.companySize ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditForm({ ...editForm, companySize: v === "" ? null : v });
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">—</option>
                    {companySizeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="foundedYear">Founded Year</Label>
                  <select
                    id="foundedYear"
                    value={String(editForm.foundedYear ?? "")}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditForm({
                        ...editForm,
                        foundedYear: v === "" ? null : Number.parseInt(v, 10),
                      });
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">—</option>
                    {foundedYearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={editForm.logoUrl || ""}
                    onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverUrl">Cover Image URL</Label>
                <Input
                  id="coverUrl"
                  value={editForm.coverUrl || ""}
                  onChange={(e) => setEditForm({ ...editForm, coverUrl: e.target.value })}
                  placeholder="https://example.com/cover.png"
                />
              </div>

              {editForm.logoUrl && (
                <div className="space-y-2">
                  <Label>Logo Preview</Label>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <img
                      src={editForm.logoUrl}
                      alt="Logo preview"
                      className="h-20 w-20 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveCompany} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </main>
  );
};

export default RecruiterDashboard;
