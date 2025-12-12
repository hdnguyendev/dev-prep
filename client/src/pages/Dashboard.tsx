import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminClient, useAdminToken } from "@/lib/adminClient";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { BriefcaseBusiness, Building2, ClipboardList, Sparkles, Globe2, Layers, ShieldCheck } from "lucide-react";

type StatRow = { name: string; value: number };

const chartColors = ["#6366f1", "#22c55e", "#f97316", "#06b6d4", "#a855f7", "#ef4444", "#0ea5e9", "#16a34a"];

const Dashboard = () => {
  const getToken = useAdminToken();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        const [jobsRes, appsRes, intsRes, compsRes, skillsRes, catsRes] = await Promise.all([
          adminClient.list("jobs", { page: 1, pageSize: 200 }, token ?? undefined),
          adminClient.list("applications", { page: 1, pageSize: 200 }, token ?? undefined),
          adminClient.list("interviews", { page: 1, pageSize: 200 }, token ?? undefined),
          adminClient.list("companies", { page: 1, pageSize: 100 }, token ?? undefined),
          adminClient.list("skills", { page: 1, pageSize: 200 }, token ?? undefined),
          adminClient.list("categories", { page: 1, pageSize: 200 }, token ?? undefined),
        ]);

        setJobs(jobsRes.data || []);
        setApplications(appsRes.data || []);
        setInterviews(intsRes.data || []);
        setStats({
          jobs: jobsRes.meta?.total ?? jobsRes.data.length,
          applications: appsRes.meta?.total ?? appsRes.data.length,
          interviews: intsRes.meta?.total ?? intsRes.data.length,
          companies: compsRes.meta?.total ?? compsRes.data.length,
          skills: skillsRes.meta?.total ?? skillsRes.data.length,
          categories: catsRes.meta?.total ?? catsRes.data.length,
          remoteJobs: (jobsRes.data || []).filter((j: any) => j.isRemote).length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getToken]);

  const countByField = (rows: any[], field: string): StatRow[] => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      const val = r?.[field];
      const key = val === undefined || val === null || val === "" ? "Unknown" : String(val);
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const jobsByStatus = useMemo(() => countByField(jobs, "status"), [jobs]);
  const appsByStatus = useMemo(() => countByField(applications, "status"), [applications]);
  const interviewsByStatus = useMemo(() => countByField(interviews, "status"), [interviews]);

  const appsByJob = useMemo(() => {
    const map: Record<string, number> = {};
    applications.forEach((a) => {
      const title = a.job?.title || a.jobId || "Unknown";
      map[title] = (map[title] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [applications]);

  const StatCard = ({ label, value, accent, icon }: { label: string; value: number | string; accent?: string; icon?: JSX.Element }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {accent && <div className="text-xs text-muted-foreground mt-1">{accent}</div>}
      </CardContent>
    </Card>
  );

  const PieBlock = ({ title, data }: { title: string; data: StatRow[] }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie dataKey="value" data={data} nameKey="name" innerRadius={50} outerRadius={90}>
                {data.map((entry, idx) => (
                  <Cell key={entry.name} fill={chartColors[idx % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );

  const BarBlock = ({ title, data }: { title: string; data: StatRow[] }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} height={40} interval={0} angle={-10} textAnchor="end" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, idx) => (
                  <Cell key={entry.name} fill={chartColors[idx % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );

  return (
    <main className="min-h-dvh bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Tổng quan jobs, applications, interviews</p>
          </div>
          {loading && <Badge variant="outline">Loading...</Badge>}
          {error && <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Error: {error}</Badge>}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Jobs" value={stats.jobs ?? 0} icon={<BriefcaseBusiness className="h-4 w-4 text-primary" />} />
          <StatCard label="Applications" value={stats.applications ?? 0} icon={<ClipboardList className="h-4 w-4 text-primary" />} />
          <StatCard label="Interviews" value={stats.interviews ?? 0} icon={<Sparkles className="h-4 w-4 text-primary" />} />
          <StatCard label="Companies" value={stats.companies ?? 0} icon={<Building2 className="h-4 w-4 text-primary" />} />
          <StatCard label="Skills" value={stats.skills ?? 0} icon={<Layers className="h-4 w-4 text-primary" />} />
          <StatCard label="Categories" value={stats.categories ?? 0} icon={<Layers className="h-4 w-4 text-primary" />} />
          <StatCard label="Remote jobs" value={stats.remoteJobs ?? 0} icon={<Globe2 className="h-4 w-4 text-primary" />} />
          <StatCard label="Security/Compliance" value="Clerk" icon={<ShieldCheck className="h-4 w-4 text-primary" />} accent="Protected routes" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <PieBlock title="Jobs by status" data={jobsByStatus} />
          <PieBlock title="Applications by status" data={appsByStatus} />
          <BarBlock title="Applications by job (top 8)" data={appsByJob} />
          <PieBlock title="Interviews by status" data={interviewsByStatus} />
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
