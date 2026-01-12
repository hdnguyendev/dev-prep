import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isRecruiterLoggedIn, getCurrentUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  Loader2,
  Send,
} from "lucide-react";
import ApplicationDetailModal from "@/components/recruiter/ApplicationDetailModal";
import CreateOfferForm from "@/components/recruiter/CreateOfferForm";

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
    skills?: Array<{ id: string; skillId: string; level?: string | null; skill?: { id: string; name: string } }>;
    experiences?: Array<{
      id: string;
      companyName: string;
      position: string;
      startDate: string;
      endDate?: string | null;
      isCurrent?: boolean;
    }>;
  };
  notes?: Array<{ id: string; authorId: string; content: string; createdAt: string }>;
  interviews?: Array<{
    id: string;
    accessCode: string;
    sessionUrl?: string | null;
    status: string;
    expiresAt: string;
    title: string;
    overallScore?: number | null;
    summary?: string | null;
    recommendation?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    createdAt: string;
  }>;
  offers?: Array<{
    id: string;
    title: string;
    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryCurrency: string;
    employmentType?: string | null;
    startDate?: string | null;
    expirationDate: string;
    location?: string | null;
    isRemote: boolean;
    description?: string | null;
    benefits?: string | null;
    terms?: string | null;
    status: string;
    responseNote?: string | null;
    respondedAt?: string | null;
    sentAt: string;
    createdAt: string;
  }>;
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

const jobStatusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  DRAFT: {
    label: "Draft",
    icon: <FileText className="h-3.5 w-3.5" />,
    color: "bg-slate-100 dark:bg-slate-950/30 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800",
  },
  PUBLISHED: {
    label: "Published",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  CLOSED: {
    label: "Closed",
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  },
  ARCHIVED: {
    label: "Archived",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
};

const statusConfig: Record<string, { label: string; variant: "default" | "outline" | "success"; icon: React.ReactNode; color: string }> = {
  APPLIED: {
    label: "Applied",
    variant: "outline",
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  },
  REVIEWING: {
    label: "Reviewing",
    variant: "outline",
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    variant: "success",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  },
  INTERVIEW_SCHEDULED: {
    label: "Interview Scheduled",
    variant: "default",
    icon: <Calendar className="h-3.5 w-3.5" />,
    color: "bg-cyan-100 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  },
  INTERVIEWED: {
    label: "Interviewed",
    variant: "default",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800",
  },
  OFFER_SENT: {
    label: "Offer Sent",
    variant: "success",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  OFFER_ACCEPTED: {
    label: "Offer Accepted",
    variant: "success",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  OFFER_REJECTED: {
    label: "Offer Rejected",
    variant: "outline",
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  },
  HIRED: {
    label: "Hired",
    variant: "success",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  REJECTED: {
    label: "Rejected",
    variant: "outline",
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    variant: "outline",
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "bg-slate-100 dark:bg-slate-950/30 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800",
  },
};

/**
 * Get allowed status transitions for recruiter based on current status
 * Recruiter can only change status following this flow:
 * APPLIED => REVIEWING => SHORTLISTED => INTERVIEW_SCHEDULED => REJECTED
 * 
 * HIRED cannot be set manually by recruiter - it's a system-managed status
 * From system-managed statuses, recruiter can only move to REJECTED
 */
const getAllowedStatusesForRecruiter = (currentStatus: string): string[] => {
  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    "APPLIED": ["REVIEWING", "REJECTED"],
    "REVIEWING": ["SHORTLISTED", "REJECTED"],
    "SHORTLISTED": ["INTERVIEW_SCHEDULED", "REJECTED"],
    "INTERVIEW_SCHEDULED": ["REJECTED"], // Cannot hire directly, can only reject
    // Allow transitions from system-managed statuses back to recruiter-managed ones
    "INTERVIEWED": ["REJECTED"], // After interview, recruiter can only reject
    "OFFER_SENT": ["REJECTED"], // After offer sent, recruiter can only reject
    "OFFER_ACCEPTED": ["REJECTED"], // After offer accepted, recruiter can only reject (HIRED is final, set automatically)
    "OFFER_REJECTED": ["REJECTED"], // After offer rejected, can only reject application
    "HIRED": [], // Final status, no transitions allowed (system-managed)
    "REJECTED": [], // Final status, no transitions allowed
    "WITHDRAWN": [], // Final status, no transitions allowed
  };

  // Get allowed next statuses, always include current status for display
  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
  return [currentStatus, ...allowedNextStatuses];
};

const RecruiterJobApplications = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const userId = currentUser?.id;
  
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updatingJobStatus, setUpdatingJobStatus] = useState(false);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [recruiterProfileId, setRecruiterProfileId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>("");
  const [noteIdToDelete, setNoteIdToDelete] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Check auth
  useEffect(() => {
    if (!isRecruiterLoggedIn()) {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch job and applications
  useEffect(() => {
    let abort = false;
    const fetchData = async () => {
      if (!userId || !jobId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const headers: Record<string, string> = {
          "Authorization": `Bearer ${userId}`,
        };

        // Load recruiter profile id for note permissions
        try {
          const meRes = await fetch(`${API_BASE}/auth/me`, { headers });
          const meData = await meRes.json();
          if (!abort) {
            setRecruiterProfileId(meData?.recruiterProfile?.id ?? null);
          }
        } catch {
          // best-effort
        }
        
        const jobResponse = await fetch(`${API_BASE}/jobs/${jobId}`, { headers });
        const jobData = await jobResponse.json();
        
        if (!jobData.success) {
          setError("Job not found");
          return;
        }
        
        if (!abort) setJob(jobData.data);
        
        const appsResponse = await fetch(
          `${API_BASE}/api/applications?jobId=${jobId}&pageSize=100`,
          { headers }
        );
        const appsData = await appsResponse.json();
        
        if (appsData.success) {
          const applications = appsData.data || [];
          // Debug: Log interviews data to help troubleshoot
          applications.forEach((app: Application) => {
            // Process interviews data
            if (app.interviews && app.interviews.length > 0) {
              // Map interviews for debugging (removed)
            }
          });
          if (!abort) setApplications(applications);
        } else {
          if (!abort) setError(appsData.message || "Failed to fetch applications");
        }
      } catch {
        if (abort) return;
        setError("Network error");
      } finally {
        if (!abort) setLoading(false);
      }
    };

    fetchData();
    return () => {
      abort = true;
    };
  }, [userId, jobId]);

  // Support being opened from dashboard (auto-open a specific application)
  useEffect(() => {
    const state = location.state as { applicationId?: string } | undefined;
    if (!state?.applicationId) return;
    if (loading) return;
    if (!applications.length) return;
    const match = applications.find((a) => a.id === state.applicationId);
    if (match) {
      setSelectedApplication(match);
      navigate(`/recruiter/jobs/${jobId}/applications`, { replace: true, state: null });
    }
  }, [applications, jobId, loading, location.state, navigate]);

  // Reset note editor when selecting an application
  useEffect(() => {
    setNoteDraft("");
    setEditingNoteId(null);
    setEditingNoteText("");
  }, [selectedApplication?.id]);

  const upsertSelectedApplication = (next: Application) => {
    setSelectedApplication(next);
    setApplications((prev) => prev.map((a) => (a.id === next.id ? next : a)));
  };

  const handleAddNote = async () => {
    if (!userId || !selectedApplication) return;
    const content = noteDraft.trim();
    if (!content) return;
    try {
      setSavingNote(true);
      const res = await fetch(`${API_BASE}/applications/${selectedApplication.id}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "Failed to add note");
        return;
      }
      const created = data.data as { id: string; authorId: string; content: string; createdAt: string };
      const next: Application = {
        ...selectedApplication,
        notes: [created, ...(selectedApplication.notes || [])],
      };
      upsertSelectedApplication(next);
      setNoteDraft("");
    } catch {
      setError("Network error");
    } finally {
      setSavingNote(false);
    }
  };

  const handleStartEditNote = (noteId: string, text: string) => {
    setEditingNoteId(noteId);
    setEditingNoteText(text);
  };

  const handleSaveEditNote = async () => {
    if (!userId || !selectedApplication || !editingNoteId) return;
    const content = editingNoteText.trim();
    if (!content) return;
    try {
      setSavingNote(true);
      const res = await fetch(`${API_BASE}/applications/${selectedApplication.id}/notes/${editingNoteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "Failed to update note");
        return;
      }
      const updated = data.data as { id: string; authorId: string; content: string; createdAt: string };
      const next: Application = {
        ...selectedApplication,
        notes: (selectedApplication.notes || []).map((n) => (n.id === updated.id ? updated : n)),
      };
      upsertSelectedApplication(next);
      setEditingNoteId(null);
      setEditingNoteText("");
    } catch {
      setError("Network error");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setNoteIdToDelete(noteId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteNoteConfirm = async () => {
    if (!userId || !selectedApplication || !noteIdToDelete) return;
    try {
      setSavingNote(true);
      const res = await fetch(`${API_BASE}/applications/${selectedApplication.id}/notes/${noteIdToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userId}`,
        },
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "Failed to delete note");
        return;
      }
      const next: Application = {
        ...selectedApplication,
        notes: (selectedApplication.notes || []).filter((n) => n.id !== noteIdToDelete),
      };
      upsertSelectedApplication(next);
      setDeleteConfirmOpen(false);
      setNoteIdToDelete(null);
    } catch {
      setError("Network error");
    } finally {
      setSavingNote(false);
    }
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || { 
      label: status, 
      variant: "outline" as const,
      icon: <Clock className="h-3.5 w-3.5" />,
      color: "bg-muted text-muted-foreground border-border",
    };
  };

  const getJobStatusConfig = (status: string) => {
    return jobStatusConfig[status] || {
      label: status,
      icon: <Clock className="h-3.5 w-3.5" />,
      color: "bg-muted text-muted-foreground border-border",
    };
  };

  const handleJobStatusUpdate = async (nextStatus: string) => {
    if (!currentUser || !jobId || !job) return;
    try {
      setUpdatingJobStatus(true);
      setError(null);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentUser.id}`,
      };
      const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...job, status: nextStatus }),
      });
      const data = await response.json();
      if (data.success) {
        setJob({ ...job, status: nextStatus });
      } else {
        setError(data.message || "Failed to update job status");
      }
    } catch {
      setError("Network error");
    } finally {
      setUpdatingJobStatus(false);
    }
  };

  const handleInlineStatusUpdate = async (applicationId: string, nextStatus: string) => {
    if (!currentUser) return;
    try {
      setUpdating(true);
      setInlineEditingId(applicationId);
      setError(null);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentUser.id}`,
      };
      const response = await fetch(
        `${API_BASE}/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setApplications((prev) =>
          prev.map((app) =>
            app.id === applicationId ? { ...app, status: nextStatus } : app
          )
        );
        if (selectedApplication && selectedApplication.id === applicationId) {
          setSelectedApplication({ ...selectedApplication, status: nextStatus });
        }
        setInlineEditingId(null);
      } else {
        setError(data.message || "Failed to update status");
      }
    } catch {
      setError("Network error");
    } finally {
      setUpdating(false);
      setInlineEditingId(null);
    }
  };

  const handleStatusUpdate = async (applicationId: string, nextStatus: string) => {
    await handleInlineStatusUpdate(applicationId, nextStatus);
  };

  const handleAddNoteModal = async (applicationId: string, content: string) => {
    if (!userId || !selectedApplication || selectedApplication.id !== applicationId) return;
    try {
      setSavingNote(true);
      const res = await fetch(`${API_BASE}/applications/${applicationId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "Failed to add note");
        return;
      }
      const created = data.data as { id: string; authorId: string; content: string; createdAt: string };
      const next: Application = {
        ...selectedApplication,
        notes: [created, ...(selectedApplication.notes || [])],
      };
      upsertSelectedApplication(next);
    } catch {
      setError("Network error");
    } finally {
      setSavingNote(false);
    }
  };

  const handleEditNoteModal = async (noteId: string, content: string) => {
    if (!userId || !selectedApplication) return;
    try {
      setSavingNote(true);
      const res = await fetch(`${API_BASE}/applications/${selectedApplication.id}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "Failed to update note");
        return;
      }
      const updated = data.data as { id: string; authorId: string; content: string; createdAt: string };
      const next: Application = {
        ...selectedApplication,
        notes: (selectedApplication.notes || []).map((n) => (n.id === updated.id ? updated : n)),
      };
      upsertSelectedApplication(next);
    } catch {
      setError("Network error");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNoteModal = async (noteId: string) => {
    if (!userId || !selectedApplication) return;
    try {
      setSavingNote(true);
      const res = await fetch(`${API_BASE}/applications/${selectedApplication.id}/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userId}`,
        },
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "Failed to delete note");
        return;
      }
      const next: Application = {
        ...selectedApplication,
        notes: (selectedApplication.notes || []).filter((n) => n.id !== noteId),
      };
      upsertSelectedApplication(next);
    } catch {
      setError("Network error");
    } finally {
      setSavingNote(false);
    }
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      setPage(1);
      return next;
    });
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const getUserDisplayName = () => {
        // Handle case where user is null but userId exists
        if (!app.candidate?.user) {
          return app.candidate?.userId ? `Candidate (${app.candidate.userId.slice(0, 8)}...)` : "";
        }
        const { firstName, lastName, email } = app.candidate.user;
        const fullName = `${firstName || ""} ${lastName || ""}`.trim();
        return fullName || email || "";
      };
      const candidateName = getUserDisplayName();
      const email = app.candidate?.user?.email || "";
      const haystack = `${candidateName} ${email}`.toLowerCase();

      if (searchTerm && !haystack.includes(searchTerm.toLowerCase().trim())) {
        return false;
      }

      if (statusFilters.size > 0 && !statusFilters.has(app.status)) {
        return false;
      }

      if (dateFrom) {
        const applied = new Date(app.appliedAt).getTime();
        if (applied < new Date(dateFrom).getTime()) return false;
      }
      if (dateTo) {
        const applied = new Date(app.appliedAt).getTime();
        if (applied > new Date(dateTo).getTime()) return false;
      }

      return true;
    });
  }, [applications, searchTerm, statusFilters, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApplications.slice(start, start + pageSize);
  }, [filteredApplications, currentPage, pageSize]);

  if (!isRecruiterLoggedIn()) {
    return null;
  }

  if (!jobId) {
    return (
      <main className="min-h-dvh bg-muted/40 py-8">
        <div className="container mx-auto px-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>Job not found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This page requires a valid jobId in the URL.
              </p>
              <Button onClick={() => navigate("/recruiter/jobs")}>Back to jobs</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-muted/40 py-8">
      <div className="container mx-auto px-4 space-y-6">
        {/* Back Button - Floating */}
          <Button
          variant="outline"
          size="icon"
            onClick={() => navigate("/recruiter/jobs")}
          className="fixed top-24 left-4 z-50 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-primary/10 hover:scale-110 transition-all group"
          >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          </Button>

        {/* Job Header & Filters - Combined */}
        {job && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-xl sm:text-2xl">
                        {job.title}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <span>{job.company?.name}</span>
                        <span>•</span>
                        <span>
                          {applications.length} application{applications.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    {/* Job Status Selector */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-flex items-center">
                        <select
                          value={job.status}
                          onChange={(e) => handleJobStatusUpdate(e.target.value)}
                          className={`inline-flex h-8 items-center gap-1.5 pl-8 pr-8 text-sm font-medium rounded-md border cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 ${getJobStatusConfig(job.status).color}`}
                          disabled={updatingJobStatus}
                        >
                          {Object.keys(jobStatusConfig).map((key) => (
                            <option key={key} value={key}>
                              {jobStatusConfig[key].label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                          {getJobStatusConfig(job.status).icon}
                        </div>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        {updatingJobStatus && (
                          <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4 border-t">
              {/* Filters */}
              <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Name or email"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Applied from</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Applied to</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(statusConfig).map((key) => {
                  const active = statusFilters.has(key);
                  return (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="gap-1"
                      onClick={() => toggleStatusFilter(key)}
                    >
                      {statusConfig[key].icon}
                      {statusConfig[key].label}
                    </Button>
                  );
                })}
                {statusFilters.size > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setStatusFilters(new Set());
                      setPage(1);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            </div>
          </CardContent>
        </Card>
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
        ) : pagedApplications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No applications found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting filters to see more results.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {pagedApplications.map((app) => {
              const config = getStatusConfig(app.status);
              const getUserDisplayName = () => {
                // Handle case where user is null but userId exists
                if (!app.candidate?.user) {
                  // If we have userId, we could fetch it, but for now show fallback
                  return app.candidate?.userId ? `Candidate (${app.candidate.userId.slice(0, 8)}...)` : "Unknown Candidate";
                }
                const { firstName, lastName, email } = app.candidate.user;
                const fullName = `${firstName || ""} ${lastName || ""}`.trim();
                return fullName || email || "Unknown Candidate";
              };
              const candidateName = getUserDisplayName();
              
              return (
                <Card
                  key={app.id}
                  className="hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedApplication(app)}
                >
                  <CardHeader className="pb-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-4">
                      <div className="flex items-start gap-3">
                        {app.candidate?.user?.avatarUrl ? (
                          <img
                            src={app.candidate.user.avatarUrl}
                            alt={candidateName}
                            className="h-12 w-12 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center border">
                            <User className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <CardTitle className="text-base">{candidateName}</CardTitle>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {app.candidate?.user?.email || "No email"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Applied {new Date(app.appliedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-flex items-center">
                        <select
                          value={app.status}
                          onChange={(e) => handleInlineStatusUpdate(app.id, e.target.value)}
                            className={`inline-flex h-8 items-center gap-1.5 pl-8 pr-8 text-sm font-medium rounded-md border cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.color}`}
                          disabled={updating && inlineEditingId === app.id}
                        >
                          {getAllowedStatusesForRecruiter(app.status).map((key) => (
                            <option key={key} value={key}>
                              {statusConfig[key]?.label || key}
                            </option>
                          ))}
                        </select>
                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                            {config.icon}
                          </div>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        {updating && inlineEditingId === app.id && (
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            </div>
                        )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    {app.resumeUrl && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={app.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          Resume
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {app.coverLetter && (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {app.coverLetter}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && (
        <div className="container mx-auto px-4 pt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Page {currentPage} / {totalPages} • {filteredApplications.length} result
              {filteredApplications.length !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      <ApplicationDetailModal
        application={selectedApplication}
        onClose={() => setSelectedApplication(null)}
        onStatusUpdate={handleStatusUpdate}
        onAddNote={handleAddNoteModal}
        onEditNote={handleEditNoteModal}
        onDeleteNote={handleDeleteNoteModal}
        getAllowedStatuses={getAllowedStatusesForRecruiter}
        getStatusConfig={getStatusConfig}
        recruiterProfileId={recruiterProfileId}
        updating={updating}
        savingNote={savingNote}
        showJobApplicationsLink={false}
        onCreateOffer={() => setShowCreateOfferModal(true)}
      />

      {/* Old Modal - Removed, using ApplicationDetailModal component */}
      {false && false && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div className="flex items-center gap-3">
                {selectedApplication.candidate?.user?.avatarUrl ? (
                  <img
                    src={selectedApplication.candidate.user.avatarUrl}
                    alt="Avatar"
                    className="h-10 w-10 rounded-full object-cover border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <CardTitle>
                    {(() => {
                      // Handle case where user is null but userId exists
                      if (!selectedApplication.candidate?.user) {
                        return selectedApplication.candidate?.userId 
                          ? `Candidate (${selectedApplication.candidate.userId.slice(0, 8)}...)` 
                          : "Unknown Candidate";
                      }
                      const { firstName, lastName, email } = selectedApplication.candidate.user;
                      const fullName = `${firstName || ""} ${lastName || ""}`.trim();
                      return fullName || email || "Unknown Candidate";
                    })()}
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
                <Badge variant="outline" className={`gap-1.5 border ${getStatusConfig(selectedApplication.status).color}`}>
                  {getStatusConfig(selectedApplication.status).icon}
                  {getStatusConfig(selectedApplication.status).label}
                </Badge>
              </div>

              {/* Interviews Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Interviews ({selectedApplication.interviews?.length || 0})
                  </div>
                </div>
                {selectedApplication.interviews && selectedApplication.interviews.length > 0 ? (
                  <div className="space-y-3">
                    {selectedApplication.interviews
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((interview) => {
                        const isPending = interview.status === "PENDING";
                        const isCompleted = interview.status === "COMPLETED";
                        const isInProgress = interview.status === "IN_PROGRESS";
                        const isExpired = new Date(interview.expiresAt) < new Date();

                        return (
                          <div
                            key={interview.id}
                            className={`rounded-lg border p-4 space-y-3 ${
                              isPending
                                ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                                : isCompleted
                                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                : "bg-muted/50"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="text-sm font-medium">{interview.title}</div>
                                  <Badge
                                    variant="outline"
                                    className={
                                      isPending
                                        ? "border-blue-500 text-blue-700 dark:text-blue-300"
                                        : isCompleted
                                        ? "border-green-500 text-green-700 dark:text-green-300"
                                        : isInProgress
                                        ? "border-yellow-500 text-yellow-700 dark:text-yellow-300"
                                        : ""
                                    }
                                  >
                                    {interview.status}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Created: {new Date(interview.createdAt).toLocaleString("en-US")}
                                </div>
                                {interview.startedAt && (
                                  <div className="text-xs text-muted-foreground">
                                    Started: {new Date(interview.startedAt).toLocaleString("en-US")}
                                  </div>
                                )}
                                {interview.endedAt && (
                                  <div className="text-xs text-muted-foreground">
                                    Ended: {new Date(interview.endedAt).toLocaleString("en-US")}
                                  </div>
                                )}
                                {isCompleted && interview.overallScore !== null && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium mb-1">Overall Score:</div>
                                    <div className="text-lg font-bold text-green-700 dark:text-green-300">
                                      {interview.overallScore?.toFixed(1)} / 100
                                    </div>
                                  </div>
                                )}
                                {isCompleted && interview.recommendation && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium mb-1">Recommendation:</div>
                                    <Badge
                                      variant="outline"
                                      className={
                                        interview.recommendation === "HIRE"
                                          ? "border-green-500 text-green-700 dark:text-green-300"
                                          : interview.recommendation === "CONSIDER"
                                          ? "border-yellow-500 text-yellow-700 dark:text-yellow-300"
                                          : "border-red-500 text-red-700 dark:text-red-300"
                                      }
                                    >
                                      {interview.recommendation}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* PENDING Interview - Show Access Code */}
                            {isPending && (
                              <div className="space-y-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                                <div>
                                  <div className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                    Access Code:
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <code className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded font-mono text-lg font-bold text-blue-900 dark:text-blue-100">
                                      {interview.accessCode}
                                    </code>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        navigator.clipboard.writeText(interview.accessCode);
                                      }}
                                    >
                                      Copy
                                    </Button>
                                  </div>
                                </div>
                                {interview.sessionUrl && (
                                  <div>
                                    <div className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                      Interview Link:
                                    </div>
                                    <a
                                      href={interview.sessionUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-sm text-blue-700 dark:text-blue-300 hover:underline"
                                    >
                                      {interview.sessionUrl}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                )}
                                <div className="text-xs text-blue-700 dark:text-blue-300">
                                  Expires: {new Date(interview.expiresAt).toLocaleString("en-US")}
                                </div>
                                {isExpired && (
                                  <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                                    ⚠️ Expired
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Show Feedback Button for COMPLETED, PROCESSING, or any interview with feedback data */}
                            {(isCompleted || interview.status === "PROCESSING" || (interview.overallScore !== null || interview.summary || interview.recommendation)) && (
                              <div className={`pt-2 border-t ${isCompleted ? "border-green-200 dark:border-green-800" : ""}`}>
                                <Button
                                  size="sm"
                                  variant={isCompleted ? "outline" : "outline"}
                                  onClick={() => navigate(`/interviews/${interview.id}/feedback`)}
                                  className="w-full"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  {isCompleted 
                                    ? "View Detailed Feedback" 
                                    : interview.status === "PROCESSING"
                                    ? "View Feedback (Processing...)"
                                    : "View Feedback"}
                                </Button>
                                {interview.summary && (
                                  <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                                    {interview.summary}
                                  </div>
                                )}
                                {!isCompleted && interview.status === "PROCESSING" && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    AI is analyzing the interview. Feedback will be available shortly.
                                  </div>
                                )}
                              </div>
                            )}

                            {/* IN_PROGRESS Interview */}
                            {isInProgress && (
                              <div className="pt-2 border-t">
                                <div className="text-xs text-muted-foreground">
                                  Candidate is participating in interview...
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No interviews scheduled yet.
                  </div>
                )}
              </div>

              {/* Offers Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Offers ({selectedApplication.offers?.length || 0})
                  </div>
                  {(selectedApplication.status === "INTERVIEWED" || selectedApplication.status === "OFFER_SENT" || selectedApplication.status === "OFFER_ACCEPTED") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCreateOfferModal(true)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Offer
                    </Button>
                  )}
                </div>
                {selectedApplication.offers && selectedApplication.offers.length > 0 ? (
                  <div className="space-y-3">
                    {selectedApplication.offers
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((offer) => {
                        const isPending = offer.status === "PENDING";
                        const isAccepted = offer.status === "ACCEPTED";
                        const isRejected = offer.status === "REJECTED";
                        const isExpired = new Date(offer.expirationDate) < new Date() && isPending;

                        return (
                          <div
                            key={offer.id}
                            className={`rounded-lg border p-4 space-y-3 ${
                              isAccepted
                                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                : isRejected
                                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                                : isPending
                                ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                                : "bg-muted/50"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="text-sm font-medium">{offer.title}</div>
                                  <Badge
                                    variant="outline"
                                    className={
                                      isAccepted
                                        ? "border-green-500 text-green-700 dark:text-green-300"
                                        : isRejected
                                        ? "border-red-500 text-red-700 dark:text-red-300"
                                        : isPending
                                        ? "border-blue-500 text-blue-700 dark:text-blue-300"
                                        : ""
                                    }
                                  >
                                    {offer.status}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Sent: {new Date(offer.sentAt).toLocaleString("en-US")}
                                </div>
                                {offer.salaryMin !== null && offer.salaryMax !== null && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium mb-1">Salary:</div>
                                    <div className="text-sm font-semibold">
                                      {offer.salaryCurrency} {offer.salaryMin?.toLocaleString()} - {offer.salaryMax?.toLocaleString()}
                                    </div>
                                  </div>
                                )}
                                {offer.startDate && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Start Date: {new Date(offer.startDate).toLocaleDateString("en-US")}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  Expires: {new Date(offer.expirationDate).toLocaleDateString("en-US")}
                                  {isExpired && (
                                    <span className="text-red-600 dark:text-red-400 ml-2">(Expired)</span>
                                  )}
                                </div>
                                {offer.responseNote && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    <div className="font-medium mb-1">Candidate Response:</div>
                                    <div>{offer.responseNote}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions for PENDING offers */}
                            {isPending && !isExpired && (
                              <div className="pt-2 border-t border-blue-200 dark:border-blue-800 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // TODO: Open edit offer modal
                                  }}
                                  className="flex-1"
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    if (!confirm("Are you sure you want to withdraw this offer?")) return;
                                    try {
                                      const response = await fetch(`${API_BASE}/offers/${offer.id}`, {
                                        method: "PUT",
                                        headers: {
                                          "Content-Type": "application/json",
                                          Authorization: `Bearer ${userId}`,
                                        },
                                        body: JSON.stringify({ status: "WITHDRAWN" }),
                                      });
                                      const data = await response.json();
                                      if (data.success) {
                                        // Reload applications
                                        window.location.reload();
                                      }
                                    } catch {
                                    }
                                  }}
                                  className="flex-1"
                                >
                                  Withdraw
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No offers sent yet.
                  </div>
                )}
              </div>

              {/* Applied Date */}
              <div>
                <div className="text-sm font-medium mb-2">Applied Date</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(selectedApplication.appliedAt).toLocaleString()}
                </div>
              </div>

              {/* Candidate Profile */}
              {selectedApplication.candidate?.id ? (
                <div>
                  <div className="text-sm font-medium mb-2">Candidate Profile</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/candidates/${encodeURIComponent(selectedApplication.candidate!.id)}`, '_blank')}
                  >
                    View full profile
                  </Button>
                </div>
              ) : null}

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

              {/* Candidate Skills & Experience */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {(selectedApplication.candidate?.skills || [])
                      .map((cs) => cs?.skill?.name || "")
                      .filter((n) => n.trim().length > 0)
                      .slice(0, 16)
                      .map((name) => (
                        <Badge key={`skill-${name}`} variant="outline">
                          {name}
                        </Badge>
                      ))}
                    {(selectedApplication.candidate?.skills || []).length === 0 && (
                      <div className="text-sm text-muted-foreground">No skills yet.</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Experience</div>
                  <div className="space-y-2">
                    {(selectedApplication.candidate?.experiences || []).slice(0, 3).map((exp) => (
                      <div key={exp.id} className="rounded-md border bg-muted/20 p-3">
                        <div className="text-sm font-medium">
                          {exp.position} • {exp.companyName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(exp.startDate).toLocaleDateString()} –{" "}
                          {exp.isCurrent || !exp.endDate ? "Present" : new Date(exp.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                    {(selectedApplication.candidate?.experiences || []).length === 0 && (
                      <div className="text-sm text-muted-foreground">No experience yet.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recruiter Notes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Recruiter Notes</div>
                  <div className="text-xs text-muted-foreground">
                    {(selectedApplication.notes || []).length} note{(selectedApplication.notes || []).length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="space-y-2">
                  {(selectedApplication.notes || []).map((n) => {
                    const canEdit = recruiterProfileId && n.authorId === recruiterProfileId;
                    return (
                      <div key={n.id} className="rounded-lg border bg-muted/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-xs text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={savingNote}
                                onClick={() => handleStartEditNote(n.id, n.content)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                disabled={savingNote}
                                onClick={() => handleDeleteNote(n.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>

                        {editingNoteId === n.id ? (
                          <div className="mt-2 space-y-2">
                            <Textarea
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              rows={3}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={savingNote}
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingNoteText("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button size="sm" disabled={savingNote} onClick={handleSaveEditNote}>
                                {savingNote ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{n.content}</div>
                        )}
                      </div>
                    );
                  })}

                  {(selectedApplication.notes || []).length === 0 && (
                    <div className="text-sm text-muted-foreground">No notes yet.</div>
                  )}
                </div>

                <div className="space-y-2 rounded-lg border bg-background p-3">
                  <div className="text-xs font-medium text-muted-foreground">Add note</div>
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                    placeholder="Write an internal note for this candidate..."
                  />
                  <div className="flex justify-end">
                    <Button size="sm" disabled={savingNote || noteDraft.trim().length === 0} onClick={handleAddNote}>
                      {savingNote ? "Saving..." : "Add note"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedApplication(null)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog for Delete Note */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteNoteConfirm}
        title="Delete Note?"
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={savingNote}
      />

      {/* Create Offer Modal */}
      <Dialog open={showCreateOfferModal} onOpenChange={setShowCreateOfferModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Offer</DialogTitle>
              <DialogDescription>
              Create and send an offer to {(() => {
                if (!selectedApplication?.candidate?.user) return "this candidate";
                const { firstName, lastName, email } = selectedApplication.candidate.user;
                const fullName = `${firstName || ""} ${lastName || ""}`.trim();
                return fullName || email || "this candidate";
              })()}
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <CreateOfferForm
              applicationId={selectedApplication.id}
              jobTitle={selectedApplication.job?.title || ""}
              onSuccess={() => {
                setShowCreateOfferModal(false);
                window.location.reload();
              }}
              onCancel={() => setShowCreateOfferModal(false)}
              creating={creatingOffer}
              setCreating={setCreatingOffer}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default RecruiterJobApplications;
