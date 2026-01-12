import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Job } from "@/lib/api";
import { isRecruiterLoggedIn, getCurrentUser } from "@/lib/auth";
import {
  ArrowLeft,
  Clock,
  Calendar,
  FileText,
  Target,
  Code,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  ExternalLink,
  Lock,
  User,
  Mail,
  ChevronRight,
  Loader2,
  Briefcase,
  Building2,
  MapPin,
  Users,
  Eye,
} from "lucide-react";
import RecruiterMatchingCandidates from "./RecruiterMatchingCandidates";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

const RecruiterJobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const userId = currentUser?.id;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [applications, setApplications] = useState<Array<{
    id: string;
    status: string;
    appliedAt: string;
    candidate?: {
      user?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        avatarUrl?: string;
      };
    };
  }>>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  // Check auth
  useEffect(() => {
    if (!isRecruiterLoggedIn()) {
      navigate("/login");
    }
  }, [navigate]);


  // Fetch job details
  useEffect(() => {
    if (!jobId) return;

    let isMounted = true;
    const abortController = new AbortController();

    const fetchJob = async () => {
      if (!userId || !jobId) return;

      try {
        setLoading(true);
        setError(null);

        const headers: Record<string, string> = {
          "Authorization": `Bearer ${userId}`,
        };

        // Fetch job
        const jobResponse = await fetch(
          `${API_BASE}/jobs/${jobId}?include=company,recruiter,skills,categories`,
          { headers }
        );
        const jobData = await jobResponse.json();

        if (!isMounted || abortController.signal.aborted) {
          return;
        }

        if (!jobData.success) {
          setError(jobData.message || "Failed to load job");
          setLoading(false);
          return;
        }

        setJob(jobData.data);

        // Verify this job belongs to the current recruiter
        try {
          const meRes = await fetch(`${API_BASE}/auth/me`, { headers });
          const meData = await meRes.json();
          if (meData.success && meData.recruiterProfile?.id) {
            const recruiterProfileId = meData.recruiterProfile.id;
            if (jobData.data.recruiterId !== recruiterProfileId) {
              setError("You don't have permission to view this job");
              setLoading(false);
              return;
            }
          }
        } catch {
          // Ignore errors
        }

        // Fetch applications
        try {
          setLoadingApplications(true);
          const appsResponse = await fetch(
            `${API_BASE}/api/applications?jobId=${jobData.data.id}&pageSize=100`,
            { headers }
          );
          const appsData = await appsResponse.json();
          if (appsData.success) {
            const fetchedApplications = appsData.data || [];
            setApplications(fetchedApplications);
            setApplicationsCount(appsData.meta?.total || fetchedApplications.length);
          }
        } catch {
          // Ignore errors
        } finally {
          setLoadingApplications(false);
        }

      } catch {
        if (isMounted && !abortController.signal.aborted) {
          setError("Failed to load job");
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchJob();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [jobId, userId, navigate]);



  const getLocation = (job: Job) => {
    if (job.isRemote) return "Remote";
    return job.location || "Not specified";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2">Error</h3>
            <p className="text-muted-foreground mb-4">{error || "Job not found"}</p>
            <Button onClick={() => navigate("/recruiter/jobs")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isJobClosed = job.status === "CLOSED";
  const isJobPublished = job.status === "PUBLISHED";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Navigation */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/recruiter/jobs")}
            className="text-muted-foreground hover:text-foreground"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>

        {/* Hero Section */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
              {/* Main Info */}
              <div className="flex-1">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-lg shrink-0">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{job.title}</h1>
                      <Badge
                        variant={isJobPublished ? "success" : isJobClosed ? "error" : "warning"}
                        className="gap-1.5 px-2.5 py-0.5 shrink-0"
                      >
                        {isJobPublished ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Published
                          </>
                        ) : isJobClosed ? (
                          <>
                            <Lock className="h-3 w-3" />
                            Closed
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            Draft
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-medium">{job.company?.name || "Company"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{getLocation(job)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Button
                  onClick={() => navigate(`/recruiter/jobs/${jobId}/edit`)}
                  className="gap-2"
                  size="sm"
                >
                  <FileText className="h-4 w-4" />
                  Edit Job
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/jobs/${job.slug || jobId}`)}
                  className="gap-2"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Public
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Description */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  Job Description
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  className="prose prose-sm max-w-none text-foreground/90 leading-relaxed prose-headings:font-semibold prose-p:mb-3 prose-ul:my-2 prose-ol:my-2"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </CardContent>
            </Card>

            {/* Requirements */}
            {job.requirements && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-md">
                      <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div
                    className="prose prose-sm max-w-none text-foreground/90 leading-relaxed prose-headings:font-semibold prose-p:mb-3 prose-ul:my-2 prose-ol:my-2"
                    dangerouslySetInnerHTML={{ __html: job.requirements }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Interview Questions */}
            {job.interviewQuestions && job.interviewQuestions.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-md">
                      <CalendarIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    Interview Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2.5">
                    {job.interviewQuestions.map((question, index) => (
                      <div
                        key={index}
                        className="flex gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="mt-0.5 h-5 w-5 shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </div>
                        <p className="text-sm text-foreground/90 flex-1 leading-relaxed">{question}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200/50 dark:border-blue-800/50">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Applications</span>
                  </div>
                  <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {applicationsCount}
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200/50 dark:border-green-800/50">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-1">
                    <Eye className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Views</span>
                  </div>
                  <div className="text-xl font-bold text-green-900 dark:text-green-100">
                    {job.viewsCount || 0}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                      <Code className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    Required Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((s) => (
                      <Badge
                        key={s.skill?.id || s.skillId}
                        variant={s.isRequired ? "primary" : "outline"}
                        className="gap-1 text-xs"
                      >
                        {s.skill?.name || "Unknown"}
                        {s.isRequired && <span className="text-[10px]">*</span>}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Applications Section */}
        <Card className="border-0 shadow-sm mt-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-md">
                  <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Applications
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {applicationsCount} total applications
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/recruiter/jobs/${jobId}/applications`)}
                className="gap-1.5 text-xs"
              >
                View All
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingApplications ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No applications yet</p>
                <p className="text-xs text-muted-foreground">
                  Applications will appear here when candidates apply
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {applications.slice(0, 5).map((app) => {
                  const getUserDisplayName = () => {
                    if (!app.candidate?.user) {
                      return app.candidate?.userId ? `Candidate (${app.candidate.userId.slice(0, 8)}...)` : "Unknown Candidate";
                    }
                    const { firstName, lastName, email } = app.candidate.user;
                    const fullName = `${firstName || ""} ${lastName || ""}`.trim();
                    return fullName || email || "Unknown Candidate";
                  };
                  const candidateName = getUserDisplayName();

                  const statusVariantMap: Record<string, "info" | "warning" | "success" | "error" | "muted"> = {
                    APPLIED: "info",
                    REVIEWING: "warning",
                    INTERVIEW_SCHEDULED: "info",
                    INTERVIEWED: "info",
                    OFFER_SENT: "success",
                    OFFER_ACCEPTED: "success",
                    OFFER_REJECTED: "error",
                    REJECTED: "error",
                    HIRED: "success",
                  };

                  const formatStatus = (status: string): string => {
                    return status
                      .split("_")
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(" ");
                  };

                  return (
                    <Card
                      key={app.id}
                      className="hover:shadow-md transition-all cursor-pointer border hover:border-primary/20"
                      onClick={() => navigate(`/recruiter/jobs/${jobId}/applications`, { state: { applicationId: app.id } })}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {app.candidate?.user?.avatarUrl ? (
                              <img
                                src={app.candidate.user.avatarUrl}
                                alt={candidateName}
                                className="h-9 w-9 rounded-full object-cover border shrink-0"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border shrink-0">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate text-foreground">{candidateName}</div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{app.candidate?.user?.email || "No email"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <Calendar className="h-3 w-3 shrink-0" />
                                <span>Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={statusVariantMap[app.status] || "muted"}
                              className="text-xs"
                            >
                              {formatStatus(app.status)}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {applications.length > 5 && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="ghost"
                      className="w-full text-xs"
                      onClick={() => navigate(`/recruiter/jobs/${jobId}/applications`)}
                    >
                      View all {applications.length} applications
                      <ChevronRight className="h-3.5 w-3.5 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matching Candidates */}
        <RecruiterMatchingCandidates />
      </div>
    </div>
  );
};

export default RecruiterJobDetail;

