import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, type Job, type Application } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import { getCurrentUser } from "@/lib/auth";
import { useMembership } from "@/hooks/useMembership";
import {
  MapPin,
  Briefcase,
  DollarSign,
  Building2,
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
  Heart,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Clock,
  Eye,
  MousePointerClick,
  AlertCircle,
  Users,
} from "lucide-react";

const JobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();
  
  // Check if user is recruiter or admin
  const currentUser = getCurrentUser();
  const isRecruiterOrAdmin = currentUser?.role === "RECRUITER" || currentUser?.role === "ADMIN";
  
  // Check VIP membership for candidates
  const { isVIP, loading: membershipLoading } = useMembership();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedJobs, setRelatedJobs] = useState<Job[]>([]);
  const [isJobOwner, setIsJobOwner] = useState(false);
  
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

  // Save job state
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Application status
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [checkingApplication, setCheckingApplication] = useState(false);

  // Candidate skills for highlighting
  const [candidateSkillIds, setCandidateSkillIds] = useState<Set<string>>(new Set());

  const isJobClosed = job?.status === "CLOSED";

  // Reset application status when jobId changes
  useEffect(() => {
    setHasApplied(false);
    setApplicationStatus(null);
    setCheckingApplication(false);
  }, [jobId]);

  // Fetch candidate skills for highlighting
  useEffect(() => {
    if (!isSignedIn) {
      setCandidateSkillIds(new Set<string>());
      return;
    }

    let isMounted = true;
    const abortController = new AbortController();

    const fetchCandidateSkills = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const meResponse = await apiClient.getMe(token);
        if (!isMounted || abortController.signal.aborted) return;

        if (meResponse.success && meResponse.data.candidateProfile) {
          const profile = meResponse.data.candidateProfile as {
            skills?: Array<{ skillId?: string; skill?: { id: string } }>;
          };
          if (profile.skills && Array.isArray(profile.skills)) {
            const skillIds = new Set<string>(
              profile.skills
                .map((cs) => cs.skillId || cs.skill?.id)
                .filter((id): id is string => Boolean(id))
            );
            setCandidateSkillIds(skillIds);
          }
        }
      } catch {
        // Ignore errors when fetching candidate skills
      }
    };

    fetchCandidateSkills();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [isSignedIn, getToken]);

  // Check if user has applied to this job (separate effect for faster check)
  // This effect depends on job.id (UUID) instead of jobId (which could be slug)
  useEffect(() => {
    if (!job?.id || !isSignedIn) {
      setHasApplied(false);
      setApplicationStatus(null);
      return;
    }

    let isMounted = true;
    const abortController = new AbortController();

    const checkApplication = async () => {
      try {
        setCheckingApplication(true);
        const token = await getToken();
        if (!token) {
          setHasApplied(false);
          setApplicationStatus(null);
          setCheckingApplication(false);
          return;
        }

        // Check if user has applied to this job using filtered endpoint that filters by current user
        const applicationsResponse = await apiClient.getFilteredApplications({ page: 1, pageSize: 100 }, token);
        
        if (!isMounted || abortController.signal.aborted) return;

        if (applicationsResponse.success && Array.isArray(applicationsResponse.data)) {
          const userApplication = applicationsResponse.data.find(
            (app: Application) => app.jobId === job.id
          );
          if (userApplication) {
            setHasApplied(true);
            setApplicationStatus(userApplication.status || "APPLIED");
          } else {
            setHasApplied(false);
            setApplicationStatus(null);
          }
        } else {
          setHasApplied(false);
          setApplicationStatus(null);
        }
      } catch {
        if (!isMounted || abortController.signal.aborted) return;
        setHasApplied(false);
        setApplicationStatus(null);
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setCheckingApplication(false);
        }
      }
    };

    checkApplication();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [job?.id, isSignedIn, getToken]);

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
        
        const jobResponse = await apiClient.getJobWithInclude(jobId, "company,recruiter,skills,categories", token ?? undefined);
        
        if (!isMounted || abortController.signal.aborted) {
          return;
        }
        
        if (jobResponse.success) {
          setJob(jobResponse.data);
          
          // Check if current user is the recruiter who posted this job
          if (isRecruiterOrAdmin && token) {
            try {
              const meResponse = await apiClient.getMe(token);
              if (meResponse.success && (meResponse.data as any)?.recruiterProfile?.id) {
                const recruiterProfileId = (meResponse.data as any).recruiterProfile.id;
                // Check if this recruiter owns the job
                if (jobResponse.data?.recruiterId === recruiterProfileId) {
                  setIsJobOwner(true);
                }
              }
            } catch {
              // Ignore errors
            }
          } else if (isSignedIn && !isRecruiterOrAdmin && token && jobResponse.data?.status === "PUBLISHED") {
            // Track view for candidates only (not recruiters)
            apiClient.trackJobView(jobResponse.data.id, token);
          }
          
          // Check if job is saved
          if (isSignedIn && jobResponse.data?.id) {
            try {
              const savedCheck = await apiClient.checkIfJobSaved(jobResponse.data.id, token ?? undefined);
              if (savedCheck.success && savedCheck.data && isMounted && !abortController.signal.aborted) {
                setIsSaved(savedCheck.data.isSaved);
              }
            } catch {
              // Ignore errors when checking saved status
            }
          }
          
          // Fetch related jobs - from same company or similar skills
          if (jobResponse.data?.companyId) {
            const companyJobsResponse = await apiClient.getCompanyJobs(jobResponse.data.companyId, { page: 1, pageSize: 6 }, token ?? undefined);
            if (companyJobsResponse.success && isMounted && !abortController.signal.aborted) {
              const companyJobs = companyJobsResponse.data.filter(j => j.id !== jobId);
              if (companyJobs.length > 0) {
                setRelatedJobs(companyJobs.slice(0, 5));
              } else {
                // Fallback to general jobs if no company jobs
                const relatedResponse = await apiClient.listJobs({ page: 1, pageSize: 6 }, token ?? undefined);
                if (relatedResponse.success && isMounted && !abortController.signal.aborted) {
                  setRelatedJobs(relatedResponse.data.filter(j => j.id !== jobId).slice(0, 5));
                }
              }
            }
          } else {
            // Fallback to general jobs
            const relatedResponse = await apiClient.listJobs({ page: 1, pageSize: 6 }, token ?? undefined);
            if (relatedResponse.success && isMounted && !abortController.signal.aborted) {
              setRelatedJobs(relatedResponse.data.filter(j => j.id !== jobId).slice(0, 5));
            }
          }
        } else {
          setError(jobResponse.message || "Job not found");
        }
      } catch (err: any) {
        if (!isMounted || abortController.signal.aborted) {
          return;
        }
        if (err instanceof Error && err.name !== 'AbortError') {
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
  }, [jobId, getToken, isSignedIn]);

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
      const token = await getToken();
      const response = await apiClient.uploadResume(file, token ?? undefined);


      if (response.success && response.data?.url) {
        return response.data.url;
      } else {
        alert(response.message || "Failed to upload resume");
        return null;
      }
    } catch {
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
      const applicationResponse = await apiClient.createApplication({
          jobId: job.id,
          resumeUrl,
          coverLetter: formData.coverLetter,
      }, token ?? undefined);

      if (applicationResponse.success) {
        setApplicationSuccess(true);
        setFormData({ resumeUrl: "", coverLetter: "" });
        setResumeFile(null);
        setShowApplyForm(false);
        // Mark as applied to prevent re-application
        setHasApplied(true);
        setApplicationStatus("APPLIED");
        setTimeout(() => {
          navigate("/candidate/applications");
        }, 2000);
      } else {
        alert(applicationResponse.message || "Failed to submit application");
      }
    } catch {
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

  /**
   * Toggle save/unsave job
   */
  const handleSaveJob = async () => {
    if (!job || !isSignedIn) {
      alert("Please sign in to save jobs");
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      
      if (isSaved) {
        const response = await apiClient.unsaveJob(job.id, token ?? undefined);
        if (response.success) {
          setIsSaved(false);
        } else {
          alert("Failed to unsave job. Please try again.");
        }
      } else {
        const response = await apiClient.saveJob(job.id, token ?? undefined);
        if (response.success) {
          setIsSaved(true);
        } else {
          alert("Failed to save job. Please try again.");
        }
      }
    } catch {
      alert("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-dvh bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container mx-auto px-4 py-0">
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
        <div className="container mx-auto px-4 py-0">
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
    <main className="min-h-dvh bg-gradient-to-b from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-background dark:via-primary/5 dark:to-background my-8">

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

      <div className="container mx-auto px-4 py-0 relative">
        {/* Back Button - Floating */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/jobs")} 
          className="fixed top-24 left-4 z-50 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-primary/10 hover:scale-110 transition-all group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        </Button>

        {/* Hero Section */}
        <div className="mb-8 relative">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-yellow-300/10 to-green-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <Card className="border-2 shadow-xl relative overflow-hidden bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 dark:from-card dark:via-card dark:to-card">
            {/* Job Illustration - Enhanced */}
            <div className="absolute right-0 top-0 bottom-0 w-96 opacity-30 dark:opacity-15 pointer-events-none hidden lg:block overflow-hidden">
              <svg viewBox="0 0 600 500" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                {/* Large JOB text with gradient effect */}
                <defs>
                  <linearGradient id="jobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.5" />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="circleGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.2" />
                  </linearGradient>
                  <linearGradient id="circleGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f472b6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                
                {/* Large JOB text */}
                <text x="100" y="250" fontSize="160" fontWeight="900" fill="url(#jobGradient)" fontFamily="system-ui">JOB</text>
                
                {/* Animated decorative circles */}
                <circle cx="480" cy="120" r="50" fill="url(#circleGradient1)" className="animate-pulse" style={{ animationDuration: '3s' }} />
                <circle cx="520" cy="380" r="45" fill="url(#circleGradient2)" className="animate-pulse" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
                <circle cx="450" cy="60" r="30" fill="currentColor" className="text-pink-400" opacity="0.25" />
                <circle cx="550" cy="200" r="35" fill="currentColor" className="text-cyan-400" opacity="0.2" />
                
                {/* Decorative curves with animation */}
                <path d="M 150 100 Q 250 70 350 100 T 550 100" stroke="url(#circleGradient1)" strokeWidth="5" fill="none" opacity="0.3" className="animate-pulse" style={{ animationDuration: '5s' }} />
                <path d="M 80 400 Q 250 430 420 400 T 580 400" stroke="url(#circleGradient2)" strokeWidth="5" fill="none" opacity="0.3" className="animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                
                {/* Lightbulb icon - glowing */}
                <g transform="translate(480, 80)">
                  <circle cx="0" cy="0" r="25" fill="currentColor" className="text-yellow-400" opacity="0.4" />
                  <circle cx="0" cy="0" r="18" fill="currentColor" className="text-yellow-300" opacity="0.5" />
                  <path d="M -10 -18 L 10 -18 L 8 -28 Q 0 -35 -8 -28 Z" fill="currentColor" className="text-yellow-500" opacity="0.6" />
                  <circle cx="0" cy="-5" r="3" fill="currentColor" className="text-yellow-200" opacity="0.8" />
                </g>
                
                {/* Briefcase icon - detailed */}
                <g transform="translate(500, 350)">
                  <rect x="-20" y="-12" width="40" height="24" rx="3" fill="currentColor" className="text-indigo-500" opacity="0.4" />
                  <rect x="-17" y="-10" width="34" height="3" fill="currentColor" className="text-indigo-400" opacity="0.5" />
                  <rect x="-8" y="-10" width="16" height="3" fill="currentColor" className="text-indigo-300" opacity="0.6" />
                  <path d="M -12 -12 L -12 -18 M 12 -12 L 12 -18" stroke="currentColor" strokeWidth="2.5" className="text-indigo-400" opacity="0.5" />
                  <rect x="-6" y="12" width="12" height="2" rx="1" fill="currentColor" className="text-indigo-400" opacity="0.4" />
                </g>
                
                {/* Laptop icon - detailed */}
                <g transform="translate(420, 250)">
                  <rect x="-25" y="-15" width="50" height="30" rx="3" fill="currentColor" className="text-blue-500" opacity="0.35" />
                  <rect x="-22" y="-12" width="44" height="22" rx="2" fill="currentColor" className="text-blue-400" opacity="0.4" />
                  <rect x="-20" y="-10" width="40" height="18" rx="1" fill="currentColor" className="text-blue-300" opacity="0.3" />
                  <rect x="-25" y="15" width="50" height="3" rx="1" fill="currentColor" className="text-blue-400" opacity="0.35" />
                  <circle cx="0" cy="16.5" r="2" fill="currentColor" className="text-blue-500" opacity="0.4" />
                </g>
                
                {/* Paper airplanes - multiple */}
                <g transform="translate(400, 180) rotate(45)">
                  <path d="M 0 0 L 20 -7 L 15 7 Z" fill="currentColor" className="text-cyan-400" opacity="0.4" />
                  <path d="M 5 -2 L 15 -5 L 12 3 Z" fill="currentColor" className="text-cyan-300" opacity="0.3" />
                </g>
                <g transform="translate(380, 120) rotate(-30)">
                  <path d="M 0 0 L 18 -6 L 14 6 Z" fill="currentColor" className="text-sky-400" opacity="0.35" />
                </g>
                
                {/* Decorative leaves - enhanced */}
                <ellipse cx="120" cy="120" rx="35" ry="60" fill="currentColor" className="text-teal-400" opacity="0.2" transform="rotate(-25 120 120)" />
                <ellipse cx="140" cy="380" rx="30" ry="50" fill="currentColor" className="text-emerald-400" opacity="0.2" transform="rotate(50 140 380)" />
                <ellipse cx="100" cy="280" rx="25" ry="45" fill="currentColor" className="text-green-400" opacity="0.15" transform="rotate(15 100 280)" />
                
                {/* Stars decoration */}
                <g transform="translate(460, 160)">
                  <path d="M 0 -8 L 2 -2 L 8 -2 L 3 1 L 5 7 L 0 4 L -5 7 L -3 1 L -8 -2 L -2 -2 Z" fill="currentColor" className="text-yellow-400" opacity="0.3" />
                </g>
                <g transform="translate(540, 280)">
                  <path d="M 0 -6 L 1.5 -1.5 L 6 -1.5 L 2 0.5 L 3.5 5 L 0 3 L -3.5 5 L -2 0.5 L -6 -1.5 L -1.5 -1.5 Z" fill="currentColor" className="text-orange-400" opacity="0.25" />
                </g>
                
                {/* Chart/Graph icon */}
                <g transform="translate(360, 320)">
                  <rect x="-15" y="-10" width="30" height="20" rx="2" fill="currentColor" className="text-purple-400" opacity="0.2" />
                  <path d="M -12 8 L -8 2 L -4 6 L 0 -2 L 4 4 L 8 0 L 12 -4" stroke="currentColor" strokeWidth="2" fill="none" className="text-purple-500" opacity="0.4" />
                  <circle cx="-8" cy="2" r="2" fill="currentColor" className="text-purple-500" opacity="0.5" />
                  <circle cx="0" cy="-2" r="2" fill="currentColor" className="text-purple-500" opacity="0.5" />
                  <circle cx="8" cy="0" r="2" fill="currentColor" className="text-purple-500" opacity="0.5" />
                </g>
              </svg>
            </div>
            
            <CardHeader className="pb-6 bg-gradient-to-r from-blue-100/50 via-purple-100/30 to-pink-100/50 dark:from-primary/5 dark:via-transparent dark:to-primary/5 border-b relative">
              <div className="flex items-start gap-6">
                <div className={`h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br ${getCompanyColor(0)} flex items-center justify-center text-4xl font-bold text-white shadow-lg hover:scale-105 transition-transform duration-300`}>
                  {getCompanyInitial(job)}
                </div>
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h1 className="text-3xl md:text-4xl font-bold">
                      {job.title}
                    </h1>
                    {job.isRemote && (
                      <Badge className="gap-1.5 bg-primary/10 text-primary border-primary/20 shadow-sm inline-flex items-center">
                        <Globe className="h-3.5 w-3.5 shrink-0" />
                        Remote
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm mb-5">
                    <button
                      onClick={() => job.company?.slug && navigate(`/companies/${job.company.slug}`)}
                      className="font-semibold hover:text-primary transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-primary/10"
                    >
                      <Building2 className="h-4 w-4" />
                      {job.company?.name || "Company"}
                    </button>
                    {job.company?.isVerified && (
                      <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary bg-primary/5">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  {/* Quick Info */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-3 items-center">
                      <Badge variant="outline" className="gap-2 px-4 py-2 text-sm bg-muted/50 border-border hover:bg-muted transition-colors inline-flex items-center justify-center min-h-[36px]">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="leading-none">{getLocation(job)}</span>
                    </Badge>
                      <Badge variant="outline" className="gap-2 px-4 py-2 text-sm bg-muted/50 border-border hover:bg-muted transition-colors inline-flex items-center justify-center min-h-[36px]">
                        <DollarSign className="h-4 w-4 shrink-0" />
                        <span className="leading-none">{getSalaryRange(job)}</span>
                    </Badge>
                    {job.experienceLevel && (
                        <Badge variant="outline" className="gap-2 px-4 py-2 text-sm bg-muted/50 border-border hover:bg-muted transition-colors inline-flex items-center justify-center min-h-[36px]">
                          <Award className="h-4 w-4 shrink-0" />
                          <span className="leading-none">{job.experienceLevel}</span>
                      </Badge>
                    )}
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                      <Badge variant="outline" className="gap-2 px-4 py-2 text-sm bg-muted/50 border-border hover:bg-muted transition-colors inline-flex items-center justify-center min-h-[36px]">
                        <Briefcase className="h-4 w-4 shrink-0" />
                        <span className="leading-none capitalize">{job.type?.replace(/_/g, " ").toLowerCase() || "Full-time"}</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px] items-start">
          {/* Main Content */}
          <div className="space-y-6 min-w-0">
            {/* Skills Section */}
            {job.skills && job.skills.length > 0 && (
              <Card className="border-2 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white via-indigo-50/30 to-blue-50/30 dark:from-card dark:via-card dark:to-card">
                <CardHeader className="bg-gradient-to-r from-indigo-100/50 via-blue-100/30 to-cyan-100/50 dark:from-primary/5 dark:via-transparent dark:to-primary/5 border-b">
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20 dark:bg-primary/10">
                      <Code className="h-5 w-5 text-indigo-600 dark:text-primary" />
                    </div>
                    Required Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((s) => {
                      if (!s.skill?.name) return null;
                      const hasSkill = candidateSkillIds.has(s.skill.id);
                      return (
                      <Badge 
                        key={s.skill.id} 
                          variant={hasSkill ? "default" : "outline"}
                          className={`gap-1.5 px-3 py-1.5 text-sm transition-all ${
                            hasSkill 
                              ? "bg-green-500 hover:bg-green-600 text-white border-green-500 shadow-md" 
                              : ""
                          }`}
                        >
                          {hasSkill && <CheckCircle className="h-3.5 w-3.5" />}
                          {!hasSkill && <Zap className="h-3.5 w-3.5" />}
                        {s.skill.name}
                        {s.isRequired && (
                            <span className={`text-xs font-semibold ${hasSkill ? "text-white" : "text-primary"}`}>*</span>
                        )}
                      </Badge>
                      );
                    })}
                  </div>
                  {candidateSkillIds.size > 0 && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Skills highlighted in green are in your profile
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Job Description */}
            <Card className="border-2 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/30 dark:from-card dark:via-card dark:to-card">
              <CardHeader className="border-b pb-4 bg-gradient-to-r from-emerald-100/50 via-teal-100/30 to-green-100/50 dark:from-primary/5 dark:via-transparent dark:to-primary/5">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 dark:bg-primary/10">
                    <FileText className="h-5 w-5 text-emerald-600 dark:text-primary" />
                  </div>
                  Job Description
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none pt-4">
                <div 
                  className="text-muted-foreground leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-4 [&_h1]:text-foreground [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-3 [&_h2]:text-foreground [&_h3]:text-lg [&_h3]:font-bold [&_h3]:my-2 [&_h3]:text-foreground [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:rounded-md [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </CardContent>
            </Card>

            {/* Requirements */}
            {job.requirements && (
              <Card className="border-2 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:from-card dark:via-card dark:to-card">
                <CardHeader className="border-b pb-4 bg-gradient-to-r from-purple-100/50 via-pink-100/30 to-rose-100/50 dark:from-primary/5 dark:via-transparent dark:to-primary/5">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:bg-primary/10">
                      <Target className="h-5 w-5 text-purple-600 dark:text-primary" />
                    </div>
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
              <Card className="border-2 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/30 dark:from-card dark:via-card dark:to-card">
                <CardHeader className="border-b pb-4 bg-gradient-to-r from-amber-100/50 via-orange-100/30 to-yellow-100/50 dark:from-primary/5 dark:via-transparent dark:to-primary/5">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 dark:bg-primary/10">
                      <Layers className="h-5 w-5 text-amber-600 dark:text-primary" />
                    </div>
                    Responsibilities
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none pt-4">
                  <div 
                    className="text-muted-foreground leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-4 [&_h1]:text-foreground [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-3 [&_h2]:text-foreground [&_h3]:text-lg [&_h3]:font-bold [&_h3]:my-2 [&_h3]:text-foreground [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:rounded-md [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: job.responsibilities }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {job.benefits && (
              <Card className="border-2 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white via-rose-50/30 to-pink-50/30 dark:from-card dark:via-card dark:to-card">
                <CardHeader className="border-b pb-4 bg-gradient-to-r from-rose-100/50 via-pink-100/30 to-fuchsia-100/50 dark:from-primary/5 dark:via-transparent dark:to-primary/5">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500/20 to-pink-500/20 dark:bg-primary/10">
                      <Rocket className="h-5 w-5 text-rose-600 dark:text-primary" />
                    </div>
                    Benefits & Perks
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none pt-4">
                  <div 
                    className="text-muted-foreground leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-4 [&_h1]:text-foreground [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-3 [&_h2]:text-foreground [&_h3]:text-lg [&_h3]:font-bold [&_h3]:my-2 [&_h3]:text-foreground [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:rounded-md [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: job.benefits }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Interview Questions - VIP preview logic */}
            {practiceQuestions.length > 0 && (
              <Card className="border-2 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white via-violet-50/30 to-purple-50/30 dark:from-card dark:via-card dark:to-card">
                <CardHeader className="border-b pb-4 bg-gradient-to-r from-violet-100/50 via-purple-100/30 to-indigo-100/50 dark:from-primary/5 dark:via-transparent dark:to-primary/5">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 dark:bg-primary/10">
                        <Sparkles className="h-5 w-5 text-violet-600 dark:text-primary" />
                      </div>
                      Interview Practice Questions
                    </CardTitle>
                    <CardDescription className="text-sm mt-2 ml-11">
                      Recruiter-provided questions to help you prepare
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {/* Recruiters/Admins: xem full. VIP chỉ xem được câu 1. FREE không xem được nội dung câu hỏi. */}
                  {isRecruiterOrAdmin ? (
                    <>
                      {practiceQuestions.map((question, index) => (
                        <div
                          key={index}
                          className="flex gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="mt-0.5 h-7 w-7 shrink-0 rounded-md bg-purple-500 text-white flex items-center justify-center text-xs font-semibold">
                            {index + 1}
                          </div>
                          <p className="text-sm text-foreground leading-6 flex-1">
                            {question}
                          </p>
                        </div>
                      ))}
                      <Button onClick={handlePracticeInterview} className="w-full gap-2">
                        <Sparkles className="h-4 w-4" />
                        Start Practice Interview
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </>
                  ) : isSignedIn && !membershipLoading && isVIP ? (
                    // VIP candidate: chỉ xem được câu 1 (các câu còn lại mờ)
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        {practiceQuestions.map((question, index) => {
                          const locked = index > 0;
                          return (
                            <div
                              key={index}
                              className={`flex gap-3 p-3 rounded-lg border transition-colors ${
                                locked
                                  ? "border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground/80"
                                  : "border bg-muted/40 hover:bg-muted/60"
                              }`}
                            >
                              <div className="mt-0.5 h-7 w-7 shrink-0 rounded-md bg-purple-500 text-white flex items-center justify-center text-xs font-semibold">
                                {index + 1}
                              </div>
                              <p
                                className={`text-sm leading-6 flex-1 ${
                                  locked ? "blur-[1px] opacity-80" : ""
                                }`}
                              >
                                {question}
                              </p>
                              {locked && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                                  Locked
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        As a VIP member, you can preview the first practice question. Start the AI practice interview to experience the full question flow in a live session.
                      </p>
                      <Button onClick={handlePracticeInterview} className="w-full gap-2">
                        <Sparkles className="h-4 w-4" />
                        Start Practice Interview
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    // FREE candidate (hoặc chưa đăng nhập): không thấy nội dung câu hỏi, chỉ thấy lock + CTA
                    <div className="space-y-4 py-4">
                      <div className="flex items-center justify-center p-6 rounded-lg border-2 border-dashed bg-muted/30">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className="p-3 rounded-full bg-primary/10">
                            <Lock className="h-8 w-8 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-1">VIP Feature</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Interview practice questions are available exclusively during VIP AI practice interviews.
                            </p>
                            <Button
                              onClick={() => navigate("/membership")}
                              className="gap-2 w-full sm:w-auto"
                            >
                              <Award className="h-4 w-4" />
                              Upgrade to VIP
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {!isSignedIn && (
                        <div className="text-center text-sm text-muted-foreground">
                          <Button
                            variant="link"
                            onClick={() => navigate("/login")}
                            className="text-primary"
                          >
                            Sign in to view membership options
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Related Jobs Section */}
            {relatedJobs.length > 0 && (
              <Card className="border-2 shadow-lg mt-6 overflow-hidden max-w-full bg-gradient-to-br from-white via-sky-50/30 to-cyan-50/30 dark:from-card dark:via-card dark:to-card hover:shadow-xl transition-all duration-300">
                <CardHeader className="border-b pb-4 bg-gradient-to-r from-sky-100/50 via-cyan-100/30 to-blue-100/50 dark:from-primary/5 dark:via-transparent dark:to-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3 text-lg mb-2 font-semibold">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500/20 to-cyan-500/20 dark:bg-primary/10">
                          <TrendingUp className="h-5 w-5 text-sky-600 dark:text-primary" />
                        </div>
                        Related Jobs
                      </CardTitle>
                      <CardDescription className="text-sm ml-11">
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
                <CardContent className="p-4 md:p-6 relative overflow-hidden">
                  {/* Navigation Buttons */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 h-8 w-8 md:h-10 md:w-10 rounded-full bg-background/95 backdrop-blur-sm shadow-lg border-2 hover:bg-background hover:scale-110 transition-transform"
                    onClick={() => {
                      const container = document.getElementById('related-jobs-scroll');
                      if (container) {
                        const scrollAmount = 290; // card width + gap
                        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                      }
                    }}
                  >
                    <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 h-8 w-8 md:h-10 md:w-10 rounded-full bg-background/95 backdrop-blur-sm shadow-lg border-2 hover:bg-background hover:scale-110 transition-transform"
                    onClick={() => {
                      const container = document.getElementById('related-jobs-scroll');
                      if (container) {
                        const scrollAmount = 290; // card width + gap
                        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                      }
                    }}
                  >
                    <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>

                  {/* Scrollable Container */}
                  <div 
                    id="related-jobs-scroll"
                    className="flex gap-3 md:gap-4 overflow-x-auto overflow-y-hidden pb-3 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'thin', msOverflowStyle: 'none' }}
                  >
                      {relatedJobs.map((rJob, index) => (
                      <Card
                        key={rJob.id}
                        className="group border-2 transition-all hover:shadow-xl hover:border-primary/50 cursor-pointer flex flex-col w-[280px] md:w-[300px] flex-shrink-0 snap-start overflow-hidden"
                        onClick={() => navigate(`/jobs/${rJob.id}`)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between mb-2">
                            <div className={`h-10 w-10 md:h-12 md:w-12 rounded-lg bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-lg md:text-xl font-bold text-white shadow-md`}>
                              {rJob.company?.name?.[0]?.toUpperCase() || "C"}
                            </div>
                            {rJob.isRemote && (
                              <Badge variant="outline" className="gap-1 text-xs border-green-500/30 text-green-700 dark:text-green-400">
                                <Globe className="h-3 w-3" />
                                Remote
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-base md:text-lg line-clamp-2 group-hover:text-primary transition-colors font-semibold">
                            {rJob.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1 text-xs md:text-sm">
                            <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                            {rJob.company?.name || "Company"}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="relative space-y-2 flex-1 flex flex-col">
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

                        <div className="border-t p-3 bg-gradient-to-r from-muted/30 to-muted/10">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full gap-2 group-hover:gap-3 transition-all group-hover:bg-primary/10"
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
            {/* Sticky Container for Apply and Company Info */}
            <div className="sticky top-20 z-10 space-y-6">
            {/* Job Stats & Deadline Card */}
            <Card className="border-2 shadow-lg bg-gradient-to-br from-white via-amber-50/30 to-orange-50/30 dark:from-card dark:via-card dark:to-card hover:shadow-xl transition-all duration-300">
              <CardHeader className="border-b pb-4 bg-gradient-to-r from-amber-100/50 via-orange-100/30 to-yellow-100/50 dark:from-primary/5 dark:via-transparent dark:to-primary/5">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 dark:bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-amber-600 dark:text-primary" />
                  </div>
                  Job Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Deadline */}
                {job.deadline && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Application Deadline
                    </div>
                    <div className="pl-6">
                      <div className="text-base font-semibold">
                        {new Date(job.deadline).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      {(() => {
                        const deadlineDate = new Date(job.deadline);
                        const now = new Date();
                        const diffTime = deadlineDate.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays < 0) {
                          return (
                            <Badge variant="outline" className="mt-2 gap-1 border-red-500 text-red-700 dark:text-red-400">
                              <AlertCircle className="h-3 w-3" />
                              Deadline passed
                            </Badge>
                          );
                        } else if (diffDays === 0) {
                          return (
                            <Badge variant="outline" className="mt-2 gap-1 border-orange-500 text-orange-700 dark:text-orange-400">
                              <Clock className="h-3 w-3" />
                              Ends today
                            </Badge>
                          );
                        } else if (diffDays <= 3) {
                          return (
                            <Badge variant="outline" className="mt-2 gap-1 border-orange-500 text-orange-700 dark:text-orange-400">
                              <Clock className="h-3 w-3" />
                              {diffDays} day{diffDays !== 1 ? "s" : ""} left
                            </Badge>
                          );
                        } else if (diffDays <= 7) {
                          return (
                            <Badge variant="outline" className="mt-2 gap-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
                              <Clock className="h-3 w-3" />
                              {diffDays} days left
                            </Badge>
                          );
                        } else {
                          return (
                            <Badge variant="outline" className="mt-2 gap-1">
                              <Clock className="h-3 w-3" />
                              {diffDays} days remaining
                            </Badge>
                          );
                        }
                      })()}
                    </div>
                  </div>
                )}

                {/* Interaction Metrics */}
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {isJobOwner || currentUser?.role === "ADMIN" ? "Engagement Metrics" : "Job Popularity"}
                  </div>
                  <div className="pl-6 space-y-2">
                    {/* Show detailed metrics only for job owner or admin */}
                    {(isJobOwner || currentUser?.role === "ADMIN") ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Views</span>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold text-foreground">
                              {job.viewsCount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Clicks</span>
                          <div className="flex items-center gap-2">
                            <MousePointerClick className="h-4 w-4 text-green-500" />
                            <span className="font-semibold text-foreground">
                              {job.clicksCount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {job.viewsCount > 0 && (
                          <div className="pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Click-through rate</span>
                              <span className="text-xs font-semibold text-foreground">
                                {((job.clicksCount / job.viewsCount) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                                style={{
                                  width: `${Math.min((job.clicksCount / job.viewsCount) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Show general popularity indicator for candidates */
                      (() => {
                        const totalEngagement = job.viewsCount + job.clicksCount;
                        let popularityLevel: "low" | "medium" | "high" | "very-high";
                        let popularityText: string;
                        let popularityColor: string;
                        
                        if (totalEngagement === 0) {
                          popularityLevel = "low";
                          popularityText = "New listing";
                          popularityColor = "text-muted-foreground";
                        } else if (totalEngagement < 10) {
                          popularityLevel = "low";
                          popularityText = "Getting attention";
                          popularityColor = "text-blue-600 dark:text-blue-400";
                        } else if (totalEngagement < 50) {
                          popularityLevel = "medium";
                          popularityText = "Popular";
                          popularityColor = "text-green-600 dark:text-green-400";
                        } else if (totalEngagement < 200) {
                          popularityLevel = "high";
                          popularityText = "Very popular";
                          popularityColor = "text-orange-600 dark:text-orange-400";
                        } else {
                          popularityLevel = "very-high";
                          popularityText = "Highly sought after";
                          popularityColor = "text-red-600 dark:text-red-400";
                        }
                        
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Interest level</span>
                              <Badge 
                                variant={popularityLevel === "low" ? "outline" : "default"}
                                className={`gap-1.5 ${popularityColor} ${
                                  popularityLevel === "high" || popularityLevel === "very-high"
                                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white border-0"
                                    : popularityLevel === "medium"
                                    ? "bg-green-500 text-white border-0"
                                    : ""
                                }`}
                              >
                                <TrendingUp className="h-3.5 w-3.5" />
                                {popularityText}
                              </Badge>
                            </div>
                            {totalEngagement > 0 && (
                              <div className="pt-2 border-t">
                                <div className="text-xs text-muted-foreground">
                                  This job is receiving significant interest from candidates
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>

                {/* Posted Date */}
                {job.publishedAt && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Posted
                      </div>
                      <div className="pl-6 text-sm text-muted-foreground">
                        {new Date(job.publishedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                        {(() => {
                          const postedDate = new Date(job.publishedAt);
                          const now = new Date();
                          const diffTime = now.getTime() - postedDate.getTime();
                          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                          
                          if (diffDays === 0) {
                            return " (Today)";
                          } else if (diffDays === 1) {
                            return " (Yesterday)";
                          } else if (diffDays < 7) {
                            return ` (${diffDays} days ago)`;
                          } else if (diffDays < 30) {
                            const weeks = Math.floor(diffDays / 7);
                            return ` (${weeks} week${weeks !== 1 ? "s" : ""} ago)`;
                          } else {
                            const months = Math.floor(diffDays / 30);
                            return ` (${months} month${months !== 1 ? "s" : ""} ago)`;
                          }
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Apply Card - Only show for candidates */}
            {!isRecruiterOrAdmin && (
            <Card className="border-2 shadow-lg bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 dark:from-card dark:via-card dark:to-card hover:shadow-xl transition-all duration-300">
              <CardHeader className="border-b pb-4 bg-gradient-to-r from-green-100/50 via-emerald-100/30 to-teal-100/50 dark:from-primary/5 dark:via-transparent dark:to-primary/5">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 dark:bg-primary/10">
                    {isJobClosed ? (
                      <Lock className="h-5 w-5 text-red-600 dark:text-red-500" />
                    ) : (
                      <Rocket className="h-5 w-5 text-green-600 dark:text-primary" />
                    )}
                  </div>
                  {isJobClosed ? "This position is closed" : "Apply for this position"}
                </CardTitle>
                <CardDescription className="text-sm mt-2 ml-11">
                  {isJobClosed
                    ? "This job is no longer accepting applications."
                    : `Join ${job.company?.name || "our team"} and make an impact`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {isJobClosed ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      You cannot apply because this job has been closed by the company.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => navigate("/jobs")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Browse other jobs
                    </Button>
                  </>
                ) : !isSignedIn ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Please sign in to apply for this position
                    </p>
                    <Button className="w-full gap-2" onClick={() => navigate("/login")}>
                      <Users className="h-4 w-4" />
                      Sign In to Apply
                    </Button>
                  </>
                ) : checkingApplication ? (
                  <div className="space-y-2">
                    <Button 
                      className="w-full gap-2 h-11"
                      disabled
                      variant="outline"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking application status...
                    </Button>
                  </div>
                ) : hasApplied ? (
                  <div className="space-y-2">
                    <Button 
                      className="w-full gap-2 h-11"
                      disabled
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Applied ({applicationStatus || "APPLIED"})
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      You have already applied for this position
                    </p>
                    <Button 
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => navigate(`/candidate/applications?jobId=${job.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Application
                    </Button>
                  </div>
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
                      variant={isSaved ? "default" : "outline"}
                      className="w-full gap-2"
                      onClick={handleSaveJob}
                      disabled={saving}
                    >
                      <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                      {saving ? "Saving..." : isSaved ? "Saved" : "Save Job"}
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
            )}

            {/* Company Info */}
            <Card className="border-2 shadow-lg bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 dark:from-card dark:via-card dark:to-card hover:shadow-xl transition-all duration-300 overflow-hidden">
              {/* Cover Image */}
              {job.company?.coverUrl ? (
                <div className="relative h-32 w-full overflow-hidden">
                  <img
                    src={job.company.coverUrl}
                    alt={`${job.company?.name || "Company"} cover`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.className = `relative h-32 w-full bg-gradient-to-br ${getCompanyColor(0)} overflow-hidden`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                </div>
              ) : (
                <div className={`relative h-32 w-full bg-gradient-to-br ${getCompanyColor(0)} overflow-hidden`}>
                  <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                </div>
              )}

              <CardHeader className="relative -mt-16 pb-4 border-b bg-gradient-to-r from-blue-100/50 via-indigo-100/30 to-purple-100/50 dark:from-primary/5 dark:via-transparent dark:to-primary/5">
                {/* Company Logo */}
                <div className="mb-3 flex items-end gap-4">
                  {job.company?.logoUrl ? (
                    <img
                      src={job.company.logoUrl}
                      alt={job.company?.name || "Company logo"}
                      className="h-16 w-16 rounded-xl border-4 border-background object-cover shadow-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={`h-16 w-16 rounded-xl border-4 border-background bg-gradient-to-br ${getCompanyColor(0)} flex items-center justify-center text-2xl font-bold text-white shadow-lg ${job.company?.logoUrl ? "hidden" : ""}`}
                  >
                    {getCompanyInitial(job)}
                  </div>
                  <div className="flex-1 pb-1">
                    <CardTitle className="text-xl font-bold mb-1">
                        {job.company?.name || "Company"}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Briefcase className="h-4 w-4 shrink-0" />
                        <span>{job.company?.industry || "Technology"}</span>
                      {job.company?.isVerified && (
                        <Badge variant="outline" className="gap-1 ml-2 border-green-500/30 text-green-700 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                    
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
      </div>
    </main>
  );
};

export default JobDetail;
