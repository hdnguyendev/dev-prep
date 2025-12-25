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

const countBy = (rows: any[], field: string) => {
  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    const key = String(r?.[field] ?? "Unknown");
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
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
  const [_followedCompanies, setFollowedCompanies] = useReactState<Company[]>([]);
  const [realtimeMessages] = useReactState<string[]>([]);

  useEffect(() => {
    let abort = false;
    const run = async () => {
      if (!isLoaded) return;
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) return;

        const [appsResponse, intsResponse, followsResponse] = await Promise.all([
          apiClient.getFilteredApplications({ page: 1, pageSize: 200 }, token),
          apiClient.getFilteredInterviews({ page: 1, pageSize: 200 }, token),
          apiClient.getFollowedCompanies({ page: 1, pageSize: 100 }, token),
        ]);
        if (abort) return;

        setApplications((appsResponse?.data || []) as ApplicationRow[]);
        setInterviews((intsResponse?.data || []) as InterviewRow[]);
        setFollowedCompanies((followsResponse?.data || []) as Company[]);
      } catch (e) {
        if (abort) return;
        console.error(e);
        setError("Failed to load dashboard");
      } finally {
        if (!abort) setLoading(false);
      }
    };
    run();
    return () => {
      abort = true;
    };
  }, [getToken, isLoaded]);

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
          <CardTitle className="text-lg">Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-dashed border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 via-background to-background dark:from-blue-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Total Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{stats.totalApps}</div>
              <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">{stats.pendingApps} pending</div>
            </CardContent>
          </Card>
          <Card className="border-dashed border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 via-background to-background dark:from-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{stats.inProgressApps}</div>
              <div className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">Active applications</div>
            </CardContent>
          </Card>
          <Card className="border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 via-background to-background dark:from-emerald-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{stats.successRate}%</div>
              <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">{stats.successfulApps} successful</div>
            </CardContent>
          </Card>
          <Card className="border-dashed border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 via-background to-background dark:from-purple-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-purple-700 dark:text-purple-400 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                Interviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-purple-600 dark:text-purple-400">{stats.totalInts}</div>
              <div className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
                {stats.completedInts} completed ({stats.completionRate.toFixed(0)}%)
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {stats.avgScore !== null && (
        <Card className="border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/30 via-background to-background dark:from-cyan-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-cyan-700 dark:text-cyan-400">Interview Performance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Card className="border-dashed border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/50 to-background dark:from-cyan-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-500" />
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-cyan-600 dark:text-cyan-400">{Math.round(stats.avgScore)}</div>
                <div className="text-xs text-cyan-600/70 dark:text-cyan-400/70 mt-1">Out of 100</div>
              </CardContent>
            </Card>
            <Card className="border-dashed border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/50 to-background dark:from-indigo-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-500" />
                  Completed Interviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-indigo-600 dark:text-indigo-400">{stats.completedInts}</div>
                <div className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">{stats.completionRate.toFixed(1)}% completion rate</div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {/* Compact Charts Section */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Weekly Activity Trend */}
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/30 via-background to-background dark:from-blue-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700 dark:text-blue-400">Weekly Activity</CardTitle>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Last 4 weeks</p>
          </CardHeader>
          <CardContent className="h-56">
            {weeklyActivity.every((w) => w.applications === 0 && w.interviews === 0) ? (
              <div className="text-xs text-muted-foreground flex items-center justify-center h-full">No recent activity</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={weeklyActivity}>
                  <defs>
                    <linearGradient id="colorWeeklyApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="colorWeeklyInts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
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
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="applications" radius={[4, 4, 0, 0]} fill="url(#colorWeeklyApps)" name="Apps" />
                  <Bar dataKey="interviews" radius={[4, 4, 0, 0]} fill="url(#colorWeeklyInts)" name="Interviews" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Application to Interview Conversion */}
        <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/30 via-background to-background dark:from-purple-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-700 dark:text-purple-400">Conversion Rate</CardTitle>
            <p className="text-xs text-purple-600/70 dark:text-purple-400/70">Apps → Interviews</p>
          </CardHeader>
          <CardContent className="h-56">
            {conversionData.appsWithInterviews === 0 && conversionData.appsWithoutInterviews === 0 ? (
              <div className="text-xs text-muted-foreground flex items-center justify-center h-full">No data</div>
            ) : (
              <div className="space-y-2">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie 
                      dataKey="count" 
                      data={[
                        { name: "With Interviews", count: conversionData.appsWithInterviews },
                        { name: "No Interviews", count: conversionData.appsWithoutInterviews },
                      ]} 
                      nameKey="name" 
                      innerRadius={35} 
                      outerRadius={55}
                      paddingAngle={2}
                    >
                      <Cell fill="#a855f7" />
                      <Cell fill="#e5e7eb" />
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
                <div className="text-center">
                  <div className="text-lg font-semibold">{conversionData.conversionRate}%</div>
                  <div className="text-xs text-muted-foreground">
                    {conversionData.appsWithInterviews} of {applications.length} apps
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Success Funnel */}
        <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/30 via-background to-background dark:from-emerald-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-700 dark:text-emerald-400">Success Funnel</CardTitle>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Application stages</p>
          </CardHeader>
          <CardContent className="h-56">
            {successFunnel.length === 0 ? (
              <div className="text-xs text-muted-foreground flex items-center justify-center h-full">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={successFunnel} layout="vertical">
                  <defs>
                    <linearGradient id="colorFunnel" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis 
                    type="category" 
                    dataKey="stage" 
                    width={70}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="url(#colorFunnel)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly Activity Trend */}
        <Card className="border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Activity Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Applications & Interviews (Last 6 months)</p>
          </CardHeader>
          <CardContent className="h-80">
            {monthlyTrend.every((t) => t.applications === 0 && t.interviews === 0) ? (
              <div className="text-sm text-muted-foreground flex items-center justify-center h-full">No recent activity</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="applications" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fill="url(#colorApplications)"
                    name="Applications"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="interviews" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    fill="url(#colorInterviews)"
                    name="Interviews"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Applications by Status */}
        <Card className="border-primary/10 bg-gradient-to-br from-emerald-500/10 via-background to-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Applications by Status</CardTitle>
            <p className="text-xs text-muted-foreground">Current distribution</p>
          </CardHeader>
          <CardContent className="h-80">
            {appsByStatus.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center justify-center h-full">No data</div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                    <Pie 
                      dataKey="value" 
                      data={appsByStatus} 
                      nameKey="name" 
                      innerRadius={60} 
                      outerRadius={90}
                      paddingAngle={2}
                    >
                    {appsByStatus.map((_, idx) => (
                      <Cell key={idx} fill={chartColors[idx % chartColors.length]} />
                    ))}
                  </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                </PieChart>
              </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {appsByStatus.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
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

        {/* Interview Score Trend */}
        {scoreTrend.length > 0 && (
          <Card className="border-primary/10 bg-gradient-to-br from-cyan-500/10 via-background to-background">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Interview Score Trend</CardTitle>
              <p className="text-xs text-muted-foreground">Average score over time</p>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={scoreTrend}>
                  <defs>
                    <linearGradient id="colorScoreTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}`, "Avg Score"]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgScore" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    fill="url(#colorScoreTrend)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Interviews by Status */}
        <Card className="border-primary/10 bg-gradient-to-br from-orange-500/10 via-background to-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Interviews by Status</CardTitle>
            <p className="text-xs text-muted-foreground">Current interview status</p>
          </CardHeader>
          <CardContent className="h-80">
            {intsByStatus.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center justify-center h-full">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={intsByStatus}>
                  <defs>
                    <linearGradient id="colorInterviewsBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="url(#colorInterviewsBar)">
                    {intsByStatus.map((_, idx) => (
                      <Cell key={idx} fill={chartColors[idx % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


