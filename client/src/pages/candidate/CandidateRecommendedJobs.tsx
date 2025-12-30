import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useMembership } from "@/hooks/useMembership";
import { apiClient, type Job, type JobType, type MatchResult } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import { AlertCircle, ArrowRight, Briefcase, CheckCircle2, Crown, ExternalLink, Filter, LayoutGrid, Lightbulb, Loader2, MapPin, Search, Sparkles, Table, TrendingUp, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

/**
 * Candidate Recommended Jobs Page
 * 
 * Displays AI-powered job recommendations based on CV-Job matching algorithm.
 * Shows match scores, breakdown, and actionable suggestions for each job.
 * Supports both grid and table view modes with comprehensive filtering.
 */
export default function CandidateRecommendedJobs() {
  const navigate = useNavigate();
  const { getToken, userId } = useAuth();
  const { isVIP, loading: membershipLoading } = useMembership();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [missingProfileItems, setMissingProfileItems] = useState<string[]>([]);
  
  // View mode and filters
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    const saved = localStorage.getItem("recommended-jobs-view-mode");
    return (saved === "table" || saved === "grid") ? saved : "grid";
  });
  const [showFilters, setShowFilters] = useState(false);
  const [minMatchScore, setMinMatchScore] = useState(0);
  const [maxMatchScore, setMaxMatchScore] = useState(100);
  const [locationFilter, setLocationFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState<JobType | "">("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "recent" | "title">("score");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        console.log("Auth token:", token ? "present" : "missing");
        console.log("User ID:", userId);
        if (!token || !userId) {
          setError("Authentication required. Please log in.");
          setLoading(false);
          return;
        }

        // Get candidate profile ID from /auth/me
        const meResponse = await apiClient.getMe(token);
        
        if (!meResponse.success) {
          setError(meResponse.message || "Failed to authenticate. Please try logging in again.");
          setLoading(false);
          return;
        }


        // Backend /auth/me returns data directly in response, not wrapped in .data
        // Check both meResponse.data (if normalized) and meResponse directly
        const responseData = meResponse.data || meResponse as any;
        const candidateProfile = responseData?.candidateProfile;
        let profileId: string | null = null;
        
        if (!candidateProfile?.id) {
          // No candidateProfile - check role to determine if we should create one
          const userRole = meResponse.data?.role;
          
          // Only reject if role is explicitly NOT candidate
          if (userRole && userRole !== "CANDIDATE" && userRole !== "candidate" && userRole !== undefined && userRole !== null) {
            setError(`This page is only available for candidates. Your role: ${userRole}`);
            setLoading(false);
            return;
          }
          
          // If role is CANDIDATE or not specified, try to sync/create profile
          // Try to sync candidate profile (this will create it if missing)
          try {
            const syncResponse = await apiClient.syncCandidate(token);
            if (syncResponse.success && syncResponse.data?.user?.candidateProfile?.id) {
              profileId = syncResponse.data.user.candidateProfile.id;
              setCandidateId(profileId);
            } else {
              // Even if sync fails, try to get profile ID from me response again
              // Sometimes the profile gets created but not returned in sync response
              const retryMeResponse = await apiClient.getMe(token);
              const retryResponseData = retryMeResponse.data || retryMeResponse as any;
              if (retryMeResponse.success && retryResponseData?.candidateProfile?.id) {
                profileId = retryResponseData.candidateProfile.id;
                setCandidateId(profileId);
              } else {
                setError(
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold mb-2">Your candidate profile has not been created yet.</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        To get job recommendations, you need to set up your profile first.
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate("/candidate/profile")}
                      className="w-full sm:w-auto"
                    >
                      Go to Profile Page to Set Up
                    </Button>
                  </div>
                );
                setLoading(false);
                return;
              }
            }
          } catch {
            // Try one more time to get profile
            try {
              const retryMeResponse = await apiClient.getMe(token);
              const retryResponseData = retryMeResponse.data || retryMeResponse as any;
              if (retryMeResponse.success && retryResponseData?.candidateProfile?.id) {
                profileId = retryResponseData.candidateProfile.id;
                setCandidateId(profileId);
              } else {
                setError(
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold mb-2">Your candidate profile has not been created yet.</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        To get job recommendations, you need to set up your profile first.
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate("/candidate/profile")}
                      className="w-full sm:w-auto"
                    >
                      Go to Profile Page to Set Up
                    </Button>
                  </div>
                );
                setLoading(false);
                return;
              }
            } catch {
              setError(
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold mb-2">Your candidate profile has not been created yet.</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      To get job recommendations, you need to set up your profile first.
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate("/candidate/profile")}
                    className="w-full sm:w-auto"
                  >
                    Go to Profile Page to Set Up
                  </Button>
                </div>
              );
              setLoading(false);
              return;
            }
          }
        } else {
          // Profile exists, check what's missing
          profileId = candidateProfile.id;
          setCandidateId(profileId);
          
          // Check what's missing in the profile for better recommendations
          const missingItems: string[] = [];
          
          if (!(candidateProfile as any).skills || (candidateProfile as any).skills.length === 0) {
            missingItems.push("Skills");
          }
          if (!(candidateProfile as any).experiences || (candidateProfile as any).experiences.length === 0) {
            missingItems.push("Work Experience");
          }
          if (!candidateProfile.headline) {
            missingItems.push("Headline/Job Title");
          }
          
          // Store missing items to show in UI
          setMissingProfileItems(missingItems);
        }

        if (!profileId) {
          setError("Candidate profile not found. Please complete your profile first.");
          setLoading(false);
          return;
        }

        // Get matching jobs
        // Note: Matching will work even with empty profile (just lower scores)
        const matchResponse = await apiClient.getMatchingJobs(profileId, 50, token);
        
        // Check membership status from API response
        if (matchResponse.success) {
          // Membership status handled elsewhere
        }
        
        if (!matchResponse.success) {
          // If matching fails, check what's missing in profile
          const errorMsg = matchResponse.message || "Failed to load job recommendations";
          
          // Fetch profile details to show what's missing
          try {
            const profileCheck = await apiClient.getMe(token);
            const profileCheckData = profileCheck.data || profileCheck as any;
            const profile = profileCheckData?.candidateProfile;
            
            if (profile) {
              const missingItems: string[] = [];
              
              if (!(profile as any).skills || (profile as any).skills.length === 0) {
                missingItems.push("Skills");
              }
              if (!(profile as any).experiences || (profile as any).experiences.length === 0) {
                missingItems.push("Work Experience");
              }
              if (!profile.headline) {
                missingItems.push("Headline/Job Title");
              }
              
              if (missingItems.length > 0 && (errorMsg.includes("not found") || errorMsg.includes("Candidate"))) {
                setError(
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold mb-2">Your profile is incomplete. Missing information:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-2 text-left">
                        {missingItems.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                      <p className="text-sm text-muted-foreground">
                        Add this information to get better job recommendations with accurate match scores.
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate("/candidate/profile")}
                      className="w-full sm:w-auto"
                    >
                      Complete Your Profile
                    </Button>
                  </div>
                );
              } else {
                setError(errorMsg);
              }
            } else {
              setError(errorMsg);
            }
          } catch {
            setError(errorMsg);
          }
          
          setLoading(false);
          return;
        }

        setMatches(matchResponse.data || []);

        // Fetch full job details for each match
        const jobIds = (matchResponse.data || []).map((m) => m.jobId);
        const jobPromises = jobIds.map((jobId) =>
          apiClient.getJob(jobId, token).catch(() => null)
        );
        const jobResponses = await Promise.all(jobPromises);
        const jobsMap: Record<string, Job> = {};
        jobResponses.forEach((response) => {
          if (response?.success && response.data) {
            jobsMap[response.data.id] = response.data;
          }
        });
        setJobs(jobsMap);
      } catch (error) {
        console.error("Error loading recommendations:", error);
        setError(`Failed to load recommendations: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getToken, userId]);

  // Debug: Log current state
  console.log("CandidateRecommendedJobs state:", { userId, candidateId, matches, loading, error });

  // Filter and sort matches
  const filteredMatches = useMemo(() => {
    let filtered = matches.filter((match) => {
      // Match score filter
      if ((match.matchScore || 0) < minMatchScore || (match.matchScore || 0) > maxMatchScore) {
        return false;
      }

      const job = jobs[match.jobId];
      if (!job) return false;

      // Location filter
      if (locationFilter) {
        const jobLocation = job.isRemote ? "Remote" : (job.location || "").toLowerCase();
        if (!jobLocation.includes(locationFilter.toLowerCase())) {
          return false;
        }
      }

      // Job type filter
      if (jobTypeFilter && job.type !== jobTypeFilter) {
        return false;
      }

      // Company filter
      if (companyFilter && job.company?.name) {
        if (!job.company.name.toLowerCase().includes(companyFilter.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    // Sort
    if (sortBy === "score") {
      filtered = filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    } else if (sortBy === "recent") {
      filtered = filtered.sort((a, b) => {
        const jobA = jobs[a.jobId];
        const jobB = jobs[b.jobId];
        const timeA = jobA?.createdAt ? new Date(jobA.createdAt).getTime() : 0;
        const timeB = jobB?.createdAt ? new Date(jobB.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    } else if (sortBy === "title") {
      filtered = filtered.sort((a, b) => a.jobTitle.localeCompare(b.jobTitle));
    }

    return filtered;
  }, [matches, jobs, minMatchScore, maxMatchScore, locationFilter, jobTypeFilter, companyFilter, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [minMatchScore, maxMatchScore, locationFilter, jobTypeFilter, companyFilter, sortBy]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredMatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageJobs = filteredMatches.slice(startIndex, endIndex);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreVariant = (score: number): "default" | "outline" | "success" => {
    if (score >= 80) return "success";
    if (score >= 60) return "default";
    if (score >= 40) return "outline";
    return "outline";
  };

  const handleViewModeChange = (mode: "grid" | "table") => {
    setViewMode(mode);
    localStorage.setItem("recommended-jobs-view-mode", mode);
  };

  const clearFilters = () => {
    setMinMatchScore(0);
    setMaxMatchScore(100);
    setLocationFilter("");
    setJobTypeFilter("");
    setCompanyFilter("");
    setSortBy("score");
  };

  const hasActiveFilters = minMatchScore > 0 || maxMatchScore < 100 || locationFilter || jobTypeFilter || companyFilter || sortBy !== "score";


  const jobTypeLabels: Record<JobType, string> = {
    FULL_TIME: "Full Time",
    PART_TIME: "Part Time",
    CONTRACT: "Contract",
    FREELANCE: "Freelance",
    INTERNSHIP: "Internship",
    REMOTE: "Remote",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading job recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {typeof error === "string" ? error : error}
        </AlertDescription>
      </Alert>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No recommendations yet</h3>
        {missingProfileItems.length > 0 ? (
          <div className="space-y-3 max-w-md mx-auto">
            <p className="text-muted-foreground mb-2">
              To get personalized job recommendations, please complete your profile by adding:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4 text-left inline-block">
              {missingProfileItems.map((item, idx) => (
                <li key={idx} className="text-left">{item}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mb-4">
              Adding this information will help us match you with better job opportunities.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground mb-4">
            There are no matching jobs available at the moment. Try again later or adjust your search criteria.
          </p>
        )}
        <Button onClick={() => navigate("/candidate/profile")}>
          {missingProfileItems.length > 0 ? "Complete Profile" : "View Profile"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Recommended Jobs
          </h1>
          <p className="text-muted-foreground mt-2">
            Jobs matched to your profile based on skills, experience, and qualifications
          </p>
        </div>
      </div>

      {/* Profile completeness warning */}
      {missingProfileItems.length > 0 && matches.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                Your profile is incomplete. To get better job recommendations, please add:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                {missingProfileItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/candidate/profile")}
                className="mt-2 border-yellow-300 text-yellow-900 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-100 dark:hover:bg-yellow-900/30"
              >
                Complete Your Profile
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* VIP Upgrade Alert for FREE Members */}
      {!isVIP && !loading && !membershipLoading && matches.length > 0 && (
        <Alert className="border-primary/50 bg-primary/5">
          <Crown className="h-4 w-4 text-primary" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">
                  Limited access to job recommendations
                </p>
                <p className="text-sm text-muted-foreground">
                  Upgrade to VIP to see all matches with detailed insights, skill breakdowns, and improvement suggestions.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate("/candidate/membership")}
                className="gap-2 whitespace-nowrap"
              >
                <Crown className="h-4 w-4" />
                Upgrade to VIP
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Horizontal Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className={`${showFilters ? "block" : "hidden lg:block"}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Match Score Range */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Match Score</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Min"
                      value={minMatchScore || ""}
                      onChange={(e) => setMinMatchScore(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="h-9 text-sm"
                    />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Max"
                      value={maxMatchScore || ""}
                      onChange={(e) => setMaxMatchScore(Math.max(0, Math.min(100, parseInt(e.target.value) || 100)))}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Location Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Location</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search location..."
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Job Type Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Job Type</label>
                  <select
                    value={jobTypeFilter}
                    onChange={(e) => setJobTypeFilter(e.target.value as JobType | "")}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">All Types</option>
                    {(Object.keys(jobTypeLabels) as JobType[]).map((type) => (
                      <option key={type} value={type}>
                        {jobTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Company</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search company..."
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Sort */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "score" | "recent" | "title")}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="score">Match Score</option>
                    <option value="recent">Most Recent</option>
                    <option value="title">Job Title</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Filter Toggle */}
            <div className="lg:hidden mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredMatches.length}</span> jobs found
              {filteredMatches.length > itemsPerPage && (
                <span className="ml-2">
                  (showing {startIndex + 1}-{Math.min(endIndex, filteredMatches.length)})
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleViewModeChange("grid")}
                  className="h-8 px-3"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleViewModeChange("table")}
                  className="h-8 px-3"
                >
                  <Table className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {minMatchScore > 0 && (
                <Badge variant="outline" className="cursor-pointer" onClick={() => setMinMatchScore(0)}>
                  Min Score: {minMatchScore}% <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {maxMatchScore < 100 && (
                <Badge variant="outline" className="cursor-pointer" onClick={() => setMaxMatchScore(100)}>
                  Max Score: {maxMatchScore}% <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {locationFilter && (
                <Badge variant="outline" className="cursor-pointer" onClick={() => setLocationFilter("")}>
                  Location: {locationFilter} <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {jobTypeFilter && (
                <Badge variant="outline" className="cursor-pointer" onClick={() => setJobTypeFilter("")}>
                  Type: {jobTypeLabels[jobTypeFilter as JobType]} <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {companyFilter && (
                <Badge variant="outline" className="cursor-pointer" onClick={() => setCompanyFilter("")}>
                  Company: {companyFilter} <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {sortBy !== "score" && (
                <Badge variant="outline" className="cursor-pointer" onClick={() => setSortBy("score")}>
                  Sort: {sortBy} <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}

          {/* Jobs View */}
          {filteredMatches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No jobs found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters or search criteria
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 grid-cols-2">
              {currentPageJobs.map((match) => {
                const job = jobs[match.jobId];
                return (
                  <Card key={match.jobId} className="relative overflow-hidden">
                    {/* Match Score Badge */}
                    <div className="absolute top-4 right-4 z-10">
                      <Badge
                        variant={getScoreVariant(match.matchScore || 0)}
                        className="text-lg font-bold px-3 py-1"
                      >
                        {match.matchScore || 0}% Match
                      </Badge>
                    </div>

                    <CardHeader>
                      <div className="pr-20">
                        <CardTitle className="text-xl mb-2">{match.jobTitle}</CardTitle>
                        {job?.company && (
                          <CardDescription className="text-base">
                            {job.company.name}
                          </CardDescription>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Overall Match Score */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Overall Match</span>
                          <span className={`text-lg font-bold ${getScoreColor(match.matchScore || 0)}`}>
                            {match.matchScore || 0}%
                          </span>
                        </div>
                        <Progress value={match.matchScore || 0} className="h-2" />
                      </div>

                      {/* Score Breakdown - VIP Only */}
                      {isVIP && (
                        <div className="space-y-3">
                              <div
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-md cursor-pointer hover:bg-muted transition-colors"
                                onClick={(e) => {
                                  // Simple toggle for score breakdown
                                  const content = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (content) {
                                    content.classList.toggle('hidden');
                                  }
                                }}
                              >
                                <span className="flex items-center gap-2 text-sm font-medium">
                                  <TrendingUp className="h-4 w-4" />
                                  View Score Breakdown
                                </span>
                                <ArrowRight className="h-4 w-4" />
                              </div>
                              <div className="hidden space-y-3 p-4 bg-muted/20 rounded-md">
                                <h4 className="font-medium text-sm mb-3">Match Score Breakdown</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <div className="flex justify-between items-center">
                                    <div className="relative group">
                                      <span className="text-muted-foreground cursor-help hover:text-foreground transition-colors">
                                        Skills
                                      </span>
                                      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <div className="bg-popover text-popover-foreground text-sm rounded-lg shadow-2xl border p-6 w-80 min-w-80 whitespace-normal max-w-lg mx-4">
                                          <strong>Skills Match:</strong> Based on how many required skills from the job description match your profile skills. Higher percentage means better alignment.
                                        </div>
                                      </div>
                                    </div>
                                    <span className="font-medium">{match.breakdown.skillScore || 0}%</span>
                                  </div>
                                  <Progress value={match.breakdown.skillScore || 0} className="h-1.5 mt-1" />
                                </div>
                                <div>
                                  <div className="flex justify-between items-center">
                                    <div className="relative group">
                                      <span className="text-muted-foreground cursor-help hover:text-foreground transition-colors">
                                        Experience
                                      </span>
                                      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <div className="bg-popover text-popover-foreground text-sm rounded-lg shadow-2xl border p-6 w-80 min-w-80 whitespace-normal max-w-lg mx-4">
                                          <strong>Experience Level:</strong> How well your years of experience match the job requirements. Entry-level jobs favor less experience, senior roles need more.
                                        </div>
                                      </div>
                                    </div>
                                    <span className="font-medium">{match.breakdown.experienceScore || 0}%</span>
                                  </div>
                                  <Progress value={match.breakdown.experienceScore || 0} className="h-1.5 mt-1" />
                                </div>
                                <div>
                                  <div className="flex justify-between items-center">
                                    <div className="relative group">
                                      <span className="text-muted-foreground cursor-help hover:text-foreground transition-colors">
                                        Title
                                      </span>
                                      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <div className="bg-popover text-popover-foreground text-sm rounded-lg shadow-2xl border p-6 w-80 min-w-80 whitespace-normal max-w-lg mx-4">
                                          <strong>Job Title Match:</strong> How closely your current/last job title matches the target position. Similar titles score higher.
                                        </div>
                                      </div>
                                    </div>
                                    <span className="font-medium">{match.breakdown.titleScore || 0}%</span>
                                  </div>
                                  <Progress value={match.breakdown.titleScore || 0} className="h-1.5 mt-1" />
                                </div>
                                {/* TODO: Add these fields to MatchResult type */}
                                {/* <div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Education</span>
                                    <span className="font-medium">{match.breakdown.educationScore || 0}%</span>
                                  </div>
                                  <Progress value={match.breakdown.educationScore || 0} className="h-1.5 mt-1" />
                                </div>
                                <div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Soft Skills</span>
                                    <span className="font-medium">{match.breakdown.softSkillsScore || 0}%</span>
                                  </div>
                                  <Progress value={match.breakdown.softSkillsScore || 0} className="h-1.5 mt-1" />
                                </div>
                                <div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Technology</span>
                                    <span className="font-medium">{match.breakdown.technologyScore || 0}%</span>
                                  </div>
                                  <Progress value={match.breakdown.technologyScore || 0} className="h-1.5 mt-1" />
                                </div> */}
                                <div>
                                  <div className="flex justify-between items-center">
                                    <div className="relative group">
                                      <span className="text-muted-foreground cursor-help hover:text-foreground transition-colors">
                                        Location
                                      </span>
                                      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <div className="bg-popover text-popover-foreground text-sm rounded-lg shadow-2xl border p-6 w-80 min-w-80 whitespace-normal max-w-lg mx-4">
                                          <strong>Location Match:</strong> Based on whether the job location matches your preferred location or willingness to relocate.
                                        </div>
                                      </div>
                                    </div>
                                    <span className="font-medium">{match.breakdown.locationScore || 0}%</span>
                                  </div>
                                  <Progress value={match.breakdown.locationScore || 0} className="h-1.5 mt-1" />
                                </div>
                                <div>
                                  <div className="flex justify-between items-center">
                                    <div className="relative group">
                                      <span className="text-muted-foreground cursor-help hover:text-foreground transition-colors">
                                        Bonus
                                      </span>
                                      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <div className="bg-popover text-popover-foreground text-sm rounded-lg shadow-2xl border p-6 w-80 min-w-80 whitespace-normal max-w-lg mx-4">
                                          <strong>Bonus Factors:</strong> Additional points for special matching criteria like certifications, languages, or industry-specific qualifications.
                                        </div>
                                      </div>
                                    </div>
                                    <span className="font-medium">{match.breakdown.bonusScore || 0}%</span>
                                  </div>
                                  <Progress value={match.breakdown.bonusScore || 0} className="h-1.5 mt-1" />
                                </div>
                              </div>
                                <div className="mt-3 pt-3 border-t border-muted-foreground/20">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium">Total Match Score</span>
                                    <span className="text-lg font-bold text-primary">{match.matchScore || 0}%</span>
                                  </div>
                                </div>
                            </div>
                            <Separator />
                          </div>
                      )}

                      {/* Matched Skills - VIP Only */}
                      {isVIP && match.details?.matchedSkills && match.details.matchedSkills.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Matched Skills</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {match.details.matchedSkills.slice(0, 5).map((skill) => (
                              <Badge key={skill} variant="default" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {match.details.matchedSkills.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{match.details.matchedSkills.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Missing Skills - VIP Only */}
                      {isVIP && match.details?.missingSkills && match.details.missingSkills.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium">Missing Skills</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {match.details.missingSkills.slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {match.details.missingSkills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{match.details.missingSkills.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Suggestions - VIP Only */}
                      {isVIP && match.suggestions && match.suggestions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium">Suggestions</span>
                          </div>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {match.suggestions.slice(0, 2).map((suggestion, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* VIP Upgrade Prompt for FREE Members */}
                      {!isVIP && (
                        <Alert className="border-primary/30 bg-primary/5">
                          <Crown className="h-4 w-4 text-primary" />
                          <AlertDescription className="text-xs">
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => navigate("/candidate/membership")}
                              className="h-auto p-0 text-primary font-semibold"
                            >
                              Upgrade to VIP
                            </Button>
                            {" "}to see detailed insights, skill breakdowns, and improvement suggestions.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Job Details */}
                      {job && (
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {job.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.isRemote ? "Remote" : job.location}
                            </div>
                          )}
                          {job.type && (
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-4 w-4" />
                              {job.type.replace("_", " ")}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={async () => {
                          // Track click for candidates
                          if (userId && job?.id) {
                            const token = await getToken();
                            if (token) {
                              apiClient.trackJobClick(job.id, token);
                            }
                          }
                          navigate(`/jobs/${job?.slug || match.jobId}`);
                        }}
                      >
                        View Details
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={async () => {
                          // Track click for candidates
                          if (userId && job?.id) {
                            const token = await getToken();
                            if (token) {
                              apiClient.trackJobClick(job.id, token);
                            }
                          }
                          navigate(`/jobs/${job?.slug || match.jobId}`);
                        }}
                      >
                        Apply Now
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Dialog>
                      <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-semibold">Job Title</th>
                        <th className="text-left p-4 font-semibold">Company</th>
                        <th className="text-left p-4 font-semibold">Match Score</th>
                        <th className="text-left p-4 font-semibold">Location</th>
                        <th className="text-left p-4 font-semibold">Type</th>
                        <th className="text-left p-4 font-semibold">Suggestions</th>
                        <th className="text-left p-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPageJobs.map((match) => {
                        const job = jobs[match.jobId];
                        return (
                          <tr key={match.jobId} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="p-4">
                              <div className="font-medium">{match.jobTitle}</div>
                              {isVIP && match.details?.matchedSkills && match.details.matchedSkills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {match.details.matchedSkills.slice(0, 3).map((skill) => (
                                    <Badge key={skill} variant="default" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {match.details.matchedSkills.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{match.details.matchedSkills.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              {job?.company?.name || "N/A"}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Badge variant={getScoreVariant(match.matchScore || 0)}>
                                  {match.matchScore || 0}%
                                </Badge>
                                <Progress value={match.matchScore || 0} className="w-20 h-2" />
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {job?.isRemote ? "Remote" : (job?.location || "N/A")}
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="text-xs">
                                {job?.type ? jobTypeLabels[job.type as JobType] || job.type : "N/A"}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {isVIP && match.suggestions && match.suggestions.length > 0 ? (
                                <span
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 cursor-pointer underline decoration-dotted"
                                  onClick={() => {
                                    // Show suggestions in a simple alert for now to avoid nested button issues
                                    const suggestionsText = match.suggestions.join('\n• ');
                                    alert(`💡 Improvement Suggestions for "${match.jobTitle}":\n\n• ${suggestionsText}`);
                                  }}
                                >
                                  <Lightbulb className="h-3 w-3" />
                                  {match.suggestions.length} tips
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/jobs/${job?.slug || match.jobId}`)}
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`/jobs/${job?.slug || match.jobId}`)}
                                >
                                  Apply
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                      </table>
                    </Dialog>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      return page === 1 ||
                             page === totalPages ||
                             (page >= currentPage - 1 && page <= currentPage + 1);
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {/* Add ellipsis if there's a gap */}
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

