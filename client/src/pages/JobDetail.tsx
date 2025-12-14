import { useEffect, useState } from "react";
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
  Clock,
  Building2,
  Users,
  Globe,
  CheckCircle,
  ArrowLeft,
  Share2,
  Bookmark,
  Send,
  FileText,
  Sparkles,
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
    const fetchJob = async () => {
      if (!jobId) return;
      
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:9999"}/jobs/${jobId}?include=company,recruiter,skills,categories`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        const data = await response.json();
        
        if (data.success) {
          setJob(data.data);
          
          // Fetch related jobs
          const relatedResponse = await apiClient.listJobs({ page: 1, pageSize: 3 }, token ?? undefined);
          if (relatedResponse.success) {
            setRelatedJobs(relatedResponse.data.filter(j => j.id !== jobId).slice(0, 3));
          }
        } else {
          setError(data.message || "Job not found");
        }
      } catch (err) {
        console.error("Failed to fetch job:", err);
        setError("Failed to load job details");
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
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

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background via-primary/5 to-background">
      {/* Success Message */}
      {applicationSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold text-green-900">Application Submitted!</div>
                <div className="text-sm text-green-700">Redirecting to applications...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/jobs")} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Job Header */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`h-16 w-16 shrink-0 rounded-xl bg-gradient-to-br ${getCompanyColor(0)} flex items-center justify-center text-3xl font-bold text-white shadow-lg`}>
                      {getCompanyInitial(job)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-2xl md:text-3xl mb-2">{job.title}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2 text-base">
                        <button
                          onClick={() => job.company?.slug && navigate(`/companies/${job.company.slug}`)}
                          className="font-medium hover:text-primary transition-colors hover:underline"
                        >
                          {job.company?.name || "Company"}
                        </button>
                        {job.company?.isVerified && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Bookmark className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Key Info */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mt-6">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{getLocation(job)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{job.type?.replace("_", " ") || "Full-time"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>{getSalaryRange(job)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Skills */}
                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {job.skills.map((s) => s.skill?.name && (
                      <Badge key={s.skill.id} variant="outline">
                        {s.skill.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Job Description */}
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <div 
                  className="text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </CardContent>
            </Card>

            {/* Requirements */}
            {job.requirements && (
              <Card>
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none">
                  <div 
                    className="text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: job.requirements }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Responsibilities */}
            {job.responsibilities && (
              <Card>
                <CardHeader>
                  <CardTitle>Responsibilities</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none">
                  <div 
                    className="text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: job.responsibilities }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <Card className="border-2 border-primary/20 sticky top-4">
              <CardHeader>
                <CardTitle>Apply for this position</CardTitle>
                <CardDescription>
                  Join {job.company?.name || "our team"} and make an impact
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        className="flex-1 gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
                        disabled={applying || uploading}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          {uploading ? "Uploading..." : applying ? "Submitting..." : "Submit Application"}
                        </span>
                        {!applying && !uploading && (
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <Button 
                      className="w-full gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all group relative overflow-hidden h-12"
                      onClick={() => setShowApplyForm(true)}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <Send className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                        Apply Now
                      </span>
                      {/* Shine effect */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 border-2 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                      onClick={() => navigate("/interview")}
                    >
                      <Sparkles className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      Practice Interview
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  About Company
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <button
                    onClick={() => job.company?.slug && navigate(`/companies/${job.company.slug}`)}
                    className="font-semibold mb-1 hover:text-primary transition-colors hover:underline block"
                  >
                    {job.company?.name || "Company"}
                  </button>
                  <div className="text-muted-foreground">{job.company?.industry || "Technology"}</div>
                </div>
                
                <Separator />
                
                {job.company?.city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{job.company.city}{job.company.country && `, ${job.company.country}`}</span>
                  </div>
                )}
                
                {job.company?.companySize && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{job.company.companySize} employees</span>
                  </div>
                )}
                
                {job.company?.website && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <a
                      href={job.company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors truncate"
                    >
                      {job.company.website.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Jobs */}
            {relatedJobs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Similar Jobs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {relatedJobs.map((rJob) => (
                    <div
                      key={rJob.id}
                      className="p-3 rounded-lg border hover:border-primary transition-colors cursor-pointer"
                      onClick={() => navigate(`/jobs/${rJob.id}`)}
                    >
                      <div className="font-medium text-sm mb-1 truncate">{rJob.title}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rJob.company?.slug && navigate(`/companies/${rJob.company.slug}`);
                        }}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors hover:underline block"
                      >
                        {rJob.company?.name}
                      </button>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{getLocation(rJob)}</span>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="w-full">
                    View All Jobs
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default JobDetail;
