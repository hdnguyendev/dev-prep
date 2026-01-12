import { useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Briefcase,
  Calendar,
  FileText,
  ExternalLink,
  MessageSquare,
  Plus,
  Code,
  Loader2,
  Send,
  Video,
  Gift,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CreateOfferForm from "./CreateOfferForm";

type Application = {
  id: string;
  status: string;
  appliedAt: string;
  jobId: string;
  resumeUrl?: string | null;
  coverLetter?: string | null;
  candidate?: {
    id: string;
    user?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string;
      avatarUrl?: string | null;
    } | null;
    skills?: Array<{ id: string; skillId: string; level?: string | null; skill?: { id: string; name: string } }>;
    experiences?: Array<{
      id: string;
      companyName: string;
      position: string;
      startDate: string;
      endDate?: string | null;
      isCurrent?: boolean;
    }>;
  } | null;
  job?: {
    id: string;
    title?: string | null;
    company?: {
      name?: string | null;
    } | null;
  } | null;
  notes?: Array<{
    id: string;
    authorId: string;
    content: string;
    createdAt: string;
  }>;
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
};

type StatusConfig = {
  label: string;
  icon: React.ReactNode;
  color: string;
};

type ApplicationDetailModalProps = {
  application: Application | null;
  onClose: () => void;
  onStatusUpdate?: (applicationId: string, newStatus: string) => Promise<void>;
  onAddNote?: (applicationId: string, content: string) => Promise<void>;
  onEditNote?: (noteId: string, content: string) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  getAllowedStatuses?: (currentStatus: string) => string[];
  getStatusConfig: (status: string) => StatusConfig;
  recruiterProfileId?: string | null;
  updating?: boolean;
  savingNote?: boolean;
  showJobApplicationsLink?: boolean;
  onCreateOffer?: (applicationId: string) => void;
};

export default function ApplicationDetailModal({
  application,
  onClose,
  onStatusUpdate,
  onAddNote,
  onEditNote,
  onDeleteNote,
  getAllowedStatuses,
  getStatusConfig,
  recruiterProfileId,
  updating = false,
  savingNote = false,
  showJobApplicationsLink = false,
  onCreateOffer,
}: ApplicationDetailModalProps) {
  const navigate = useNavigate();
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>("");
  const [noteIdToDelete, setNoteIdToDelete] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [statusChangeConfirmOpen, setStatusChangeConfirmOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);

  if (!application) return null;

  const handleStartEditNote = (noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setEditingNoteText(content);
  };

  const handleSaveEditNote = async () => {
    if (!editingNoteId || !onEditNote) return;
    await onEditNote(editingNoteId, editingNoteText);
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handleDeleteNote = (noteId: string) => {
    setNoteIdToDelete(noteId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteNoteConfirm = async () => {
    if (!noteIdToDelete || !onDeleteNote) return;
    await onDeleteNote(noteIdToDelete);
    setNoteIdToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const handleAddNote = async () => {
    if (!noteDraft.trim() || !onAddNote) return;
    await onAddNote(application.id, noteDraft);
    setNoteDraft("");
  };

  const getNextStatus = (): string | null => {
    if (!getAllowedStatuses) return null;
    const allowed = getAllowedStatuses(application.status);
    // Filter out current status and REJECTED
    const nextStatuses = allowed.filter(s => s !== application.status && s !== "REJECTED");
    return nextStatuses.length > 0 ? nextStatuses[0] : null;
  };

  const handleNextStatusClick = () => {
    const nextStatus = getNextStatus();
    if (nextStatus) {
      setPendingStatusChange(nextStatus);
      setStatusChangeConfirmOpen(true);
    }
  };

  const handleRejectClick = () => {
    setPendingStatusChange("REJECTED");
    setStatusChangeConfirmOpen(true);
  };

  const handleStatusChangeConfirm = async () => {
    if (pendingStatusChange && onStatusUpdate) {
      await onStatusUpdate(application.id, pendingStatusChange);
      setStatusChangeConfirmOpen(false);
      setPendingStatusChange(null);
    }
  };

  const candidateName = application.candidate?.user
    ? `${application.candidate.user.firstName || ''} ${application.candidate.user.lastName || ''}`.trim() || application.candidate.user.email
    : "Unknown";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col border-0 shadow-xl overflow-hidden">
          {/* Sticky Header */}
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-blue-50/50 via-background to-background dark:from-blue-950/10 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              {application.candidate?.user?.avatarUrl ? (
                <img
                  src={application.candidate.user.avatarUrl}
                  alt="Avatar"
                  className="h-12 w-12 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20">
                  <User className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg">{candidateName}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {application.candidate?.user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getAllowedStatuses && onStatusUpdate && application.status !== "REJECTED" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRejectClick}
                  disabled={updating}
                  className="gap-2"
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Reject
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          
          {/* Scrollable Content */}
          <CardContent className="space-y-5 pt-5 overflow-y-auto flex-1">
            {/* Job Info */}
            <div className="rounded-lg border border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wide">Job Application</div>
              </div>
              <div className="text-base font-semibold text-foreground">{application.job?.title || "Unknown Job"}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{application.job?.company?.name || ""}</div>
            </div>

            {/* Status & Applied Date - Side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-purple-200/50 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/30 to-background dark:from-purple-950/10 p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                  <div className="text-xs font-medium text-purple-700 dark:text-purple-400">Status</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`gap-2 border text-base px-4 py-2 h-auto ${getStatusConfig(application.status).color}`}>
                    {getStatusConfig(application.status).icon}
                    <span className="font-semibold">{getStatusConfig(application.status).label}</span>
                  </Badge>
                  {getAllowedStatuses && onStatusUpdate && getNextStatus() && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleNextStatusClick}
                      disabled={updating}
                      className="gap-2"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-4 w-4" />
                          Move to {getStatusConfig(getNextStatus()!).label}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-green-200/50 dark:border-green-800/50 bg-gradient-to-br from-green-50/30 to-background dark:from-green-950/10 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  <div className="text-xs font-medium text-green-700 dark:text-green-400">Applied Date</div>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {new Date(application.appliedAt).toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(application.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              {application.candidate?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/candidates/${encodeURIComponent(application.candidate!.id)}`, '_blank')}
                  className="gap-2 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                >
                  <User className="h-4 w-4" />
                  View Profile
                </Button>
              )}
              {application.resumeUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(application.resumeUrl!, '_blank')}
                  className="gap-2 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                >
                  <FileText className="h-4 w-4" />
                  View Resume
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Candidate Information */}
            <div className="rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 bg-gradient-to-br from-indigo-50/20 to-background dark:from-indigo-950/10 p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-indigo-200/50 dark:border-indigo-800/50">
                <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">Candidate Information</div>
              </div>
              
              {/* Skills */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Code className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <div className="text-xs font-medium text-indigo-700 dark:text-indigo-400">Skills</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(application.candidate?.skills || [])
                    .map((cs) => cs?.skill?.name || "")
                    .filter((n) => n.trim().length > 0)
                    .slice(0, 12)
                    .map((name) => (
                      <Badge key={`skill-${name}`} variant="outline" className="text-xs border-indigo-200 dark:border-indigo-800">
                        {name}
                      </Badge>
                    ))}
                  {(application.candidate?.skills || []).length === 0 && (
                    <div className="text-sm text-muted-foreground">No skills listed</div>
                  )}
                </div>
              </div>

              {/* Experience */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Briefcase className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <div className="text-xs font-medium text-indigo-700 dark:text-indigo-400">Experience</div>
                </div>
                <div className="space-y-2">
                  {(application.candidate?.experiences || []).slice(0, 3).map((exp) => (
                    <div key={exp.id} className="rounded-md border border-indigo-200/50 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-950/10 p-3">
                      <div className="text-sm font-medium text-foreground">
                        {exp.position}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {exp.companyName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(exp.startDate).toLocaleDateString()} –{" "}
                        {exp.isCurrent || !exp.endDate ? "Present" : new Date(exp.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {(application.candidate?.experiences || []).length === 0 && (
                    <div className="text-sm text-muted-foreground">No experience listed</div>
                  )}
                </div>
              </div>
            </div>

            {/* Cover Letter */}
            {application.coverLetter && (
              <div className="space-y-2 rounded-lg border border-amber-200/50 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/20 to-background dark:from-amber-950/10 p-4">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-200/50 dark:border-amber-800/50">
                  <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">Cover Letter</div>
                </div>
                <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                  {application.coverLetter}
                </div>
              </div>
            )}

            {/* Interviews Section */}
            {application.interviews && application.interviews.length > 0 && (
              <div className="space-y-4 rounded-lg border border-cyan-200/50 dark:border-cyan-800/50 bg-gradient-to-br from-cyan-50/20 to-background dark:from-cyan-950/10 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-cyan-200/50 dark:border-cyan-800/50">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <div className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">
                      Interviews ({application.interviews.length})
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {application.interviews
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

                          {(isCompleted || interview.status === "PROCESSING" || (interview.overallScore !== null || interview.summary || interview.recommendation)) && (
                            <div className={`pt-2 border-t ${isCompleted ? "border-green-200 dark:border-green-800" : ""}`}>
                              <Button
                                size="sm"
                                variant="outline"
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
                            </div>
                          )}

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
              </div>
            )}

            {/* Offers Section */}
            <div className="space-y-4 rounded-lg border border-yellow-200/50 dark:border-yellow-800/50 bg-gradient-to-br from-yellow-50/20 to-background dark:from-yellow-950/10 p-4">
              <div className="flex items-center justify-between pb-2 border-b border-yellow-200/50 dark:border-yellow-800/50">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                    Offers ({application.offers?.length || 0})
                  </div>
                </div>
                {(application.status === "INTERVIEWED" ||
                  application.status === "OFFER_SENT" ||
                  application.status === "OFFER_ACCEPTED") &&
                  onCreateOffer && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (onCreateOffer) {
                          onCreateOffer(application.id);
                        } else {
                          setShowCreateOfferModal(true);
                        }
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Offer
                    </Button>
                  )}
              </div>
              <div className="space-y-3">
                {application.offers && application.offers.length > 0 ? (
                  application.offers
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
                                    {offer.salaryCurrency} {offer.salaryMin?.toLocaleString()} -{" "}
                                    {offer.salaryMax?.toLocaleString()}
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
                        </div>
                      );
                    })
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    No offers have been sent yet. Use the &quot;Send Offer&quot; button above to create one.
                  </div>
                )}
              </div>
            </div>

            {/* Recruiter Notes */}
            {onAddNote && (
              <div className="space-y-3 rounded-lg border border-pink-200/50 dark:border-pink-800/50 bg-gradient-to-br from-pink-50/20 to-background dark:from-pink-950/10 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-pink-200/50 dark:border-pink-800/50">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                    <div className="text-sm font-semibold text-pink-900 dark:text-pink-100">Recruiter Notes</div>
                  </div>
                  <div className="text-xs text-muted-foreground bg-pink-100/50 dark:bg-pink-950/30 px-2 py-1 rounded-full">
                    {(application.notes || []).length} note{(application.notes || []).length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="space-y-2">
                  {(application.notes || []).map((n) => {
                    const canEdit = recruiterProfileId && n.authorId === recruiterProfileId;
                    return (
                      <div key={n.id} className="rounded-lg border border-pink-200/50 dark:border-pink-800/50 bg-pink-50/30 dark:bg-pink-950/10 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-pink-500"></div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(n.createdAt).toLocaleString()}
                            </div>
                          </div>
                          {canEdit && onEditNote && onDeleteNote && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={savingNote}
                                onClick={() => handleStartEditNote(n.id, n.content)}
                                className="h-7 px-2 text-xs"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
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
                              className="text-sm"
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
                          <div className="mt-2 whitespace-pre-line text-sm text-foreground leading-relaxed">{n.content}</div>
                        )}
                      </div>
                    );
                  })}

                  {(application.notes || []).length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">No notes yet.</div>
                  )}
                </div>

                <div className="space-y-2 rounded-lg border border-pink-200/50 dark:border-pink-800/50 bg-background p-3">
                  <div className="flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
                    <div className="text-xs font-medium text-pink-700 dark:text-pink-400">Add note</div>
                  </div>
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                    placeholder="Write an internal note for this candidate..."
                    className="text-sm"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" disabled={savingNote || noteDraft.trim().length === 0} onClick={handleAddNote}>
                      {savingNote ? "Saving..." : "Add note"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          
          {/* Sticky Footer */}
          <div className="border-t bg-background p-4 shrink-0">
            <div className="flex justify-between items-center">
              {showJobApplicationsLink && application.jobId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/recruiter/jobs/${application.jobId}/applications`)}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Job Applications
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </Card>
      </div>

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

      {/* Confirmation Dialog for Status Change */}
      <ConfirmationDialog
        open={statusChangeConfirmOpen}
        onOpenChange={setStatusChangeConfirmOpen}
        onConfirm={handleStatusChangeConfirm}
        title={pendingStatusChange === "REJECTED" ? "Reject Application?" : "Change Application Status?"}
        description={
          pendingStatusChange === "REJECTED"
            ? "Are you sure you want to reject this application? This action cannot be undone."
            : `Are you sure you want to change the status from "${getStatusConfig(application.status).label}" to "${pendingStatusChange ? getStatusConfig(pendingStatusChange).label : ''}"?`
        }
        confirmText={pendingStatusChange === "REJECTED" ? "Reject" : "Confirm"}
        cancelText="Cancel"
        variant={pendingStatusChange === "REJECTED" ? "destructive" : "default"}
        loading={updating}
      />

      {/* Create Offer Modal */}
      {showCreateOfferModal && (
        <Dialog open={showCreateOfferModal} onOpenChange={setShowCreateOfferModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send Offer</DialogTitle>
              <DialogDescription>
                Create and send an offer to {candidateName}
              </DialogDescription>
            </DialogHeader>
            {application && (
              <CreateOfferForm
                applicationId={application.id}
                jobTitle={application.job?.title || ""}
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
      )}
    </>
  );
}

