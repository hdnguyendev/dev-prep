import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { getCurrentUser, isRecruiterLoggedIn } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type CandidateSkill = { id: string; skillId: string; level?: string | null; skill?: { id: string; name: string } };
type Experience = {
  id: string;
  companyName: string;
  position: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
};
type CandidateProfile = {
  id: string;
  isPublic: boolean;
  headline?: string | null;
  bio?: string | null;
  website?: string | null;
  linkedin?: string | null;
  github?: string | null;
  cvUrl?: string | null;
  user?: { firstName?: string | null; lastName?: string | null; email?: string; avatarUrl?: string | null };
  skills?: CandidateSkill[];
  experiences?: Experience[];
};

export default function RecruiterCandidateProfile() {
  const navigate = useNavigate();
  const { candidateProfileId } = useParams();
  const currentUser = getCurrentUser();
  const userId = currentUser?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);

  const fullName = useMemo(() => {
    const fn = profile?.user?.firstName ?? "";
    const ln = profile?.user?.lastName ?? "";
    const name = `${fn} ${ln}`.trim();
    return name || profile?.user?.email || "Candidate";
  }, [profile]);

  useEffect(() => {
    if (!isRecruiterLoggedIn()) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    let abort = false;
    const load = async () => {
      if (!candidateProfileId || !userId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/candidate-profiles/${encodeURIComponent(candidateProfileId)}/view`, {
          headers: { Authorization: `Bearer ${userId}` },
        });
        const json = await res.json();
        if (abort) return;
        if (!json?.success) {
          setError(json?.message || "Profile not found");
          setProfile(null);
          return;
        }
        setProfile(json.data as CandidateProfile);
      } catch (e) {
        if (abort) return;
        console.error(e);
        setError("Failed to load profile");
      } finally {
        if (!abort) setLoading(false);
      }
    };
    load();
    return () => {
      abort = true;
    };
  }, [candidateProfileId, userId]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {profile?.isPublic ? <Badge variant="outline">Public</Badge> : <Badge variant="secondary">Private</Badge>}
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">{loading ? "Loading…" : fullName}</CardTitle>
          {profile?.headline ? <div className="text-sm text-muted-foreground">{profile.headline}</div> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="text-sm text-destructive">{error}</div> : null}
          {profile?.bio ? <div className="whitespace-pre-wrap break-words text-sm">{profile.bio}</div> : null}

          <div className="flex flex-wrap gap-2">
            {profile?.website ? (
              <Button asChild variant="outline" size="sm">
                <a href={profile.website} target="_blank" rel="noreferrer">
                  Website <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
            {profile?.linkedin ? (
              <Button asChild variant="outline" size="sm">
                <a href={profile.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
            {profile?.github ? (
              <Button asChild variant="outline" size="sm">
                <a href={profile.github} target="_blank" rel="noreferrer">
                  GitHub <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
            {profile?.cvUrl ? (
              <Button asChild variant="outline" size="sm">
                <a href={profile.cvUrl} target="_blank" rel="noreferrer">
                  CV <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(profile?.skills || []).length === 0 ? <div className="text-sm text-muted-foreground">No skills</div> : null}
            {(profile?.skills || []).map((s) => (
              <Badge key={s.id} variant="secondary" className="max-w-full break-words">
                {s.skill?.name || s.skillId}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(profile?.experiences || []).length === 0 ? (
              <div className="text-sm text-muted-foreground">No experience</div>
            ) : null}
            {(profile?.experiences || []).map((e) => (
              <div key={e.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium break-words">{e.position}</div>
                  <Badge variant="outline" className="whitespace-nowrap">
                    {e.isCurrent ? "Current" : "Past"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground break-words">
                  {e.companyName}
                  {e.location ? ` • ${e.location}` : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {e.startDate ? e.startDate.slice(0, 10) : ""} — {e.isCurrent ? "Present" : e.endDate ? e.endDate.slice(0, 10) : ""}
                </div>
                {e.description ? <div className="mt-2 whitespace-pre-wrap break-words text-sm">{e.description}</div> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


