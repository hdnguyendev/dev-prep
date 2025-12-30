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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Navigation */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/recruiter/jobs")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>

        {/* Hero Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Main Info */}
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{job.title}</h1>
                    <Badge
                      variant={isJobPublished ? "default" : isJobClosed ? "outline" : "outline"}
                      className={`gap-2 px-3 py-1 ${isJobClosed ? 'bg-red-100 text-red-700 border-red-200' : ''}`}
                    >
                      {isJobPublished ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Published
                        </>
                      ) : isJobClosed ? (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          Closed
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5" />
                          Draft
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">{job.company?.name || "Company"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{getLocation(job)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Applications</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {applicationsCount}
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm font-medium">Views</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                    {job.viewsCount || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate(`/recruiter/jobs/${jobId}/edit`)}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Edit Job
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/jobs/${job.slug || jobId}`)}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View Public
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content - Simple Single Column */}
        <div className="space-y-8">
          {/* Job Description */}
          <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Job Description
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div
                className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            </CardContent>
          </Card>

          {/* Requirements */}
          {job.requirements && (
            <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: job.requirements }}
                />
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  Required Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((s) => (
                    <Badge
                      key={s.skill?.id || s.skillId}
                      variant={s.isRequired ? "default" : "outline"}
                      className="gap-1.5"
                    >
                      {s.skill?.name || "Unknown"}
                      {s.isRequired && <span className="text-xs">*</span>}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interview Questions */}
          {job.interviewQuestions && job.interviewQuestions.length > 0 && (
            <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  Interview Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {job.interviewQuestions.map((question, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="mt-0.5 h-6 w-6 shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </div>
                      <p className="text-sm flex-1">{question}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Applications */}
          <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Applications
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {applicationsCount} total applications
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/recruiter/jobs/${jobId}/applications`)}
                  className="text-xs gap-2"
                >
                  View All
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingApplications ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No applications yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Applications will appear here when candidates apply
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.slice(0, 5).map((app) => {
                    const candidateName = app.candidate?.user
                      ? `${app.candidate.user.firstName || ""} ${app.candidate.user.lastName || ""}`.trim() || app.candidate.user.email
                      : "Unknown Candidate";

                    const statusColors: Record<string, string> = {
                      APPLIED: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
                      REVIEWING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
                      INTERVIEW_SCHEDULED: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
                      INTERVIEWED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
                      OFFER_SENT: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800",
                      OFFER_ACCEPTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                      OFFER_REJECTED: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
                      REJECTED: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800",
                      HIRED: "bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 border-teal-200 dark:border-teal-800",
                    };

                    return (
                      <Card
                        key={app.id}
                        className="hover:shadow-md transition-all cursor-pointer border-2"
                        onClick={() => navigate(`/recruiter/jobs/${jobId}/applications`, { state: { applicationId: app.id } })}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {app.candidate?.user?.avatarUrl ? (
                                <img
                                  src={app.candidate.user.avatarUrl}
                                  alt={candidateName}
                                  className="h-10 w-10 rounded-full object-cover border shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border shrink-0">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{candidateName}</div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{app.candidate?.user?.email || "No email"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3 shrink-0" />
                                  Applied {new Date(app.appliedAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant="outline"
                                className={`text-xs ${statusColors[app.status] || "bg-muted text-muted-foreground border-border"}`}
                              >
                                {app.status.replace(/_/g, " ")}
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
                        className="w-full"
                        onClick={() => navigate(`/recruiter/jobs/${jobId}/applications`)}
                      >
                        View all {applications.length} applications
                        <ChevronRight className="h-4 w-4 ml-2" />
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
    </div>
  );
};

export default RecruiterJobDetail;

