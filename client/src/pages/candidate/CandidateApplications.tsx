import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/clerk-react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type ApplicationRow = {
  id: string;
  status: string;
  appliedAt: string;
  job?: { id: string; title: string; company?: { name?: string | null } | null } | null;
};

const statusVariant = (status: string): "default" | "outline" | "success" => {
  if (status === "HIRED" || status === "OFFER_SENT" || status === "SHORTLISTED") return "success";
  if (status === "REJECTED" || status === "WITHDRAWN") return "outline";
  return "default";
};

export default function CandidateApplications() {
  const navigate = useNavigate();
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
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
        const res = await fetch(`${API_BASE}/api/applications?page=1&pageSize=300`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (abort) return;
        if (!json?.success) {
          setError(json?.message || "Failed to load applications");
          setRows([]);
          return;
        }
        setRows((json.data || []) as ApplicationRow[]);
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
      const jobTitle = String(r.job?.title || "").toLowerCase();
      const company = String(r.job?.company?.name || "").toLowerCase();
      return `${jobTitle} ${company}`.includes(term);
    });
  }, [q, rows]);

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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg">Applications</CardTitle>
            <div className="text-sm text-muted-foreground">{filtered.length} items</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="Search by job or company…" />
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Job</th>
                  <th className="px-3 py-2 font-medium">Company</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Applied</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.job?.title || "Unknown job"}</div>
                      <div className="text-xs text-muted-foreground">{r.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.job?.company?.name || "-"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={statusVariant(String(r.status))}>{String(r.status)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.appliedAt ? new Date(r.appliedAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.job?.id ? (
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/jobs/${r.job?.id}`)}>
                          <ExternalLink className="h-4 w-4" />
                          View
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No applications found.
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


