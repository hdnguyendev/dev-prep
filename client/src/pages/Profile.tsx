import { SignedIn, SignedOut, RedirectToSignIn, useAuth, useUser } from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type SkillOption = { id: string; name: string };

type CandidateSkill = {
  id: string;
  skillId: string;
  level?: string | null;
  skill?: { id: string; name: string };
};

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
  userId: string;
  isPublic?: boolean;
  headline?: string | null;
  bio?: string | null;
  website?: string | null;
  linkedin?: string | null;
  github?: string | null;
  cvUrl?: string | null;
  skills?: CandidateSkill[];
  experiences?: Experience[];
};

export default function Profile({ embedded }: { embedded?: boolean }) {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [skills, setSkills] = useState<SkillOption[]>([]);

  // Draft form
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  // Experience form
  const [expEditingId, setExpEditingId] = useState<string | null>(null);
  const [expCompanyName, setExpCompanyName] = useState("");
  const [expPosition, setExpPosition] = useState("");
  const [expLocation, setExpLocation] = useState("");
  const [expStartDate, setExpStartDate] = useState("");
  const [expEndDate, setExpEndDate] = useState("");
  const [expIsCurrent, setExpIsCurrent] = useState(false);
  const [expDescription, setExpDescription] = useState("");
  const [expSaving, setExpSaving] = useState(false);

  const skillNameById = useMemo(() => {
    const m = new Map<string, string>();
    skills.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [skills]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) return;

        const [meRes, skillsRes] = await Promise.all([
          fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/skills?pageSize=200`),
        ]);
        const me = await meRes.json();
        const skillsJson = await skillsRes.json();
        if (cancelled) return;

        const cp = me?.candidateProfile as CandidateProfile | undefined;
        if (!me?.success || !cp?.id) {
          setError("Candidate profile not found. Please refresh and try again.");
          return;
        }
        setProfile(cp);

        setSkills((skillsJson?.data || []).map((r: any) => ({ id: String(r.id), name: String(r.name ?? r.id) })));

        setHeadline(cp.headline ?? "");
        setBio(cp.bio ?? "");
        setWebsite(cp.website ?? "");
        setLinkedin(cp.linkedin ?? "");
        setGithub(cp.github ?? "");
        setCvUrl(cp.cvUrl ?? "");
        setIsPublic(Boolean(cp.isPublic));
        const ids = (cp.skills || [])
          .map((cs) => cs.skillId || cs.skill?.id)
          .filter((v): v is string => Boolean(v));
        setSelectedSkillIds(ids);

        // Clear experience form on load
        setExpEditingId(null);
        setExpCompanyName("");
        setExpPosition("");
        setExpLocation("");
        setExpStartDate("");
        setExpEndDate("");
        setExpIsCurrent(false);
        setExpDescription("");
      } catch (err) {
        console.error("Failed to load profile", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const uploadCv = async (file: File): Promise<string | null> => {
    try {
      setCvUploading(true);
      setCvUploadError(null);

      const allowed = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowed.includes(file.type)) {
        setCvUploadError("Only PDF, DOC, and DOCX are allowed.");
        return null;
      }
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setCvUploadError("File too large. Maximum size is 5MB.");
        return null;
      }

      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_BASE}/upload/resume`, {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!json?.success || !json?.url) {
        setCvUploadError(json?.message || "Failed to upload CV.");
        return null;
      }
      return String(json.url);
    } catch (e) {
      console.error(e);
      setCvUploadError("Failed to upload CV.");
      return null;
    } finally {
      setCvUploading(false);
    }
  };

  const handleUploadCv = async () => {
    if (!cvFile) {
      setCvUploadError("Please choose a file first.");
      return;
    }
    const url = await uploadCv(cvFile);
    if (url) {
      setCvUrl(url);
      setCvFile(null);
      // Persist immediately so public profile can show CV without requiring an extra Save click.
      try {
        if (profile?.id) {
          const token = await getToken();
          if (token) {
            const res = await fetch(`${API_BASE}/candidate-profiles/${encodeURIComponent(profile.id)}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ cvUrl: url }),
            });
            const json = await res.json().catch(() => null);
            if (!json?.success) {
              setCvUploadError(json?.message || "Uploaded CV, but failed to save to profile. Please click Save.");
            }
          }
        }
      } catch (e) {
        console.error(e);
        setCvUploadError("Uploaded CV, but failed to save to profile. Please click Save.");
      }
    }
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) => (prev.includes(skillId) ? prev.filter((v) => v !== skillId) : [...prev, skillId]));
  };

  const syncCandidateSkills = async (token: string, candidateId: string) => {
    const existingRes = await fetch(`${API_BASE}/candidate-skills?candidateId=${candidateId}&pageSize=500`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const existingJson = await existingRes.json();
    const existing: CandidateSkill[] = existingJson?.data || [];

    const existingBySkillId = new Map(existing.map((cs) => [String(cs.skillId), cs]));

    // delete removed
    await Promise.all(
      existing
        .filter((cs) => !selectedSkillIds.includes(String(cs.skillId)))
        .map((cs) =>
          fetch(`${API_BASE}/candidate-skills/${encodeURIComponent(String(cs.id))}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
    );

    // add new
    await Promise.all(
      selectedSkillIds
        .filter((sid) => !existingBySkillId.has(String(sid)))
        .map((sid) =>
          fetch(`${API_BASE}/candidate-skills`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ candidateId, skillId: sid, level: null }),
          })
        )
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      const payload = {
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        website: website.trim() || null,
        linkedin: linkedin.trim() || null,
        github: github.trim() || null,
        cvUrl: cvUrl.trim() || null,
        isPublic,
      };

      const res = await fetch(`${API_BASE}/candidate-profiles/${encodeURIComponent(profile.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const updatedJson = await res.json();
      if (!updatedJson?.success) {
        setError(updatedJson?.message || "Failed to save profile");
        return;
      }

      await syncCandidateSkills(token, profile.id);

      // Refresh from /auth/me to reflect includes
      const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const me = await meRes.json();
      if (me?.success && me?.candidateProfile) {
        setProfile(me.candidateProfile as CandidateProfile);
      }
    } catch (err) {
      console.error("Save profile failed", err);
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const refreshFromMe = async () => {
    const token = await getToken();
    if (!token) return;
    const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const me = await meRes.json();
    if (me?.success && me?.candidateProfile) {
      setProfile(me.candidateProfile as CandidateProfile);
    }
  };

  const resetExperienceForm = () => {
    setExpEditingId(null);
    setExpCompanyName("");
    setExpPosition("");
    setExpLocation("");
    setExpStartDate("");
    setExpEndDate("");
    setExpIsCurrent(false);
    setExpDescription("");
  };

  const startEditExperience = (exp: Experience) => {
    setExpEditingId(exp.id);
    setExpCompanyName(exp.companyName);
    setExpPosition(exp.position);
    setExpLocation(exp.location ?? "");
    setExpStartDate(exp.startDate ? exp.startDate.slice(0, 10) : "");
    setExpEndDate(exp.endDate ? exp.endDate.slice(0, 10) : "");
    setExpIsCurrent(Boolean(exp.isCurrent) || !exp.endDate);
    setExpDescription(exp.description ?? "");
  };

  const saveExperience = async () => {
    if (!profile) return;
    if (!expCompanyName.trim() || !expPosition.trim() || !expStartDate) {
      setError("Experience: company, position, start date are required.");
      return;
    }
    try {
      setExpSaving(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      const payload = {
        companyName: expCompanyName.trim(),
        position: expPosition.trim(),
        location: expLocation.trim() || null,
        startDate: expStartDate,
        endDate: expIsCurrent ? null : expEndDate || null,
        isCurrent: expIsCurrent,
        description: expDescription.trim() || null,
      };

      const url = expEditingId ? `${API_BASE}/auth/experience/${encodeURIComponent(expEditingId)}` : `${API_BASE}/auth/experience`;
      const method = expEditingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "Failed to save experience");
        return;
      }
      await refreshFromMe();
      resetExperienceForm();
    } catch (err) {
      console.error("Save experience failed", err);
      setError("Failed to save experience");
    } finally {
      setExpSaving(false);
    }
  };

  const deleteExperience = async (id: string) => {
    if (!confirm("Delete this experience?")) return;
    try {
      setExpSaving(true);
      setError(null);
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/auth/experience/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "Failed to delete experience");
        return;
      }
      await refreshFromMe();
      if (expEditingId === id) resetExperienceForm();
    } catch (err) {
      console.error("Delete experience failed", err);
      setError("Failed to delete experience");
    } finally {
      setExpSaving(false);
    }
  };

  const content = (
    <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">My Profile</h1>
                <p className="text-sm text-muted-foreground">Your public CV-style profile for applications.</p>
              </div>
              <div className="flex items-center gap-3">
                {user?.imageUrl && (
                  <img src={user.imageUrl} alt="avatar" className="h-10 w-10 rounded-full object-cover border" />
                )}
                <Button onClick={handleSave} disabled={saving || loading || !profile}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <Card>
        <CardHeader className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Public profile</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={isPublic ? "default" : "outline"}
                aria-pressed={isPublic}
                onClick={() => setIsPublic((v) => !v)}
              >
                {isPublic ? "Public" : "Private"}
              </Button>
              <Badge variant="outline" className="text-xs">
                {isPublic ? "Visible" : "Hidden"}
              </Badge>
            </div>
          </div>
              </CardHeader>
              <CardContent className="space-y-2">
          {isPublic && profile?.id ? (
                  <div className="text-sm text-muted-foreground break-words">
                        Link:{" "}
                        <a className="underline" href={`/candidates/${profile.id}`} target="_blank" rel="noreferrer">
                          {window.location.origin}/candidates/{profile.id}
                        </a>
            </div>
                    ) : (
            <div className="text-sm text-muted-foreground">
              Toggle on to make your profile visible to recruiters.
            </div>
          )}
              </CardContent>
            </Card>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">{error}</div>
            )}

            {loading ? (
              <div className="text-sm text-muted-foreground">Loading profile...</div>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Headline</Label>
                      <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Frontend Engineer | React | TypeScript" />
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={6} placeholder="A short summary about you..." />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
                      </div>
                      <div className="space-y-2">
                        <Label>LinkedIn</Label>
                        <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>GitHub</Label>
                        <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." />
                      </div>
                      <div className="space-y-2">
                        <Label>CV</Label>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                              className="text-sm"
                            />
                            <Button size="sm" variant="outline" onClick={handleUploadCv} disabled={cvUploading || !cvFile}>
                              {cvUploading ? "Uploading..." : "Upload"}
                            </Button>
                            {cvUrl ? (
                              <>
                                <Button size="sm" variant="outline" asChild>
                                  <a href={cvUrl} target="_blank" rel="noreferrer">
                                    View
                                  </a>
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setCvUrl("")} disabled={cvUploading}>
                                  Remove
                                </Button>
                              </>
                            ) : null}
                          </div>
                          {cvUploadError ? <div className="text-xs text-destructive">{cvUploadError}</div> : null}
                          {cvFile ? (
                            <div className="text-xs text-muted-foreground">
                              Selected: {cvFile.name} ({(cvFile.size / 1024).toFixed(1)} KB)
                            </div>
                          ) : null}
                          {!cvFile && !cvUrl ? (
                            <div className="text-xs text-muted-foreground">Upload a PDF/DOC/DOCX (max 5MB).</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Experience</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">
                          {expEditingId ? "Edit experience" : "Add experience"}
                        </div>
                        {expEditingId && (
                          <Button size="sm" variant="ghost" onClick={resetExperienceForm} disabled={expSaving}>
                            Cancel edit
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Company</Label>
                          <Input value={expCompanyName} onChange={(e) => setExpCompanyName(e.target.value)} placeholder="Company name" />
                        </div>
                        <div className="space-y-1">
                          <Label>Position</Label>
                          <Input value={expPosition} onChange={(e) => setExpPosition(e.target.value)} placeholder="Role / title" />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Start date</Label>
                          <Input type="date" value={expStartDate} onChange={(e) => setExpStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>End date</Label>
                          <Input
                            type="date"
                            value={expEndDate}
                            onChange={(e) => setExpEndDate(e.target.value)}
                            disabled={expIsCurrent}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          id="exp-current"
                          type="checkbox"
                          checked={expIsCurrent}
                          onChange={(e) => setExpIsCurrent(e.target.checked)}
                        />
                        <Label htmlFor="exp-current">I currently work here</Label>
                      </div>

                      <div className="space-y-1">
                        <Label>Location (optional)</Label>
                        <Input value={expLocation} onChange={(e) => setExpLocation(e.target.value)} placeholder="City, Country" />
                      </div>

                      <div className="space-y-1">
                        <Label>Description (optional)</Label>
                        <Textarea value={expDescription} onChange={(e) => setExpDescription(e.target.value)} rows={4} placeholder="What did you work on?" />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={saveExperience} disabled={expSaving}>
                          {expSaving ? "Saving..." : expEditingId ? "Update" : "Add"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(profile?.experiences || []).length === 0 && (
                        <div className="text-sm text-muted-foreground">No experience yet.</div>
                      )}
                      {(profile?.experiences || [])
                        .slice()
                        .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
                        .map((exp) => (
                          <div key={exp.id} className="rounded-lg border bg-background p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold">
                                  {exp.position} • {exp.companyName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(exp.startDate).toLocaleDateString()} –{" "}
                                  {exp.isCurrent || !exp.endDate ? "Present" : new Date(exp.endDate).toLocaleDateString()}
                                  {exp.location ? ` • ${exp.location}` : ""}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" onClick={() => startEditExperience(exp)} disabled={expSaving}>
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => deleteExperience(exp.id)}
                                  disabled={expSaving}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                            {exp.description && (
                              <div className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                                {exp.description}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Skills</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Selected: <span className="font-medium">{selectedSkillIds.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s) => {
                        const active = selectedSkillIds.includes(s.id);
                        return (
                          <Badge
                            key={s.id}
                            variant={active ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleSkill(s.id)}
                            title={active ? "Remove" : "Add"}
                          >
                            {s.name}
                          </Badge>
                        );
                      })}
                      {skills.length === 0 && <div className="text-sm text-muted-foreground">No skills available.</div>}
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Preview</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedSkillIds.slice(0, 16).map((id) => (
                          <Badge key={`sel-${id}`} variant="outline">
                            {skillNameById.get(id) || id}
                          </Badge>
                        ))}
                        {selectedSkillIds.length === 0 && <div className="text-sm text-muted-foreground">No skills selected.</div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
    </div>
  );

  if (embedded) return content;

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <main className="min-h-dvh bg-muted/40 py-8">
          <div className="container mx-auto px-4">
            {content}
          </div>
        </main>
      </SignedIn>
    </>
  );
}


