import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiClient, type Job, type JobType } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import {
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Heart,
  Search,
  Filter,
  ArrowRight,
  X,
  CheckCircle,
} from "lucide-react";

const Jobs = () => {
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [types, setTypes] = useState<Record<JobType, boolean>>({
    FULL_TIME: false,
    PART_TIME: false,
    CONTRACT: false,
    FREELANCE: false,
    INTERNSHIP: false,
    REMOTE: false,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 9;

  // Fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        const response = await apiClient.listJobs({ page, pageSize: 100 }, token ?? undefined);
        if (response.success) {
          setJobs(response.data);
        } else {
          setError(response.message || "Failed to fetch jobs");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [getToken, page]);

  // Fetch saved jobs status
  useEffect(() => {
    if (!isSignedIn || jobs.length === 0) return;

    const fetchSavedStatus = async () => {
      try {
        const token = await getToken();
        const savedJobsResponse = await apiClient.getSavedJobs({ page: 1, pageSize: 100 }, token ?? undefined);
        
        if (savedJobsResponse.success) {
          const savedJobIds = new Set(savedJobsResponse.data.map(job => job.id));
          setSavedJobs(savedJobIds);
        }
      } catch (err) {
        console.error("Error fetching saved jobs:", err);
      }
    };

    fetchSavedStatus();
  }, [isSignedIn, jobs, getToken]);

  // Toggle save job
  const handleToggleSave = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    
    if (!isSignedIn) {
      alert("Please sign in to save jobs");
      return;
    }

    try {
      const token = await getToken();
      const isSaved = savedJobs.has(jobId);

      if (isSaved) {
        await apiClient.unsaveJob(jobId, token ?? undefined);
        setSavedJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      } else {
        await apiClient.saveJob(jobId, token ?? undefined);
        setSavedJobs(prev => new Set(prev).add(jobId));
      }
    } catch (err) {
      console.error("Error toggling save job:", err);
      alert("Failed to save job. Please try again.");
    }
  };

  const getLocation = (job: Job) =>
    job.isRemote ? "Remote" : job.location || "Not specified";

  const typeLabels: Record<JobType, string> = {
    FULL_TIME: "Full-time",
    PART_TIME: "Part-time",
    CONTRACT: "Contract",
    FREELANCE: "Freelance",
    INTERNSHIP: "Internship",
    REMOTE: "Remote",
  };

  const getEmploymentTypeLabel = (job: Job) => typeLabels[job.type] ?? job.type;

  const getSalaryRange = (job: Job) => {
    if (job.isSalaryNegotiable) return "Negotiable";
    if (job.salaryMin && job.salaryMax) {
      return `$${(job.salaryMin / 1000).toFixed(0)}k-${(job.salaryMax / 1000).toFixed(0)}k`;
    }
    if (job.salaryMin) return `From $${(job.salaryMin / 1000).toFixed(0)}k`;
    if (job.salaryMax) return `Up to $${(job.salaryMax / 1000).toFixed(0)}k`;
    return "Not specified";
  };

  const getSkillTags = (job: Job): string[] =>
    (job.skills || [])
      .map((s) => s.skill?.name)
      .filter((x): x is string => Boolean(x))
      .slice(0, 3);

  const allTags = useMemo(() => {
    const t = new Set<string>();
    jobs.forEach((j) => {
      (j.skills || []).forEach((s) => {
        if (s.skill?.name) t.add(s.skill.name);
      });
    });
    return Array.from(t).slice(0, 20);
  }, [jobs]);

  const filtered = useMemo(() => {
    const activeTypes = Object.entries(types)
      .filter(([, v]) => v)
      .map(([k]) => k);
    let list = jobs.filter((j) => {
      const q = query.trim().toLowerCase();
      const matchesQuery = !q ||
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        (j.requirements || "").toLowerCase().includes(q);
      const matchesLocation =
        !location || getLocation(j).toLowerCase().includes(location.toLowerCase());
      const matchesType =
        activeTypes.length === 0 || activeTypes.includes(j.type);
      const jobTags = (j.skills || []).map((s) => s.skill?.name).filter((x): x is string => Boolean(x));
      const matchesTags =
        selectedTags.length === 0 || selectedTags.every((t) => jobTags.includes(t));
      return matchesQuery && matchesLocation && matchesType && matchesTags;
    });
    if (sort === "salary")
      list = list.sort((a, b) => (b.salaryMin || 0) - (a.salaryMin || 0));
    return list;
  }, [jobs, location, query, selectedTags, sort, types]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleType = (k: JobType) => setTypes((prev) => ({ ...prev, [k]: !prev[k] }));
  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

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

  if (loading) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <div className="mb-2 text-lg font-semibold">Loading amazing jobs...</div>
          <div className="text-sm text-muted-foreground">Finding the perfect opportunities for you</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <Card className="max-w-md border-red-200">
          <CardHeader>
            <div className="mb-4 flex justify-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-center text-red-600">Error loading jobs</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background via-primary/5 to-background">
      {/* Hero Search Section */}
      <section className="border-b bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="mb-8 text-center">
            <Badge className="mb-4">
              <Briefcase className="mr-1 h-3 w-3" />
              {filtered.length} Jobs Available
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl mb-4">
              Find Your <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Dream Job</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover opportunities from top companies worldwide
            </p>
          </div>

          {/* Search Bar */}
          <Card className="border-2 shadow-lg">
            <CardContent className="p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Job title, company, keywords..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
                <Button className="h-11 px-8 gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Popular Tags */}
          <div className="mt-6 flex flex-wrap items-center gap-2 justify-center">
            <span className="text-sm text-muted-foreground">Popular:</span>
            {allTags.slice(0, 6).map((t) => (
              <Badge
                key={t}
                variant={selectedTags.includes(t) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => toggleTag(t)}
              >
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Filters Sidebar */}
          <aside className={`${showFilters ? "block" : "hidden lg:block"} space-y-6`}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Employment Type */}
                <div>
                  <div className="mb-3 text-sm font-semibold">Employment Type</div>
                  <div className="space-y-2">
                    {(Object.keys(types) as JobType[]).map((k) => (
                      <label key={k} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={types[k]}
                          onChange={() => toggleType(k)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm group-hover:text-primary transition-colors">
                          {typeLabels[k] ?? k}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Skills/Tags */}
                <div>
                  <div className="mb-3 text-sm font-semibold">Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((t) => (
                      <Badge
                        key={t}
                        variant={selectedTags.includes(t) ? "default" : "outline"}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => toggleTag(t)}
                      >
                        {selectedTags.includes(t) && <CheckCircle className="mr-1 h-3 w-3" />}
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                {(Object.values(types).some((v) => v) || selectedTags.length > 0) && (
                  <>
                    <Separator />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTypes({
                          FULL_TIME: false,
                          PART_TIME: false,
                          CONTRACT: false,
                          FREELANCE: false,
                          INTERNSHIP: false,
                          REMOTE: false,
                        });
                        setSelectedTags([]);
                      }}
                      className="w-full"
                    >
                      Clear All Filters
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Jobs Grid */}
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filtered.length}</span> jobs found
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="recent">Most Recent</option>
                  <option value="salary">Highest Salary</option>
                </select>
              </div>
            </div>

            {/* Jobs Grid */}
            {paged.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">No jobs found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try adjusting your filters or search terms
                  </p>
                  <Button variant="outline" onClick={() => {
                    setQuery("");
                    setLocation("");
                    setSelectedTags([]);
                    setTypes({
                      FULL_TIME: false,
                      PART_TIME: false,
                      CONTRACT: false,
                      FREELANCE: false,
                      INTERNSHIP: false,
                      REMOTE: false,
                    });
                  }}>
                    Clear All Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {paged.map((job, index) => (
                  <Card
                    key={job.id}
                    className="group relative overflow-hidden border-2 transition-all hover:-translate-y-2 hover:shadow-xl cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    
                    <CardHeader className="relative space-y-4">
                      {/* Company Logo & Actions */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-14 w-14 rounded-xl bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}
                          >
                            {getCompanyInitial(job)}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">
                              {job.company?.name || "Company"}
                            </div>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {getEmploymentTypeLabel(job)}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => handleToggleSave(e, job.id)}
                        >
                          <Heart 
                            className={`h-4 w-4 transition-colors ${
                              savedJobs.has(job.id) 
                                ? "fill-red-500 text-red-500" 
                                : "text-muted-foreground hover:text-red-500"
                            }`} 
                          />
                        </Button>
                      </div>

                      {/* Job Title */}
                      <div>
                        <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                          {job.title}
                        </CardTitle>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getLocation(job)}
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Posted 2d ago
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="relative space-y-4">
                      {/* Description */}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1.5">
                        {getSkillTags(job).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter className="relative flex-col gap-3 border-t bg-gradient-to-br from-background to-muted/30 p-4">
                      {/* Salary Section */}
                      <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Salary</div>
                            <div className="font-semibold text-sm">{getSalaryRange(job)}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getEmploymentTypeLabel(job)}
                        </Badge>
                      </div>

                      {/* Apply Button - Full Width */}
                      <Button 
                        className="w-full gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all group relative overflow-hidden"
                        size="lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/${job.id}`);
                        }}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          Apply Now
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                        {/* Shine effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-9"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-muted-foreground">...</span>}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Jobs;
