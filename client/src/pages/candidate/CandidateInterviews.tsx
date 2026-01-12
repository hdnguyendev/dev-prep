import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@clerk/clerk-react";
import { Loader2, Search, Calendar, Clock, TrendingUp, CheckCircle2, XCircle, Award, Building2, Briefcase, FileText, Eye, EyeOff, Sparkles, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { apiClient, type InterviewFeedback } from "@/lib/api";

type InterviewRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  createdAt: string;
  expiresAt?: string | null;
  overallScore?: number | null;
  accessCode?: string | null; // Access code for pending interviews
  applicationId?: string | null; // Real interview has applicationId, practice interview doesn't
  application?: { 
    job?: { 
      title?: string | null;
      company?: {
        name?: string | null;
        logoUrl?: string | null;
      } | null;
    } | null;
  } | null;
  job?: { 
    title?: string | null;
    company?: {
      name?: string | null;
      logoUrl?: string | null;
    } | null;
  } | null;
};

const statusVariant = (status: string): "default" | "outline" | "success" => {
  if (status === "COMPLETED") return "success";
  if (status === "FAILED" || status === "EXPIRED") return "outline";
  if (status === "SCHEDULED" || status === "IN_PROGRESS") return "default";
  return "outline";
};

const getCompanyInitial = (companyName?: string | null) => {
  return companyName?.[0]?.toUpperCase() || "C";
};

const getCompanyColor = (index: number) => {
  const colors = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-orange-500 to-red-500",
    "from-green-500 to-emerald-500",
    "from-indigo-500 to-blue-500",
  ];
  return colors[index % colors.length];
};

export default function CandidateInterviews() {
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InterviewRow[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [copiedAccessCode, setCopiedAccessCode] = useState<string | null>(null);
  const [visibleAccessCodeId, setVisibleAccessCodeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [feedbackData, setFeedbackData] = useState<InterviewFeedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const copyToClipboard = async (text: string, interviewId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAccessCode(interviewId);
      setTimeout(() => setCopiedAccessCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const loadFeedback = async (interviewId: string) => {
    try {
      setLoadingFeedback(true);
      setFeedbackError(null);
      const token = await getToken();
      if (!token) {
        setFeedbackError("Not authenticated");
        return;
      }
      const res = await apiClient.getInterviewFeedback(interviewId, token);
      if (!res.success) {
        setFeedbackError(res.message || "Failed to load feedback");
        return;
      }
      setFeedbackData(res.data);
    } catch (err) {
      setFeedbackError("Network error");
      console.error("Failed to load feedback:", err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleViewFeedback = (interviewId: string) => {
    setSelectedInterviewId(interviewId);
    loadFeedback(interviewId);
  };

  const handleCloseFeedback = () => {
    setSelectedInterviewId(null);
    setFeedbackData(null);
    setFeedbackError(null);
  };


  // Statistics
  const stats = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter((r) => r.status === "COMPLETED").length;
    const scheduled = rows.filter((r) => r.status === "SCHEDULED").length;
    const inProgress = rows.filter((r) => r.status === "IN_PROGRESS").length;
    const failed = rows.filter((r) => r.status === "FAILED" || r.status === "EXPIRED").length;
    const scored = rows.filter((r) => typeof r.overallScore === "number").map((r) => Number(r.overallScore));
    const avgScore = scored.length > 0 ? (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1) : "0";
    
    return { total, completed, scheduled, inProgress, failed, avgScore };
  }, [rows]);

  // const handleSearch = () => {
  //   setQ(qInput);
  // };

  // const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
  //   if (e.key === "Enter") {
  //     handleSearch();
  //   }
  // };

  useEffect(() => {
    let abort = false;
    const run = async () => {
      if (!isLoaded) return;
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) return;
        const response = await apiClient.getFilteredInterviews({ 
          page: 1, 
          pageSize: 300,
          q: q.trim() || undefined,
        }, token);
        if (abort) return;
        if (!response?.success) {
          setError(response?.message || "Failed to load interviews");
          setRows([]);
          return;
        }
        setRows((response.data || []) as InterviewRow[]);
      } catch {
        if (abort) return;
        setError("Network error");
      } finally {
        if (!abort) setLoading(false);
      }
    };
    run();
    return () => {
      abort = true;
    };
  }, [getToken, isLoaded, q]);

  // Get unique types for filter
  const interviewTypes = useMemo(() => {
    const types = new Set(rows.map((r) => r.type).filter(Boolean));
    return Array.from(types);
  }, [rows]);

  // Get unique statuses for filter
  const interviewStatuses = useMemo(() => {
    const statuses = new Set(rows.map((r) => r.status).filter(Boolean));
    return Array.from(statuses);
  }, [rows]);

  // Client-side filtering only for status, type, and date (search is done on server)
  const filtered = useMemo(() => {
    let result = rows;
    
    // Status filter
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }
    
    // Type filter
    if (typeFilter) {
      result = result.filter((r) => r.type === typeFilter);
    }
    
    // Date filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter((r) => {
        if (!r.createdAt) return false;
        const createdDate = new Date(r.createdAt);
        createdDate.setHours(0, 0, 0, 0);
        return createdDate >= fromDate;
    });
    }
    
    return result;
  }, [rows, statusFilter, typeFilter, dateFrom]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, dateFrom, q]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interviews</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-destructive">{error}</div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-dashed border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/50 via-background to-background dark:from-violet-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-violet-700 dark:text-violet-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-500" />
              <FileText className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-violet-600 dark:text-violet-400">{stats.total}</div>
            <div className="text-xs text-violet-600/70 dark:text-violet-400/70">Interviews</div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 via-background to-background dark:from-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.completed}</div>
            <div className="text-xs text-green-600/70 dark:text-green-400/70">Finished</div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-sky-200 dark:border-sky-800 bg-gradient-to-br from-sky-50/50 via-background to-background dark:from-sky-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-sky-700 dark:text-sky-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-sky-500" />
              <Clock className="h-4 w-4" />
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-sky-600 dark:text-sky-400">{stats.scheduled}</div>
            <div className="text-xs text-sky-600/70 dark:text-sky-400/70">Upcoming</div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50/50 via-background to-background dark:from-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <Award className="h-4 w-4" />
              Avg Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">{stats.avgScore}</div>
            <div className="text-xs text-yellow-600/70 dark:text-yellow-400/70">Out of 100</div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-pink-200 dark:border-pink-800 bg-gradient-to-br from-pink-50/50 via-background to-background dark:from-pink-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-pink-700 dark:text-pink-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-pink-500" />
              <TrendingUp className="h-4 w-4" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-pink-600 dark:text-pink-400">{stats.inProgress}</div>
            <div className="text-xs text-pink-600/70 dark:text-pink-400/70">Active</div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Interviews Section - hidden to keep layout compact */}

      {/* Interviews Table */}
      <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50/20 via-background to-background dark:from-slate-950/5">
        <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg text-slate-700 dark:text-slate-300">All Interviews</CardTitle>
            <div className="text-sm text-slate-600 dark:text-slate-400">{filtered.length} items</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 my-2">
          {/* Search and Filters */}
          <div className="grid gap-3 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
                className="pl-9" 
                placeholder="Search by interview or job title…" 
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All Status</option>
              {interviewStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All Types</option>
              {interviewTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Created from"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/50 bg-card">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-foreground text-xs">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Interview
                    </div>
                  </th>
                  <th className="px-3 py-2 font-semibold text-foreground text-xs">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      Job / Company
                    </div>
                  </th>
                  <th className="px-3 py-2 font-semibold text-foreground text-xs">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      Status
                    </div>
                  </th>
                  <th className="px-3 py-2 font-semibold text-foreground text-xs">
                    <div className="flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-primary" />
                      Score
                    </div>
                  </th>
                  <th className="px-3 py-2 font-semibold text-foreground text-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Created
                    </div>
                  </th>
                  <th className="px-3 py-2 font-semibold text-foreground text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((r, index) => {
                  // Practice interview: no applicationId (can view feedback)
                  // Real interview: has applicationId (cannot view feedback)
                  const isPracticeInterview = !r.applicationId;
                  
                  const companyName = isPracticeInterview 
                    ? "Practice" 
                    : (r.application?.job?.company?.name || r.job?.company?.name || "Unknown");
                  const companyLogo = isPracticeInterview 
                    ? null 
                    : (r.application?.job?.company?.logoUrl || r.job?.company?.logoUrl);
                  const jobTitle = r.application?.job?.title || r.job?.title || "-";
                  
                  return (
                    <tr 
                      key={r.id} 
                      className={`group hover:bg-gradient-to-r hover:from-primary/5 hover:via-primary/3 hover:to-transparent transition-all border-b border-border/30 ${isPracticeInterview ? 'cursor-pointer' : ''}`}
                      onClick={isPracticeInterview ? () => handleViewFeedback(r.id) : undefined}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {r.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 h-4">
                              <Sparkles className="h-2.5 w-2.5" />
                              {r.type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground/60 font-mono">
                              {r.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {isPracticeInterview ? (
                            <>
                              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow-sm border border-border/50 shrink-0">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-foreground line-clamp-1">{jobTitle !== "-" ? jobTitle : r.title}</div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  Practice
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {companyLogo ? (
                                <img 
                                  src={companyLogo} 
                                  alt={companyName}
                                  className="h-8 w-8 rounded-md object-cover border border-border/50 shadow-sm shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className={`h-8 w-8 rounded-md bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-xs font-bold text-white shadow-sm border border-border/50 shrink-0 ${companyLogo ? 'hidden' : 'flex'}`}
                              >
                                {getCompanyInitial(companyName)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-foreground line-clamp-1">{jobTitle}</div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Building2 className="h-2.5 w-2.5" />
                                  {companyName}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                    </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant={statusVariant(r.status)}
                            className="inline-flex h-6 items-center gap-1 px-2 text-[11px] font-medium"
                          >
                            {r.status === "COMPLETED" && <CheckCircle2 className="h-2.5 w-2.5" />}
                            {r.status === "FAILED" && <XCircle className="h-2.5 w-2.5" />}
                            {r.status === "EXPIRED" && <Clock className="h-2.5 w-2.5" />}
                            {r.status === "SCHEDULED" && <Calendar className="h-2.5 w-2.5" />}
                            {r.status === "IN_PROGRESS" && <TrendingUp className="h-2.5 w-2.5" />}
                            {r.status === "PENDING" && <Clock className="h-2.5 w-2.5" />}
                            <span className="leading-none">{r.status}</span>
                          </Badge>
                          {/* Access Code for PENDING interviews */}
                          {r.status === "PENDING" && r.accessCode && (
                            <>
                              {visibleAccessCodeId === r.id ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 rounded border border-primary/30 dark:border-primary/40">
                                  <span className="text-[9px]">🔑</span>
                                  <div className="font-mono text-[10px] font-bold text-primary tracking-wider">
                                    {r.accessCode}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 shrink-0 hover:bg-primary/10 -mr-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(r.accessCode!, r.id);
                                    }}
                                    title="Copy"
                                  >
                                    {copiedAccessCode === r.id ? (
                                      <Check className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 shrink-0 hover:bg-primary/10 -mr-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setVisibleAccessCodeId(null);
                                    }}
                                    title="Hide"
                                  >
                                    <EyeOff className="h-2.5 w-2.5 text-muted-foreground" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-1.5 text-[10px] gap-1 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVisibleAccessCodeId(r.id);
                                  }}
                                >
                                  <Eye className="h-2.5 w-2.5 text-muted-foreground" />
                                  <span className="text-muted-foreground">Code</span>
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                    </td>
                      <td className="px-3 py-2.5">
                        {typeof r.overallScore === "number" ? (
                          <div className="flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-semibold text-sm">{r.overallScore}</span>
                            <span className="text-[10px] text-muted-foreground">/100</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                    </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs text-muted-foreground">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          }) : "-"}
                        </div>
                        {r.expiresAt && (
                          <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                            Exp: {new Date(r.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                    </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPracticeInterview ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewFeedback(r.id);
                                }}
                                title="View feedback"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">
                              No feedback
                            </span>
                          )}
                        </div>
                    </td>
                  </tr>
                  );
                })}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="h-12 w-12 text-muted-foreground/50" />
                        <div className="text-muted-foreground font-medium">No interviews found</div>
                        <div className="text-sm text-muted-foreground/70">Try adjusting your search or filters</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * pageSize, filtered.length)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{filtered.length}</span> interviews
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="gap-1.5 h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <span className="text-muted-foreground px-1">...</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-1.5 h-8"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Dialog */}
      <Dialog open={selectedInterviewId !== null} onOpenChange={(open) => !open && handleCloseFeedback()}>
        <DialogContent className="!max-w-[98vw] !w-[98vw] max-h-[95vh] overflow-y-auto p-8">
          <DialogHeader>
            <DialogTitle>Interview Feedback</DialogTitle>
            <DialogDescription>
              {feedbackData ? `Interview ID: ${feedbackData.id.slice(0, 8)}` : "Loading feedback..."}
            </DialogDescription>
          </DialogHeader>

          {loadingFeedback && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {feedbackError && (
            <div className="py-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-destructive">{feedbackError}</div>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => selectedInterviewId && loadFeedback(selectedInterviewId)}>
                    Try again
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {feedbackData && !loadingFeedback && (() => {
            const ai = feedbackData.aiAnalysisData ? (feedbackData.aiAnalysisData as Record<string, unknown>) : null;
            const categoryScores = ai && Array.isArray(ai?.categoryScores) ? (ai.categoryScores as Array<{ name?: string; score?: number }>) : [];
            const strengths = ai && Array.isArray(ai?.strengths) ? (ai.strengths as string[]) : [];
            const improvements = ai && Array.isArray(ai?.areasForImprovement) ? (ai.areasForImprovement as string[]) : [];

            return (
              <div className="space-y-4">
                {/* Overall Score */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Overall</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{feedbackData.status}</Badge>
                    </div>
                    <div className="text-sm">
                      <div className="text-muted-foreground">Score</div>
                      <div className="text-3xl font-semibold tracking-tight">{feedbackData.overallScore ?? "-"}</div>
                    </div>
                    {feedbackData.summary && (
                      <>
                        <Separator />
                        <div className="text-sm text-muted-foreground">{feedbackData.summary}</div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Breakdown */}
                {(categoryScores.length > 0 || strengths.length > 0 || improvements.length > 0) && (
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Category scores</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {categoryScores.length === 0 ? (
                              <div className="text-muted-foreground">No category scores.</div>
                            ) : (
                              categoryScores.map((c, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3">
                                  <div className="truncate">{String(c?.name || "")}</div>
                                  <Badge variant="outline">{String(c?.score ?? "-")}/10</Badge>
                                </div>
                              ))
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Strengths</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            {strengths.length === 0 ? (
                              <div>No strengths found.</div>
                            ) : (
                              <ul className="list-disc space-y-1 pl-4">
                                {strengths.map((s, idx) => (
                                  <li key={idx}>{s}</li>
                                ))}
                              </ul>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Areas for improvement</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                          {improvements.length === 0 ? (
                            <div>No improvement areas found.</div>
                          ) : (
                            <ul className="list-disc space-y-1 pl-4">
                              {improvements.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                )}

                {/* Per Question */}
                {(feedbackData.perQuestion || []).length > 0 && (
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Per Question</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(feedbackData.perQuestion || []).map((q) => (
                        <Card key={q.orderIndex}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">
                              Q{q.orderIndex}: {q.questionText}
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {q.questionCategory && <Badge variant="outline">{q.questionCategory}</Badge>}
                              <Badge variant="success">{q.score ?? "-"}/10</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {q.feedback ? q.feedback : "No feedback."}
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}


