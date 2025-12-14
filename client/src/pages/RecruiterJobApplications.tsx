import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isRecruiterLoggedIn, getCurrentUser } from "@/lib/auth";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type Application = {
  id: string;
  status: string;
  appliedAt: string;
  resumeUrl?: string;
  coverLetter?: string;
  candidate?: {
    id: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      avatarUrl: string | null;
    };
  };
  job?: {
    id: string;
    title: string;
    company?: {
      name: string;
    };
  };
};

type Job = {
  id: string;
  title: string;
  status: string;
  company?: {
    name: string;
  };
};

const statusConfig: Record<string, { label: string; variant: "default" | "outline" | "success"; icon: React.ReactNode }> = {
  APPLIED: {
    label: "Applied",
    variant: "outline",
    icon: <Clock className="h-3 w-3" />,
  },
  REVIEWING: {
    label: "Reviewing",
    variant: "outline",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  SHORTLISTED: {
    label: "Shortlisted",
    variant: "success",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  INTERVIEW_SCHEDULED: {
    label: "Interview Scheduled",
    variant: "default",
    icon: <Calendar className="h-3 w-3" />,
  },
  INTERVIEWED: {
    label: "Interviewed",
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  OFFER_SENT: {
    label: "Offer Sent",
    variant: "success",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  HIRED: {
    label: "Hired",
    variant: "success",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  REJECTED: {
    label: "Rejected",
    variant: "outline",
    icon: <XCircle className="h-3 w-3" />,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    variant: "outline",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const RecruiterJobApplications = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const currentUser = getCurrentUser();
  
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Check auth
  useEffect(() => {
    if (!isRecruiterLoggedIn()) {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch job and applications
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !jobId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const headers: Record<string, string> = {
          "Authorization": `Bearer ${currentUser.id}`,
        };
        
        // Fetch job details
        const jobResponse = await fetch(`${API_BASE}/jobs/${jobId}`, { headers });
        const jobData = await jobResponse.json();
        
        if (!jobData.success) {
          setError("Job not found");
          return;
        }
        
        setJob(jobData.data);
        
        // Fetch applications for this job
        const appsResponse = await fetch(
          `${API_BASE}/applications?jobId=${jobId}&pageSize=100&include=candidate,job`,
          { headers }
        );
        const appsData = await appsResponse.json();
        
        if (appsData.success) {
          setApplications(appsData.data || []);
        } else {
          setError(appsData.message || "Failed to fetch applications");
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.id, jobId]);

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || { 
      label: status, 
      variant: "outline" as const,
      icon: <Clock className="h-3 w-3" />
    };
  };

  if (!isRecruiterLoggedIn()) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-muted/40 py-8">
      <div className="container mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/recruiter/jobs")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        </div>

        {job && (
          <div>
            <h1 className="text-3xl font-bold">{job.title}</h1>
            <p className="text-sm text-muted-foreground">
              {job.company?.name} • {applications.length} application{applications.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No applications yet</h3>
              <p className="text-sm text-muted-foreground">
                Applications for this job will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {applications.map((app) => {
              const config = getStatusConfig(app.status);
              const candidateName = app.candidate?.user
                ? `${app.candidate.user.firstName || ''} ${app.candidate.user.lastName || ''}`.trim() || app.candidate.user.email
                : "Unknown";
              
              return (
                <Card key={app.id} className="hover:shadow-md transition">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Avatar */}
                        {app.candidate?.user?.avatarUrl ? (
                          <img
                            src={app.candidate.user.avatarUrl}
                            alt={candidateName}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        
                        {/* Info */}
                        <div className="flex-1">
                          <CardTitle className="text-base">{candidateName}</CardTitle>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {app.candidate?.user?.email || "No email"}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Applied {new Date(app.appliedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <Badge variant={config.variant} className="gap-1 shrink-0">
                        {config.icon}
                        {config.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Resume */}
                    {app.resumeUrl && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={app.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          View Resume
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    
                    {/* Cover Letter */}
                    {app.coverLetter && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Cover Letter</div>
                        <div className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
                          {app.coverLetter}
                        </div>
                        {app.coverLetter.length > 200 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedApplication(app)}
                            className="h-auto p-0 text-xs"
                          >
                            Read more
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedApplication(app)}
                        className="flex-1"
                      >
                        View Details
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          // TODO: Update application status
                          alert("Status update coming soon");
                        }}
                      >
                        Update Status
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div className="flex items-center gap-3">
                {selectedApplication.candidate?.user?.avatarUrl ? (
                  <img
                    src={selectedApplication.candidate.user.avatarUrl}
                    alt="Avatar"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <CardTitle>
                    {selectedApplication.candidate?.user
                      ? `${selectedApplication.candidate.user.firstName || ''} ${selectedApplication.candidate.user.lastName || ''}`.trim() || selectedApplication.candidate.user.email
                      : "Unknown"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {selectedApplication.candidate?.user?.email}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedApplication(null)}
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Status */}
              <div>
                <div className="text-sm font-medium mb-2">Status</div>
                <Badge variant={getStatusConfig(selectedApplication.status).variant} className="gap-1">
                  {getStatusConfig(selectedApplication.status).icon}
                  {getStatusConfig(selectedApplication.status).label}
                </Badge>
              </div>

              {/* Applied Date */}
              <div>
                <div className="text-sm font-medium mb-2">Applied Date</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(selectedApplication.appliedAt).toLocaleString()}
                </div>
              </div>

              {/* Resume */}
              {selectedApplication.resumeUrl && (
                <div>
                  <div className="text-sm font-medium mb-2">Resume</div>
                  <a
                    href={selectedApplication.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    View Resume
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Cover Letter */}
              {selectedApplication.coverLetter && (
                <div>
                  <div className="text-sm font-medium mb-2">Cover Letter</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 rounded-lg p-4">
                    {selectedApplication.coverLetter}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedApplication(null)}
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    // TODO: Update status
                    alert("Status update coming soon");
                  }}
                >
                  Update Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
};

export default RecruiterJobApplications;
