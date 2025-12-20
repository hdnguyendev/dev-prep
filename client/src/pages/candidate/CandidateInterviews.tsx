import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/clerk-react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type InterviewRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  createdAt: string;
  overallScore?: number | null;
  application?: { job?: { title?: string | null } | null } | null;
  job?: { title?: string | null } | null;
};

const statusVariant = (status: string): "default" | "outline" | "success" => {
  if (status === "COMPLETED") return "success";
  if (status === "FAILED" || status === "EXPIRED") return "outline";
  return "default";
};

export default function CandidateInterviews() {
  const navigate = useNavigate();
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InterviewRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let abort = false;
    const run = async () => {
      if (!isLoaded) return;
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/interviews?page=1&pageSize=300`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (abort) return;
        if (!json?.success) {
          setError(json?.message || "Failed to load interviews");
          setRows([]);
          return;
        }
        setRows((json.data || []) as InterviewRow[]);
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
  }, [getToken, isLoaded]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const jobTitle = String(r.application?.job?.title || r.job?.title || "").toLowerCase();
      const title = String(r.title || "").toLowerCase();
      return `${title} ${jobTitle}`.includes(term);
    });
  }, [q, rows]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interviews</CardTitle>
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
          <CardTitle>Interviews</CardTitle>
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg">Interviews</CardTitle>
            <div className="text-sm text-muted-foreground">{filtered.length} items</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="Search by interview or job title…" />
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Interview</th>
                  <th className="px-3 py-2 font-medium">Job</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Score</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground">{r.id.slice(0, 8)} • {r.type}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.application?.job?.title || r.job?.title || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={statusVariant(String(r.status))}>{String(r.status)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {typeof r.overallScore === "number" ? r.overallScore : "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/interviews/${r.id}/feedback`)}>
                        <ExternalLink className="h-4 w-4" />
                        Feedback
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No interviews found.
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


