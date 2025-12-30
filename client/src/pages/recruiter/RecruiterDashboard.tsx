import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isRecruiterLoggedIn, getCurrentUser } from "@/lib/auth";
import {
  Calendar,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Search,
  MapPin,
  Save,
  Plus,
  User,
  FileText,
  ExternalLink,
  AlertTriangle,
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
  resumeUrl?: string;
  coverLetter?: string;
  job?: { title?: string; company?: { name?: string } };
  candidate?: {
    id: string;
    user?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string;
      avatarUrl?: string | null;
    };
    skills?: Array<{ id: string; skillId: string; level?: string | null; skill?: { id: string; name: string } }>;
    experiences?: Array<{
      id: string;
      companyName: string;
      position: string;
      startDate: string;
      endDate?: string | null;
      isCurrent?: boolean;
    }>;
  };
  notes?: Array<{ id: string; authorId: string; content: string; createdAt: string }>;
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

const RecruiterDashboard = ({ showOnly }: { showOnly?: "applications" | "company" } = {}) => {
  const navigate = useNavigate();
  // const location = useLocation();
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
  const [selectedApplication, setSelectedApplication] = useState<RecruiterApplication | null>(null);
  const [recruiterProfileId, setRecruiterProfileId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Jobs panel state - moved before useEffect that uses them
  const [jobSearchInput, setJobSearchInput] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("");
  const [jobEmploymentFilter, setJobEmploymentFilter] = useState<string>("");
  const [jobLocationTypeFilter, setJobLocationTypeFilter] = useState<string>("");
  const [jobSortBy, setJobSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [jobPage, setJobPage] = useState(1);
  const jobPageSize = 10;

  // Applications panel state - moved before useEffect that uses them
  const [appSearchInput, setAppSearchInput] = useState("");
  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("");
  // const [appSortBy, setAppSortBy] = useState<"newest" | "oldest">("newest");
  const [appPage, setAppPage] = useState(1);
  const appPageSize = 10;

  // Get active tab from URL path - only show overview in dashboard
  const activeTab = "overview";

  useEffect(() => {
    // Only allow RECRUITER role (Admin has their own dashboard)
    if (!isRecruiterLoggedIn()) {
      navigate("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  // const handleLogout = () => {
  //   logout();
  //   navigate("/login");
  // };

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
        if (meData.success) {
          if (meData.recruiterProfile?.company) {
          const companyData = meData.recruiterProfile.company;
          setCompany(companyData);
          setEditForm(companyData);
          }
          if (meData.recruiterProfile?.id) {
            setRecruiterProfileId(meData.recruiterProfile.id);
          }
        }
        
        // Fetch jobs (use filtered API endpoint to get only recruiter's jobs)
        const searchParam = jobSearch.trim() ? `&q=${encodeURIComponent(jobSearch.trim())}` : "";
        const jobsRes = await fetch(`${apiBase}/api/jobs?pageSize=100${searchParam}`, { headers });
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
      } catch {
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && recruiterUserId) {
      loadData();
    }
  }, [isAuthenticated, recruiterUserId, jobSearch, appSearch]);

  const setTab = (tab: string) => {
    if (tab === "overview") {
      navigate("/recruiter/dashboard", { replace: true });
    } else if (tab === "jobs") {
      navigate("/recruiter/jobs", { replace: true });
    } else if (tab === "applications") {
      navigate("/recruiter/applications", { replace: true });
    } else if (tab === "company") {
      navigate("/recruiter/company", { replace: true });
    }
  };

  // Helper function to render Applications tab content
  function renderApplicationsTabContent() {
    return (
      <div className="space-y-6">
        <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Applications
              </CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                {filteredApps.length} result{filteredApps.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:w-[420px] flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={appSearchInput}
                  onChange={(e) => setAppSearchInput(e.target.value)}
                  onKeyPress={handleAppSearchKeyPress}
                  placeholder="Search by candidate, email, job..."
                  className="pl-9"
                />
              </div>
              <Button onClick={handleAppSearch} size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
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
              <thead className="bg-muted/50">
                <tr className="border-b text-xs font-semibold uppercase tracking-wide">
                  <th className="px-4 py-3 text-left w-[32%]">Candidate</th>
                  <th className="px-4 py-3 text-left w-[36%]">Job</th>
                  <th className="px-4 py-3 text-center w-[18%]">Status</th>
                  <th className="px-4 py-3 text-right w-[14%]">Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pagedApps.map((a, index) => {
                  const candidateName = `${a?.candidate?.user?.firstName ?? ""} ${a?.candidate?.user?.lastName ?? ""}`.trim() || (a?.candidate?.user?.email ?? "Candidate");
                  
                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-muted/50 transition cursor-pointer ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/20"
                      }`}
                      onClick={() => handleApplicationClick(a.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold break-words">{candidateName}</div>
                        <div className="text-xs text-muted-foreground break-words mt-1">{a?.candidate?.user?.email ?? ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold break-words">{a?.job?.title ?? "Job"}</div>
                        <div className="text-xs text-muted-foreground break-words mt-1">{a?.job?.company?.name ?? ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Badge variant="outline" className="inline-flex h-8 items-center gap-2 px-3 text-sm font-medium">
                            {a.status === "APPLIED" && <Clock className="h-3.5 w-3.5" />}
                            {a.status === "REVIEWING" && <Clock className="h-3.5 w-3.5" />}
                            {a.status === "SHORTLISTED" && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {a.status === "INTERVIEW_SCHEDULED" && <Calendar className="h-3.5 w-3.5" />}
                            {a.status === "INTERVIEWED" && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {a.status === "OFFER_SENT" && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {a.status === "HIRED" && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {a.status === "REJECTED" && <XCircle className="h-3.5 w-3.5" />}
                            {a.status === "WITHDRAWN" && <XCircle className="h-3.5 w-3.5" />}
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
      </div>
    );
  }

  // Helper function to render Company tab content
  function renderCompanyTabContent() {
    return (
      <div className="space-y-6">
        {company ? (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                {editForm.logoUrl ? (
                  <img 
                    src={editForm.logoUrl} 
                    alt={editForm.name || "Company logo"} 
                    className="h-16 w-16 rounded-lg object-cover border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div 
                  className={`h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center ${editForm.logoUrl ? "hidden" : ""}`}
                >
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{editForm.name || company.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{editForm.industry || company.industry || "No industry specified"}</p>
                </div>
              </div>
              <CardTitle>Edit Company Information</CardTitle>
              <p className="text-sm text-muted-foreground">
                Update your company details. These changes will be reflected across all job postings.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                    <Label htmlFor="logoUrl">Logo</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          id="logoUrl"
                          value={editForm.logoUrl || ""}
                          onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                          placeholder="https://example.com/logo.png hoặc upload ảnh"
                          className="flex-1"
                        />
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadImage(file, "logo");
                            }
                          }}
                          disabled={uploadingLogo}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          disabled={uploadingLogo}
                          onClick={() => logoInputRef.current?.click()}
                        >
                          {uploadingLogo ? "Đang upload..." : "Upload"}
                        </Button>
                      </div>
                      {editForm.logoUrl && (
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
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coverUrl">Cover Image</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        id="coverUrl"
                        value={editForm.coverUrl || ""}
                        onChange={(e) => setEditForm({ ...editForm, coverUrl: e.target.value })}
                        placeholder="https://example.com/cover.png hoặc upload ảnh"
                        className="flex-1"
                      />
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadImage(file, "cover");
                          }
                        }}
                        disabled={uploadingCover}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        disabled={uploadingCover}
                        onClick={() => coverInputRef.current?.click()}
                      >
                        {uploadingCover ? "Đang upload..." : "Upload"}
                      </Button>
                    </div>
                    {editForm.coverUrl && (
                      <div className="border rounded-lg p-4 bg-muted/20">
                        <img
                          src={editForm.coverUrl}
                          alt="Cover preview"
                          className="w-full h-32 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button onClick={handleSaveCompany} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">No company found.</CardContent>
          </Card>
        )}
      </div>
    );
  }

  const handleJobSearch = () => {
    setJobSearch(jobSearchInput);
    setJobPage(1);
  };

  const handleJobSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleJobSearch();
    }
  };

  const handleAppSearch = () => {
    setAppSearch(appSearchInput);
    setAppPage(1);
  };

  const handleAppSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAppSearch();
    }
  };

  // Application detail modal handlers
  const handleApplicationClick = async (applicationId: string) => {
    if (!recruiterUserId) return;
    
    try {
      setLoadingApplicationDetail(true);
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${recruiterUserId}`,
      };
      
      // Fetch full application detail
      const response = await fetch(`${apiBase}/api/applications?pageSize=100`, { headers });
      const data = await response.json();
      
      if (data.success) {
        const fullApplication = (data.data || []).find((a: RecruiterApplication) => a.id === applicationId);
        if (fullApplication) {
          setSelectedApplication(fullApplication);
        } else {
          // Fallback: use the application from the list
          const app = allApplications.find((a) => a.id === applicationId);
          if (app) {
            setSelectedApplication(app);
          }
        }
      }
    } catch {
    } finally {
      setLoadingApplicationDetail(false);
    }
  };

  const upsertSelectedApplication = (next: RecruiterApplication) => {
    setSelectedApplication(next);
    setAllApplications((prev) => prev.map((a) => (a.id === next.id ? next : a)));
  };

  const handleAddNote = async () => {
    if (!recruiterUserId || !selectedApplication) return;
    const content = noteDraft.trim();
    if (!content) return;
    
    try {
      setSavingNote(true);
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";
      const res = await fetch(`${apiBase}/applications/${selectedApplication.id}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${recruiterUserId}`,
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!data?.success) {
        return;
      }
      const created = data.data as { id: string; authorId: string; content: string; createdAt: string };
      const next: RecruiterApplication = {
        ...selectedApplication,
        notes: [created, ...(selectedApplication.notes || [])],
      };
      upsertSelectedApplication(next);
      setNoteDraft("");
    } catch {
    } finally {
      setSavingNote(false);
    }
  };

  const handleStartEditNote = (noteId: string, text: string) => {
    setEditingNoteId(noteId);
    setEditingNoteText(text);
  };

  const handleSaveEditNote = async () => {
    if (!recruiterUserId || !selectedApplication || !editingNoteId) return;
    const content = editingNoteText.trim();
    if (!content) return;
    
    try {
      setSavingNote(true);
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";
      const res = await fetch(`${apiBase}/applications/${selectedApplication.id}/notes/${editingNoteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${recruiterUserId}`,
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!data?.success) {
        return;
      }
      const updated = data.data as { id: string; authorId: string; content: string; createdAt: string };
      const next: RecruiterApplication = {
        ...selectedApplication,
        notes: (selectedApplication.notes || []).map((n) => (n.id === updated.id ? updated : n)),
      };
      upsertSelectedApplication(next);
      setEditingNoteId(null);
      setEditingNoteText("");
    } catch {
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!recruiterUserId || !selectedApplication) return;
    
    try {
      setSavingNote(true);
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";
      const res = await fetch(`${apiBase}/applications/${selectedApplication.id}/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${recruiterUserId}`,
        },
      });
      const data = await res.json();
      if (!data?.success) {
        return;
      }
      const next: RecruiterApplication = {
        ...selectedApplication,
        notes: (selectedApplication.notes || []).filter((n) => n.id !== noteId),
      };
      upsertSelectedApplication(next);
    } catch {
    } finally {
      setSavingNote(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "outline" | "success"; icon: React.ReactNode; color: string }> = {
      APPLIED: {
        label: "Applied",
        variant: "outline",
        icon: <Clock className="h-3.5 w-3.5" />,
        color: "bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
      },
      REVIEWING: {
        label: "Reviewing",
        variant: "outline",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        color: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      },
      SHORTLISTED: {
        label: "Shortlisted",
        variant: "success",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        color: "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      },
      INTERVIEW_SCHEDULED: {
        label: "Interview Scheduled",
        variant: "default",
        icon: <Calendar className="h-3.5 w-3.5" />,
        color: "bg-cyan-100 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
      },
      INTERVIEWED: {
        label: "Interviewed",
        variant: "default",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        color: "bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800",
      },
      OFFER_SENT: {
        label: "Offer Sent",
        variant: "success",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        color: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      },
      HIRED: {
        label: "Hired",
        variant: "success",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        color: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
      },
      REJECTED: {
        label: "Rejected",
        variant: "outline",
        icon: <XCircle className="h-3.5 w-3.5" />,
        color: "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
      },
      WITHDRAWN: {
        label: "Withdrawn",
        variant: "outline",
        icon: <XCircle className="h-3.5 w-3.5" />,
        color: "bg-slate-100 dark:bg-slate-950/30 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800",
      },
    };
    return statusConfig[status] || { 
      label: status, 
      variant: "outline" as const,
      icon: <Clock className="h-3.5 w-3.5" />,
      color: "bg-muted text-muted-foreground border-border",
    };
  };

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

  // Client-side filtering only for status, employment type, location type (search is done on server)
  const filteredJobs = useMemo(() => {
    const next = (allJobs || []).filter((j) => {
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

  useEffect(() => {
    setAppPage(1);
  }, [appSearch, appStatusFilter]);

  // Client-side filtering only for status (search is done on server)
  const filteredApps = useMemo(() => {
    const next = (allApplications || []).filter((a) => {
      if (appStatusFilter && String(a.status) !== appStatusFilter) return false;
      return true;
    });
    next.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
    return next;
  }, [allApplications, appStatusFilter]);

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

  const handleUploadImage = async (file: File, type: "logo" | "cover") => {
    
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Kích thước ảnh phải nhỏ hơn 5MB");
      return;
    }

    try {
      if (type === "logo") {
        setUploadingLogo(true);
      } else {
        setUploadingCover(true);
      }

      const formData = new FormData();
      formData.append("file", file);

      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";
      
      const response = await fetch(`${apiBase}/upload/image`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data?.url) {
        if (type === "logo") {
          const newForm = { ...editForm, logoUrl: data.data.url };
          setEditForm(newForm);
          // Cập nhật luôn company state để logo hiển thị ngay
          if (company) {
            setCompany({ ...company, logoUrl: data.data.url });
          }
          alert("Upload logo thành công!");
        } else {
          const newForm = { ...editForm, coverUrl: data.data.url };
          setEditForm(newForm);
          // Cập nhật luôn company state để cover hiển thị ngay
          if (company) {
            setCompany({ ...company, coverUrl: data.data.url });
          }
          alert("Upload cover image thành công!");
        }
      } else {
        alert(data.message || "Upload ảnh thất bại");
      }
    } catch {
      alert("Upload ảnh thất bại. Vui lòng thử lại.");
    } finally {
      if (type === "logo") {
        setUploadingLogo(false);
        if (logoInputRef.current) {
          logoInputRef.current.value = "";
        }
      } else {
        setUploadingCover(false);
        if (coverInputRef.current) {
          coverInputRef.current.value = "";
        }
      }
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
        setEditForm(data.data);
        // Show success message (you can add a toast here)
      } else {
        alert(data.message || "Failed to update company");
      }
    } catch {
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
    <div className="space-y-6">

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
            ) : showOnly === "applications" ? (
              <div className="space-y-4">
                {renderApplicationsTabContent()}
              </div>
            ) : showOnly === "company" ? (
              <div className="space-y-4">
                {renderCompanyTabContent()}
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
                      <Card className="overflow-hidden border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/30 via-background to-background dark:from-blue-950/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            Applications (last 14 days)
                          </CardTitle>
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

                      <Card className="overflow-hidden border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/30 via-background to-background dark:from-purple-950/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-purple-700 dark:text-purple-400 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-purple-500" />
                            Application breakdown
                          </CardTitle>
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

                      <Card className="overflow-hidden border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/30 via-background to-background dark:from-indigo-950/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-indigo-500" />
                            Job status
                          </CardTitle>
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
                  <Card className="border-dashed border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 via-background to-background dark:from-blue-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Total Jobs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{stats.totalJobs}</div>
                      <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">{stats.activeJobs} active</p>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 via-background to-background dark:from-purple-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-purple-700 dark:text-purple-400 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        Applications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-semibold text-purple-600 dark:text-purple-400">{stats.totalApplications}</div>
                      <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">{stats.pendingApplications} pending review</p>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 via-background to-background dark:from-emerald-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        Interviews
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{stats.totalInterviews}</div>
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">{stats.upcomingInterviews} upcoming</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Jobs */}
                <Card className="border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/30 via-background to-background dark:from-cyan-950/10">
                  <CardHeader>
                    <CardTitle className="text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-cyan-500" />
                      Recent Job Posts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentJobs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No jobs posted yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {recentJobs.map((job) => {
                          const statusColors: Record<string, string> = {
                            PUBLISHED: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                            DRAFT: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                            CLOSED: "bg-slate-100 dark:bg-slate-950/30 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800",
                            ARCHIVED: "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
                          };
                          const statusColor = statusColors[job.status] || "bg-muted text-muted-foreground";
                          
                          return (
                          <div
                            key={job.id}
                              className="flex items-center justify-between rounded-lg border border-cyan-200/50 dark:border-cyan-800/50 bg-gradient-to-r from-cyan-50/30 to-background dark:from-cyan-950/10 p-4 hover:from-cyan-50/50 hover:dark:from-cyan-950/20 hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => navigate(`/recruiter/jobs/${job.id}/applications`)}
                          >
                            <div className="flex-1">
                                <h3 className="font-semibold text-cyan-900 dark:text-cyan-100 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">{job.title}</h3>
                                <p className="text-xs text-cyan-700/70 dark:text-cyan-400/70 mt-1">
                                {job.location || "Remote"} • Posted {new Date(job.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                              <div className="flex items-center gap-4">
                              <div className="text-right">
                                  <div className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{job.applicationsCount || 0}</div>
                                  <div className="text-xs text-cyan-600/70 dark:text-cyan-400/70">applications</div>
                              </div>
                                <Badge variant="outline" className={`gap-1.5 border ${statusColor}`}>
                                {job.status === "PUBLISHED" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : job.status === "DRAFT" ? (
                                    <Clock className="h-3.5 w-3.5" />
                                ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                )}
                                {job.status}
                              </Badge>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Overview */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50/30 via-background to-background dark:from-orange-950/10">
                    <CardHeader>
                      <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        <TrendingUp className="h-4 w-4" />
                        Hiring Pipeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 rounded-lg bg-orange-50/50 dark:bg-orange-950/20">
                          <span className="text-sm text-orange-700 dark:text-orange-400">New Applications</span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">{stats.pendingApplications}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg bg-orange-50/50 dark:bg-orange-950/20">
                          <span className="text-sm text-orange-700 dark:text-orange-400">Scheduled Interviews</span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">{stats.upcomingInterviews}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg bg-orange-50/50 dark:bg-orange-950/20">
                          <span className="text-sm text-orange-700 dark:text-orange-400">Active Job Posts</span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">{stats.activeJobs}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-pink-200 dark:border-pink-800 bg-gradient-to-br from-pink-50/30 via-background to-background dark:from-pink-950/10">
                    <CardHeader>
                      <CardTitle className="text-pink-700 dark:text-pink-400 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-pink-500" />
                        <MessageSquare className="h-4 w-4" />
                        Quick Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2 text-pink-700 dark:text-pink-400">
                          <span className="text-pink-500 dark:text-pink-400 mt-0.5">•</span>
                          <span>Review pending applications daily</span>
                        </li>
                        <li className="flex items-start gap-2 text-pink-700 dark:text-pink-400">
                          <span className="text-pink-500 dark:text-pink-400 mt-0.5">•</span>
                          <span>Schedule interviews within 48 hours</span>
                        </li>
                        <li className="flex items-start gap-2 text-pink-700 dark:text-pink-400">
                          <span className="text-pink-500 dark:text-pink-400 mt-0.5">•</span>
                          <span>Keep job descriptions updated</span>
                        </li>
                        <li className="flex items-start gap-2 text-pink-700 dark:text-pink-400">
                          <span className="text-pink-500 dark:text-pink-400 mt-0.5">•</span>
                          <span>Respond to candidate inquiries promptly</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                  </TabsContent>

                  <TabsContent value="jobs" className="space-y-4">
                    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/30 via-background to-background dark:from-blue-950/10">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <CardTitle className="text-lg text-blue-700 dark:text-blue-400 flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              Jobs
                            </CardTitle>
                            <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                              {filteredJobs.length} result{filteredJobs.length === 1 ? "" : "s"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              onClick={() => navigate("/recruiter/jobs", { state: { mode: "create" } })}
                              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div className="relative w-full lg:w-[420px] flex gap-2">
                            <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={jobSearchInput}
                                onChange={(e) => setJobSearchInput(e.target.value)}
                                onKeyPress={handleJobSearchKeyPress}
                              placeholder="Search jobs..."
                              className="pl-9"
                            />
                            </div>
                            <Button onClick={handleJobSearch} size="sm">
                              <Search className="h-4 w-4 mr-2" />
                              Search
                            </Button>
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

                        <div className="overflow-x-auto rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gradient-to-r from-blue-100/50 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-900/20 text-blue-900 dark:text-blue-100">
                              <tr className="border-b border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wide">
                                <th className="px-4 py-3 text-left w-[46%]">Job</th>
                                <th className="px-4 py-3 text-center w-[18%]">Status</th>
                                <th className="px-4 py-3 text-left w-[18%]">Type</th>
                                <th className="px-4 py-3 text-right w-[18%]">Created</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-100/50 dark:divide-blue-900/30">
                              {pagedJobs.map((j, index) => {
                                const statusColors: Record<string, string> = {
                                  PUBLISHED: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                                  DRAFT: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                                  CLOSED: "bg-slate-100 dark:bg-slate-950/30 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800",
                                  ARCHIVED: "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
                                };
                                const statusColor = statusColors[j.status] || "bg-muted text-muted-foreground";
                                
                                return (
                                <tr
                                  key={j.id}
                                  className={`hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition cursor-pointer ${
                                    index % 2 === 0 ? "bg-background" : "bg-blue-50/20 dark:bg-blue-950/10"
                                  }`}
                                  onClick={() => navigate("/recruiter/jobs", { state: { openJobId: j.id } })}
                                >
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-blue-900 dark:text-blue-100 break-words">{j.title}</div>
                                    <div className="text-xs text-blue-700/70 dark:text-blue-300/70 break-words mt-1">
                                      <span className="inline-flex items-center gap-2">
                                        <MapPin className="h-3 w-3" />
                                        {j.location || "—"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex justify-center">
                                      <Badge
                                        variant="outline"
                                        className={`inline-flex h-8 items-center gap-2 px-3 text-sm font-medium border ${statusColor}`}
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
                                  <td className="px-4 py-3 text-blue-800 dark:text-blue-200">
                                    <div className="space-y-1">
                                      <div className="font-medium">{j.employmentType || "—"}</div>
                                      <div className="text-xs text-blue-700/70 dark:text-blue-300/70">{j.experienceLevel || ""}</div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-blue-700 dark:text-blue-300 whitespace-nowrap">
                                    {new Date(j.createdAt).toLocaleDateString()}
                                  </td>
                                </tr>
                                );
                              })}
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
                    {renderApplicationsTabContent()}
                  </TabsContent>

                  <TabsContent value="company" className="space-y-4">
                    {company ? (
                      <Card className="border-primary/20">
                        <CardHeader>
                          <div className="flex items-center gap-4 mb-4">
                            {editForm.logoUrl ? (
                              <img 
                                src={editForm.logoUrl} 
                                alt={editForm.name || "Company logo"} 
                                className="h-16 w-16 rounded-lg object-cover border"
                                onError={(e) => {
                                  // Fallback to icon if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div 
                              className={`h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center ${editForm.logoUrl ? "hidden" : ""}`}
                            >
                              <Building2 className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-2xl">{editForm.name || company.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{editForm.industry || company.industry || "No industry specified"}</p>
                            </div>
                          </div>
                          <CardTitle>Edit Company Information</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Update your company details. These changes will be reflected across all job postings.
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
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
                                <Label htmlFor="logoUrl">Logo</Label>
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <Input
                                      id="logoUrl"
                                      value={editForm.logoUrl || ""}
                                      onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                                      placeholder="https://example.com/logo.png hoặc upload ảnh"
                                      className="flex-1"
                                    />
                                    <input
                                      ref={logoInputRef}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleUploadImage(file, "logo");
                                        }
                                      }}
                                      disabled={uploadingLogo}
                                    />
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm" 
                                      disabled={uploadingLogo}
                                      onClick={() => logoInputRef.current?.click()}
                                    >
                                      {uploadingLogo ? "Đang upload..." : "Upload"}
                                    </Button>
                                  </div>
                                  {editForm.logoUrl && (
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
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="coverUrl">Cover Image</Label>
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <Input
                                    id="coverUrl"
                                    value={editForm.coverUrl || ""}
                                    onChange={(e) => setEditForm({ ...editForm, coverUrl: e.target.value })}
                                    placeholder="https://example.com/cover.png hoặc upload ảnh"
                                    className="flex-1"
                                  />
                                  <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleUploadImage(file, "cover");
                                      }
                                    }}
                                    disabled={uploadingCover}
                                  />
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={uploadingCover}
                                    onClick={() => coverInputRef.current?.click()}
                                  >
                                    {uploadingCover ? "Đang upload..." : "Upload"}
                                  </Button>
                                </div>
                                {editForm.coverUrl && (
                                  <div className="border rounded-lg p-4 bg-muted/20">
                                    <img
                                      src={editForm.coverUrl}
                                      alt="Cover preview"
                                      className="w-full h-32 object-cover rounded"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                              <Button onClick={handleSaveCompany} disabled={saving}>
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? "Saving..." : "Save Changes"}
                              </Button>
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
                    className="h-10 w-10 rounded-full object-cover border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border">
                    <User className="h-5 w-5 text-muted-foreground" />
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
                <Badge variant="outline" className={`gap-1.5 border ${getStatusConfig(selectedApplication.status).color}`}>
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

              {/* Candidate Profile */}
              {selectedApplication.candidate?.id ? (
                <div>
                  <div className="text-sm font-medium mb-2">Candidate Profile</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/recruiter/candidates/${encodeURIComponent(selectedApplication.candidate!.id)}`)}
                  >
                    View full profile
                  </Button>
                </div>
              ) : null}

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

              {/* Candidate Skills & Experience */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {(selectedApplication.candidate?.skills || [])
                      .map((cs) => cs?.skill?.name || "")
                      .filter((n) => n.trim().length > 0)
                      .slice(0, 16)
                      .map((name) => (
                        <Badge key={`skill-${name}`} variant="outline">
                          {name}
                        </Badge>
                      ))}
                    {(selectedApplication.candidate?.skills || []).length === 0 && (
                      <div className="text-sm text-muted-foreground">No skills yet.</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Experience</div>
                  <div className="space-y-2">
                    {(selectedApplication.candidate?.experiences || []).slice(0, 3).map((exp) => (
                      <div key={exp.id} className="rounded-md border bg-muted/20 p-3">
                        <div className="text-sm font-medium">
                          {exp.position} • {exp.companyName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(exp.startDate).toLocaleDateString()} –{" "}
                          {exp.isCurrent || !exp.endDate ? "Present" : new Date(exp.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                    {(selectedApplication.candidate?.experiences || []).length === 0 && (
                      <div className="text-sm text-muted-foreground">No experience yet.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recruiter Notes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Recruiter Notes</div>
                  <div className="text-xs text-muted-foreground">
                    {(selectedApplication.notes || []).length} note{(selectedApplication.notes || []).length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="space-y-2">
                  {(selectedApplication.notes || []).map((n) => {
                    const canEdit = recruiterProfileId && n.authorId === recruiterProfileId;
                    return (
                      <div key={n.id} className="rounded-lg border bg-muted/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-xs text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={savingNote}
                                onClick={() => handleStartEditNote(n.id, n.content)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                disabled={savingNote}
                                onClick={() => handleDeleteNote(n.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>

                        {editingNoteId === n.id ? (
                          <div className="mt-2 space-y-2">
                            <Textarea
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              rows={3}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={savingNote}
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingNoteText("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button size="sm" disabled={savingNote} onClick={handleSaveEditNote}>
                                {savingNote ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{n.content}</div>
                        )}
                      </div>
                    );
                  })}

                  {(selectedApplication.notes || []).length === 0 && (
                    <div className="text-sm text-muted-foreground">No notes yet.</div>
                  )}
                </div>

                <div className="space-y-2 rounded-lg border bg-background p-3">
                  <div className="text-xs font-medium text-muted-foreground">Add note</div>
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                    placeholder="Write an internal note for this candidate..."
                  />
                  <div className="flex justify-end">
                    <Button size="sm" disabled={savingNote || noteDraft.trim().length === 0} onClick={handleAddNote}>
                      {savingNote ? "Saving..." : "Add note"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/recruiter/jobs/${selectedApplication.jobId}/applications`)}
                >
                  View All Applications
                </Button>
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
    </div>
  );
};

export default RecruiterDashboard;
