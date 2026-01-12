import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
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

import { apiClient, type Company } from "@/lib/api";
import { useState as useReactState } from "react";

type ApplicationRow = { id: string; status: string; appliedAt: string; jobId?: string | null };
type InterviewRow = { id: string; status: string; createdAt: string; overallScore?: number | null; applicationId?: string | null; jobId?: string | null };

const chartColors = ["#6366f1", "#22c55e", "#f97316", "#06b6d4", "#a855f7", "#ef4444", "#0ea5e9", "#16a34a"];

/**
 * Format application status from UPPER_SNAKE_CASE to Title Case
 * Example: "APPLIED" -> "Applied", "INTERVIEW_SCHEDULED" -> "Interview Scheduled"
 */
const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const countBy = (rows: any[], field: string) => {
  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    const key = String(r?.[field] ?? "Unknown");
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name: formatStatus(name), value }));
};

// const startOfDay = (d: Date) => {
//   const x = new Date(d);
//   x.setHours(0, 0, 0, 0);
//   return x;
// };

// const dayKey = (d: Date) => startOfDay(d).toISOString().slice(0, 10);

  // const lastNDays = (n: number) => {
  //   const out: string[] = [];
  //   const today = startOfDay(new Date());
  //   for (let i = n - 1; i >= 0; i -= 1) {
  //     const d = new Date(today);
  //     d.setDate(today.getDate() - i);
  //     out.push(dayKey(d));
  //   }
  //   return out;
  // };

// const bucketScore0to100 = (score: number) => {
//   const s = Math.max(0, Math.min(100, Math.round(score)));
//   const base = Math.floor(s / 10) * 10;
//   const hi = Math.min(100, base + 9);
//   return `${base}-${hi}`;
// };

export default function CandidateDashboard() {
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [followedCompanies, setFollowedCompanies] = useState<Company[]>([]);
  const [realtimeMessages] = useReactState<string[]>([]);

  useEffect(() => {
    let abort = false;
    const run = async () => {
      if (!isLoaded) return;
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        console.log("Dashboard auth token:", token ? "present" : "missing");
        console.log("Dashboard user loaded:", isLoaded);
        if (!token) {
          setError("Authentication required. Please log in.");
          setLoading(false);
          return;
        }

        const [appsResponse, intsResponse, followsResponse] = await Promise.all([
          apiClient.getFilteredApplications({ page: 1, pageSize: 200 }, token),
          apiClient.getFilteredInterviews({ page: 1, pageSize: 200 }, token),
          apiClient.getFollowedCompanies({ page: 1, pageSize: 100 }, token),
        ]);
        if (abort) return;

        setApplications((appsResponse?.data || []) as ApplicationRow[]);
        setInterviews((intsResponse?.data || []) as InterviewRow[]);
        setFollowedCompanies((followsResponse?.data || []) as Company[]);
      } catch (error) {
        if (abort) return;
        console.error("Error loading dashboard:", error);
        setError(`Failed to load dashboard: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        if (!abort) setLoading(false);
      }
    };
    run();
    return () => {
      abort = true;
    };
  }, [getToken, isLoaded]);

  // Debug: Log current state
  console.log("CandidateDashboard state:", { applications, interviews, followedCompanies, loading, error });

  // WebSocket realtime notifications have been removed.

  const appsByStatus = useMemo(() => countBy(applications, "status"), [applications]);
  const intsByStatus = useMemo(() => countBy(interviews, "status"), [interviews]);

  // const trendDays = useMemo(() => lastNDays(14), []);
  // const _trend = useMemo(() => {
  //   const appsByDay: Record<string, number> = {};
  //   const intsByDay: Record<string, number> = {};
  //   applications.forEach((a) => {
  //     const k = a.appliedAt ? dayKey(new Date(a.appliedAt)) : null;
  //     if (!k) return;
  //     appsByDay[k] = (appsByDay[k] ?? 0) + 1;
  //   });
  //   interviews.forEach((i) => {
  //     const k = i.createdAt ? dayKey(new Date(i.createdAt)) : null;
  //     if (!k) return;
  //     intsByDay[k] = (intsByDay[k] ?? 0) + 1;
  //   });
  //   return trendDays.map((k) => ({
  //     day: k.slice(5), // MM-DD
  //     applications: appsByDay[k] ?? 0,
  //     interviews: intsByDay[k] ?? 0,
  //   }));
  // }, [applications, interviews, trendDays]);

  // const _scoreHistogram = useMemo(() => {
  //   const counts: Record<string, number> = {};
  //   interviews
  //     .filter((i) => typeof i.overallScore === "number")
  //     .forEach((i) => {
  //       const k = bucketScore0to100(Number(i.overallScore));
  //       counts[k] = (counts[k] ?? 0) + 1;
  //     });
  //   // Ensure stable bucket ordering 0-9 ... 90-99, 100-100 would map to 100-100? keep 100 in 100-100 by bucket fn.
  //   const buckets = Array.from({ length: 11 }, (_, idx) => idx * 10).map((b) => bucketScore0to100(b));
  //   return buckets.map((b) => ({ bucket: b, value: counts[b] ?? 0 }));
  // }, [interviews]);

  // Monthly application trend
  const monthlyTrend = useMemo(() => {
    const months: Record<string, { applications: number; interviews: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      months[key] = { applications: 0, interviews: 0 };
    }
    
    applications.forEach((a) => {
      if (!a.appliedAt) return;
      const date = new Date(a.appliedAt);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (key in months) {
        months[key].applications += 1;
      }
    });

    interviews.forEach((i) => {
      if (!i.createdAt) return;
      const date = new Date(i.createdAt);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (key in months) {
        months[key].interviews += 1;
      }
    });
    
    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  }, [applications, interviews]);

  // Interview score trend over time
  const scoreTrend = useMemo(() => {
    const scoredInterviews = interviews
      .filter((i) => typeof i.overallScore === "number" && i.createdAt)
      .map((i) => ({
        date: new Date(i.createdAt),
        score: Number(i.overallScore),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (scoredInterviews.length === 0) return [];

    // Group by month
    const byMonth: Record<string, number[]> = {};
    scoredInterviews.forEach((item) => {
      const key = item.date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(item.score);
    });

    return Object.entries(byMonth).map(([month, scores]) => ({
      month,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    }));
  }, [interviews]);

  // Application to Interview conversion
  const conversionData = useMemo(() => {
    const appsWithInterviews = applications.filter((a) => {
      return interviews.some((i) => i.applicationId === a.id || i.jobId === a.jobId);
    }).length;
    const totalApps = applications.length;
    const conversionRate = totalApps > 0 ? ((appsWithInterviews / totalApps) * 100).toFixed(1) : "0";
    
    return {
      appsWithInterviews,
      appsWithoutInterviews: totalApps - appsWithInterviews,
      conversionRate,
    };
  }, [applications, interviews]);

  // Weekly activity (last 4 weeks)
  const weeklyActivity = useMemo(() => {
    const weeks: Record<string, { applications: number; interviews: number }> = {};
    const now = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekKey = `Week ${i + 1}`;
      weeks[weekKey] = { applications: 0, interviews: 0 };
      
      applications.forEach((a) => {
        if (!a.appliedAt) return;
        const date = new Date(a.appliedAt);
        if (date >= weekStart && date <= weekEnd) {
          weeks[weekKey].applications += 1;
        }
      });
      
      interviews.forEach((i) => {
        if (!i.createdAt) return;
        const date = new Date(i.createdAt);
        if (date >= weekStart && date <= weekEnd) {
          weeks[weekKey].interviews += 1;
        }
      });
    }
    
    return Object.entries(weeks).map(([week, data]) => ({ week, ...data }));
  }, [applications, interviews]);

  // Application success funnel
  const successFunnel = useMemo(() => {
    const applied = applications.length;
    const shortlisted = applications.filter((a) => a.status === "SHORTLISTED").length;
    const interviewed = applications.filter((a) => 
      a.status === "INTERVIEW_SCHEDULED" || a.status === "INTERVIEWED"
    ).length;
    const offered = applications.filter((a) => a.status === "OFFER_SENT").length;
    const hired = applications.filter((a) => a.status === "HIRED").length;
    
    return [
      { stage: "Applied", count: applied },
      { stage: "Shortlisted", count: shortlisted },
      { stage: "Interviewed", count: interviewed },
      { stage: "Offered", count: offered },
      { stage: "Hired", count: hired },
    ].filter((item) => item.count > 0);
  }, [applications]);

  // Interview completion rate over time
  const interviewCompletionTrend = useMemo(() => {
    const months: Record<string, { total: number; completed: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      months[key] = { total: 0, completed: 0 };
    }
    
    interviews.forEach((i) => {
      if (!i.createdAt) return;
      const date = new Date(i.createdAt);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (key in months) {
        months[key].total += 1;
        if (i.status === "COMPLETED") {
          months[key].completed += 1;
        }
      }
    });
    
    return Object.entries(months).map(([month, data]) => ({
      month,
      completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      total: data.total,
      completed: data.completed,
    }));
  }, [interviews]);

  // Application status changes over time (by day)
  const statusTimeline = useMemo(() => {
    const statusCounts: Record<string, Record<string, number>> = {};
    const now = new Date();
    // Get last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      statusCounts[key] = {};
    }
    
    applications.forEach((a) => {
      if (!a.appliedAt) return;
      const date = new Date(a.appliedAt);
      date.setHours(0, 0, 0, 0);
      const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (key in statusCounts) {
        statusCounts[key][a.status] = (statusCounts[key][a.status] || 0) + 1;
      }
    });
    
    const statuses = ["APPLIED", "REVIEWING", "SHORTLISTED", "INTERVIEW_SCHEDULED", "HIRED", "REJECTED"];
    return Object.entries(statusCounts).map(([day, counts]) => ({
      day,
      ...Object.fromEntries(statuses.map(s => [formatStatus(s), counts[s] || 0])),
    }));
  }, [applications]);

  // Top application statuses (for pie chart)
  const topStatuses = useMemo(() => {
    return appsByStatus
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(item => ({
        name: item.name,
        value: item.value,
      }));
  }, [appsByStatus]);

  const stats = useMemo(() => {
    const totalApps = applications.length;
    const totalInts = interviews.length;
    const completedInts = interviews.filter((i) => i.status === "COMPLETED").length;
    const scored = interviews.filter((i) => typeof i.overallScore === "number").map((i) => Number(i.overallScore));
    const avgScore = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
    const completionRate = totalInts ? (completedInts / totalInts) * 100 : 0;
    
    // Application stats
    const pendingApps = applications.filter((a) => a.status === "APPLIED" || a.status === "REVIEWING").length;
    const inProgressApps = applications.filter((a) => 
      a.status === "SHORTLISTED" || a.status === "INTERVIEW_SCHEDULED" || a.status === "INTERVIEWED"
    ).length;
    const successfulApps = applications.filter((a) => a.status === "HIRED" || a.status === "OFFER_SENT").length;
    const successRate = totalApps > 0 ? ((successfulApps / totalApps) * 100).toFixed(1) : "0";
    
    return { 
      totalApps, 
      totalInts, 
      completedInts, 
      avgScore, 
      completionRate,
      pendingApps,
      inProgressApps,
      successfulApps,
      successRate
    };
  }, [applications, interviews]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {realtimeMessages.length > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary">
              Company updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-foreground">
            {realtimeMessages.map((msg, idx) => (
              <div key={`${msg}-${idx}`} className="truncate">
                {msg}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-dashed border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 via-background to-background dark:from-blue-950/20">
            <CardHeader className="pb-1.5 pt-3 px-3">
              <CardTitle className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Total Applications
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">{stats.totalApps}</div>
              <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">{stats.pendingApps} pending</div>
            </CardContent>
          </Card>
          <Card className="border-dashed border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 via-background to-background dark:from-amber-950/20">
            <CardHeader className="pb-1.5 pt-3 px-3">
              <CardTitle className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <div className="text-xl font-semibold text-amber-600 dark:text-amber-400">{stats.inProgressApps}</div>
              <div className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">Active applications</div>
            </CardContent>
          </Card>
          <Card className="border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 via-background to-background dark:from-emerald-950/20">
            <CardHeader className="pb-1.5 pt-3 px-3">
              <CardTitle className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{stats.successRate}%</div>
              <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">{stats.successfulApps} successful</div>
            </CardContent>
          </Card>
          <Card className="border-dashed border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 via-background to-background dark:from-purple-950/20">
            <CardHeader className="pb-1.5 pt-3 px-3">
              <CardTitle className="text-xs text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Interviews
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <div className="text-xl font-semibold text-purple-600 dark:text-purple-400">{stats.totalInts}</div>
              <div className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-0.5">
                {stats.completedInts} completed ({stats.completionRate.toFixed(0)}%)
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>


      {/* Application Status Overview + Activity Trend - 1:3 ratio */}
      <div className="grid gap-3 lg:grid-cols-4">
        {/* Application Status Overview - 1/4 width */}
        <Card className="lg:col-span-1 border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50/40 via-background to-background dark:from-emerald-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground mb-1">Application Status</CardTitle>
              <p className="text-xs text-muted-foreground mb-2">
                See where your applications stand. Focus on those in progress and follow up on pending ones.
              </p>
              {appsByStatus.length > 0 && (
                <div className="text-center mt-1">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {applications.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="h-64">
            {appsByStatus.length === 0 ? (
              <div className="text-xs text-muted-foreground flex items-center justify-center h-full text-center">No applications yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie 
                    dataKey="value" 
                    data={appsByStatus} 
                    nameKey="name" 
                    innerRadius={40} 
                    outerRadius={70}
                    paddingAngle={2}
                    labelLine={false}
                  >
                    {appsByStatus.map((_, idx) => (
                      <Cell 
                        key={idx} 
                        fill={chartColors[idx % chartColors.length]}
                        stroke="hsl(var(--background))"
                        strokeWidth={1.5}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} application${value !== 1 ? 's' : ''}`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Your Activity Over Time - 3/4 width */}
        <Card className="lg:col-span-3 border-primary/20 bg-gradient-to-br from-indigo-50/50 via-background to-background dark:from-indigo-950/20 dark:border-indigo-800/30 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground mb-1">Your Activity Over Time</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Track your job search progress. See how your applications and interviews have changed over the past 6 months.
                </p>
              </div>
              {monthlyTrend.length >= 2 && (() => {
                const recent = monthlyTrend[monthlyTrend.length - 1];
                const previous = monthlyTrend[monthlyTrend.length - 2];
                const appChange = previous.applications > 0 
                  ? ((recent.applications - previous.applications) / previous.applications * 100).toFixed(0)
                  : recent.applications > 0 ? "100" : "0";
                const intChange = previous.interviews > 0
                  ? ((recent.interviews - previous.interviews) / previous.interviews * 100).toFixed(0)
                  : recent.interviews > 0 ? "100" : "0";
                return (
                  <div className="text-right space-y-1">
                    <div className="text-xs text-muted-foreground">This month</div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">{recent.applications}</span>
                        <span className="text-xs text-muted-foreground ml-1">apps</span>
                        {Number(appChange) !== 0 && (
                          <span className={`text-xs ml-1 ${Number(appChange) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {Number(appChange) > 0 ? '↑' : '↓'} {Math.abs(Number(appChange))}%
                          </span>
                        )}
                      </div>
                      <div className="text-xs">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{recent.interviews}</span>
                        <span className="text-xs text-muted-foreground ml-1">interviews</span>
                        {Number(intChange) !== 0 && (
                          <span className={`text-xs ml-1 ${Number(intChange) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {Number(intChange) > 0 ? '↑' : '↓'} {Math.abs(Number(intChange))}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent className="h-64">
            {monthlyTrend.every((t) => t.applications === 0 && t.interviews === 0) ? (
              <div className="text-xs text-muted-foreground flex items-center justify-center h-full">No recent activity. Start applying to see your progress!</div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <AreaChart data={monthlyTrend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="50%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                      <stop offset="50%" stopColor="#22c55e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={0.5}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={0.5}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} ${name.toLowerCase()}`,
                      name === "Applications" ? "📝 Applications" : "🎤 Interviews"
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="applications" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fill="url(#colorApplications)"
                    name="Applications"
                    dot={{ fill: "#6366f1", r: 3, strokeWidth: 1.5, stroke: "#fff" }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="interviews" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    fill="url(#colorInterviews)"
                    name="Interviews"
                    dot={{ fill: "#22c55e", r: 3, strokeWidth: 1.5, stroke: "#fff" }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Application Journey Timeline + Interview Status Breakdown - 2 columns */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Status Distribution Over Time */}
        <Card className="border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-br from-violet-50/40 via-background to-background dark:from-violet-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground mb-1">Application Journey Timeline</CardTitle>
              <p className="text-xs text-muted-foreground">
                Track how your applications progress through different stages each day. See your success rate improve over the last 30 days.
              </p>
            </div>
          </CardHeader>
          <CardContent className="h-56">
            {statusTimeline.every((t) => Object.values(t).filter(v => typeof v === 'number').every(v => v === 0)) ? (
              <div className="text-xs text-muted-foreground flex items-center justify-center h-full">No data available. Your application history will appear here.</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={statusTimeline} margin={{ top: 5, right: 5, left: 0, bottom: 40 }}>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={0.5}
                    angle={-45}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={0.5}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} application${value !== 1 ? 's' : ''}`,
                      name
                    ]}
                  />
                  <Bar dataKey="Applied" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Reviewing" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Shortlisted" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Interview Scheduled" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Hired" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Interview Status Breakdown */}
        <Card className="border-orange-200/50 dark:border-orange-800/30 bg-gradient-to-br from-orange-50/40 via-background to-background dark:from-orange-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground mb-1">Interview Status Breakdown</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Monitor your interview pipeline. See how many interviews you have at each stage and prepare accordingly.
                </p>
              </div>
              {intsByStatus.length > 0 && (
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {interviews.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  {stats.completedInts > 0 && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {stats.completedInts} completed
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="h-56">
            {intsByStatus.length === 0 ? (
              <div className="text-xs text-muted-foreground flex items-center justify-center h-full">No interviews yet. Keep applying to get interview opportunities!</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <PieChart>
                  <defs>
                    <linearGradient id="colorInterviewsPie" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.7}/>
                    </linearGradient>
                  </defs>
                  <Pie
                    data={intsByStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={3}
                    labelLine={false}
                  >
                    {intsByStatus.map((_, idx) => (
                      <Cell 
                        key={idx} 
                        fill={chartColors[idx % chartColors.length]}
                        stroke="hsl(var(--background))"
                        strokeWidth={1.5}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} interview${value !== 1 ? 's' : ''}`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


