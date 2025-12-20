import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type ApplicationRow = { id: string; status: string; appliedAt: string };
type InterviewRow = { id: string; status: string; createdAt: string; overallScore?: number | null };

const chartColors = ["#6366f1", "#22c55e", "#f97316", "#06b6d4", "#a855f7", "#ef4444", "#0ea5e9", "#16a34a"];

const countBy = (rows: any[], field: string) => {
  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    const key = String(r?.[field] ?? "Unknown");
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

const bucketScore0to100 = (score: number) => {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const base = Math.floor(s / 10) * 10;
  const hi = Math.min(100, base + 9);
  return `${base}-${hi}`;
};

export default function CandidateDashboard() {
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);

  useEffect(() => {
    let abort = false;
    const run = async () => {
      if (!isLoaded) return;
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };
        const [appsRes, intsRes] = await Promise.all([
          fetch(`${API_BASE}/api/applications?page=1&pageSize=200`, { headers }),
          fetch(`${API_BASE}/api/interviews?page=1&pageSize=200`, { headers }),
        ]);
        const appsJson = await appsRes.json();
        const intsJson = await intsRes.json();
        if (abort) return;

        setApplications((appsJson?.data || []) as ApplicationRow[]);
        setInterviews((intsJson?.data || []) as InterviewRow[]);
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

  const appsByStatus = useMemo(() => countBy(applications, "status"), [applications]);
  const intsByStatus = useMemo(() => countBy(interviews, "status"), [interviews]);

  const trendDays = useMemo(() => lastNDays(14), []);
  const trend = useMemo(() => {
    const appsByDay: Record<string, number> = {};
    const intsByDay: Record<string, number> = {};
    applications.forEach((a) => {
      const k = a.appliedAt ? dayKey(new Date(a.appliedAt)) : null;
      if (!k) return;
      appsByDay[k] = (appsByDay[k] ?? 0) + 1;
    });
    interviews.forEach((i) => {
      const k = i.createdAt ? dayKey(new Date(i.createdAt)) : null;
      if (!k) return;
      intsByDay[k] = (intsByDay[k] ?? 0) + 1;
    });
    return trendDays.map((k) => ({
      day: k.slice(5), // MM-DD
      applications: appsByDay[k] ?? 0,
      interviews: intsByDay[k] ?? 0,
    }));
  }, [applications, interviews, trendDays]);

  const scoreHistogram = useMemo(() => {
    const counts: Record<string, number> = {};
    interviews
      .filter((i) => typeof i.overallScore === "number")
      .forEach((i) => {
        const k = bucketScore0to100(Number(i.overallScore));
        counts[k] = (counts[k] ?? 0) + 1;
      });
    // Ensure stable bucket ordering 0-9 ... 90-99, 100-100 would map to 100-100? keep 100 in 100-100 by bucket fn.
    const buckets = Array.from({ length: 11 }, (_, idx) => idx * 10).map((b) => bucketScore0to100(b));
    return buckets.map((b) => ({ bucket: b, value: counts[b] ?? 0 }));
  }, [interviews]);

  const stats = useMemo(() => {
    const totalApps = applications.length;
    const totalInts = interviews.length;
    const completedInts = interviews.filter((i) => i.status === "COMPLETED").length;
    const scored = interviews.filter((i) => typeof i.overallScore === "number").map((i) => Number(i.overallScore));
    const avgScore = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
    const completionRate = totalInts ? (completedInts / totalInts) * 100 : 0;
    return { totalApps, totalInts, completedInts, avgScore, completionRate };
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.totalApps}</div>
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.totalInts}</div>
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-semibold">{stats.completedInts}</div>
              <div className="text-xs text-muted-foreground">{stats.completionRate.toFixed(0)}% completion</div>
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Avg score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.avgScore === null ? "-" : Math.round(stats.avgScore)}</div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity trend (last 14 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {trend.every((t) => t.applications === 0 && t.interviews === 0) ? (
              <div className="text-sm text-muted-foreground">No recent activity</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="applications" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="interviews" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Applications by status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {appsByStatus.length === 0 ? (
              <div className="text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={appsByStatus} nameKey="name" innerRadius={45} outerRadius={90}>
                    {appsByStatus.map((_, idx) => (
                      <Cell key={idx} fill={chartColors[idx % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Interviews by status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {intsByStatus.length === 0 ? (
              <div className="text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intsByStatus}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {intsByStatus.map((_, idx) => (
                      <Cell key={idx} fill={chartColors[idx % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Interview score distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {scoreHistogram.every((b) => b.value === 0) ? (
              <div className="text-sm text-muted-foreground">No scored interviews yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreHistogram}>
                  <XAxis dataKey="bucket" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


