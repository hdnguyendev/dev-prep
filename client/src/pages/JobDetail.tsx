import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, type Job } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import {
  MapPin,
  Briefcase,
  DollarSign,
  Building2,
  Users,
  Globe,
  CheckCircle,
  ArrowLeft,
  Send,
  FileText,
  Sparkles,
  Award,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  Zap,
  Target,
  Layers,
  Code,
  Rocket,
} from "lucide-react";

const JobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedJobs, setRelatedJobs] = useState<Job[]>([]);
  
  // Application form state
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    resumeUrl: "",
    coverLetter: "",
  });

  // Fetch job details
  useEffect(() => {
    if (!jobId) return;
    
    let isMounted = true;
    const abortController = new AbortController();
    
    const fetchJob = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:9999"}/jobs/${jobId}?include=company,recruiter,skills,categories`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: abortController.signal,
        });
        
        if (!isMounted || abortController.signal.aborted) {
          return;
        }
        
        const data = await response.json();
        
        if (data.success) {
          setJob(data.data);
          
          // Fetch related jobs - from same company or similar skills
          if (data.data?.companyId) {
            const companyJobsResponse = await apiClient.getCompanyJobs(data.data.companyId, { page: 1, pageSize: 6 }, token ?? undefined);
            if (companyJobsResponse.success && isMounted && !abortController.signal.aborted) {
              const companyJobs = companyJobsResponse.data.filter(j => j.id !== jobId);
              if (companyJobs.length > 0) {
                setRelatedJobs(companyJobs.slice(0, 6));
              } else {
                // Fallback to general jobs if no company jobs
                const relatedResponse = await apiClient.listJobs({ page: 1, pageSize: 6 }, token ?? undefined);
                if (relatedResponse.success && isMounted && !abortController.signal.aborted) {
                  setRelatedJobs(relatedResponse.data.filter(j => j.id !== jobId).slice(0, 6));
                }
              }
            }
          } else {
            // Fallback to general jobs
            const relatedResponse = await apiClient.listJobs({ page: 1, pageSize: 6 }, token ?? undefined);
            if (relatedResponse.success && isMounted && !abortController.signal.aborted) {
              setRelatedJobs(relatedResponse.data.filter(j => j.id !== jobId).slice(0, 6));
            }
          }
        } else {
          setError(data.message || "Job not found");
        }
      } catch (err) {
        if (!isMounted || abortController.signal.aborted) {
          return;
        }
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Failed to fetch job:", err);
          setError("Failed to load job details");
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
  }, [jobId, getToken]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF, DOC, or DOCX file");
      e.target.value = ""; // Reset input
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      e.target.value = ""; // Reset input
      return;
    }

    setResumeFile(file);
  };

  const uploadResume = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:9999"}/upload/resume`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        return data.url;
      } else {
        alert(data.message || "Failed to upload resume");
        return null;
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload resume. Please try again.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || !isSignedIn) return;

    try {
      setApplying(true);
      const token = await getToken();
      
      let resumeUrl = formData.resumeUrl;

      // Upload resume if file is selected
      if (resumeFile) {
        const uploadedUrl = await uploadResume(resumeFile);
        if (!uploadedUrl) {
          setApplying(false);
          return;
        }
        resumeUrl = uploadedUrl;
      }

      if (!resumeUrl) {
        alert("Please upload your resume");
        setApplying(false);
        return;
      }
      
      // Create application
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:9999"}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          jobId: job.id,
          resumeUrl,
          coverLetter: formData.coverLetter,
          status: "APPLIED",
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setApplicationSuccess(true);
        setFormData({ resumeUrl: "", coverLetter: "" });
        setResumeFile(null);
        setShowApplyForm(false);
        setTimeout(() => {
          navigate("/applications");
        }, 2000);
      } else {
        alert(data.message || "Failed to submit application");
      }
    } catch (err) {
      console.error("Application error:", err);
      alert("Failed to submit application");
    } finally {
      setApplying(false);
    }
  };

  const getLocation = (job: Job) => job.isRemote ? "Remote" : job.location || "Not specified";

  const getSalaryRange = (job: Job) => {
    if (job.isSalaryNegotiable) return "Negotiable";
    if (job.salaryMin && job.salaryMax) {
      return `$${(job.salaryMin / 1000).toFixed(0)}k - $${(job.salaryMax / 1000).toFixed(0)}k ${job.currency || ""}`;
    }
    if (job.salaryMin) return `From $${(job.salaryMin / 1000).toFixed(0)}k`;
    if (job.salaryMax) return `Up to $${(job.salaryMax / 1000).toFixed(0)}k`;
    return "Negotiable";
  };

  const getCompanyInitial = (job: Job) => {
    return job.company?.name?.[0]?.toUpperCase() || "C";
  };

  const getCompanyColor = (index: number) => {
    const colors = [
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-pink-500",
      "from-orange-500 to-red-500",
    ];
    return colors[index % colors.length];
  };

  const practiceQuestions = useMemo(
    () => (job?.interviewQuestions || []).filter((q) => q && q.trim().length > 0),
    [job?.interviewQuestions]
  );

  /**
   * Điều hướng đến trang phỏng vấn, ưu tiên dùng bộ câu hỏi của job nếu có.
   */
  const handlePracticeInterview = () => {
    if (!job) return;
    navigate("/interview", {
      state: {
        questions: practiceQuestions,
        jobTitle: job.title,
        jobId: job.id,
      },
    });
  };

  if (loading) {
    return (
      <main className="min-h-dvh bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="space-y-4">
                    <div className="h-8 w-3/4 bg-muted rounded" />
                    <div className="flex gap-2">
                      <div className="h-6 w-20 bg-muted rounded" />
                      <div className="h-6 w-20 bg-muted rounded" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-4 w-2/3 bg-muted rounded" />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="h-6 w-32 bg-muted rounded" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-4 w-full bg-muted rounded" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="min-h-dvh bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto border-red-200">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Job Not Found</CardTitle>
              <CardDescription className="text-center">{error || "This job doesn't exist or has been removed"}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3">
              <Button onClick={() => navigate("/jobs")}>Browse Jobs</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const getSkillTags = (job: Job) => {
    return job.skills?.map(s => s.skill?.name).filter(Boolean) as string[] || [];
  };

  return (
    <main className="min-h-dvh bg-background">

      {/* Success Message */}
      {applicationSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-green-900">Application Submitted!</div>
                <div className="text-sm text-green-700">Redirecting to applications...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 relative">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/jobs")} 
          className="mb-6 gap-2 hover:bg-primary/10 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Jobs
        </Button>

        {/* Hero Section */}
        <div className="mb-8">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <div className={`h-16 w-16 shrink-0 rounded-xl bg-gradient-to-br ${getCompanyColor(0)} flex items-center justify-center text-3xl font-bold text-white shadow-lg`}>
                  {getCompanyInitial(job)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-2 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-bold">
                      {job.title}
                    </h1>
                    {job.isRemote && (
                      <Badge className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                        <Globe className="h-3 w-3" />
                        Remote
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
                    <button
                      onClick={() => job.company?.slug && navigate(`/companies/${job.company.slug}`)}
                      className="font-semibold hover:text-primary transition-colors hover:underline flex items-center gap-1.5"
                    >
                      <Building2 className="h-4 w-4" />
                      {job.company?.name || "Company"}
                    </button>
                    {job.company?.isVerified && (
                      <Badge variant="outline" className="gap-1 border-green-500/30 text-green-700 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  {/* Quick Info */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5" />
                      {getLocation(job)}
                    </Badge>
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                      <Briefcase className="h-3.5 w-3.5" />
                      {job.type?.replace("_", " ") || "Full-time"}
                    </Badge>
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                      <DollarSign className="h-3.5 w-3.5" />
                      {getSalaryRange(job)}
                    </Badge>
                    {job.experienceLevel && (
                      <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                        <Award className="h-3.5 w-3.5" />
                        {job.experienceLevel}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Skills Section */}
            {job.skills && job.skills.length > 0 && (
              <Card className="border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Code className="h-5 w-5 text-primary" />
                    Required Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((s) => s.skill?.name && (
                      <Badge 
                        key={s.skill.id} 
                        variant="outline" 
                        className="gap-1.5 px-3 py-1.5 text-sm"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        {s.skill.name}
                        {s.isRequired && (
                          <span className="text-xs text-primary font-semibold">*</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Job Description */}
            <Card className="border shadow-sm">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-4 w-4 text-primary" />
                  Job Description
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none pt-4">
                <div 
                  className="text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </CardContent>
            </Card>

            {/* Requirements */}
            {job.requirements && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none pt-4">
                  <div 
                    className="text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: job.requirements }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Responsibilities */}
            {job.responsibilities && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Layers className="h-4 w-4 text-green-600 dark:text-green-400" />
                    Responsibilities
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none pt-4">
                  <div 
                    className="text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: job.responsibilities }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {job.benefits && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Rocket className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    Benefits & Perks
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none pt-4">
                  <div 
                    className="text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: job.benefits }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Interview Questions */}
            {practiceQuestions.length > 0 && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      Interview Practice Questions
                    </CardTitle>
                    <CardDescription className="text-sm mt-1.5">
                      Recruiter-provided questions to help you prepare
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {practiceQuestions.map((question, index) => (
                    <div key={index} className="flex gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="mt-0.5 h-7 w-7 shrink-0 rounded-md bg-purple-500 text-white flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </div>
                      <p className="text-sm text-foreground leading-6 flex-1">{question}</p>
                    </div>
                  ))}
                  <Button 
                    onClick={handlePracticeInterview}
                    className="w-full gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Start Practice Interview
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Related Jobs Section */}
            {relatedJobs.length > 0 && (
              <Card className="border shadow-sm mt-6">
                <CardHeader className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg mb-1">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Related Jobs
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Explore similar opportunities from {job.company?.name || "other companies"}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate("/jobs")}
                      className="gap-2"
                    >
                      View All
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {relatedJobs.map((rJob, index) => (
                      <Card
                        key={rJob.id}
                        className="group border transition-all hover:shadow-md cursor-pointer h-full flex flex-col"
                        onClick={() => navigate(`/jobs/${rJob.id}`)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-lg font-bold text-white`}>
                              {rJob.company?.name?.[0]?.toUpperCase() || "C"}
                            </div>
                            {rJob.isRemote && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Globe className="h-3 w-3" />
                                Remote
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                            {rJob.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-2">
                            <Building2 className="h-3 w-3" />
                            {rJob.company?.name || "Company"}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="relative space-y-3 flex-1 flex flex-col">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate">{getLocation(rJob)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4 shrink-0" />
                            <span>{getSalaryRange(rJob)}</span>
                          </div>

                          {getSkillTags(rJob).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                              {getSkillTags(rJob).slice(0, 3).map((skill) => (
                                <Badge key={skill} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {getSkillTags(rJob).length > 3 && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  +{getSkillTags(rJob).length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>

                        <div className="border-t p-3 bg-muted/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full gap-2 group-hover:gap-3 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/jobs/${rJob.id}`);
                            }}
                          >
                            View Details
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <Card className="border shadow-sm sticky top-4">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Rocket className="h-4 w-4 text-primary" />
                  Apply for this position
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  Join {job.company?.name || "our team"} and make an impact
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {!isSignedIn ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Please sign in to apply for this position
                    </p>
                    <Button className="w-full gap-2" onClick={() => navigate("/login")}>
                      <Users className="h-4 w-4" />
                      Sign In to Apply
                    </Button>
                  </>
                ) : showApplyForm ? (
                  <form onSubmit={handleApply} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Upload Resume (PDF, DOC, DOCX - Max 5MB)
                      </label>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange}
                        disabled={uploading || applying}
                        className="cursor-pointer"
                        required
                      />
                      {resumeFile && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {resumeFile.name} ({(resumeFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                      {uploading && (
                        <p className="text-sm text-primary animate-pulse">
                          Uploading resume...
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cover Letter</label>
                      <Textarea
                        placeholder="Tell us why you're a great fit..."
                        rows={6}
                        value={formData.coverLetter}
                        onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowApplyForm(false)}
                        className="flex-1"
                        disabled={applying}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 gap-2"
                        disabled={applying || uploading}
                      >
                        <Send className="h-4 w-4" />
                        {uploading ? "Uploading..." : applying ? "Submitting..." : "Submit Application"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <Button 
                      className="w-full gap-2 h-11"
                      onClick={() => setShowApplyForm(true)}
                    >
                      <Send className="h-4 w-4" />
                      Apply Now
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={handlePracticeInterview}
                    >
                      <Sparkles className="h-4 w-4" />
                      {practiceQuestions.length > 0 ? "Practice Interview" : "Quick Practice"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card className="border shadow-sm">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  About Company
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <button
                        onClick={() => job.company?.slug && navigate(`/companies/${job.company.slug}`)}
                        className="font-bold text-lg mb-1 hover:text-primary transition-colors hover:underline block flex items-center gap-2 group"
                      >
                        {job.company?.name || "Company"}
                        <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        <span>{job.company?.industry || "Technology"}</span>
                      </div>
                      {job.company?.isVerified && (
                        <Badge variant="outline" className="gap-1 mt-2 border-green-500/30 text-green-700 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          Verified Company
                        </Badge>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      {job.company?.city && (
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">
                            {job.company.city}{job.company.country && `, ${job.company.country}`}
                          </span>
                        </div>
                      )}
                      
                      {job.company?.companySize && (
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                          <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                            <Users className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">{job.company.companySize} employees</span>
                        </div>
                      )}
                      
                      {job.company?.website && (
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                            <Globe className="h-4 w-4" />
                          </div>
                          <a
                            href={job.company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:text-primary transition-colors truncate flex items-center gap-1"
                          >
                            {job.company.website.replace(/^https?:\/\/(www\.)?/, "")}
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </div>
                      )}

                    </div>

                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => job.company?.slug && navigate(`/companies/${job.company.slug}`)}
                    >
                      <Building2 className="h-4 w-4" />
                      View Company Profile
                      <ArrowRight className="h-4 w-4" />
                    </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </main>
  );
};

export default JobDetail;
