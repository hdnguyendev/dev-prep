import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient, type Job, type JobType } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import {
  MapPin,
  Briefcase,
  DollarSign,
  Heart,
  ArrowRight,
  CheckCircle,
  Globe,
  Award,
  Trash2,
} from "lucide-react";

const SavedJobs = () => {
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not signed in
  useEffect(() => {
    if (!isSignedIn) {
      navigate("/login");
    }
  }, [isSignedIn, navigate]);

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
      } catch (err) {
        console.error("Error fetching saved jobs:", err);
        setError("Failed to load saved jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchSavedJobs();
  }, [isSignedIn, getToken]);

  // Handle unsave
  const handleUnsave = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to remove this job from your saved list?")) {
      return;
    }

    try {
      const token = await getToken();
      await apiClient.unsaveJob(jobId, token ?? undefined);
      setSavedJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
    } catch (err) {
      console.error("Error unsaving job:", err);
      alert("Failed to remove job. Please try again.");
    }
  };

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

  if (!isSignedIn) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background via-purple-500/5 to-background">
      {/* Header */}
      <section className="border-b bg-gradient-to-br from-purple-500/5 via-background to-primary/5">
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 mb-4">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            <span className="text-sm font-medium">Your Saved Jobs</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">
            Jobs You've Saved
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Keep track of interesting opportunities and apply when you're ready
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-3">
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
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

        {/* Jobs Grid */}
        {!loading && !error && savedJobs.length > 0 && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {savedJobs.length} Saved Job{savedJobs.length !== 1 ? "s" : ""}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Click on any job to view details and apply
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {savedJobs.map((job, index) => (
                <Card
                  key={job.id}
                  className="group relative overflow-hidden border-2 transition-all hover:-translate-y-2 hover:shadow-xl cursor-pointer"
                  onClick={() => navigate(`/jobs/${job.id}`)}
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
                        onClick={(e) => handleUnsave(e, job.id)}
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
                        navigate(`/jobs/${job.id}`);
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
          </>
        )}
      </div>
    </main>
  );
};

export default SavedJobs;
