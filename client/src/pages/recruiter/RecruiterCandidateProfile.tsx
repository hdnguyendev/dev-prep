import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  ArrowLeft,
  User, 
  Globe, 
  Linkedin, 
  Github, 
  FileText, 
  Briefcase, 
  MapPin, 
  Calendar, 
  Sparkles,
  Loader2,
  Eye,
  Mail,
  GraduationCap,
  Code
} from "lucide-react";
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
type Education = {
  id: string;
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate: string;
  endDate?: string | null;
  grade?: string | null;
};

type Project = {
  id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  technologies?: string[];
};

type CandidateProfile = {
  id: string;
  isPublic: boolean;
  headline?: string | null;
  bio?: string | null;
  website?: string | null;
  linkedin?: string | null;
  github?: string | null;
  address?: string | null;
  cvUrl?: string | null;
  user?: { firstName?: string | null; lastName?: string | null; email?: string; avatarUrl?: string | null };
  skills?: CandidateSkill[];
  experiences?: Experience[];
  educations?: Education[];
  projects?: Project[];
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
      } catch {
        if (abort) return;
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

  if (loading) {
    return (
      <main className="min-h-dvh bg-muted/40 py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardContent className="py-12 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-sm text-muted-foreground">Loading profile…</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (error || !profile) {
  return (
      <main className="min-h-dvh bg-muted/40 py-8">
        <div className="container mx-auto px-4">
          <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-400">Profile Unavailable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-red-600 dark:text-red-400">{error || "Profile not found"}</div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const skills = profile.skills || [];
  const experiences = profile.experiences || [];
  const sortedExperiences = [...experiences].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

  return (
    <main className="min-h-dvh bg-muted/40 py-8">
      <div className="container mx-auto px-4">
        <div className="space-y-6">
          {/* Back Button - Floating */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="fixed top-24 left-4 z-50 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-primary/10 hover:scale-110 transition-all group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          </Button>

          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {profile.user?.avatarUrl ? (
                <div className="relative">
                  <img
                    src={profile.user.avatarUrl}
                    alt={`${fullName} avatar`}
                    className="h-20 w-20 rounded-full object-cover border-4 border-primary/20 shadow-lg"
                    draggable={false}
                  />
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-background"></div>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center border-4 border-primary/20 shadow-lg">
                  <div className="text-2xl font-semibold text-white">
                    {(fullName || "C")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s) => s[0]?.toUpperCase())
                      .join("")}
                  </div>
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-foreground">{fullName}</h1>
                {profile.headline ? (
                  <p className="text-sm text-muted-foreground mt-1">{profile.headline}</p>
                ) : null}
                {profile.address && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.address}
                  </div>
                )}
                {profile.user?.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Mail className="h-3.5 w-3.5" />
                    {profile.user.email}
                  </div>
                )}
              </div>
            </div>
            <Badge variant="outline" className="gap-2 px-3 py-1.5">
              <Eye className="h-3.5 w-3.5" />
              {profile.isPublic ? "Public Profile" : "Private Profile"}
            </Badge>
      </div>

          {/* Layout 2 columns */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/30 via-background to-background dark:from-blue-950/10">
                <CardHeader className="border-b border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <CardTitle className="text-lg text-blue-700 dark:text-blue-400">About</CardTitle>
                  </div>
                  <CardDescription>Professional summary and contact information</CardDescription>
        </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {profile.bio ? (
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                      {profile.bio}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">No bio available</div>
                  )}

                  {/* CV Section */}
                  {profile.cvUrl && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Resume / CV</div>
                        <Button asChild variant="default" size="sm" className="gap-2">
                          <a href={profile.cvUrl} target="_blank" rel="noreferrer">
                            <FileText className="h-3.5 w-3.5" />
                            View CV
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Social Links */}
                  {(profile.website || profile.linkedin || profile.github) && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Links</div>
          <div className="flex flex-wrap gap-2">
                        {profile.website && (
                          <Button asChild variant="outline" size="sm" className="gap-2">
                <a href={profile.website} target="_blank" rel="noreferrer">
                              <Globe className="h-3.5 w-3.5" />
                              Website
                              <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
                        )}
                        {profile.linkedin && (
                          <Button asChild variant="outline" size="sm" className="gap-2">
                <a href={profile.linkedin} target="_blank" rel="noreferrer">
                              <Linkedin className="h-3.5 w-3.5" />
                              LinkedIn
                              <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
                        )}
                        {profile.github && (
                          <Button asChild variant="outline" size="sm" className="gap-2">
                <a href={profile.github} target="_blank" rel="noreferrer">
                              <Github className="h-3.5 w-3.5" />
                              GitHub
                              <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
                        )}
                      </div>
          </div>
                  )}
        </CardContent>
      </Card>

              {/* Experience Section */}
              <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/30 via-background to-background dark:from-amber-950/10">
                <CardHeader className="border-b border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <CardTitle className="text-lg text-amber-700 dark:text-amber-400">Experience</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {sortedExperiences.length} {sortedExperiences.length === 1 ? 'entry' : 'entries'}
                    </Badge>
                  </div>
                  <CardDescription>Work experience and professional background</CardDescription>
          </CardHeader>
                <CardContent className="space-y-3 pt-6">
                  {sortedExperiences.length === 0 ? (
                    <div className="text-center py-8 rounded-lg border-2 border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10">
                      <Briefcase className="h-12 w-12 mx-auto text-amber-400 mb-3" />
                      <div className="text-sm text-muted-foreground">No experience listed</div>
                    </div>
                  ) : (
                    sortedExperiences.map((exp, index) => (
                      <Card
                        key={exp.id}
                        className={`border-2 transition-all hover:shadow-md ${
                          index % 3 === 0 ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10' :
                          index % 3 === 1 ? 'border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/10' :
                          'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10'
                        }`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`h-3 w-3 rounded-full ${
                                  index % 3 === 0 ? 'bg-blue-500' :
                                  index % 3 === 1 ? 'bg-purple-500' :
                                  'bg-green-500'
                                }`} />
                                <div className="text-base font-semibold text-foreground">
                                  {exp.position}
                                </div>
                              </div>
                              <div className="text-sm font-medium text-primary mb-2">
                                {exp.companyName}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} –{" "}
                                  {exp.isCurrent || !exp.endDate ? (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">Present</Badge>
                                  ) : (
                                    new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                  )}
                                </div>
                                {exp.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {exp.location}
                                  </div>
                                )}
                              </div>
                              {exp.description && (
                                <div className="mt-3 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                                  {exp.description}
                                </div>
                              )}
                            </div>
                            {exp.isCurrent && (
                              <Badge variant="default" className="whitespace-nowrap">
                                Current
              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
          </CardContent>
        </Card>

              {/* Education Section */}
              <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/30 via-background to-background dark:from-purple-950/10">
                <CardHeader className="border-b border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <CardTitle className="text-lg text-purple-700 dark:text-purple-400">Education</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {(profile.educations || []).length} {(profile.educations || []).length === 1 ? 'entry' : 'entries'}
                    </Badge>
                  </div>
                  <CardDescription>Educational background</CardDescription>
          </CardHeader>
                <CardContent className="space-y-3 pt-6">
                  {(profile.educations || []).length === 0 ? (
                    <div className="text-center py-8 rounded-lg border-2 border-dashed border-purple-200 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/10">
                      <GraduationCap className="h-12 w-12 mx-auto text-purple-400 mb-3" />
                      <div className="text-sm text-muted-foreground">No education listed</div>
                    </div>
                  ) : (
                    [...(profile.educations || [])]
                      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
                      .map((edu, index) => (
                        <Card
                          key={edu.id}
                          className={`border-2 transition-all hover:shadow-md ${
                            index % 2 === 0 ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/10' :
                            'border-pink-200 dark:border-pink-800 bg-pink-50/30 dark:bg-pink-950/10'
                          }`}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                              <div className={`h-3 w-3 rounded-full mt-1.5 ${index % 2 === 0 ? 'bg-indigo-500' : 'bg-pink-500'}`} />
                              <div className="flex-1">
                                <div className="text-base font-semibold text-foreground mb-1">
                                  {edu.institution}
                                </div>
                                {(edu.degree || edu.fieldOfStudy) && (
                                  <div className="text-sm font-medium text-primary mb-2">
                                    {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(" • ")}
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(edu.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} –{" "}
                                    {edu.endDate ? new Date(edu.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Present"}
                                  </div>
                                  {edu.grade && (
                                    <div className="flex items-center gap-1">
                                      <Sparkles className="h-3 w-3" />
                                      {edu.grade}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
                </CardContent>
              </Card>

              {/* Projects Section */}
              <Card className="border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/30 via-background to-background dark:from-cyan-950/10">
                <CardHeader className="border-b border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      <CardTitle className="text-lg text-cyan-700 dark:text-cyan-400">Projects</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {(profile.projects || []).length} {(profile.projects || []).length === 1 ? 'project' : 'projects'}
                  </Badge>
                </div>
                  <CardDescription>Portfolio and projects</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-6">
                  {(profile.projects || []).length === 0 ? (
                    <div className="text-center py-8 rounded-lg border-2 border-dashed border-cyan-200 dark:border-cyan-800 bg-cyan-50/20 dark:bg-cyan-950/10">
                      <Code className="h-12 w-12 mx-auto text-cyan-400 mb-3" />
                      <div className="text-sm text-muted-foreground">No projects listed</div>
                    </div>
                  ) : (
                    [...(profile.projects || [])]
                      .sort((a, b) => {
                        const aDate = a.startDate || "";
                        const bDate = b.startDate || "";
                        return aDate < bDate ? 1 : -1;
                      })
                      .map((proj, index) => (
                        <Card
                          key={proj.id}
                          className={`border-2 transition-all hover:shadow-md ${
                            index % 3 === 0 ? 'border-cyan-200 dark:border-cyan-800 bg-cyan-50/30 dark:bg-cyan-950/10' :
                            index % 3 === 1 ? 'border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/10' :
                            'border-sky-200 dark:border-sky-800 bg-sky-50/30 dark:bg-sky-950/10'
                          }`}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                              <div className={`h-3 w-3 rounded-full mt-1.5 ${
                                index % 3 === 0 ? 'bg-cyan-500' :
                                index % 3 === 1 ? 'bg-teal-500' :
                                'bg-sky-500'
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="text-base font-semibold text-foreground">
                                    {proj.name}
                                  </div>
                                  {proj.url && (
                                    <Button size="sm" variant="ghost" asChild className="h-6 px-2">
                                      <a href={proj.url} target="_blank" rel="noreferrer">
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                                {proj.description && (
                                  <div className="text-sm text-muted-foreground mb-2 whitespace-pre-line">
                                    {proj.description}
                                  </div>
                                )}
                                {proj.technologies && proj.technologies.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {proj.technologies.map((tech) => (
                                      <Badge key={tech} variant="outline" className="text-xs">
                                        {tech}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {proj.startDate && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(proj.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} –{" "}
                                    {proj.isCurrent || !proj.endDate ? (
                                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">Ongoing</Badge>
                                    ) : (
                                      new Date(proj.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Skills Section */}
              <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/30 via-background to-background dark:from-emerald-950/10">
                <CardHeader className="border-b border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <CardTitle className="text-lg text-emerald-700 dark:text-emerald-400">Skills</CardTitle>
                </div>
                    <Badge variant="outline" className="text-xs">
                      {skills.length} {skills.length === 1 ? 'skill' : 'skills'}
                    </Badge>
                </div>
                  <CardDescription>Technical and professional skills</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {skills.length === 0 ? (
                    <div className="text-center py-8 rounded-lg border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10">
                      <Sparkles className="h-12 w-12 mx-auto text-emerald-400 mb-3" />
                      <div className="text-sm text-muted-foreground">No skills listed</div>
              </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <Badge
                          key={s.id}
                          variant="default"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 max-w-full break-words"
                        >
                          {s.skill?.name || s.skillId}
                        </Badge>
                      ))}
                    </div>
                  )}
          </CardContent>
        </Card>
      </div>
    </div>
        </div>
      </div>
    </main>
  );
}
