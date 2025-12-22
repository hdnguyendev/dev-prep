import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/clerk-react";
import { ExternalLink, Loader2, Search, ClipboardList, CheckCircle2, Clock, TrendingUp, Building2, Calendar, MapPin, Briefcase, FileText, Sparkles, Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { APPLICATION_STATUS_META } from "@/constants/applications";
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

import { apiClient } from "@/lib/api";

type ApplicationRow = {
  id: string;
  status: string;
  appliedAt: string;
  job?: { 
    id: string; 
    title: string; 
    location?: string | null;
    isRemote?: boolean;
    company?: { 
      name?: string | null;
      logoUrl?: string | null;
      slug?: string | null;
    } | null;
  } | null;
};

const statusVariant = (status: string): "default" | "outline" | "success" | "destructive" => {
  if (status === "HIRED" || status === "OFFER_SENT" || status === "SHORTLISTED") return "success";
  if (status === "REJECTED" || status === "WITHDRAWN") return "destructive";
  if (status === "APPLIED" || status === "REVIEWING") return "outline";
  return "default";
};

const getCompanyInitial = (companyName?: string | null) => {
  return companyName?.[0]?.toUpperCase() || "C";
};

const getCompanyColor = (index: number) => {
  const colors = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-orange-500 to-red-500",
    "from-green-500 to-emerald-500",
    "from-indigo-500 to-blue-500",
  ];
  return colors[index % colors.length];
};

const chartColors = [
  "#6366f1", // indigo
  "#22c55e", // green
  "#f97316", // orange
  "#06b6d4", // cyan
  "#a855f7", // purple
  "#ef4444", // red
  "#0ea5e9", // sky
  "#16a34a", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
];

const statusColors: Record<string, string> = {
  APPLIED: "#6366f1",
  REVIEWING: "#f59e0b",
  SHORTLISTED: "#a855f7",
  INTERVIEW_SCHEDULED: "#06b6d4",
  INTERVIEWED: "#0ea5e9",
  OFFER_SENT: "#22c55e",
  HIRED: "#16a34a",
  REJECTED: "#ef4444",
  WITHDRAWN: "#94a3b8",
};

const countBy = (rows: ApplicationRow[], field: string) => {
  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    const key = String((r as any)?.[field] ?? "Unknown");
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const dayKey = (d: Date) => startOfDay(d).toISOString().slice(0, 10);

const lastNDays = (n: number) => {
  const out: string[] = [];
  const today = startOfDay(new Date());
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
};

export default function CandidateApplications() {
  const navigate = useNavigate();
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  const handleSearch = () => {
    setQ(qInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  useEffect(() => {
    let abort = false;
    const run = async () => {
      if (!isLoaded) return;
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) return;
        const response = await apiClient.getFilteredApplications({ 
          page: 1, 
          pageSize: 300,
          q: q.trim() || undefined,
        }, token);
        if (abort) return;
        if (!response?.success) {
          setError(response?.message || "Failed to load applications");
          setRows([]);
          return;
        }
        setRows((response.data || []) as ApplicationRow[]);
      } catch (e) {
        if (abort) return;
        console.error(e);
        setError("Network error");
      } finally {
        if (!abort) setLoading(false);
      }
    };
    run();
    return () => {
      abort = true;
    };
  }, [getToken, isLoaded, q]);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");

  // Recently applied (last 6 applications)
  const recentApplications = useMemo(() => {
    return [...rows]
      .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
      .slice(0, 6);
  }, [rows]);

  // Application outcome data for pie chart
  const appsByOutcome = useMemo(() => {
    const successful = rows.filter((r) => r.status === "HIRED" || r.status === "OFFER_SENT").length;
    const inProgress = rows.filter((r) => 
      r.status !== "HIRED" && r.status !== "OFFER_SENT" && r.status !== "REJECTED" && r.status !== "WITHDRAWN"
    ).length;
    const rejected = rows.filter((r) => r.status === "REJECTED" || r.status === "WITHDRAWN").length;
    return [
      { name: "Successful", value: successful },
      { name: "In Progress", value: inProgress },
      { name: "Rejected", value: rejected },
    ].filter((item) => item.value > 0);
  }, [rows]);

  // Client-side filtering only for status and date (search is done on server)
  const filtered = useMemo(() => {
    let result = rows;
    
    // Status filter
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }
    
    // Date filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter((r) => {
        if (!r.appliedAt) return false;
        const appliedDate = new Date(r.appliedAt);
        appliedDate.setHours(0, 0, 0, 0);
        return appliedDate >= fromDate;
      });
    }
    
    return result;
  }, [rows, statusFilter, dateFrom]);

  // Statistics
  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => r.status === "APPLIED" || r.status === "REVIEWING").length;
    const inProgress = rows.filter((r) => 
      r.status === "SHORTLISTED" || r.status === "INTERVIEW_SCHEDULED" || r.status === "INTERVIEWED"
    ).length;
    const successful = rows.filter((r) => r.status === "HIRED" || r.status === "OFFER_SENT").length;
    const rejected = rows.filter((r) => r.status === "REJECTED" || r.status === "WITHDRAWN").length;
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : "0";
    
    return { total, pending, inProgress, successful, rejected, successRate };
  }, [rows]);

  // Charts data
  const appsByStatus = useMemo(() => countBy(rows, "status"), [rows]);
  
  const trendDays = useMemo(() => lastNDays(30), []);
  const trend = useMemo(() => {
    const appsByDay: Record<string, number> = {};
    rows.forEach((a) => {
      const k = a.appliedAt ? dayKey(new Date(a.appliedAt)) : null;
      if (!k) return;
      appsByDay[k] = (appsByDay[k] ?? 0) + 1;
    });
    return trendDays.map((k) => ({
      day: k.slice(5), // MM-DD
      applications: appsByDay[k] ?? 0,
    }));
  }, [rows, trendDays]);

  const topCompanies = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      const company = r.job?.company?.name || "Unknown";
      counts[company] = (counts[company] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [rows]);

  // Monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      months[key] = 0;
    }
    
    rows.forEach((r) => {
      if (!r.appliedAt) return;
      const date = new Date(r.appliedAt);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (key in months) {
        months[key] = (months[key] || 0) + 1;
      }
    });
    
    return Object.entries(months).map(([month, count]) => ({ month, count }));
  }, [rows]);

  // Application funnel
  const applicationFunnel = useMemo(() => {
    const stages = [
      { name: "Applied", statuses: ["APPLIED"] },
      { name: "Reviewing", statuses: ["REVIEWING"] },
      { name: "Shortlisted", statuses: ["SHORTLISTED"] },
      { name: "Interview", statuses: ["INTERVIEW_SCHEDULED", "INTERVIEWED"] },
      { name: "Offer", statuses: ["OFFER_SENT"] },
      { name: "Hired", statuses: ["HIRED"] },
    ];
    
    return stages.map((stage) => {
      const count = rows.filter((r) => stage.statuses.includes(r.status)).length;
      return { name: stage.name, value: count };
    }).filter((s) => s.value > 0);
  }, [rows]);

  // Status progression (showing transitions)
  const statusBreakdown = useMemo(() => {
    const statusOrder = [
      "APPLIED",
      "REVIEWING", 
      "SHORTLISTED",
      "INTERVIEW_SCHEDULED",
      "INTERVIEWED",
      "OFFER_SENT",
      "HIRED",
      "REJECTED",
      "WITHDRAWN"
    ];
    
    return statusOrder.map((status) => {
      const count = rows.filter((r) => r.status === status).length;
      return { status, count };
    }).filter((s) => s.count > 0);
  }, [rows]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-destructive">{error}</div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-dashed border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 via-background to-background dark:from-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <ClipboardList className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
            <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Applications</div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 via-background to-background dark:from-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</div>
            <div className="text-xs text-amber-600/70 dark:text-amber-400/70">Awaiting review</div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/50 via-background to-background dark:from-cyan-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-500" />
              <TrendingUp className="h-4 w-4" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.inProgress}</div>
            <div className="text-xs text-cyan-600/70 dark:text-cyan-400/70">Active process</div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 via-background to-background dark:from-emerald-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <CheckCircle2 className="h-4 w-4" />
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.successful}</div>
            <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{stats.successRate}% success rate</div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50/50 via-background to-background dark:from-rose-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-rose-500" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.rejected}</div>
            <div className="text-xs text-rose-600/70 dark:text-rose-400/70">Not selected</div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Applied Section */}
      {recentApplications.length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/30 via-background to-background dark:from-indigo-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <Clock className="h-5 w-5" />
              Recently Applied
            </CardTitle>
            <CardDescription>Your most recent job applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentApplications.map((app) => {
                const status = String(app.status);
                const meta = APPLICATION_STATUS_META[status as keyof typeof APPLICATION_STATUS_META] || APPLICATION_STATUS_META.APPLIED;
                const Icon = meta.Icon;
                return (
                  <Card
                    key={app.id}
                    className="group border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50/50 via-background to-background dark:from-slate-950/10 transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer"
                    onClick={() => app.job?.id && navigate(`/jobs/${app.job.id}`)}
                  >
        <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                            {app.job?.title || "Job"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Building2 className="h-3 w-3" />
                            {app.job?.company?.name || "Company"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Badge
                        variant={statusVariant(status)}
                        className="inline-flex h-7 items-center gap-2 px-3 text-xs font-medium"
                      >
                        <Icon className="h-3 w-3" />
                        <span>{meta.label}</span>
                      </Badge>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section - 2 Pie Charts + 1 Line Chart (Compact) */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Pie Chart 1: Applications by Status */}
        <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/30 via-background to-background dark:from-indigo-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-indigo-700 dark:text-indigo-400">Applications by Status</CardTitle>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">Distribution</p>
          </CardHeader>
          <CardContent className="h-56">
            {appsByStatus.length === 0 ? (
              <div className="text-xs text-muted-foreground flex items-center justify-center h-full">No data</div>
            ) : (
              <div className="space-y-2">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie 
                      dataKey="value" 
                      data={appsByStatus} 
                      nameKey="name" 
                      innerRadius={35} 
                      outerRadius={55}
                      paddingAngle={2}
                    >
                      {appsByStatus.map((item) => (
                        <Cell key={item.name} fill={statusColors[item.name] || chartColors[0]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {appsByStatus.slice(0, 4).map((item) => (
                    <div key={item.name} className="flex items-center gap-1">
                      <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: statusColors[item.name] || chartColors[0] }}
                      />
                      <span className="text-muted-foreground truncate">{item.name}:</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart 2: Application Outcome */}
        <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50/30 via-background to-background dark:from-teal-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-teal-700 dark:text-teal-400">Application Outcome</CardTitle>
            <p className="text-xs text-teal-600/70 dark:text-teal-400/70">Result summary</p>
          </CardHeader>
          <CardContent className="h-56">
            {appsByOutcome.length === 0 ? (
              <div className="text-xs text-muted-foreground flex items-center justify-center h-full">No data</div>
            ) : (
              <div className="space-y-2">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie 
                      dataKey="value" 
                      data={appsByOutcome} 
                      nameKey="name" 
                      innerRadius={35} 
                      outerRadius={55}
                      paddingAngle={2}
                    >
                      {appsByOutcome.map((_, idx) => (
                        <Cell key={idx} fill={chartColors[idx % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  {appsByOutcome.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1">
                      <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: chartColors[idx % chartColors.length] }}
                      />
                      <span className="text-muted-foreground">{item.name}:</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart: Application Trend */}
        <Card className="border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/30 via-background to-background dark:from-cyan-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cyan-700 dark:text-cyan-400">Application Trend</CardTitle>
            <p className="text-xs text-cyan-600/70 dark:text-cyan-400/70">Last 30 days</p>
          </CardHeader>
          <CardContent className="h-56">
            {trend.every((t) => t.applications === 0) ? (
              <div className="text-xs text-muted-foreground flex items-center justify-center h-full">No recent activity</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="applications" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    fill="url(#colorApplications)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50/20 via-background to-background dark:from-slate-950/5">
        <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg text-slate-700 dark:text-slate-300">All Applications</CardTitle>
            <div className="text-sm text-slate-600 dark:text-slate-400">{filtered.length} items</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search and Filters */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative flex gap-2">
              <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  value={qInput} 
                  onChange={(e) => setQInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-9" 
                  placeholder="Search by job or company…" 
                />
              </div>
              <Button onClick={handleSearch} size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All Status</option>
              {Object.keys(APPLICATION_STATUS_META).map((status) => (
                <option key={status} value={status}>
                  {APPLICATION_STATUS_META[status as keyof typeof APPLICATION_STATUS_META].label}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Applied from"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/50 bg-card">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Job
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Company
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      Status
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Applied
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((r, index) => {
                  const status = String(r.status);
                  const meta = APPLICATION_STATUS_META[status as keyof typeof APPLICATION_STATUS_META] || APPLICATION_STATUS_META.APPLIED;
                  const StatusIcon = meta.Icon;
                  const companyName = r.job?.company?.name || "Unknown";
                  const companyLogo = r.job?.company?.logoUrl;
                  
                  return (
                    <tr 
                      key={r.id} 
                      className="group hover:bg-gradient-to-r hover:from-primary/5 hover:via-primary/3 hover:to-transparent transition-all cursor-pointer border-b border-border/30"
                      onClick={() => r.job?.id && navigate(`/jobs/${r.job.id}`)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {r.job?.title || "Unknown job"}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              {r.job?.isRemote && (
                                <Badge variant="outline" className="gap-1 text-xs px-1.5 py-0 h-5">
                                  <MapPin className="h-3 w-3" />
                                  Remote
                                </Badge>
                              )}
                              {r.job?.location && !r.job.isRemote && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {r.job.location}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground/70 mt-1 font-mono">
                              {r.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {companyLogo ? (
                            <img 
                              src={companyLogo} 
                              alt={companyName}
                              className="h-10 w-10 rounded-lg object-cover border-2 border-border/50 shadow-sm"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className={`h-10 w-10 rounded-lg bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-sm font-bold text-white shadow-sm border-2 border-border/50 ${companyLogo ? 'hidden' : 'flex'}`}
                          >
                            {getCompanyInitial(companyName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">{companyName}</div>
                            {r.job?.company?.slug && (
                              <div className="text-xs text-muted-foreground">@{r.job.company.slug}</div>
                            )}
                          </div>
                        </div>
                    </td>
                      <td className="px-4 py-4">
                        <Badge 
                          variant={statusVariant(status)}
                          className="inline-flex h-7 items-center gap-1.5 px-3 text-xs font-medium shadow-sm"
                        >
                          <StatusIcon className="h-3 w-3" />
                          <span>{meta.label}</span>
                        </Badge>
                    </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">
                            {r.appliedAt ? new Date(r.appliedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            }) : "-"}
                          </span>
                        </div>
                        {r.appliedAt && (
                          <div className="text-xs text-muted-foreground/70 mt-1">
                            {new Date(r.appliedAt).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        )}
                    </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                      {r.job?.id ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/jobs/${r.job?.id}`);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/jobs/${r.job?.id}`);
                                }}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </>
                      ) : null}
                        </div>
                    </td>
                  </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
                        <div className="text-muted-foreground font-medium">No applications found</div>
                        <div className="text-sm text-muted-foreground/70">Try adjusting your search or filters</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


