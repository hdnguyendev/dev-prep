import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { getCurrentUser } from "@/lib/auth";

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

export default function CandidatePublicProfile() {
  const { candidateProfileId } = useParams();
  const { getToken } = useAuth();
  const staffUser = getCurrentUser();
  const isStaff = staffUser?.role === "ADMIN" || staffUser?.role === "RECRUITER";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [canView, setCanView] = useState<boolean>(false);

  const fullName = useMemo(() => {
    const fn = profile?.user?.firstName ?? "";
    const ln = profile?.user?.lastName ?? "";
    const name = `${fn} ${ln}`.trim();
    return name || "Candidate";
  }, [profile]);

  useEffect(() => {
    let abort = false;
    const load = async () => {
      if (!candidateProfileId) return;
      try {
        setLoading(true);
        setError(null);

        // Permission rule:
        // - Staff (admin/recruiter) can view any published profile via public endpoint.
        // - Candidates can only view their OWN profile (self preview).
        let allow = false;
        if (isStaff) {
          allow = true;
        } else {
          const token = await getToken().catch(() => null);
          if (token) {
            const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
            const meJson = await meRes.json().catch(() => null);
            const myId = String(meJson?.candidateProfile?.id || "");
            allow = myId && myId === String(candidateProfileId);
          }
        }
        if (abort) return;
        setCanView(Boolean(allow));
        if (!allow) {
          setError("Profile unavailable");
          setProfile(null);
          return;
        }

        const res = await fetch(`${API_BASE}/public/candidate-profiles/${encodeURIComponent(candidateProfileId)}`);
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
  }, [candidateProfileId, getToken, isStaff]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading profile…</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!canView || error || !profile) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{error || "Not found"}</CardContent>
          <CardContent className="pt-0">
            <SignedOut>
              <Button variant="outline" onClick={() => (window.location.href = "/login")}>
                Login
              </Button>
            </SignedOut>
            <SignedIn>
              <Button variant="outline" onClick={() => (window.location.href = "/candidate/profile")}>
                Back to profile
              </Button>
            </SignedIn>
          </CardContent>
        </Card>
      </div>
    );
  }

  const skills = profile.skills || [];
  const experiences = profile.experiences || [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {profile.user?.avatarUrl ? (
                <img
                  src={profile.user.avatarUrl}
                  alt={`${fullName} avatar`}
                  className="h-24 w-24 rounded-full object-cover border"
                  draggable={false}
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border">
                  <div className="text-2xl font-semibold text-muted-foreground">
                    {(fullName || "C")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s) => s[0]?.toUpperCase())
                      .join("")}
                  </div>
                </div>
              )}
              <div className="min-w-0">
                <CardTitle className="text-2xl">{fullName}</CardTitle>
                {profile.headline ? (
                  <div className="mt-1 text-sm text-muted-foreground">{profile.headline}</div>
                ) : null}
              </div>
            </div>
            <Badge variant="outline">Public Profile</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.bio ? <div className="whitespace-pre-wrap break-words text-sm">{profile.bio}</div> : null}

          {profile.cvUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="default" size="sm">
                <a href={profile.cvUrl} target="_blank" rel="noreferrer">
                  View CV <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <div className="text-xs text-muted-foreground">PDF/DOC/DOCX</div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {profile.website ? (
              <Button asChild variant="outline" size="sm">
                <a href={profile.website} target="_blank" rel="noreferrer">
                  Website <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
            {profile.linkedin ? (
              <Button asChild variant="outline" size="sm">
                <a href={profile.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
            {profile.github ? (
              <Button asChild variant="outline" size="sm">
                <a href={profile.github} target="_blank" rel="noreferrer">
                  GitHub <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
            {/* CV link is shown above as a primary action */}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {skills.length === 0 ? <div className="text-sm text-muted-foreground">No skills</div> : null}
            {skills.map((s) => (
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
            {experiences.length === 0 ? <div className="text-sm text-muted-foreground">No experience</div> : null}
            {experiences.map((e) => (
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


