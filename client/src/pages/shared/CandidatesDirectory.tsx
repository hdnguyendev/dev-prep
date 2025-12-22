import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type SkillOption = { id: string; name: string };
type CandidateSkill = { id: string; skillId: string; skill?: { id: string; name: string } };
type CandidateProfileRow = {
  id: string;
  headline?: string | null;
  isPublic: boolean;
  user?: { firstName?: string | null; lastName?: string | null; avatarUrl?: string | null };
  skills?: CandidateSkill[];
  updatedAt: string;
};

export default function CandidatesDirectory() {
  const navigate = useNavigate();
  const staffUser = getCurrentUser();
  const isStaff = staffUser?.role === "ADMIN" || staffUser?.role === "RECRUITER";

  useEffect(() => {
    if (!isStaff) navigate("/login");
  }, [isStaff, navigate]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<CandidateProfileRow[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [q, setQ] = useState("");
  const [skillId, setSkillId] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);

  useEffect(() => setPage(1), [q, skillId]);

  useEffect(() => {
    if (!isStaff) return;
    let abort = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("pageSize", String(pageSize));
        if (q.trim()) qs.set("q", q.trim());
        if (skillId) qs.set("skillId", skillId);

        const [profilesRes, skillsRes] = await Promise.all([
          fetch(`${API_BASE}/public/candidate-profiles?${qs.toString()}`),
          skills.length ? Promise.resolve(null as any) : fetch(`${API_BASE}/skills?pageSize=200`),
        ]);

        const profilesJson = await profilesRes.json();
        const skillsJson = skillsRes ? await skillsRes.json() : null;

        if (abort) return;

        if (!profilesJson?.success) {
          setError(profilesJson?.message || "Failed to load profiles");
          setProfiles([]);
          setTotal(0);
          return;
        }

        setProfiles((profilesJson.data || []) as CandidateProfileRow[]);
        setTotal(Number(profilesJson?.meta?.total || 0));

        if (skillsJson?.data) {
          setSkills((skillsJson.data || []).map((r: any) => ({ id: String(r.id), name: String(r.name ?? r.id) })));
        }
      } catch (e) {
        if (abort) return;
        console.error(e);
        setError("Failed to load profiles");
      } finally {
        if (!abort) setLoading(false);
      }
    };
    load();
    return () => {
      abort = true;
    };
  }, [isStaff, page, pageSize, q, skillId, skills.length]);

  return (
    <main className="min-h-dvh bg-muted/40 py-8">
      <div className="container mx-auto px-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Candidates</h1>
            <p className="text-sm text-muted-foreground">Browse published candidate profiles.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or headline…"
              className="w-[260px]"
            />
            <select
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All skills</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <div className="rounded-lg border bg-background p-4 text-sm text-destructive">{error}</div> : null}

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profiles.map((p) => {
                const name = `${p.user?.firstName ?? ""} ${p.user?.lastName ?? ""}`.trim() || "Candidate";
                const topSkills = (p.skills || [])
                  .map((cs) => cs.skill?.name || "")
                  .filter((s) => s.trim().length > 0)
                  .slice(0, 8);

                return (
                  <Card key={p.id} className="overflow-hidden">
                    <CardHeader className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base break-words">{name}</CardTitle>
                        <Badge variant="outline">Public</Badge>
                      </div>
                      {p.headline ? <div className="text-sm text-muted-foreground break-words">{p.headline}</div> : null}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {topSkills.length ? (
                          topSkills.map((s) => (
                            <Badge key={`${p.id}-${s}`} variant="secondary" className="max-w-full break-words">
                              {s}
                            </Badge>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">No skills</div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground">
                          Updated: {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "-"}
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/candidates/${encodeURIComponent(p.id)}`}>View</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {profiles.length === 0 ? (
                <div className="text-sm text-muted-foreground">No public profiles found.</div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="text-sm text-muted-foreground">
                Page {page} / {totalPages} • {total} results
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}


