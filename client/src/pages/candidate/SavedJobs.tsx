import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { apiClient, type Job, type JobType } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import {
  MapPin,
  DollarSign,
  Heart,
  ArrowRight,
  CheckCircle,
  Globe,
  Award,
  Trash2,
  Search,
  Filter,
  X,
  LayoutGrid,
  Table,
  Loader2,
  Briefcase,
} from "lucide-react";

const SavedJobs = ({ embedded }: { embedded?: boolean }) => {
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsaveConfirmOpen, setUnsaveConfirmOpen] = useState(false);
  const [jobToUnsave, setJobToUnsave] = useState<string | null>(null);
  const [unsaving, setUnsaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // View mode and filters
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    const saved = localStorage.getItem("saved-jobs-view-mode");
    return (saved === "table" || saved === "grid") ? saved : "grid";
  });
  const [showFilters, setShowFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState<JobType | "">("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "company">("recent");

  // Redirect if not signed in (skip when embedded - parent layout already handles auth)
  useEffect(() => {
    if (embedded) return;
    if (!isSignedIn) {
      navigate("/login");
    }
  }, [embedded, isSignedIn, navigate]);

  // Fetch saved jobs
  useEffect(() => {
    if (!isSignedIn) return;

    const fetchSavedJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        const response = await apiClient.getSavedJobs(
          { page: 1, pageSize: 100, include: "company,skills" },
          token ?? undefined
        );

        if (response.success) {
          setSavedJobs(response.data);
        } else {
          setError("Failed to load saved jobs");
        }
      } catch {
        setError("Failed to load saved jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchSavedJobs();
  }, [isSignedIn, getToken]);

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let filtered = savedJobs.filter((job) => {
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
    if (sortBy === "recent") {
      filtered = filtered.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    } else if (sortBy === "title") {
      filtered = filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "company") {
      filtered = filtered.sort((a, b) => {
        const nameA = a.company?.name || "";
        const nameB = b.company?.name || "";
        return nameA.localeCompare(nameB);
      });
    }

    return filtered;
  }, [savedJobs, locationFilter, jobTypeFilter, companyFilter, sortBy]);

  // Handle unsave
  const handleUnsaveClick = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    setJobToUnsave(jobId);
    setUnsaveConfirmOpen(true);
  };

  const handleUnsaveConfirm = async () => {
    if (!jobToUnsave) return;
    
    try {
      setUnsaving(true);
      const token = await getToken();
      await apiClient.unsaveJob(jobToUnsave, token ?? undefined);
      setSavedJobs(prevJobs => prevJobs.filter(job => job.id !== jobToUnsave));
      setUnsaveConfirmOpen(false);
      setJobToUnsave(null);
    } catch {
      alert("Failed to remove job. Please try again.");
    } finally {
      setUnsaving(false);
    }
  };

  const handleViewModeChange = (mode: "grid" | "table") => {
    setViewMode(mode);
    localStorage.setItem("saved-jobs-view-mode", mode);
  };

  const clearFilters = () => {
    setLocationFilter("");
    setJobTypeFilter("");
    setCompanyFilter("");
    setSortBy("recent");
  };

  const hasActiveFilters = locationFilter || jobTypeFilter || companyFilter || sortBy !== "recent";

  // Helper functions
  const getJobTypeColor = (type: JobType) => {
    const colors: Record<JobType, string> = {
      FULL_TIME: "bg-blue-500",
      PART_TIME: "bg-green-500",
      CONTRACT: "bg-purple-500",
      FREELANCE: "bg-orange-500",
      INTERNSHIP: "bg-pink-500",
      REMOTE: "bg-cyan-500",
    };
    return colors[type] || "bg-gray-500";
  };

  const formatSalary = (job: Job) => {
    if (!job.salaryMin && !job.salaryMax) {
      return job.isSalaryNegotiable ? "Negotiable" : "Not specified";
    }

    const format = (amount: number) => {
      if (job.currency === "VND") {
        return `${(amount / 1000000).toFixed(0)}M`;
      }
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: job.currency,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    if (job.salaryMin && job.salaryMax) {
      return `${format(job.salaryMin)} - ${format(job.salaryMax)}`;
    }
    if (job.salaryMin) {
      return `From ${format(job.salaryMin)}`;
    }
    if (job.salaryMax) {
      return `Up to ${format(job.salaryMax)}`;
    }
    return "Negotiable";
  };

  const getSkillTags = (job: Job) => {
    return job.skills?.slice(0, 3).map((js) => js.skill?.name).filter(Boolean) || [];
  };

  const getCompanyInitial = (job: Job) => {
    return job.company?.name?.[0]?.toUpperCase() || "C";
  };

  const getCompanyColor = (index: number) => {
    const colors = [
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-pink-500",
      "from-orange-500 to-red-500",
      "from-green-500 to-emerald-500",
      "from-yellow-500 to-orange-500",
      "from-indigo-500 to-purple-500",
    ];
    return colors[index % colors.length];
  };

  const jobTypeLabels: Record<JobType, string> = {
    FULL_TIME: "Full Time",
    PART_TIME: "Part Time",
    CONTRACT: "Contract",
    FREELANCE: "Freelance",
    INTERNSHIP: "Internship",
    REMOTE: "Remote",
  };

  if (!isSignedIn && !embedded) {
    return null;
  }

  const content = (
    <div className="space-y-6">
      {/* Header */}
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-8 w-8 fill-red-500 text-red-500" />
            Saved Jobs
          </h1>
          <p className="text-muted-foreground mt-2">
            Jobs you've saved for later
          </p>
        </div>
      )}

      {/* Horizontal Filter Bar */}
      {!embedded && (
        <Card>
          <CardContent className="p-4">
            <div className={`${showFilters ? "block" : "hidden lg:block"}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    onChange={(e) => setSortBy(e.target.value as "recent" | "title" | "company")}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="title">Job Title</option>
                    <option value="company">Company</option>
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
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading saved jobs...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="max-w-md mx-auto border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-red-600 text-center mb-4">{error}</div>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && savedJobs.length === 0 && (
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Heart className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Saved Jobs Yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Start saving jobs that interest you to keep track of them
            </p>
            <Button onClick={() => navigate("/jobs")}>
              Browse Jobs
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Jobs View */}
      {!loading && !error && savedJobs.length > 0 && (
        <div className="space-y-6">
          {/* Toolbar */}
          {!embedded && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredJobs.length}</span> jobs found
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
          )}

          {/* Active Filters */}
          {!embedded && hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
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
              {sortBy !== "recent" && (
                <Badge variant="outline" className="cursor-pointer" onClick={() => setSortBy("recent")}>
                  Sort: {sortBy} <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}

          {/* No Results */}
          {filteredJobs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No jobs found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Grid View */}
          {filteredJobs.length > 0 && viewMode === "grid" && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job, index) => (
                <Card
                  key={job.id}
                  className="group relative overflow-hidden border-2 transition-all hover:-translate-y-2 hover:shadow-xl cursor-pointer"
                  onClick={() => navigate(`/jobs/${job.slug || job.id}`)}
                >
                  <CardHeader className="relative pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getJobTypeColor(job.type)} text-white`}>
                          {job.type.replace("_", " ")}
                        </Badge>
                        {job.isRemote && (
                          <Badge variant="outline" className="gap-1">
                            <Globe className="h-3 w-3" />
                            Remote
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => handleUnsaveClick(e, job.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                      </Button>
                    </div>

                    {/* Company Logo & Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-xl font-bold text-white shadow-lg`}
                      >
                        {getCompanyInitial(job)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">
                          {job.company?.name || "Company"}
                        </div>
                        {job.company?.isVerified && (
                          <Badge variant="outline" className="gap-1 text-xs mt-1">
                            <CheckCircle className="h-2.5 w-2.5" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                      {job.title}
                    </CardTitle>

                    <CardDescription className="flex items-center gap-1 mt-2">
                      <MapPin className="h-3 w-3" />
                      {job.location || "Not specified"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3">
                    {job.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description.replace(/<[^>]*>/g, "")}
                      </p>
                    )}

                    {getSkillTags(job).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {getSkillTags(job).map((skill, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {job.experienceLevel && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Award className="h-4 w-4" />
                        <span>{job.experienceLevel}</span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="relative justify-between border-t bg-muted/30">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <DollarSign className="h-4 w-4" />
                      {formatSalary(job)}
                    </div>
                    <Button
                      size="sm"
                      className="gap-1 group-hover:gap-2 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/jobs/${job.slug || job.id}`);
                      }}
                    >
                      Apply
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardFooter>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/20 transition-colors rounded-lg pointer-events-none" />
                </Card>
              ))}
            </div>
          )}

          {/* Table View */}
          {filteredJobs.length > 0 && viewMode === "table" && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-semibold">Job Title</th>
                        <th className="text-left p-4 font-semibold">Company</th>
                        <th className="text-left p-4 font-semibold">Location</th>
                        <th className="text-left p-4 font-semibold">Type</th>
                        <th className="text-left p-4 font-semibold">Salary</th>
                        <th className="text-left p-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.map((job) => (
                        <tr key={job.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-4">
                            <div className="font-medium">{job.title}</div>
                            {getSkillTags(job).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {getSkillTags(job).map((skill, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {job.company?.name || "N/A"}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {job.isRemote ? "Remote" : (job.location || "N/A")}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">
                              {job.type ? jobTypeLabels[job.type as JobType] || job.type : "N/A"}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm font-medium">
                            {formatSalary(job)}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/jobs/${job.slug || job.id}`)}
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnsaveClick(e, job.id);
                                }}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="inline-flex items-center gap-2">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            <CardTitle className="text-lg">Saved jobs</CardTitle>
          </div>
          <CardDescription>Jobs you've saved</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background via-purple-500/5 to-background">
      {content}

      {/* Confirmation Dialog for Unsave */}
      <ConfirmationDialog
        open={unsaveConfirmOpen}
        onOpenChange={setUnsaveConfirmOpen}
        onConfirm={handleUnsaveConfirm}
        title="Remove Saved Job?"
        description="Are you sure you want to remove this job from your saved list?"
        confirmText="Remove"
        cancelText="Cancel"
        variant="default"
        loading={unsaving}
      />
    </main>
  );
};

export default SavedJobs;
