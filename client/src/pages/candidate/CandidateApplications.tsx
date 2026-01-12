import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { APPLICATION_STATUS_META } from "@/constants/applications";
import { useAuth } from "@clerk/clerk-react";
import { Award, Briefcase, Building2, Calendar, Check, CheckCircle2, Clock, ExternalLink, Eye, Gift, Loader2, MapPin, Search, Video, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { apiClient } from "@/lib/api";

type ApplicationRow = {
  id: string;
  status: string;
  appliedAt: string;
  job?: { 
    id: string; 
    title: string; 
    location?: string | null;
    isRemote?: boolean;
    company?: { 
      name?: string | null;
      logoUrl?: string | null;
      slug?: string | null;
    } | null;
  } | null;
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

const statusVariant = (status: string): "default" | "outline" | "success" => {
  if (status === "HIRED" || status === "OFFER_ACCEPTED" || status === "OFFER_SENT" || status === "SHORTLISTED") return "success";
  if (status === "REJECTED" || status === "OFFER_REJECTED" || status === "WITHDRAWN") return "outline";
  if (status === "APPLIED" || status === "REVIEWING") return "outline";
  return "default";
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


export default function CandidateApplications() {
  const navigate = useNavigate();
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  type OfferType = NonNullable<ApplicationRow["offers"]>[number];
  const [selectedOffer, setSelectedOffer] = useState<OfferType | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [respondingToOffer, setRespondingToOffer] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const [responseAction, setResponseAction] = useState<"accept" | "reject" | null>(null);
  const [withdrawingApplicationId, setWithdrawingApplicationId] = useState<string | null>(null);
  
  // Application detail modal
  const [selectedApplication, setSelectedApplication] = useState<ApplicationRow | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [fullApplicationData, setFullApplicationData] = useState<{
    id: string;
    status: string;
    appliedAt: string;
    updatedAt: string;
    resumeUrl?: string | null;
    coverLetter?: string | null;
    rejectionReason?: string | null;
    history?: Array<{
      id: string;
      status: string;
      changedBy?: string | null;
      note?: string | null;
      createdAt: string;
    }>;
    interviews?: Array<{
      id: string;
      title: string;
      type: string;
      status: string;
      accessCode: string;
      sessionUrl?: string | null;
      expiresAt: string;
      startedAt?: string | null;
      endedAt?: string | null;
      overallScore?: number | null;
      summary?: string | null;
      recommendation?: string | null;
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
  } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleSearch = () => {
    setQ(qInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleWithdrawApplication = async (applicationId: string) => {
    if (!confirm("Are you sure you want to withdraw this application? This action cannot be undone.")) {
      return;
    }

    try {
      setWithdrawingApplicationId(applicationId);
      const token = await getToken();
      if (!token) return;

      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";
      const response = await fetch(`${API_BASE}/applications/${applicationId}/withdraw`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        // Update local state
        setRows((prev) =>
          prev.map((app) =>
            app.id === applicationId ? { ...app, status: "WITHDRAWN" } : app
          )
        );
        // If modal is open, update it too
        if (selectedApplication?.id === applicationId) {
          setSelectedApplication({ ...selectedApplication, status: "WITHDRAWN" });
        }
      } else {
        alert(data.message || "Failed to withdraw application");
      }
    } catch (error) {
      console.error("Failed to withdraw application:", error);
      alert("Failed to withdraw application");
    } finally {
      setWithdrawingApplicationId(null);
    }
  };

  // Handle viewing application detail
  const handleViewApplication = async (application: ApplicationRow) => {
    setSelectedApplication(application);
    setShowApplicationModal(true);
    setLoadingHistory(true);
    
    try {
      const token = await getToken();
      if (!token) return;
      
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";
      
      // Fetch application from CRUD endpoint (which includes history, interviews, offers via include)
      // CRUD endpoint: /applications/:id
      const appRes = await fetch(`${API_BASE}/applications/${application.id}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!appRes.ok) {
        throw new Error(`Failed to fetch application: ${appRes.status} ${appRes.statusText}`);
      }
      
      const appResponse = await appRes.json();
      
      // Extract application from response
      let extractedAppData: {
        id: string;
        status: string;
        appliedAt: string;
        updatedAt: string;
        resumeUrl?: string | null;
        coverLetter?: string | null;
        rejectionReason?: string | null;
        history?: Array<{
          id: string;
          status: string;
          changedBy?: string | null;
          note?: string | null;
          createdAt: string;
        }>;
        interviews?: Array<{
          id: string;
          title: string;
          type: string;
          status: string;
          accessCode: string;
          sessionUrl?: string | null;
          expiresAt: string;
          startedAt?: string | null;
          endedAt?: string | null;
          overallScore?: number | null;
          summary?: string | null;
          recommendation?: string | null;
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
      } | null = null;
      
      if (appResponse?.success && appResponse.data && Array.isArray(appResponse.data)) {
        extractedAppData = appResponse.data.find((app: { id: string }) => app.id === application.id) || appResponse.data[0];
      } else if (appResponse?.success && appResponse.data && !Array.isArray(appResponse.data)) {
        extractedAppData = appResponse.data;
      } else if (appResponse?.data && !Array.isArray(appResponse.data)) {
        extractedAppData = appResponse.data;
      }
      
      if (!extractedAppData) {
        console.error("Application not found in response:", appResponse);
        throw new Error("Application not found");
      }
      
      // History should already be included in appData.history from the filtered endpoint
      // But fetch separately as fallback if needed
      let historyResponse: {
        success?: boolean;
        data?: Array<{
          id: string;
          applicationId?: string;
          status: string;
          changedBy?: string | null;
          note?: string | null;
          createdAt: string;
        }>;
      } | Array<{
        id: string;
        applicationId?: string;
        status: string;
        changedBy?: string | null;
        note?: string | null;
        createdAt: string;
      }> | null = null;
      
      try {
        // Try CRUD endpoint with applicationId filter
        const historyRes = await fetch(`${API_BASE}/application-histories?applicationId=${application.id}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        
        if (historyRes.ok) {
          historyResponse = await historyRes.json();
        } else {
          console.warn("History endpoint returned error:", historyRes.status, historyRes.statusText);
        }
      } catch (error) {
        console.warn("Failed to fetch application history separately:", error);
        // Not critical - we can use history from appData
      }
      
      // Use extracted data
      const appData = extractedAppData;
      
      let history: Array<{
        id: string;
        status: string;
        changedBy?: string | null;
        note?: string | null;
        createdAt: string;
      }> = [];
      
      // Get history from application data if available
      if (appData && typeof appData === 'object' && 'history' in appData && Array.isArray(appData.history)) {
        history = appData.history;
        console.log("History from application endpoint:", {
          count: history.length,
          statuses: history.map(h => h.status),
        });
      }
      
      // Also try to get from separate history endpoint and merge
      if (historyResponse) {
        let historyFromEndpoint: Array<{
          id: string;
          status: string;
          changedBy?: string | null;
          note?: string | null;
          createdAt: string;
        }> = [];
        
        if (Array.isArray(historyResponse)) {
          historyFromEndpoint = historyResponse;
        } else if (historyResponse?.success && Array.isArray(historyResponse.data)) {
          historyFromEndpoint = historyResponse.data;
        } else if (historyResponse && typeof historyResponse === 'object' && 'data' in historyResponse && Array.isArray(historyResponse.data)) {
          historyFromEndpoint = historyResponse.data;
        }
        
        console.log("History from separate endpoint:", {
          count: historyFromEndpoint.length,
          statuses: historyFromEndpoint.map(h => h.status),
        });
        
        // Merge with existing history - use Set to track IDs to avoid duplicates
        const existingIds = new Set(history.map(h => h.id));
        const newHistory = historyFromEndpoint.filter(h => !existingIds.has(h.id));
        history = [...history, ...newHistory];
        
        console.log("Merged history:", {
          total: history.length,
          statuses: history.map(h => h.status),
          sequence: history.map(h => h.status).join(' -> '),
        });
      }
      
      // Remove duplicates by ID and sort by date
      // IMPORTANT: Keep ALL status changes, even if same status appears multiple times
      // Use a combination of status + createdAt as key to preserve all status transitions
      const historyMap = new Map<string, {
        id: string;
        status: string;
        changedBy?: string | null;
        note?: string | null;
        createdAt: string;
      }>();
      
      history.forEach((h) => {
        // Use id as primary key to avoid true duplicates (same record)
        // But keep all records even if they have the same status (different timestamps)
        if (!historyMap.has(h.id)) {
          historyMap.set(h.id, h);
        } else {
          // If duplicate id, keep the one with earlier date (first occurrence)
          const existing = historyMap.get(h.id);
          if (existing && new Date(h.createdAt) < new Date(existing.createdAt)) {
            historyMap.set(h.id, h);
          }
        }
      });
      
      // Sort by date to ensure chronological order
      const uniqueHistory = Array.from(historyMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      // CRITICAL: Verify we have all status transitions
      const statuses = uniqueHistory.map(h => h.status);
      const statusSequence = statuses.join(' -> ');
      console.log("History status sequence:", statusSequence);
      
      // Check for missing intermediate statuses
      const hasReviewing = statuses.includes('REVIEWING');
      const hasShortlisted = statuses.includes('SHORTLISTED');
      const hasInterviewScheduled = statuses.includes('INTERVIEW_SCHEDULED');
      
      if (hasShortlisted && !hasReviewing) {
        console.warn("⚠️ WARNING: Found SHORTLISTED but missing REVIEWING in history!");
        console.warn("This might indicate a missing history record in the database.");
        console.warn("Current application status:", appData?.status || application.status);
      }
      
      if (hasInterviewScheduled && !hasShortlisted && !hasReviewing) {
        console.warn("⚠️ WARNING: Found INTERVIEW_SCHEDULED but missing intermediate statuses!");
      }
      
      // Debug: Log to verify all history records are captured
      console.log("Final History Data:", {
        totalRecords: uniqueHistory.length,
        allStatuses: uniqueHistory.map(h => ({
          id: h.id,
          status: h.status,
          date: h.createdAt,
          note: h.note,
        })),
        statusSequence: uniqueHistory.map(h => h.status).join(' -> '),
      });
      
      // Combine all data - ensure we have all required fields
      const fullData: {
        id: string;
        status: string;
        appliedAt: string;
        updatedAt: string;
        resumeUrl?: string | null;
        coverLetter?: string | null;
        rejectionReason?: string | null;
        history?: Array<{
          id: string;
          status: string;
          changedBy?: string | null;
          note?: string | null;
          createdAt: string;
        }>;
        interviews?: Array<{
          id: string;
          title: string;
          type: string;
          status: string;
          accessCode: string;
          sessionUrl?: string | null;
          expiresAt: string;
          startedAt?: string | null;
          endedAt?: string | null;
          overallScore?: number | null;
          summary?: string | null;
          recommendation?: string | null;
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
      } = {
        id: appData?.id || application.id,
        status: appData?.status || application.status,
        appliedAt: appData?.appliedAt || application.appliedAt,
        updatedAt: appData?.updatedAt || application.appliedAt,
        resumeUrl: appData?.resumeUrl || null,
        coverLetter: appData?.coverLetter || null,
        rejectionReason: appData?.rejectionReason || null,
        history: uniqueHistory,
        interviews: appData?.interviews || [],
        offers: appData?.offers || application.offers || [],
      };
      
      // Debug: Log history to console to verify data
      console.log("Application History Data:", {
        applicationId: application.id,
        currentStatus: fullData.status,
        historyCount: uniqueHistory.length,
        history: uniqueHistory,
        allStatuses: uniqueHistory.map(h => h.status),
        statusSequence: uniqueHistory.map(h => h.status).join(' -> '),
      });
      
      setFullApplicationData(fullData);
    } catch (error) {
      console.error("Failed to load application details:", error);
      // Fallback to basic data
      setFullApplicationData({
        id: application.id,
        status: application.status,
        appliedAt: application.appliedAt,
        updatedAt: application.appliedAt,
        history: [],
        interviews: [],
        offers: application.offers || [],
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    let abort = false;
    const run = async () => {
      if (!isLoaded) return;
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) return;
        const response = await apiClient.getFilteredApplications({ 
          page: 1, 
          pageSize: 300,
          q: q.trim() || undefined,
        }, token);
        if (abort) return;
        if (!response?.success) {
          setError(response?.message || "Failed to load applications");
          setRows([]);
          return;
        }
        setRows((response.data || []) as ApplicationRow[]);
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

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");

  // Client-side filtering only for status and date (search is done on server)
  const filtered = useMemo(() => {
    let result = rows;
    
    // Status filter
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }
    
    // Date filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter((r) => {
        if (!r.appliedAt) return false;
        const appliedDate = new Date(r.appliedAt);
        appliedDate.setHours(0, 0, 0, 0);
        return appliedDate >= fromDate;
      });
    }
    
    return result;
  }, [rows, statusFilter, dateFrom]);

  // Statistics
  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => r.status === "APPLIED" || r.status === "REVIEWING").length;
    const inProgress = rows.filter((r) => 
      r.status === "SHORTLISTED" || r.status === "INTERVIEW_SCHEDULED" || r.status === "INTERVIEWED"
    ).length;
    const successful = rows.filter((r) => r.status === "HIRED" || r.status === "OFFER_ACCEPTED" || r.status === "OFFER_SENT").length;
    const rejected = rows.filter((r) => r.status === "REJECTED" || r.status === "WITHDRAWN").length;
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : "0";
    
    return { total, pending, inProgress, successful, rejected, successRate };
  }, [rows]);

  // const topCompanies = useMemo(() => {
  //   const counts: Record<string, number> = {};
  //   rows.forEach((r) => {
  //     const company = r.job?.company?.name || "Unknown";
  //     counts[company] = (counts[company] ?? 0) + 1;
  //   });
  //   return Object.entries(counts)
  //     .map(([name, value]) => ({ name, value }))
  //     .sort((a, b) => b.value - a.value)
  //     .slice(0, 5);
  // }, [rows]);

  // Monthly trend (last 6 months)
  // const monthlyTrend = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      months[key] = 0;
    }
    
    rows.forEach((r) => {
      if (!r.appliedAt) return;
      const date = new Date(r.appliedAt);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (key in months) {
        months[key] = (months[key] || 0) + 1;
      }
    });
    
  //   return Object.entries(months).map(([month, count]) => ({ month, count }));
  // }, [rows]);

  // Application funnel
  // const applicationFunnel = useMemo(() => {
  //   const stages = [
  //     { name: "Applied", statuses: ["APPLIED"] },
  //     { name: "Reviewing", statuses: ["REVIEWING"] },
  //     { name: "Shortlisted", statuses: ["SHORTLISTED"] },
  //     { name: "Interview", statuses: ["INTERVIEW_SCHEDULED", "INTERVIEWED"] },
  //     { name: "Offer", statuses: ["OFFER_SENT"] },
  //     { name: "Hired", statuses: ["HIRED"] },
  //   ];
  //   
  //   return stages.map((stage) => {
  //     const count = rows.filter((r) => stage.statuses.includes(r.status)).length;
  //     return { name: stage.name, value: count };
  //   }).filter((s) => s.value > 0);
  // }, [rows]);

  // Status progression (showing transitions)
  // const _statusBreakdown = useMemo(() => {
  //   const statusOrder = [
  //     "APPLIED",
  //     "REVIEWING", 
  //     "SHORTLISTED",
  //     "INTERVIEW_SCHEDULED",
  //     "INTERVIEWED",
  //     "OFFER_SENT",
  //     "HIRED",
  //     "REJECTED",
  //     "WITHDRAWN"
  //   ];
  //   
  //   return statusOrder.map((status) => {
  //     const count = rows.filter((r) => r.status === status).length;
  //     return { status, count };
  //   }).filter((s) => s.count > 0);
  // }, [rows]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
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
          <CardTitle>Applications</CardTitle>
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
        <Card className="border-dashed border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 via-background to-background dark:from-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
            <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Applications</div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 via-background to-background dark:from-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</div>
            <div className="text-xs text-amber-600/70 dark:text-amber-400/70">Awaiting review</div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/50 via-background to-background dark:from-cyan-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-500" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.inProgress}</div>
            <div className="text-xs text-cyan-600/70 dark:text-cyan-400/70">Active process</div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 via-background to-background dark:from-emerald-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <CheckCircle2 className="h-4 w-4" />
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.successful}</div>
            <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{stats.successRate}% success rate</div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50/50 via-background to-background dark:from-rose-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-rose-500" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.rejected}</div>
            <div className="text-xs text-rose-600/70 dark:text-rose-400/70">Not selected</div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50/20 via-background to-background dark:from-slate-950/5">
        <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg text-slate-700 dark:text-slate-300">All Applications</CardTitle>
            <div className="text-sm text-slate-600 dark:text-slate-400">{filtered.length} items</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 my-2">
          {/* Search and Filters */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative flex gap-2">
              <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  value={qInput} 
                  onChange={(e) => setQInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-9" 
                  placeholder="Search by job or company…" 
                />
              </div>
              <Button onClick={handleSearch} size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All Status</option>
              {Object.keys(APPLICATION_STATUS_META).map((status) => (
                <option key={status} value={status}>
                  {APPLICATION_STATUS_META[status as keyof typeof APPLICATION_STATUS_META].label}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Applied from"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/50 bg-card">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Job
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Company
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      Status
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Applied
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((r, index) => {
                  const status = String(r.status);
                  const meta = APPLICATION_STATUS_META[status as keyof typeof APPLICATION_STATUS_META] || APPLICATION_STATUS_META.APPLIED;
                  const StatusIcon = meta.Icon;
                  const companyName = r.job?.company?.name || "Unknown";
                  const companyLogo = r.job?.company?.logoUrl;
                  
                  return (
                    <tr 
                      key={r.id} 
                      className="group hover:bg-gradient-to-r hover:from-primary/5 hover:via-primary/3 hover:to-transparent transition-all cursor-pointer border-b border-border/30"
                      onClick={() => handleViewApplication(r)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {r.job?.title || "Unknown job"}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              {r.job?.isRemote && (
                                <Badge variant="outline" className="gap-1 text-xs px-1.5 py-0 h-5">
                                  <MapPin className="h-3 w-3" />
                                  Remote
                                </Badge>
                              )}
                              {r.job?.location && !r.job.isRemote && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {r.job.location}
                                </span>
                              )}
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
                            <div className="font-medium text-foreground">{companyName}</div>
                            {r.job?.company?.slug && (
                              <div className="text-xs text-muted-foreground">@{r.job.company.slug}</div>
                            )}
                          </div>
                        </div>
                    </td>
                      <td className="px-4 py-4">
                        <Badge 
                          variant={statusVariant(status)}
                          className="inline-flex h-7 items-center gap-1.5 px-3 text-xs font-medium shadow-sm"
                        >
                          <StatusIcon className="h-3 w-3" />
                          <span>{meta.label}</span>
                        </Badge>
                    </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">
                            {r.appliedAt ? new Date(r.appliedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            }) : "-"}
                          </span>
                        </div>
                        {r.appliedAt && (
                          <div className="text-xs text-muted-foreground/70 mt-1">
                            {new Date(r.appliedAt).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        )}
                    </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                      {r.job?.id ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewApplication(r);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                              {r.job?.id && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="gap-1.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/jobs/${r.job?.id}`);
                                  }}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </>
                      ) : null}
                        </div>
                    </td>
                  </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="text-muted-foreground font-medium">No applications found</div>
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

      {/* Application Detail Modal */}
      <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
        <DialogContent className="max-w-7xl w-[95vw] min-w-[1200px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Application Details
            </DialogTitle>
            <DialogDescription>
              View the timeline and status of your application
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6">
              {/* Job Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Job Title</div>
                  <div className="text-lg font-semibold">{selectedApplication.job?.title || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Company</div>
                  <div className="text-lg font-semibold flex items-center gap-2">
                    {selectedApplication.job?.company?.logoUrl && (
                      <img 
                        src={selectedApplication.job.company.logoUrl} 
                        alt={selectedApplication.job.company.name || "Company"}
                        className="h-6 w-6 rounded"
                      />
                    )}
                    {selectedApplication.job?.company?.name || "Unknown"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Current Status</div>
                  <Badge variant={statusVariant(selectedApplication.status)} className="text-sm">
                    {APPLICATION_STATUS_META[selectedApplication.status as keyof typeof APPLICATION_STATUS_META]?.label || selectedApplication.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Applied Date</div>
                  <div className="text-sm">{new Date(selectedApplication.appliedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <div className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Application Timeline
                </div>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                    
                    {/* Build complete timeline with all events */}
                    {fullApplicationData && (() => {
                      const timelineEvents: Array<{
                        id: string;
                        type: 'application' | 'history' | 'interview' | 'offer';
                        title: string;
                        description?: string;
                        status?: string;
                        date: string;
                        icon: React.ReactNode;
                        color: string;
                        note?: string;
                        metadata?: {
                          id?: string;
                          title?: string;
                          type?: string;
                          status?: string;
                          overallScore?: number | null;
                          recommendation?: string | null;
                          expirationDate?: string;
                          [key: string]: unknown;
                        };
                      }> = [];

                      // Helper function to get status color
                      const getStatusColor = (status: string): string => {
                        if (status === "HIRED" || status === "OFFER_ACCEPTED") {
                          return 'bg-green-500 text-white';
                        } else if (status === "REJECTED" || status === "OFFER_REJECTED") {
                          return 'bg-red-500 text-white';
                        } else if (status === "REVIEWING") {
                          return 'bg-amber-500 text-white';
                        } else if (status === "SHORTLISTED") {
                          return 'bg-purple-500 text-white';
                        } else if (status === "INTERVIEW_SCHEDULED" || status === "INTERVIEWED") {
                          return 'bg-cyan-500 text-white';
                        } else if (status === "OFFER_SENT") {
                          return 'bg-yellow-500 text-white';
                        }
                        return 'bg-primary text-primary-foreground';
                      };

                      // 1. Application submitted - Always show this first
                      timelineEvents.push({
                        id: 'application-submitted',
                        type: 'application',
                        title: 'Application Submitted',
                        status: 'APPLIED',
                        date: fullApplicationData.appliedAt,
                        icon: <CheckCircle2 className="h-4 w-4" />,
                        color: 'bg-primary text-primary-foreground',
                      });

                      // 2. Add ALL status changes from history (keep all, don't deduplicate)
                      // This ensures we show: Applied -> Reviewing -> Shortlisted -> Interview Scheduled, etc.
                      if (fullApplicationData.history && fullApplicationData.history.length > 0) {
                        // Sort history by date to ensure chronological order
                        const sortedHistory = [...fullApplicationData.history].sort(
                          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                        );
                        
                        console.log("Processing history for timeline:", {
                          totalRecords: sortedHistory.length,
                          records: sortedHistory.map(h => ({
                            id: h.id,
                            status: h.status,
                            date: h.createdAt,
                            note: h.note,
                          })),
                          statusSequence: sortedHistory.map(h => h.status).join(' -> '),
                        });
                        
                        sortedHistory.forEach((history, index) => {
                          // Skip if status is APPLIED and date is same as initial application
                          if (history.status === 'APPLIED') {
                            const appliedDate = new Date(fullApplicationData.appliedAt).getTime();
                            const historyDate = new Date(history.createdAt).getTime();
                            // Only skip if it's the same date as initial application (within 1 second)
                            if (Math.abs(appliedDate - historyDate) < 1000) {
                              console.log(`Skipping duplicate APPLIED at index ${index}:`, history);
                              return;
                            }
                          }
                          
                          const meta = APPLICATION_STATUS_META[history.status as keyof typeof APPLICATION_STATUS_META] || APPLICATION_STATUS_META.APPLIED;
                          const StatusIcon = meta.Icon;
                          
                          console.log(`Adding timeline event ${index + 1}/${sortedHistory.length}:`, {
                            id: history.id,
                            status: history.status,
                            date: history.createdAt,
                            title: meta.label,
                          });
                          
                          timelineEvents.push({
                            id: history.id,
                            type: 'history',
                            title: meta.label,
                            status: history.status,
                            date: history.createdAt,
                            icon: <StatusIcon className="h-4 w-4" />,
                            color: getStatusColor(history.status),
                            note: history.note || undefined,
                          });
                        });
                        
                        // Debug: Log timeline events after adding history
                        console.log("Timeline Events after adding history:", {
                          totalEvents: timelineEvents.length,
                          events: timelineEvents.map(e => ({
                            id: e.id,
                            type: e.type,
                            status: e.status,
                            title: e.title,
                            date: e.date,
                          })),
                          statusSequence: timelineEvents.map(e => e.status).join(' -> '),
                        });
                      }
                      
                      // 3. Check if current status is missing from timeline
                      // This handles cases where status was updated but no history record was created
                      const statusesInTimeline = new Set(timelineEvents.map(e => e.status).filter(Boolean));
                      const currentStatus = fullApplicationData.status;
                      
                      if (currentStatus && currentStatus !== 'APPLIED' && !statusesInTimeline.has(currentStatus)) {
                        const meta = APPLICATION_STATUS_META[currentStatus as keyof typeof APPLICATION_STATUS_META] || APPLICATION_STATUS_META.APPLIED;
                        const StatusIcon = meta.Icon;
                        
                        // Use updatedAt as date, or if that's before the last event, use last event date + 1ms
                        let statusDate = fullApplicationData.updatedAt || fullApplicationData.appliedAt;
                        if (timelineEvents.length > 0) {
                          const lastEventDate = new Date(timelineEvents[timelineEvents.length - 1].date).getTime();
                          const updatedAtTime = new Date(statusDate).getTime();
                          if (updatedAtTime <= lastEventDate) {
                            statusDate = new Date(lastEventDate + 1).toISOString();
                          }
                        }
                        
                        timelineEvents.push({
                          id: `current-status-${currentStatus}-${Date.now()}`,
                          type: 'history',
                          title: meta.label,
                          status: currentStatus,
                          date: statusDate,
                          icon: <StatusIcon className="h-4 w-4" />,
                          color: getStatusColor(currentStatus),
                        });
                      }

                      // 3. Interview events
                      if (fullApplicationData.interviews && fullApplicationData.interviews.length > 0) {
                        fullApplicationData.interviews.forEach((interview) => {
                          timelineEvents.push({
                            id: interview.id,
                            type: 'interview',
                            title: interview.title || 'Interview',
                            description: `${interview.type} - ${interview.status}`,
                            date: interview.createdAt,
                            icon: <Video className="h-4 w-4" />,
                            color: interview.status === 'COMPLETED' ? 'bg-blue-500 text-white' : 'bg-cyan-500 text-white',
                            metadata: interview,
                          });
                        });
                      }

                      // 4. Offer events
                      if (fullApplicationData.offers && fullApplicationData.offers.length > 0) {
                        fullApplicationData.offers.forEach((offer) => {
                          timelineEvents.push({
                            id: offer.id,
                            type: 'offer',
                            title: offer.title || 'Job Offer',
                            description: offer.salaryMin && offer.salaryMax 
                              ? `${offer.salaryCurrency} ${offer.salaryMin.toLocaleString()} - ${offer.salaryMax.toLocaleString()}`
                              : undefined,
                            status: offer.status,
                            date: offer.sentAt,
                            icon: <Gift className="h-4 w-4" />,
                            color: offer.status === 'ACCEPTED' ? 'bg-green-500 text-white' : offer.status === 'REJECTED' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white',
                            note: offer.responseNote || undefined,
                            metadata: offer,
                          });
                        });
                      }

                      // Sort by date
                      timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                      return (
                        <div className="space-y-6">
                          {timelineEvents.map((event, index) => {
                            const isLast = index === timelineEvents.length - 1;
                            return (
                              <div key={event.id} className="relative flex gap-4">
                                <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${event.color}`}>
                                  {event.icon}
                                </div>
                                <div className={`flex-1 space-y-1 ${!isLast ? 'pb-6' : ''}`}>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold">{event.title}</span>
                                    {event.status && (
                                      <Badge variant={statusVariant(event.status)} className="text-xs">
                                        {APPLICATION_STATUS_META[event.status as keyof typeof APPLICATION_STATUS_META]?.label || event.status}
                                      </Badge>
                                    )}
                                  </div>
                                  {event.description && (
                                    <div className="text-sm text-muted-foreground">{event.description}</div>
                                  )}
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(event.date).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                  {event.note && (
                                    <div className="text-sm text-muted-foreground/80 mt-1 p-2 bg-muted rounded">
                                      {event.note}
                                    </div>
                                  )}
                                  {event.type === 'interview' && event.metadata && (
                                    <div className="mt-2 space-y-1">
                                      {event.metadata.overallScore !== null && event.metadata.overallScore !== undefined && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Award className="h-3 w-3" />
                                          Score: {event.metadata.overallScore}/100
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {event.type === 'offer' && event.metadata && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      {event.metadata.expirationDate && (
                                        <div>Expires: {new Date(event.metadata.expirationDate).toLocaleDateString()}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {timelineEvents.length === 0 && (
                            <div className="text-sm text-muted-foreground pl-12">
                              No timeline events yet. Your application is being reviewed.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Active Offers Section */}
              {fullApplicationData && fullApplicationData.offers && fullApplicationData.offers.length > 0 && (
                <div>
                  <div className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Gift className="h-5 w-5 text-yellow-600" />
                    Job Offers
                  </div>
                  <div className="space-y-4">
                    {fullApplicationData.offers.map((offer) => {
                      const isPending = offer.status === "PENDING";
                      const isAccepted = offer.status === "ACCEPTED";
                      const isRejected = offer.status === "REJECTED";
                      
                      return (
                        <Card 
                          key={offer.id} 
                          className={`border-2 transition-all ${
                            isPending 
                              ? "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/10 hover:border-yellow-600" 
                              : isAccepted
                              ? "border-green-500 bg-green-50/50 dark:bg-green-950/10"
                              : isRejected
                              ? "border-red-500 bg-red-50/50 dark:bg-red-950/10 opacity-60"
                              : "border-gray-300 dark:border-gray-700 opacity-60"
                          }`}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-lg font-semibold">{offer.title}</h3>
                                  <Badge 
                                    variant={
                                      isPending ? "default" : 
                                      isAccepted ? "success" : 
                                      "outline"
                                    }
                                  >
                                    {offer.status}
                                  </Badge>
                                </div>
                                
                                {offer.salaryMin !== null && offer.salaryMin !== undefined && 
                                 offer.salaryMax !== null && offer.salaryMax !== undefined && (
                                  <div>
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Salary</div>
                                    <div className="text-xl font-bold text-green-600">
                                      {offer.salaryCurrency} {offer.salaryMin.toLocaleString()} - {offer.salaryMax.toLocaleString()}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  {offer.employmentType && (
                                    <div>
                                      <div className="text-muted-foreground">Employment Type</div>
                                      <div className="font-medium">{offer.employmentType}</div>
                                    </div>
                                  )}
                                  {offer.location && (
                                    <div>
                                      <div className="text-muted-foreground">Location</div>
                                      <div className="font-medium flex items-center gap-1">
                                        {offer.isRemote && <span className="text-xs">🌐 Remote</span>}
                                        {offer.location}
                                      </div>
                                    </div>
                                  )}
                                  {offer.startDate && (
                                    <div>
                                      <div className="text-muted-foreground">Start Date</div>
                                      <div className="font-medium">
                                        {new Date(offer.startDate).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric'
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {offer.expirationDate && (
                                    <div>
                                      <div className="text-muted-foreground">Expires</div>
                                      <div className={`font-medium ${
                                        new Date(offer.expirationDate) < new Date() 
                                          ? "text-red-600" 
                                          : "text-orange-600"
                                      }`}>
                                        {new Date(offer.expirationDate).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric'
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {offer.description && (
                                  <div>
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                                    <div className="text-sm text-muted-foreground line-clamp-3">{offer.description}</div>
                                  </div>
                                )}
                                
                                {offer.benefits && (
                                  <div>
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Benefits</div>
                                    <div className="text-sm text-muted-foreground line-clamp-2">{offer.benefits}</div>
                                  </div>
                                )}
                                
                                {offer.responseNote && (
                                  <div className="mt-2 p-2 bg-muted rounded">
                                    <div className="text-xs font-medium text-muted-foreground mb-1">Your Response</div>
                                    <div className="text-sm">{offer.responseNote}</div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col gap-2">
                                {isPending && (
                                  <Button
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => {
                                      setSelectedOffer(offer);
                                      setResponseAction("accept");
                                      setShowOfferModal(true);
                                    }}
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Accept
                                  </Button>
                                )}
                                {isPending && (
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedOffer(offer);
                                      setResponseAction("reject");
                                      setShowOfferModal(true);
                                    }}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOffer(offer);
                                    setShowOfferModal(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  {selectedApplication.status !== "WITHDRAWN" && 
                   selectedApplication.status !== "HIRED" && 
                   selectedApplication.status !== "OFFER_ACCEPTED" && 
                   selectedApplication.status !== "REJECTED" && (
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
                      onClick={() => handleWithdrawApplication(selectedApplication.id)}
                      disabled={withdrawingApplicationId === selectedApplication.id}
                    >
                      {withdrawingApplicationId === selectedApplication.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Withdrawing...
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Withdraw Application
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedApplication.job?.id && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowApplicationModal(false);
                        navigate(`/jobs/${selectedApplication.job?.id}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Job Details
                    </Button>
                  )}
                  <Button onClick={() => setShowApplicationModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Offer Detail Modal */}
      <Dialog open={showOfferModal} onOpenChange={setShowOfferModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-600" />
              Job Offer
            </DialogTitle>
            <DialogDescription>
              Review the offer details and respond by the expiration date
            </DialogDescription>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Offer Title</div>
                  <div className="text-lg font-semibold">{selectedOffer.title}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <Badge
                    variant={selectedOffer.status === "PENDING" ? "default" : selectedOffer.status === "ACCEPTED" ? "success" : "outline"}
                  >
                    {selectedOffer.status}
                  </Badge>
                </div>
              </div>

              {selectedOffer.salaryMin !== null && selectedOffer.salaryMin !== undefined && selectedOffer.salaryMax !== null && selectedOffer.salaryMax !== undefined && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Salary</div>
                  <div className="text-xl font-bold text-green-600">
                    {selectedOffer.salaryCurrency} {selectedOffer.salaryMin.toLocaleString()} - {selectedOffer.salaryMax.toLocaleString()}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedOffer.employmentType && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Employment Type</div>
                    <div>{selectedOffer.employmentType}</div>
                  </div>
                )}
                {selectedOffer.startDate && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Start Date</div>
                    <div>{new Date(selectedOffer.startDate).toLocaleDateString()}</div>
                  </div>
                )}
                {selectedOffer.location && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Location</div>
                    <div>{selectedOffer.location}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Remote</div>
                  <div>{selectedOffer.isRemote ? "Yes" : "No"}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Expiration Date</div>
                <div className={`text-lg font-semibold ${new Date(selectedOffer.expirationDate) < new Date() ? "text-red-600" : ""}`}>
                  {new Date(selectedOffer.expirationDate).toLocaleDateString()}
                  {new Date(selectedOffer.expirationDate) < new Date() && (
                    <span className="ml-2 text-sm text-red-600">(Expired)</span>
                  )}
                </div>
              </div>

              {selectedOffer.description && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Description</div>
                  <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                    {selectedOffer.description}
                  </div>
                </div>
              )}

              {selectedOffer.benefits && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Benefits</div>
                  <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                    {selectedOffer.benefits}
                  </div>
                </div>
              )}

              {selectedOffer.terms && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Terms & Conditions</div>
                  <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                    {selectedOffer.terms}
                  </div>
                </div>
              )}

              {selectedOffer.status === "PENDING" && new Date(selectedOffer.expirationDate) >= new Date() && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <div className="text-sm font-medium mb-2">Response Note (Optional)</div>
                    <Textarea
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      placeholder="Add any comments or questions about this offer..."
                      rows={3}
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowOfferModal(false);
                        setResponseNote("");
                        setResponseAction(null);
                      }}
                      disabled={respondingToOffer}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!selectedOffer || !getToken) return;
                        try {
                          setRespondingToOffer(true);
                          setResponseAction("reject");
                          const token = await getToken();
                          if (!token) return;
                          const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";
                          const response = await fetch(`${API_BASE}/offers/${selectedOffer.id}/reject`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ responseNote: responseNote || null }),
                          });
                          const data = await response.json();
                          if (data.success) {
                            setShowOfferModal(false);
                            window.location.reload();
                          } else {
                            alert(data.message || "Failed to reject offer");
                          }
                        } catch {
                          alert("Failed to reject offer");
                        } finally {
                          setRespondingToOffer(false);
                          setResponseAction(null);
                        }
                      }}
                      disabled={respondingToOffer}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {respondingToOffer && responseAction === "reject" ? "Rejecting..." : "Reject Offer"}
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!selectedOffer || !getToken) return;
                        try {
                          setRespondingToOffer(true);
                          setResponseAction("accept");
                          const token = await getToken();
                          if (!token) return;
                          const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";
                          const response = await fetch(`${API_BASE}/offers/${selectedOffer.id}/accept`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ responseNote: responseNote || null }),
                          });
                          const data = await response.json();
                          if (data.success) {
                            setShowOfferModal(false);
                            window.location.reload();
                          } else {
                            alert(data.message || "Failed to accept offer");
                          }
                        } catch {
                          alert("Failed to accept offer");
                        } finally {
                          setRespondingToOffer(false);
                          setResponseAction(null);
                        }
                      }}
                      disabled={respondingToOffer}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {respondingToOffer && responseAction === "accept" ? "Accepting..." : "Accept Offer"}
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {selectedOffer.status !== "PENDING" && (
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Response</div>
                  {selectedOffer.responseNote && (
                    <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md mb-2">
                      {selectedOffer.responseNote}
                    </div>
                  )}
                  {selectedOffer.respondedAt && (
                    <div className="text-xs text-muted-foreground">
                      Responded on: {new Date(selectedOffer.respondedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


