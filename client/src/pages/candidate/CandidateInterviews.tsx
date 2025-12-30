import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/clerk-react";
import { ExternalLink, Loader2, Search, Calendar, Clock, TrendingUp, CheckCircle2, XCircle, Award, Building2, Briefcase, FileText, Eye, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { apiClient } from "@/lib/api";

type InterviewRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  createdAt: string;
  expiresAt?: string | null;
  overallScore?: number | null;
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
  const navigate = useNavigate();
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InterviewRow[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");

  // Recently interviews (last 6)
  const recentInterviews = useMemo(() => {
    return [...rows]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [rows]);

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
  }, [q, rows, statusFilter, typeFilter, dateFrom]);

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

      {/* Recently Interviews Section */}
      {recentInterviews.length > 0 && (
        <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50/30 via-background to-background dark:from-teal-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
              <Clock className="h-5 w-5" />
              Recent Interviews
            </CardTitle>
            <CardDescription>Your most recent interview sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentInterviews.map((interview, index) => {
                const companyName = interview.application?.job?.company?.name || interview.job?.company?.name || "Company";
                const companyLogo = interview.application?.job?.company?.logoUrl || interview.job?.company?.logoUrl;
                const jobTitle = interview.application?.job?.title || interview.job?.title || "Job";
                
                return (
                  <Card
                    key={interview.id}
                    className="group border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50/50 via-background to-background dark:from-slate-950/10 transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer"
                    onClick={() => navigate(`/interviews/${interview.id}/feedback`)}
                  >
        <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                            {interview.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Briefcase className="h-3 w-3" />
                            {jobTitle}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        {companyLogo ? (
                          <img 
                            src={companyLogo} 
                            alt={companyName}
                            className="h-8 w-8 rounded-lg object-cover border border-border/50"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`h-8 w-8 rounded-lg bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-xs font-bold text-white border border-border/50 ${companyLogo ? 'hidden' : 'flex'}`}
                        >
                          {getCompanyInitial(companyName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium">{companyName}</div>
                        </div>
                      </div>
                      <Badge
                        variant={statusVariant(interview.status)}
                        className="inline-flex h-6 items-center gap-1.5 px-2 text-xs font-medium"
                      >
                        {interview.status}
                      </Badge>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(interview.createdAt).toLocaleDateString()}
                        </div>
                        {typeof interview.overallScore === "number" && (
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <Award className="h-3 w-3" />
                            {interview.overallScore}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interviews Table */}
      <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50/20 via-background to-background dark:from-slate-950/5">
        <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg text-slate-700 dark:text-slate-300">All Interviews</CardTitle>
            <div className="text-sm text-slate-600 dark:text-slate-400">{filtered.length} items</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
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
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Interview
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Job / Company
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Status
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Score
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Created
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((r, index) => {
                  const companyName = r.application?.job?.company?.name || r.job?.company?.name || "Unknown";
                  const companyLogo = r.application?.job?.company?.logoUrl || r.job?.company?.logoUrl;
                  const jobTitle = r.application?.job?.title || r.job?.title || "-";
                  
                  return (
                    <tr 
                      key={r.id} 
                      className="group hover:bg-gradient-to-r hover:from-primary/5 hover:via-primary/3 hover:to-transparent transition-all cursor-pointer border-b border-border/30"
                      onClick={() => navigate(`/interviews/${r.id}/feedback`)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {r.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Badge variant="outline" className="gap-1 text-xs px-1.5 py-0 h-5">
                                <Sparkles className="h-3 w-3" />
                                {r.type}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground/70 mt-1 font-mono">
                              {r.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {companyLogo ? (
                            <img 
                              src={companyLogo} 
                              alt={companyName}
                              className="h-10 w-10 rounded-lg object-cover border-2 border-border/50 shadow-sm"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className={`h-10 w-10 rounded-lg bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-sm font-bold text-white shadow-sm border-2 border-border/50 ${companyLogo ? 'hidden' : 'flex'}`}
                          >
                            {getCompanyInitial(companyName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">{jobTitle}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3 w-3" />
                              {companyName}
                            </div>
                          </div>
                        </div>
                    </td>
                      <td className="px-4 py-4">
                        <Badge 
                          variant={statusVariant(r.status)}
                          className="inline-flex h-7 items-center gap-1.5 px-3 text-xs font-medium shadow-sm"
                        >
                          {r.status === "COMPLETED" && <CheckCircle2 className="h-3 w-3" />}
                          {r.status === "FAILED" && <XCircle className="h-3 w-3" />}
                          {r.status === "EXPIRED" && <Clock className="h-3 w-3" />}
                          {r.status === "SCHEDULED" && <Calendar className="h-3 w-3" />}
                          {r.status === "IN_PROGRESS" && <TrendingUp className="h-3 w-3" />}
                          <span>{r.status}</span>
                        </Badge>
                    </td>
                      <td className="px-4 py-4">
                        {typeof r.overallScore === "number" ? (
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{r.overallScore}</span>
                            <span className="text-xs text-muted-foreground">/ 100</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                    </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            }) : "-"}
                          </span>
                        </div>
                        {r.expiresAt && (
                          <div className="text-xs text-muted-foreground/70 mt-1">
                            Expires: {new Date(r.expiresAt).toLocaleDateString()}
                          </div>
                        )}
                    </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/interviews/${r.id}/feedback`);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/interviews/${r.id}/feedback`);
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                        </div>
                    </td>
                  </tr>
                  );
                })}
                {filtered.length === 0 && (
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
        </CardContent>
      </Card>
    </div>
  );
}


