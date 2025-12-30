import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ADMIN_NUMERIC_FIELDS_BY_RESOURCE } from "@/constants/admin";
import { getFoundedYearOptions } from "@/constants/company";
import { adminClient, useAdminToken } from "@/lib/adminClient";
import { normalizeAdminPayload } from "@/lib/adminNormalize";
import { adminResources, type AdminResource } from "@/lib/adminResources";
import { isAdminLoggedIn } from "@/lib/auth";
import {
  AlarmClock,
  AlertTriangle,
  Ban,
  Blocks,
  Building2,
  CheckCircle2,
  ChevronRight,
  Circle,
  GraduationCap,
  LayoutPanelLeft,
  MessageSquare,
  PauseCircle,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AdminRow = Record<string, unknown>;
type ModalMode = "create" | "edit";

type AdminState = {
  loading: boolean;
  error: string | null;
  data: AdminRow[];
  meta?: { page: number; pageSize: number; total: number };
};

const formatLabel = (field: string) => {
  const clean = field.replace(/^is([A-Z])/, (_, c) => c.toUpperCase());
  return clean
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
};

const chartColors = ["#6366f1", "#22c55e", "#f97316", "#06b6d4", "#a855f7", "#ef4444", "#0ea5e9", "#16a34a", "#ec4899", "#14b8a6"];

const countBy = (rows: any[], field: string) => {
  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    const key = String(r?.[field] ?? "Unknown");
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

const lastNDays = (n: number) => {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

// Admin Dashboard Component
const AdminDashboard = ({ 
  setShowDashboard, 
  setResource, 
  adminResources 
}: { 
  setShowDashboard: (show: boolean) => void;
  setResource: (r: AdminResource) => void;
  adminResources: AdminResource[];
}) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    totalJobs: 0,
    totalApplications: 0,
    totalInterviews: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";
        
        const [usersRes, companiesRes, jobsRes, applicationsRes, interviewsRes] = await Promise.all([
          fetch(`${API_BASE}/users?pageSize=200`).then(r => r.json()),
          fetch(`${API_BASE}/companies?pageSize=1`).then(r => r.json()),
          fetch(`${API_BASE}/jobs?pageSize=200`).then(r => r.json()),
          fetch(`${API_BASE}/applications?pageSize=200`).then(r => r.json()),
          fetch(`${API_BASE}/interviews?pageSize=200`).then(r => r.json()),
        ]);

        setStats({
          totalUsers: usersRes.meta?.total || 0,
          totalCompanies: companiesRes.meta?.total || 0,
          totalJobs: jobsRes.meta?.total || 0,
          totalApplications: applicationsRes.meta?.total || 0,
          totalInterviews: interviewsRes.meta?.total || 0,
        });

        setUsers(usersRes.data || []);
        setJobs(jobsRes.data || []);
        setApplications(applicationsRes.data || []);
        setInterviews(interviewsRes.data || []);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const usersByRole = useMemo(() => countBy(users, "role"), [users]);
  const jobsByStatus = useMemo(() => countBy(jobs, "status"), [jobs]);
  const applicationsByStatus = useMemo(() => countBy(applications, "status"), [applications]);
  const interviewsByStatus = useMemo(() => countBy(interviews, "status"), [interviews]);
  const interviewsByType = useMemo(() => countBy(interviews, "type"), [interviews]);

  // Growth trend data (last 30 days)
  const growthTrend = useMemo(() => {
    const days = lastNDays(30);
    const userCounts: Record<string, number> = {};
    const jobCounts: Record<string, number> = {};
    const appCounts: Record<string, number> = {};

    users.forEach((u) => {
      const day = new Date(u.createdAt).toISOString().slice(0, 10);
      if (days.includes(day)) {
        userCounts[day] = (userCounts[day] || 0) + 1;
      }
    });

    jobs.forEach((j) => {
      const day = new Date(j.createdAt).toISOString().slice(0, 10);
      if (days.includes(day)) {
        jobCounts[day] = (jobCounts[day] || 0) + 1;
      }
    });

    applications.forEach((a) => {
      const day = new Date(a.appliedAt || a.createdAt).toISOString().slice(0, 10);
      if (days.includes(day)) {
        appCounts[day] = (appCounts[day] || 0) + 1;
      }
    });

    return days.map((day) => ({
      date: day.slice(5), // MM-DD format
      users: userCounts[day] || 0,
      jobs: jobCounts[day] || 0,
      applications: appCounts[day] || 0,
    }));
  }, [users, jobs, applications]);

  const handleQuickAccess = (resourceKey: string) => {
    const resource = adminResources.find((r) => r.key === resourceKey);
    if (resource) {
      setShowDashboard(false);
      setResource(resource);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <p className="text-sm text-muted-foreground">Platform overview and statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/30 via-background to-background dark:from-blue-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Users</CardTitle>
            <UserRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Candidates, Recruiters, Admins</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/30 via-background to-background dark:from-emerald-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">Registered companies</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/30 via-background to-background dark:from-purple-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-400">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
            <p className="text-xs text-muted-foreground">Active and inactive jobs</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/30 via-background to-background dark:from-amber-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">All application submissions</p>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/30 via-background to-background dark:from-cyan-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-cyan-700 dark:text-cyan-400">Total Interviews</CardTitle>
            <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInterviews}</div>
            <p className="text-xs text-muted-foreground">All interviews conducted</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/30 via-background to-background dark:from-indigo-950/10">
        <CardHeader>
          <CardTitle className="text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-500" />
            Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              onClick={() => handleQuickAccess("users")}
            >
              <UserRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium">Manage Users</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
              onClick={() => handleQuickAccess("companies")}
            >
              <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium">Verify Companies</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
              onClick={() => handleQuickAccess("jobs")}
            >
              <span className="text-sm font-medium">Review Jobs</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
              onClick={() => handleQuickAccess("applications")}
            >
              <span className="text-sm font-medium">View Applications</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Users by Role */}
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/30 via-background to-background dark:from-blue-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-700 dark:text-blue-400">Users by Role</CardTitle>
            <p className="text-xs text-muted-foreground">Distribution of user types</p>
          </CardHeader>
          <CardContent className="h-80">
            {usersByRole.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center justify-center h-full">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={usersByRole}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {usersByRole.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Jobs by Status */}
        <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/30 via-background to-background dark:from-purple-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-purple-700 dark:text-purple-400">Jobs by Status</CardTitle>
            <p className="text-xs text-muted-foreground">Current job statuses</p>
          </CardHeader>
          <CardContent className="h-80">
            {jobsByStatus.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center justify-center h-full">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={jobsByStatus}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {jobsByStatus.map((_, idx) => (
                      <Cell key={idx} fill={chartColors[idx % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Applications by Status */}
        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/30 via-background to-background dark:from-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-700 dark:text-amber-400">Applications by Status</CardTitle>
            <p className="text-xs text-muted-foreground">Application status distribution</p>
          </CardHeader>
          <CardContent className="h-80">
            {applicationsByStatus.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center justify-center h-full">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={applicationsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {applicationsByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Interviews by Status */}
        <Card className="border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/30 via-background to-background dark:from-cyan-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-cyan-700 dark:text-cyan-400">Interviews by Status</CardTitle>
            <p className="text-xs text-muted-foreground">Interview status breakdown</p>
          </CardHeader>
          <CardContent className="h-80">
            {interviewsByStatus.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center justify-center h-full">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={interviewsByStatus}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {interviewsByStatus.map((_, idx) => (
                      <Cell key={idx} fill={chartColors[idx % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Growth Trend Chart */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/30 via-background to-background dark:from-emerald-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-emerald-700 dark:text-emerald-400">Growth Trend (Last 30 Days)</CardTitle>
          <p className="text-xs text-muted-foreground">Daily growth of users, jobs, and applications</p>
        </CardHeader>
        <CardContent className="h-80">
          {growthTrend.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center justify-center h-full">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={growthTrend}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="users" stackId="1" stroke="#6366f1" fill="url(#colorUsers)" />
                <Area type="monotone" dataKey="jobs" stackId="1" stroke="#a855f7" fill="url(#colorJobs)" />
                <Area type="monotone" dataKey="applications" stackId="1" stroke="#f97316" fill="url(#colorApplications)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Interviews by Type */}
      <Card className="border-pink-200 dark:border-pink-800 bg-gradient-to-br from-pink-50/30 via-background to-background dark:from-pink-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-pink-700 dark:text-pink-400">Interviews by Type</CardTitle>
          <p className="text-xs text-muted-foreground">Distribution of interview types</p>
        </CardHeader>
        <CardContent className="h-80">
          {interviewsByType.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center justify-center h-full">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={interviewsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {interviewsByType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/30 via-background to-background dark:from-green-950/10">
        <CardHeader>
          <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            Platform Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">System Status</span>
              <Badge variant="success">Healthy</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database</span>
              <Badge variant="success">Connected</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Response Time</span>
              <span className="font-medium">~120ms</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Admin = ({ embedded }: { embedded?: boolean }) => {
  const [resource, setResource] = useState<AdminResource>(adminResources[0]);
  const [state, setState] = useState<AdminState>({ loading: true, error: null, data: [] });
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<AdminRow | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const getToken = useAdminToken();
  const [relationOptions, setRelationOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [filterField, setFilterField] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
  const [showFilters, setShowFilters] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true); // Start with dashboard view
  const [companyTab, setCompanyTab] = useState<"unverified" | "verified">("unverified"); // For companies tab
  const [companyCounts, setCompanyCounts] = useState<{ unverified: number; verified: number }>({ unverified: 0, verified: 0 });

  useEffect(() => {
    if (embedded) return;
    if (!isAdminLoggedIn()) {
      navigate("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [embedded, navigate]);


  const resourceIcons: Record<string, React.ReactNode> = {
    users: <UserRound className="h-4 w-4" />,
    companies: <Building2 className="h-4 w-4" />,
    interviews: <Sparkles className="h-4 w-4" />,
    skills: <Blocks className="h-4 w-4" />,
    categories: <Blocks className="h-4 w-4" />,
    messages: <MessageSquare className="h-4 w-4" />,
    notifications: <ShieldCheck className="h-4 w-4" />,
    "candidate-profiles": <GraduationCap className="h-4 w-4" />,
    "recruiter-profiles": <LayoutPanelLeft className="h-4 w-4" />,
  };
  const filteredAllowed = useMemo(() => {
    // Exclude sensitive/important fields that shouldn't be edited by admin
    const exclude = new Set<string>([
      "id", 
      "createdAt", 
      "updatedAt", 
      "passwordHash", // Never allow editing password hash
      "email", // Email should not be changed
      "userId", // User ID relationships
      "candidateId", // Candidate ID relationships
      "recruiterId", // Recruiter ID relationships
      "companyId", // Company ID relationships
      "jobId", // Job ID relationships
      "applicationId", // Application ID relationships
      "senderId", // Message sender ID
      "receiverId", // Message receiver ID
      "lastLoginAt", // System managed field
      ...resource.primaryKeys
    ]);
    
    // For companies, only allow editing: description, industry, companySize, foundedYear, address, city, country, logoUrl, coverUrl, website
    // isVerified should be handled via verify/unverify action, not edit form
    if (resource.key === "companies") {
      const allowedCompanyFields = ["description", "industry", "companySize", "foundedYear", "address", "city", "country", "logoUrl", "coverUrl", "website"];
      return allowedCompanyFields.filter((f) => !exclude.has(f));
    }
    
    // For jobs, only allow editing: description, requirements, benefits, location, salaryMin, salaryMax, currency, isSalaryNegotiable, experienceLevel, quantity
    // status should be handled via approve/reject action, not edit form
    if (resource.key === "jobs") {
      const allowedJobFields = ["description", "requirements", "benefits", "location", "salaryMin", "salaryMax", "currency", "isSalaryNegotiable", "experienceLevel", "quantity"];
      return allowedJobFields.filter((f) => !exclude.has(f));
    }
    
    // For users, only allow editing: firstName, lastName, phone, avatarUrl, isActive
    // role, isVerified, email should not be editable
    if (resource.key === "users") {
      const allowedUserFields = ["firstName", "lastName", "phone", "avatarUrl", "isActive"];
      return allowedUserFields.filter((f) => !exclude.has(f));
    }
    
    // For other resources, use allowedFields but still exclude sensitive fields
    return (resource.allowedFields || resource.columns).filter((f) => !exclude.has(f));
  }, [resource]);

  const visibleColumns = useMemo(() => {
    const hide = new Set<string>(["createdAt", "updatedAt"]);
    return (resource.columns || []).filter((c) => !hide.has(c)).slice(0, 8);
  }, [resource]);

  const getInitials = (row: AdminRow) => {
    const first = (row.firstName as string | undefined) || "";
    const last = (row.lastName as string | undefined) || "";
    const email = (row.email as string | undefined) || "";
    const base = `${first} ${last}`.trim() || email;
    return base ? base.trim().slice(0, 2).toUpperCase() : "NA";
  };

  const renderAvatar = (val: unknown, row: AdminRow, size = 36) => {
    const hasImg = typeof val === "string" && val;
    return (
      <div className="flex items-center gap-2">
        <div
          className="relative overflow-hidden rounded-full border bg-gradient-to-br from-indigo-500/10 to-slate-500/10"
          style={{ width: size, height: size }}
        >
          {hasImg ? (
            <img
              src={val as string}
              alt="avatar"
              className="h-full w-full object-cover"
              onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-600">
              {getInitials(row)}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground line-clamp-1 break-all">
          {hasImg ? String(val) : "No avatar"}
        </div>
      </div>
    );
  };

  const isIdField = (field: string) => field === "id" || field.endsWith("Id") || resource.primaryKeys.includes(field);

  const renderIdLink = (field: string, val: unknown) => {
    if (val === undefined || val === null || val === "") return "N/A";
    const rel = relationMap[field];
    if (rel) {
      return (
        <Button
          variant="link"
          className="h-auto p-0 text-xs"
          onClick={() => {
            navigate(`/admin/${rel.path}/${encodeURIComponent(String(val))}`);
          }}
        >
          {String(val)}
        </Button>
      );
    }
    if (isIdField(field)) {
      return (
        <Button
          variant="link"
          className="h-auto p-0 text-xs"
          onClick={() => navigate(`/admin/${resource.path}/${encodeURIComponent(String(val))}`)}
        >
          {String(val)}
        </Button>
      );
    }
    return String(val);
  };

  const renderEnum = (field: string, value: unknown) => {
    const _field = field; // keep for future field-specific styling
    void _field;
    if (!value) return null;
    const v = String(value);
    const statusStyles: Record<string, { icon: React.ReactNode; className: string }> = {
      DRAFT: { icon: <Circle className="h-3 w-3" />, className: "text-slate-600" },
      PUBLISHED: { icon: <CheckCircle2 className="h-3 w-3" />, className: "text-green-700" },
      ARCHIVED: { icon: <PauseCircle className="h-3 w-3" />, className: "text-amber-700" },
      CLOSED: { icon: <Ban className="h-3 w-3" />, className: "text-red-700" },
      APPLIED: { icon: <Circle className="h-3 w-3" />, className: "text-slate-700" },
      REVIEWING: { icon: <AlarmClock className="h-3 w-3" />, className: "text-amber-700" },
      SHORTLISTED: { icon: <Sparkles className="h-3 w-3" />, className: "text-purple-700" },
      INTERVIEW_SCHEDULED: { icon: <AlarmClock className="h-3 w-3" />, className: "text-blue-700" },
      INTERVIEWED: { icon: <CheckCircle2 className="h-3 w-3" />, className: "text-green-700" },
      OFFER_SENT: { icon: <Sparkles className="h-3 w-3" />, className: "text-emerald-700" },
      HIRED: { icon: <CheckCircle2 className="h-3 w-3" />, className: "text-emerald-700" },
      REJECTED: { icon: <Ban className="h-3 w-3" />, className: "text-red-700" },
      WITHDRAWN: { icon: <PauseCircle className="h-3 w-3" />, className: "text-slate-600" },
      PENDING: { icon: <Circle className="h-3 w-3" />, className: "text-slate-600" },
      IN_PROGRESS: { icon: <AlarmClock className="h-3 w-3" />, className: "text-amber-700" },
      PROCESSING: { icon: <AlarmClock className="h-3 w-3" />, className: "text-amber-700" },
      COMPLETED: { icon: <CheckCircle2 className="h-3 w-3" />, className: "text-green-700" },
      FAILED: { icon: <AlertTriangle className="h-3 w-3" />, className: "text-red-700" },
      EXPIRED: { icon: <XCircle className="h-3 w-3" />, className: "text-slate-700" },
    };
    const style = statusStyles[v];
    return (
      <Badge variant="outline" className={`gap-1 ${style?.className ?? ""}`}>
        {style?.icon}
        {v}
      </Badge>
    );
  };

  const isImageField = (field: string) => /(avatar|logo|cover|image|photo|picture|icon)/i.test(field);
  const getRelationLabel = useCallback(
    (field: string, value: unknown) => {
      if (value === undefined || value === null || value === "") return undefined;
      const opts = relationOptions[field];
      if (!opts) return undefined;
      const match = opts.find((opt) => opt.value === String(value));
      return match?.label;
    },
    [relationOptions]
  );

  const relationMap = useMemo(
    () =>
      ({
        userId: { path: "users", label: (r: AdminRow) => `${r.firstName ?? ""} ${r.lastName ?? ""} (${r.email ?? ""})`.trim() },
        companyId: { path: "companies", label: (r: AdminRow) => `${r.name ?? "Company"} (${r.slug ?? ""})` },
        recruiterId: {
          path: "recruiter-profiles",
          label: (r: AdminRow) => {
            const user = r.user as AdminRow | undefined;
            const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
            return full || (user?.email as string | undefined) || (r.userId as string | undefined) || (r.id as string | undefined) || "Recruiter";
          },
        },
        candidateId: { path: "candidate-profiles", label: (r: AdminRow) => `${r.userId ?? ""}` },
        jobId: { path: "jobs", label: (r: AdminRow) => `${r.title ?? "Job"} (${r.id ?? ""})` },
        categoryId: { path: "categories", label: (r: AdminRow) => `${r.name ?? "Category"}` },
        skillId: { path: "skills", label: (r: AdminRow) => `${r.name ?? "Skill"}` },
        applicationId: { path: "applications", label: (r: AdminRow) => `${r.id ?? ""} (${r.status ?? ""})` },
      }) as Record<string, { path: string; label: (row: AdminRow) => string }>,
    []
  );

  const loadRelations = useCallback(
    async (fields: string[]) => {
      const need = fields.filter((f) => relationMap[f] && !relationOptions[f]);
      if (need.length === 0) return;
      try {
        const token = await getToken();
        const results = await Promise.all(
          need.map(async (f) => {
            const cfg = relationMap[f];
            const res = await adminClient.list(cfg.path, { page: 1, pageSize: 100 }, token ?? undefined);
            const opts = (res.data || []).map((row: AdminRow) => ({
              value: String(row.id ?? row[f] ?? ""),
              label: cfg.label(row),
            }));
            return [f, opts] as const;
          })
        );
        setRelationOptions((prev) => {
          const next = { ...prev };
          results.forEach(([k, v]) => (next[k] = v));
          return next;
        });
      } catch {
        // Silently fail
      }
    },
    [getToken, relationOptions, relationMap]
  );

  const handleVerifyCompany = async (companyId: string, currentVerified: boolean) => {
    try {
      const token = await getToken();
      const row = state.data.find((r) => String(r.id) === companyId);
      if (!row) {
        alert("Company not found");
        return;
      }
      await adminClient.update("companies", ["id"], row, { isVerified: !currentVerified }, token ?? undefined);
      await load(); // Reload to refresh counts
    } catch {
      alert("Failed to verify/unverify company");
    }
  };

  const handleApproveJob = async (jobId: string) => {
    try {
      const token = await getToken();
      const row = state.data.find((r) => String(r.id) === jobId);
      if (!row) {
        alert("Job not found");
        return;
      }
      await adminClient.update("jobs", ["id"], row, { status: "PUBLISHED" }, token ?? undefined);
      await load();
    } catch {
      alert("Failed to approve job");
    }
  };

  const handleRejectJob = async (jobId: string) => {
    try {
      const token = await getToken();
      const row = state.data.find((r) => String(r.id) === jobId);
      if (!row) {
        alert("Job not found");
        return;
      }
      await adminClient.update("jobs", ["id"], row, { status: "ARCHIVED" }, token ?? undefined);
      await load();
    } catch {
      alert("Failed to reject job");
    }
  };

  const load = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const token = await getToken();
      
      // Build query params for server-side search and filter
      const queryParams: Record<string, string | number> = {
        page,
        pageSize,
      };
      
      // Add search query
      if (search.trim()) {
        queryParams.q = search.trim();
      }
      
      // Add filter field/value
      if (filterField && filterValue) {
        queryParams[filterField] = filterValue;
      }
      
      // For companies, add isVerified filter based on tab
      if (resource.key === "companies") {
        queryParams.isVerified = companyTab === "verified" ? "true" : "false";
      }
      
      const res = await adminClient.list(resource.path, queryParams, token ?? undefined);
      if (!res.success) {
        setState({ loading: false, error: res.message || "Failed to load", data: [], meta: res.meta });
        return;
      }
      setState({ loading: false, error: null, data: res.data, meta: res.meta });
      
      // Fetch company counts separately if this is companies resource
      if (resource.key === "companies") {
        try {
          // Only fetch counts if no search/filter is applied (to show accurate totals)
          if (!search.trim() && !filterField) {
            const [unverifiedRes, verifiedRes] = await Promise.all([
              adminClient.list(resource.path, { page: 1, pageSize: 1, isVerified: "false" }, token ?? undefined),
              adminClient.list(resource.path, { page: 1, pageSize: 1, isVerified: "true" }, token ?? undefined),
            ]);
            setCompanyCounts({
              unverified: unverifiedRes.meta?.total || 0,
              verified: verifiedRes.meta?.total || 0,
            });
          } else {
            // If search/filter is active, use current meta.total for the active tab
            setCompanyCounts((prev) => {
              if (companyTab === "unverified") {
                return { ...prev, unverified: res.meta?.total || 0 };
              } else {
                return { ...prev, verified: res.meta?.total || 0 };
              }
            });
          }
        } catch (err) {
        }
      }
    } catch (err) {
      setState({ loading: false, error: err instanceof Error ? err.message : "Unexpected error", data: [] });
    }
  }, [getToken, page, pageSize, resource.path, search, filterField, filterValue, resource.key, companyTab]);

  useEffect(() => {
    setPage(1);
    setSelectedRow(null);
    setFormData({});
    setSelectedSkills([]);
    setSelectedCategories([]);
    setCompanyCounts({ unverified: 0, verified: 0 });
    const fieldsToLoad = resource.key === "jobs" ? [...filteredAllowed, "skillId", "categoryId"] : filteredAllowed;
    loadRelations(fieldsToLoad);
  }, [resource, filteredAllowed, loadRelations]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, filterField, filterValue, companyTab]);

  const total = state.meta?.total ?? state.data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const renderTable = (rows: AdminRow[]) => (
    <>
      <div className="overflow-x-auto rounded-lg border shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/70 text-muted-foreground sticky top-0 z-10">
            <tr>
              {visibleColumns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-[11px]">{formatLabel(col)}</th>
              ))}
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-[11px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((row) => resource.primaryKeys.every((k) => row && row[k] !== undefined && row[k] !== null))
              .map((row, idx) => (
                <tr
                  key={resource.primaryKeys.map((k) => String(row[k] ?? "")).join("|") || crypto.randomUUID()}
                  className={`border-b last:border-0 transition hover:bg-muted/40 ${idx % 2 === 0 ? "bg-muted/20" : "bg-background"}`}
                >
                  {visibleColumns.map((col) => {
                    const val = row[col];
                    const isJobSkillCategoryCell =
                      resource.key === "jobs" &&
                      (col === "skills" || col === "categories") &&
                      Array.isArray(val);
                    const relLabel = getRelationLabel(col, val);
                    const isImg = isImageField(col) && typeof val === "string" && /^https?:\/\//i.test(val);
                    const isBool = typeof val === "boolean";
                    const isRole = col === "role";
                    const isAvatar = col === "avatarUrl";
                    const isEnum = Boolean(resource.fieldEnums?.[col]);
                    const display =
                      val === undefined || val === null || val === ""
                        ? "N/A"
                        : relLabel
                          ? relLabel
                          : typeof val === "object"
                            ? JSON.stringify(val)
                            : String(val);
                    return (
                      <td key={col} className="px-3 py-2">
                        {isJobSkillCategoryCell ? (
                          (() => {
                            const items = val as Array<Record<string, unknown>>;
                            const names = items
                              .map((it) => {
                                const nested =
                                  col === "skills"
                                    ? ((it as any).skill as AdminRow | undefined)
                                    : ((it as any).category as AdminRow | undefined);
                                const name = (nested?.name as string | undefined) ?? "";
                                return name.trim();
                              })
                              .filter((n) => n.length > 0);
                            const shown = names.slice(0, 3);
                            const rest = names.length - shown.length;
                            return (
                              <div className="flex flex-wrap items-center gap-1">
                                {shown.map((n) => (
                                  <Badge key={`${col}-${n}`} variant="outline" className="text-[11px]">
                                    {n}
                                  </Badge>
                                ))}
                                {rest > 0 && (
                                  <span className="text-[11px] text-muted-foreground">+{rest}</span>
                                )}
                                {names.length === 0 && (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                            );
                          })()
                        ) : isAvatar ? (
                          renderAvatar(val, row, 36)
                        ) : isImg ? (
                          <img
                            src={val as string}
                            alt={col}
                            className="h-10 w-10 rounded-md border object-cover"
                            onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.display = "none")}
                          />
                        ) : isBool ? (
                          <div className="flex items-center gap-1 text-xs font-medium">
                            {val ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="text-green-700">Yes</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-red-600">No</span>
                              </>
                            )}
                          </div>
                        ) : isRole ? (
                          <Badge variant="outline" className="gap-1">
                            <Shield className="h-3 w-3" />
                            {display}
                          </Badge>
                        ) : isEnum ? (
                          renderEnum(col, val)
                        ) : isIdField(col) ? (
                          renderIdLink(col, val)
                        ) : (
                          <span className="text-muted-foreground line-clamp-2 break-all">{display}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {/* Verify/Unverify Company */}
                      {resource.key === "companies" && (
                        <Button
                          variant={row.isVerified ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleVerifyCompany(String(row.id), Boolean(row.isVerified))}
                        >
                          {row.isVerified ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Verify
                            </>
                          )}
                        </Button>
                      )}
                      
                      {/* Approve/Reject Job */}
                      {resource.key === "jobs" && (
                        <>
                          {row.status === "DRAFT" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => handleApproveJob(String(row.id))}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => handleRejectJob(String(row.id))}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {row.status === "ARCHIVED" && (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveJob(String(row.id))}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}
                        </>
                      )}
                      
                      {/* View Details */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const idPath = resource.primaryKeys.map((k) => encodeURIComponent(String(row[k] ?? ""))).join("/");
                          navigate(`/admin/${resource.path}/${idPath}`);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-3 py-6 text-center text-muted-foreground">
                  No records match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <div className="text-xs text-muted-foreground">Page {page} / {totalPages}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );

  const uploadFile = useCallback(
    async (field: string, file: File) => {
      setUploadingField(field);
      try {
        const token = await getToken();
        const form = new FormData();
        form.append("file", file);
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";
        const res = await fetch(`${apiBase}/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        });
        const json = await res.json();
        if (!json?.success || !json?.data?.url) throw new Error(json?.message || "Upload failed");
        return String(json.data.url);
      } finally {
        setUploadingField(null);
      }
    },
    [getToken]
  );

  // No client-side filtering - all filtering is done server-side
  const filteredRows = state.data;

  const openModal = (mode: ModalMode, row?: AdminRow) => {
    setModalMode(mode);
    if (mode === "edit" && row) {
      setSelectedRow(row);
      const payload: Record<string, unknown> = {};
      filteredAllowed.forEach((f) => (payload[f] = row[f] ?? ""));
      setFormData(payload);
      if (resource.key === "jobs") {
        const existingSkills = Array.isArray(row.skills)
          ? (row.skills as AdminRow[])
              .map((s) => {
                const skillRel = s as Record<string, unknown>;
                const val = (skillRel.skillId as string | undefined) || (skillRel.skill as Record<string, unknown> | undefined)?.id;
                return val as string | undefined;
              })
              .filter((v): v is string => Boolean(v))
          : [];
        setSelectedSkills(existingSkills);
        const existingCategories = Array.isArray(row.categories)
          ? (row.categories as AdminRow[])
              .map((c) => {
                const catRel = c as Record<string, unknown>;
                const val = (catRel.categoryId as string | undefined) || (catRel.category as Record<string, unknown> | undefined)?.id;
                return val as string | undefined;
              })
              .filter((v): v is string => Boolean(v))
          : [];
        setSelectedCategories(existingCategories);
      }
    } else {
      setSelectedRow(null);
      const payload: Record<string, unknown> = {};
      filteredAllowed.forEach((f) => (payload[f] = ""));
      setFormData(payload);
      if (resource.key === "jobs") {
        setSelectedSkills([]);
        setSelectedCategories([]);
      }
    }
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleFormChange = (field: string, value: unknown) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
  };

  const handleSubmit = async () => {
    try {
      const token = await getToken();
      let jobId: string | undefined;
      const normalizedFormData = normalizeAdminPayload(resource.key, formData);

      if (modalMode === "create") {
        const res = await adminClient.create(resource.path, normalizedFormData, token ?? undefined);
        jobId = res?.data?.id as string | undefined;
      } else if (modalMode === "edit" && selectedRow) {
        const res = await adminClient.update(resource.path, resource.primaryKeys, selectedRow, normalizedFormData, token ?? undefined);
        jobId = (selectedRow.id as string | undefined) ?? (res?.data?.id as string | undefined);
      } else {
        throw new Error("No row selected");
      }

      if (resource.key === "jobs" && jobId) {
        // Remove duplicates from selectedSkills and selectedCategories
        const uniqueSkills = Array.from(new Set(selectedSkills.map(String)));
        const uniqueCategories = Array.from(new Set(selectedCategories.map(String)));

        const res = await adminClient.list("job-skills", { page: 1, pageSize: 200 }, token ?? undefined);
        const existingForJob = ((res.data || []) as AdminRow[]).filter((js) => String(js.jobId) === String(jobId));
        const existingIds = new Set(existingForJob.map((js) => String(js.skillId)));

        // delete removed
        await Promise.all(
          existingForJob
            .filter((js) => !uniqueSkills.includes(String(js.skillId)))
            .map((js) => adminClient.remove("job-skills", ["jobId", "skillId"], js, token ?? undefined))
            .map((p) => p.catch(() => {
              return null;
            }))
        );
        
        // add new (only if not already exists)
        await Promise.all(
          uniqueSkills
            .filter((sid) => !existingIds.has(sid))
            .map((sid) => 
              adminClient.create("job-skills", { jobId, skillId: sid, isRequired: true }, token ?? undefined)
                .catch((err) => {
                  // Ignore unique constraint errors (already exists)
                  if (err?.message?.includes("Unique constraint") || err?.message?.includes("already exists")) {
                    return null;
                  }
                  throw err;
                })
            )
        );

        const catRes = await adminClient.list("job-categories", { page: 1, pageSize: 200 }, token ?? undefined);
        const existingCatForJob = ((catRes.data || []) as AdminRow[]).filter((jc) => String(jc.jobId) === String(jobId));
        const existingCatIds = new Set(existingCatForJob.map((jc) => String(jc.categoryId)));
        
        await Promise.all(
          existingCatForJob
            .filter((jc) => !uniqueCategories.includes(String(jc.categoryId)))
            .map((jc) => adminClient.remove("job-categories", ["jobId", "categoryId"], jc, token ?? undefined))
            .map((p) => p.catch(() => {
              return null;
            }))
        );
        
        await Promise.all(
          uniqueCategories
            .filter((cid) => !existingCatIds.has(cid))
            .map((cid) => 
              adminClient.create("job-categories", { jobId, categoryId: cid }, token ?? undefined)
                .catch((err) => {
                  // Ignore unique constraint errors (already exists)
                  if (err?.message?.includes("Unique constraint") || err?.message?.includes("already exists")) {
                    return null;
                  }
                  throw err;
                })
            )
        );
      }

      closeModal();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Request failed");
    }
  };

  const guessInputType = (field: string, value: unknown) => {
    if (resource.fieldEnums && resource.fieldEnums[field]) return "select";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "checkbox";
    if ((ADMIN_NUMERIC_FIELDS_BY_RESOURCE[resource.key] ?? []).includes(field)) return "number";
    if (field.toLowerCase().includes("year")) return "number";
    if (field.startsWith("is")) return "checkbox";
    if (
      field.toLowerCase().includes("description") ||
      field.toLowerCase().includes("summary") ||
      field.toLowerCase().includes("letter") ||
      field.toLowerCase().includes("content")
    ) {
      return "textarea";
    }
    return "text";
  };

  if (!isAuthenticated && !embedded) {
    return null;
  }

  const embeddedNav = embedded ? (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Button
        key="dashboard-tab-embedded"
        variant={showDashboard ? "default" : "outline"}
        size="sm"
        className="gap-2"
        onClick={() => setShowDashboard(true)}
      >
        <LayoutPanelLeft className="h-4 w-4" /> Dashboard
      </Button>
      {adminResources.map((r) => (
        <Button
          key={`embedded-${r.key}`}
          variant={!showDashboard && resource.key === r.key ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => {
            setShowDashboard(false);
            setResource(r);
          }}
        >
          {resourceIcons[r.key] ?? <Blocks className="h-4 w-4" />} {r.label}
        </Button>
      ))}
      {!showDashboard ? (
        <Button size="sm" onClick={() => openModal("create")} className="ml-auto">
          + New {resource.label}
        </Button>
      ) : null}
    </div>
  ) : null;

  const topNav = !embedded ? (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b pb-4">
                <Button
                  key="dashboard-tab"
        variant={showDashboard ? "default" : "outline"}
                  size="sm"
        className="gap-2"
                  onClick={() => setShowDashboard(true)}
                >
                  <LayoutPanelLeft className="h-4 w-4" /> Dashboard
                </Button>
                {adminResources.map((r) => (
                  <Button
                    key={r.key}
          variant={!showDashboard && resource.key === r.key ? "default" : "outline"}
                    size="sm"
          className="gap-2"
                    onClick={() => {
                      setShowDashboard(false);
                      setResource(r);
                    }}
                  >
                    {resourceIcons[r.key] ?? <Blocks className="h-4 w-4" />} {r.label}
                  </Button>
                ))}
      {!showDashboard ? (
        <Button size="sm" onClick={() => openModal("create")} className="ml-auto">
          + New {resource.label}
              </Button>
        ) : null}
    </div>
  ) : null;

  return (
    <main className={embedded ? "" : "min-h-dvh bg-muted/40"}>
      <div className={embedded ? "w-full" : "container mx-auto px-4 py-6"}>
        {topNav}
              {embeddedNav}
              {showDashboard ? (
                <AdminDashboard 
                  setShowDashboard={setShowDashboard}
                  setResource={setResource}
                  adminResources={adminResources}
                />
              ) : (
                <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{resource.label}</h2>
                  <p className="text-xs text-muted-foreground">Records: {total} • page {page}/{totalPages}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
                    {showFilters ? "Hide filters" : "Show filters"}
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="mt-3 rounded-lg border bg-background/70 p-3 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span>Search</span>
                      <div className="flex gap-2">
                      <input
                          value={searchInput}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              setSearch(searchInput);
                              setPage(1);
                            }
                          }}
                          placeholder="Search..."
                          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                      />
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSearch(searchInput);
                            setPage(1);
                          }}
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Search
                        </Button>
                      </div>
                    </label>
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span>Column</span>
                      <select
                        value={filterField}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          setFilterField(e.target.value);
                          setFilterValue("");
                        }}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">All columns</option>
                        {(resource.columns || []).map((col) => (
                          <option key={col} value={col}>{formatLabel(col)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span>Value</span>
                      {filterField && relationOptions[filterField] ? (
                        <select
                          value={filterValue}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            setFilterValue(e.target.value);
                            setPage(1);
                          }}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="">Any</option>
                          {relationOptions[filterField]?.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : filterField && resource.fieldEnums?.[filterField] ? (
                        <select
                          value={filterValue}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            setFilterValue(e.target.value);
                            setPage(1);
                          }}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="">Any</option>
                          {resource.fieldEnums[filterField].map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex gap-2">
                        <input
                          value={filterValue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterValue(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                setPage(1);
                              }
                            }}
                          placeholder={filterField ? "Enter value" : "Select column first"}
                            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                          disabled={!filterField}
                        />
                          {filterField && (
                            <Button 
                              size="sm" 
                              onClick={() => setPage(1)}
                              disabled={!filterValue}
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      )}
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>Clear search</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setFilterField(""); setFilterValue(""); setPage(1); }}>Reset filter</Button>
                  </div>
                  
                  {/* Quick Filters */}
                  {resource.key === "users" && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Quick Filters:</div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant={filterField === "role" && filterValue === "ADMIN" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("role"); setFilterValue("ADMIN"); setPage(1); }}>Admin</Button>
                        <Button variant={filterField === "role" && filterValue === "CANDIDATE" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("role"); setFilterValue("CANDIDATE"); setPage(1); }}>Candidates</Button>
                        <Button variant={filterField === "role" && filterValue === "RECRUITER" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("role"); setFilterValue("RECRUITER"); setPage(1); }}>Recruiters</Button>
                        <Button variant={filterField === "isActive" && filterValue === "false" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("isActive"); setFilterValue("false"); setPage(1); }}>Inactive</Button>
                      </div>
                    </div>
                  )}
                  
                  {resource.key === "jobs" && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Quick Filters:</div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant={filterField === "status" && filterValue === "DRAFT" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("DRAFT"); setPage(1); }}>Draft</Button>
                        <Button variant={filterField === "status" && filterValue === "PUBLISHED" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("PUBLISHED"); setPage(1); }}>Published</Button>
                        <Button variant={filterField === "status" && filterValue === "ARCHIVED" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("ARCHIVED"); setPage(1); }}>Archived</Button>
                        <Button variant={filterField === "status" && filterValue === "CLOSED" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("CLOSED"); setPage(1); }}>Closed</Button>
                        <Button variant={filterField === "isRemote" && filterValue === "true" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("isRemote"); setFilterValue("true"); setPage(1); }}>Remote</Button>
                      </div>
                    </div>
                  )}
                  
                  {resource.key === "applications" && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Quick Filters:</div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant={filterField === "status" && filterValue === "APPLIED" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("APPLIED"); setPage(1); }}>Applied</Button>
                        <Button variant={filterField === "status" && filterValue === "REVIEWING" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("REVIEWING"); setPage(1); }}>Reviewing</Button>
                        <Button variant={filterField === "status" && filterValue === "SHORTLISTED" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("SHORTLISTED"); setPage(1); }}>Shortlisted</Button>
                        <Button variant={filterField === "status" && filterValue === "HIRED" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("HIRED"); setPage(1); }}>Hired</Button>
                        <Button variant={filterField === "status" && filterValue === "REJECTED" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("REJECTED"); setPage(1); }}>Rejected</Button>
                      </div>
                    </div>
                  )}
                  
                  {resource.key === "interviews" && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Quick Filters:</div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant={filterField === "status" && filterValue === "PENDING" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("PENDING"); setPage(1); }}>Pending</Button>
                        <Button variant={filterField === "status" && filterValue === "IN_PROGRESS" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("IN_PROGRESS"); setPage(1); }}>In Progress</Button>
                        <Button variant={filterField === "status" && filterValue === "COMPLETED" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("COMPLETED"); setPage(1); }}>Completed</Button>
                        <Button variant={filterField === "status" && filterValue === "FAILED" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("status"); setFilterValue("FAILED"); setPage(1); }}>Failed</Button>
                        <Button variant={filterField === "type" && filterValue === "AI_VIDEO" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("type"); setFilterValue("AI_VIDEO"); setPage(1); }}>AI Video</Button>
                        <Button variant={filterField === "type" && filterValue === "AI_VOICE" ? "default" : "outline"} size="sm" onClick={() => { setFilterField("type"); setFilterValue("AI_VOICE"); setPage(1); }}>AI Voice</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 space-y-4">
                {resource.key === "companies" ? (
                  <Tabs value={companyTab} onValueChange={(v) => setCompanyTab(v as "unverified" | "verified")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="unverified">
                        <XCircle className="h-4 w-4 mr-2" />
                        Unverified ({companyCounts.unverified})
                      </TabsTrigger>
                      <TabsTrigger value="verified">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Verified ({companyCounts.verified})
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="unverified" className="mt-4">
                      <Card className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-amber-600" />
                            Unverified Companies
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {state.loading && <div className="text-sm text-muted-foreground">Loading...</div>}
                          {state.error && <div className="text-sm text-red-600">{state.error}</div>}
                          {!state.loading && !state.error && filteredRows.length === 0 && (
                            <div className="text-sm text-muted-foreground">No unverified companies.</div>
                          )}
                          {!state.loading && !state.error && filteredRows.length > 0 && renderTable(filteredRows)}
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="verified" className="mt-4">
                      <Card className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            Verified Companies
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {state.loading && <div className="text-sm text-muted-foreground">Loading...</div>}
                          {state.error && <div className="text-sm text-red-600">{state.error}</div>}
                          {!state.loading && !state.error && filteredRows.length === 0 && (
                            <div className="text-sm text-muted-foreground">No verified companies.</div>
                          )}
                          {!state.loading && !state.error && filteredRows.length > 0 && renderTable(filteredRows)}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                ) : (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{resource.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {state.loading && <div className="text-sm text-muted-foreground">Loading...</div>}
                    {state.error && <div className="text-sm text-red-600">{state.error}</div>}
                    {!state.loading && !state.error && state.data.length === 0 && (
                      <div className="text-sm text-muted-foreground">No data.</div>
                    )}
                      {!state.loading && !state.error && filteredRows.length > 0 && renderTable(filteredRows)}
                  </CardContent>
                </Card>
                )}
              </div>
                </>
              )}
            </div>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6">
            <div className="w-full max-w-4xl max-h-[90vh] rounded-xl bg-background shadow-2xl border flex flex-col">
              <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  {resourceIcons[resource.key] && (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {resourceIcons[resource.key]}
                    </div>
                  )}
                <div>
                    <h2 className="text-xl font-semibold">{modalMode === "create" ? "Create" : "Edit"} {resource.label}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {modalMode === "create" ? "Fill in the required information" : "Update the fields below"}
                    </p>
                </div>
              </div>
                <Button variant="ghost" size="icon" onClick={closeModal} className="h-8 w-8">
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="grid gap-6 lg:grid-cols-2">
                {filteredAllowed.map((field) => {
                  const type = guessInputType(field, formData[field]);
                  const enumOptions = resource.fieldEnums?.[field];
                  const imageField = isImageField(field);
                  const relOptions = relationOptions[field];
                  const foundedYearOptions = resource.key === "companies" ? getFoundedYearOptions() : [];

                  if (resource.key === "companies" && field === "foundedYear") {
                    return (
                      <div key={field} className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <span>{formatLabel(field)}</span>
                        </label>
                        <select
                          value={String(formData[field] ?? "")}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const v = e.target.value;
                            handleFormChange(field, v === "" ? null : Number.parseInt(v, 10));
                          }}
                          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        >
                          <option value="">— Select Year —</option>
                          {foundedYearOptions.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (relOptions && relOptions.length > 0) {
                    return (
                      <div key={field} className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{formatLabel(field)}</label>
                        <select
                          value={String(formData[field] ?? "")}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFormChange(field, e.target.value)}
                          className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        >
                          <option value="">— Select {formatLabel(field)} —</option>
                          {relOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (type === "select" && enumOptions) {
                    return (
                      <div key={field} className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{formatLabel(field)}</label>
                        <div className="flex flex-wrap gap-2">
                          {enumOptions.map((opt) => {
                            const active = formData[field] === opt;
                            return (
                            <Badge
                              key={`${field}-chip-${opt}`}
                                variant={active ? "default" : "outline"}
                                className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1"
                              onClick={() => handleFormChange(field, opt)}
                            >
                              {opt}
                            </Badge>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (type === "checkbox") {
                    return (
                      <div
                        key={field}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {formatLabel(field)}
                          </span>
                        </div>
                        <Switch
                          checked={Boolean(formData[field])}
                          onCheckedChange={(checked: boolean) => handleFormChange(field, checked)}
                        />
                      </div>
                    );
                  }

                  if (type === "textarea") {
                    return (
                      <div key={field} className="space-y-2 lg:col-span-2">
                        <label className="text-sm font-medium text-foreground">{formatLabel(field)}</label>
                        <Textarea
                          value={String(formData[field] ?? "")}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFormChange(field, e.target.value)}
                          className="min-h-[120px] rounded-lg border-input focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-y"
                          placeholder={`Enter ${formatLabel(field).toLowerCase()}...`}
                        />
                      </div>
                    );
                  }

                  const inputVal: string = String(formData[field] ?? "");
                  return (
                    <div key={field} className={`space-y-2 ${imageField ? "lg:col-span-2" : ""}`}>
                      <label className="text-sm font-medium text-foreground flex items-center justify-between">
                        <span>{formatLabel(field)}</span>
                        {imageField && (
                          <span className="text-xs text-muted-foreground font-normal">Upload image or paste URL</span>
                        )}
                      </label>
                      <div className="flex items-start gap-3">
                        <input
                          type={type === "number" ? "number" : "text"}
                          value={inputVal}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleFormChange(
                              field,
                              type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
                            )}
                          className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                          placeholder={`Enter ${formatLabel(field).toLowerCase()}...`}
                        />
                        {imageField && (
                          <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-muted hover:bg-muted/80 cursor-pointer transition-colors text-sm font-medium">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              uploadFile(field, file)
                                .then((url) => handleFormChange(field, url))
                                .catch((err) => alert(err instanceof Error ? err.message : "Upload failed"));
                            }}
                              className="hidden"
                          />
                            <span>Upload</span>
                          </label>
                        )}
                      </div>
                      {imageField && (
                        <div className="space-y-2">
                          {uploadingField === field && (
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              Uploading...
                            </div>
                          )}
                          {inputVal && inputVal.startsWith("http") && (
                            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                              <img
                                src={inputVal}
                                alt={field}
                                className="h-20 w-20 rounded-lg border object-cover flex-shrink-0"
                                onError={(ev) => {
                                  (ev.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground break-all line-clamp-2">{inputVal}</div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 h-7 text-xs"
                                  onClick={() => handleFormChange(field, "")}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {resource.key === "jobs" && relationOptions["skillId"] && (
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium text-foreground">Skills</label>
                    <div className="p-4 rounded-lg border bg-muted/20">
                    <div className="flex flex-wrap gap-2">
                      {relationOptions["skillId"]?.map((opt) => (
                        <Badge
                          key={opt.value}
                          variant={selectedSkills.includes(opt.value) ? "default" : "outline"}
                            className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1"
                          onClick={() =>
                            setSelectedSkills((prev) =>
                              prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                            )
                          }
                        >
                          {opt.label}
                        </Badge>
                      ))}
                        {relationOptions["skillId"]?.length === 0 && (
                          <span className="text-sm text-muted-foreground">No skills available</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {resource.key === "jobs" && relationOptions["categoryId"] && (
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium text-foreground">Categories</label>
                    <div className="p-4 rounded-lg border bg-muted/20">
                    <div className="flex flex-wrap gap-2">
                      {relationOptions["categoryId"]?.map((opt) => (
                        <Badge
                          key={opt.value}
                          variant={selectedCategories.includes(opt.value) ? "default" : "outline"}
                            className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1"
                          onClick={() =>
                            setSelectedCategories((prev) =>
                              prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                            )
                          }
                        >
                          {opt.label}
                        </Badge>
                      ))}
                        {relationOptions["categoryId"]?.length === 0 && (
                          <span className="text-sm text-muted-foreground">No categories available</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </div>
              <div className="flex items-center justify-between border-t px-6 py-4 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {modalMode === "create" ? "CREATE MODE" : "EDIT MODE"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {filteredAllowed.length} field{filteredAllowed.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button onClick={handleSubmit} className="min-w-[120px]">
                    {modalMode === "create" ? "Create" : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
    </main>
  );
};

export default Admin;
