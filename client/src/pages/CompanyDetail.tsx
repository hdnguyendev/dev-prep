import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiClient, type Company, type Job, type JobType, type CompanyReview } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import {
  MapPin,
  Users,
  Globe,
  CheckCircle,
  ArrowLeft,
  Briefcase,
  DollarSign,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  Star,
  Award,
  Bell,
} from "lucide-react";

const CompanyDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [myReview, setMyReview] = useState<CompanyReview | null>(null);
  const [reviewStats, setReviewStats] = useState<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
    recommendPercentage: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    review: "",
    pros: "",
    cons: "",
    isCurrentEmployee: false,
    wouldRecommend: true,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);

  // Fetch company details and jobs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = await getToken();

        // Fetch company by slug using dedicated endpoint
        const companyResponse = await apiClient.getCompanyBySlug(
          slug!,
          token ?? undefined
        );

        if (!companyResponse.success || !companyResponse.data) {
          setError("Company not found");
          setLoading(false);
          return;
        }

        const foundCompany = companyResponse.data;
        setCompany(foundCompany);

        // Fetch jobs for this company using dedicated endpoint
        const jobsResponse = await apiClient.getCompanyJobs(
          foundCompany.id,
          { page: 1, pageSize: 100, include: "skills,categories" },
          token ?? undefined
        );

        if (jobsResponse.success) {
          setJobs(jobsResponse.data);
        }

        // Fetch reviews
        const reviewsResponse = await apiClient.getCompanyReviews(
          foundCompany.id,
          { page: 1, pageSize: 10 },
          token ?? undefined
        );

        if (reviewsResponse.success) {
          setReviews(reviewsResponse.data);
        }

        // Fetch review stats
        const statsResponse = await apiClient.getCompanyReviewStats(
          foundCompany.id,
          token ?? undefined
        );

        if (statsResponse.success) {
          setReviewStats(statsResponse.data);
        }

        // Fetch user's review & follow state if signed in
        if (token) {
          const [myReviewResponse, followResponse] = await Promise.all([
            apiClient.getMyReview(foundCompany.id, token),
            apiClient.checkIfCompanyFollowed(foundCompany.id, token),
          ]);

          if (myReviewResponse.success && myReviewResponse.data) {
            setMyReview(myReviewResponse.data);
            setReviewForm({
              rating: myReviewResponse.data.rating,
              title: myReviewResponse.data.title || "",
              review: myReviewResponse.data.review || "",
              pros: myReviewResponse.data.pros || "",
              cons: myReviewResponse.data.cons || "",
              isCurrentEmployee: myReviewResponse.data.isCurrentEmployee,
              wouldRecommend: myReviewResponse.data.wouldRecommend,
            });
          }

          if (followResponse.success && followResponse.data) {
            setIsFollowing(!!followResponse.data.isFollowed);
          } else {
            setIsFollowing(false);
          }
        }
      } catch (err) {
        console.error("Error fetching company:", err);
        setError(err instanceof Error ? err.message : "Failed to load company");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchData();
    }
  }, [slug, getToken]);

  const handleToggleFollow = async () => {
    if (!company || !isSignedIn) return;
    try {
      setFollowLoading(true);
      const token = await getToken();
      if (!token) return;

      if (isFollowing) {
        const res = await apiClient.unfollowCompany(company.id, token);
        if (res.success) {
          setIsFollowing(false);
        }
      } else {
        const res = await apiClient.followCompany(company.id, token);
        if (res.success) {
          setIsFollowing(true);
        }
      }
    } catch (err) {
      console.error("Error toggling company follow:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  // Helper functions
  const getCompanyInitial = () => {
    return company?.name?.[0]?.toUpperCase() || "C";
  };

  const getCompanyColor = () => {
    const colors = [
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-pink-500",
      "from-orange-500 to-red-500",
      "from-green-500 to-emerald-500",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

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

  // Strip HTML tags from description
  const stripHtmlTags = (html: string | null | undefined): string => {
    if (!html) return "No description available";
    return html.replace(/<[^>]*>/g, "").trim() || "No description available";
  };

  // Handle review submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !isSignedIn) return;

    try {
      setSubmittingReview(true);
      const token = await getToken();

      const response = await apiClient.createOrUpdateReview(
        {
          companyId: company.id,
          ...reviewForm,
        },
        token ?? undefined
      );

      if (response.success) {
        setMyReview(response.data);
        setShowReviewForm(false);
        
        // Refresh reviews and stats
        const [reviewsResponse, statsResponse] = await Promise.all([
          apiClient.getCompanyReviews(company.id, { page: 1, pageSize: 10 }, token ?? undefined),
          apiClient.getCompanyReviewStats(company.id, token ?? undefined),
        ]);

        if (reviewsResponse.success) setReviews(reviewsResponse.data);
        if (statsResponse.success) setReviewStats(statsResponse.data);

        alert(myReview ? "Review updated successfully!" : "Review submitted successfully!");
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle delete review
  const handleDeleteReview = () => {
    setDeleteConfirmOpen(true);
  };

  const handleDeleteReviewConfirm = async () => {
    if (!myReview) return;

    try {
      setDeletingReview(true);
      const token = await getToken();
      const response = await apiClient.deleteReview(myReview.id, token ?? undefined);

      if (response.success) {
        setMyReview(null);
        setReviewForm({
          rating: 5,
          title: "",
          review: "",
          pros: "",
          cons: "",
          isCurrentEmployee: false,
          wouldRecommend: true,
        });
        setDeleteConfirmOpen(false);

        // Refresh reviews and stats
        if (company) {
          const [reviewsResponse, statsResponse] = await Promise.all([
            apiClient.getCompanyReviews(company.id, { page: 1, pageSize: 10 }, token ?? undefined),
            apiClient.getCompanyReviewStats(company.id, token ?? undefined),
          ]);

          if (reviewsResponse.success) setReviews(reviewsResponse.data);
          if (statsResponse.success) setReviewStats(statsResponse.data);
        }

        alert("Review deleted successfully!");
      } else {
        alert("Failed to delete review. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting review:", err);
      alert("Failed to delete review. Please try again.");
    } finally {
      setDeletingReview(false);
    }
  };

  // Render star rating
  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
            onClick={() => interactive && onRate?.(star)}
          />
        ))}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <main className="min-h-dvh bg-gradient-to-b from-background via-purple-500/5 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="h-64 bg-muted rounded-xl" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !company) {
    return (
      <main className="min-h-dvh bg-gradient-to-b from-background via-purple-500/5 to-background">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/companies")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Button>
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle>Company Not Found</CardTitle>
              <CardDescription>
                The company you're looking for doesn't exist or has been removed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/companies")} className="w-full">
                Browse All Companies
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background via-purple-500/5 to-background">
      {/* Back Button */}
      <div className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/companies")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Company Header */}
        <Card className="mb-8 overflow-hidden">
          {/* Cover Image */}
          <div className={`h-32 relative overflow-hidden ${
            company.coverUrl 
              ? '' 
              : `bg-gradient-to-br ${getCompanyColor()}`
          }`}>
            {company.coverUrl ? (
              <img
                src={company.coverUrl}
                alt={`${company.name} cover`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  // Fallback to gradient if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    parent.className = `h-32 bg-gradient-to-br ${getCompanyColor()} relative overflow-hidden`;
                  }
                }}
              />
            ) : null}
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            {company.isVerified && (
              <Badge className="absolute top-4 right-4 gap-1 bg-green-500/90 backdrop-blur">
                <CheckCircle className="h-3 w-3" />
                Verified Company
              </Badge>
            )}
          </div>

          <CardHeader className="relative -mt-16 pb-4">
            {/* Company Logo */}
            <div className="mb-4 flex items-end gap-6">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="h-24 w-24 rounded-2xl border-4 border-background object-cover shadow-xl"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className={`h-24 w-24 rounded-2xl border-4 border-background bg-gradient-to-br ${getCompanyColor()} flex items-center justify-center text-4xl font-bold text-white shadow-xl ${company.logoUrl ? "hidden" : ""}`}
              >
                {getCompanyInitial()}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-3xl mb-2">{company.name}</CardTitle>
                    {company.industry && (
                      <CardDescription className="text-base">
                        {company.industry}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {company.website && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(company.website!, "_blank")}
                        className="gap-2"
                      >
                        <Globe className="h-4 w-4" />
                        Visit Website
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    {isSignedIn && (
                      <Button
                        variant={isFollowing ? "outline" : "default"}
                        size="sm"
                        className="gap-2"
                        onClick={handleToggleFollow}
                        disabled={followLoading}
                      >
                        <Bell className="h-4 w-4" />
                        {isFollowing ? "Following" : "Follow company"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Open Positions</div>
                  <div className="text-xl font-bold">{jobs.length}</div>
                </div>
              </div>

              {company.companySize && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                  <div className="rounded-lg bg-purple-500/10 p-2">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Company Size</div>
                    <div className="text-xl font-bold">{company.companySize}</div>
                  </div>
                </div>
              )}

              {(company.city || company.country) && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                  <div className="rounded-lg bg-orange-500/10 p-2">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Location</div>
                    <div className="text-xl font-bold">
                      {[company.city, company.country].filter(Boolean).join(", ")}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <Star className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Rating</div>
                  <div className="text-xl font-bold">4.5/5</div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Jobs Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Open Positions ({jobs.length})
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Explore career opportunities at {company.name}
              </p>
            </div>
          </div>

          {jobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <Briefcase className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Open Positions</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  {company.name} doesn't have any open positions at the moment.
                  Check back later or explore other companies.
                </p>
                <Button onClick={() => navigate("/companies")} variant="outline">
                  Browse Other Companies
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job, index) => (
                <Card
                  key={job.id}
                  className="group relative overflow-hidden border-2 transition-all hover:-translate-y-2 hover:shadow-xl cursor-pointer h-full flex flex-col"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: "slideUp 0.5s ease-out forwards",
                  }}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <CardHeader className="relative pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <Badge
                        className={`${getJobTypeColor(job.type)} text-white`}
                      >
                        {job.type.replace("_", " ")}
                      </Badge>
                      {job.isRemote && (
                        <Badge variant="outline" className="gap-1">
                          <Globe className="h-3 w-3" />
                          Remote
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                      {job.title}
                    </CardTitle>

                    <CardDescription className="flex items-center gap-1 mt-2">
                      <MapPin className="h-3 w-3" />
                      {job.location || "Not specified"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3 flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {stripHtmlTags(job.description)}
                    </p>

                    <div className="flex flex-wrap gap-1 min-h-[1.5rem]">
                      {getSkillTags(job).length > 0 ? (
                        getSkillTags(job).map((skill, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground/50">No skills listed</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-h-[1.5rem]">
                      <Award className="h-4 w-4 shrink-0" />
                      <span>{job.experienceLevel || "Not specified"}</span>
                    </div>
                  </CardContent>

                  <Separator />

                  <CardFooter className="relative justify-between border-t bg-muted/30 py-3">
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
                      View Job
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardFooter>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/20 transition-colors rounded-lg pointer-events-none" />
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Company Reviews</h2>
              <p className="text-sm text-muted-foreground mt-1">
                What employees say about {company.name}
              </p>
            </div>
            {isSignedIn && !myReview && (
              <Button onClick={() => setShowReviewForm(true)}>
                Write a Review
              </Button>
            )}
          </div>

          {/* Review Stats */}
          {reviewStats && reviewStats.totalReviews > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Average Rating */}
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2">
                      {reviewStats.averageRating.toFixed(1)}
                    </div>
                    {renderStars(Math.round(reviewStats.averageRating))}
                    <div className="text-sm text-muted-foreground mt-2">
                      Based on {reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''}
                    </div>
                    <div className="mt-3">
                      <Badge variant="outline" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {reviewStats.recommendPercentage}% would recommend
                      </Badge>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviewStats.ratingDistribution[rating] || 0;
                      const percentage =
                        reviewStats.totalReviews > 0
                          ? (count / reviewStats.totalReviews) * 100
                          : 0;
                      return (
                        <div key={rating} className="flex items-center gap-2">
                          <div className="flex items-center gap-1 w-16">
                            <span className="text-sm font-medium">{rating}</span>
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          </div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User's Review or Review Form */}
          {isSignedIn && (myReview || showReviewForm) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {myReview && !showReviewForm ? "Your Review" : "Write a Review"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myReview && !showReviewForm ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      {renderStars(myReview.rating)}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowReviewForm(true)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteReview}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    {myReview.title && (
                      <h4 className="font-semibold">{myReview.title}</h4>
                    )}
                    {myReview.review && (
                      <p className="text-sm text-muted-foreground">{myReview.review}</p>
                    )}
                    {myReview.pros && (
                      <div>
                        <div className="text-sm font-semibold text-green-600 mb-1">
                          Pros
                        </div>
                        <p className="text-sm text-muted-foreground">{myReview.pros}</p>
                      </div>
                    )}
                    {myReview.cons && (
                      <div>
                        <div className="text-sm font-semibold text-red-600 mb-1">
                          Cons
                        </div>
                        <p className="text-sm text-muted-foreground">{myReview.cons}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      {myReview.isCurrentEmployee && (
                        <Badge variant="outline">Current Employee</Badge>
                      )}
                      {myReview.wouldRecommend && (
                        <Badge variant="outline" className="bg-green-500/10">
                          Would Recommend
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Rating *
                      </label>
                      {renderStars(reviewForm.rating, true, (rating) =>
                        setReviewForm({ ...reviewForm, rating })
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Title</label>
                      <input
                        type="text"
                        className="w-full rounded-md border px-3 py-2"
                        value={reviewForm.title}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, title: e.target.value })
                        }
                        placeholder="Brief summary of your experience"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Review</label>
                      <Textarea
                        className="min-h-[100px]"
                        value={reviewForm.review}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, review: e.target.value })
                        }
                        placeholder="Share your experience working at this company..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Pros</label>
                      <Textarea
                        value={reviewForm.pros}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, pros: e.target.value })
                        }
                        placeholder="What are the positive aspects?"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Cons</label>
                      <Textarea
                        value={reviewForm.cons}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, cons: e.target.value })
                        }
                        placeholder="What could be improved?"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reviewForm.isCurrentEmployee}
                          onChange={(e) =>
                            setReviewForm({
                              ...reviewForm,
                              isCurrentEmployee: e.target.checked,
                            })
                          }
                        />
                        <span className="text-sm">I currently work here</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reviewForm.wouldRecommend}
                          onChange={(e) =>
                            setReviewForm({
                              ...reviewForm,
                              wouldRecommend: e.target.checked,
                            })
                          }
                        />
                        <span className="text-sm">I would recommend this company</span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={submittingReview}>
                        {submittingReview ? "Submitting..." : myReview ? "Update Review" : "Submit Review"}
                      </Button>
                      {showReviewForm && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowReviewForm(false)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                        {review.candidate?.user.firstName?.[0]}
                        {review.candidate?.user.lastName?.[0]}
                      </div>

                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">
                                {review.candidate?.user.firstName}{" "}
                                {review.candidate?.user.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            {renderStars(review.rating)}
                          </div>
                          {review.title && (
                            <h4 className="font-semibold mt-2">{review.title}</h4>
                          )}
                        </div>

                        {/* Content */}
                        {review.review && (
                          <p className="text-sm text-muted-foreground">{review.review}</p>
                        )}

                        {review.pros && (
                          <div>
                            <div className="text-sm font-semibold text-green-600 mb-1">
                              Pros
                            </div>
                            <p className="text-sm text-muted-foreground">{review.pros}</p>
                          </div>
                        )}

                        {review.cons && (
                          <div>
                            <div className="text-sm font-semibold text-red-600 mb-1">
                              Cons
                            </div>
                            <p className="text-sm text-muted-foreground">{review.cons}</p>
                          </div>
                        )}

                        {/* Tags */}
                        <div className="flex items-center gap-2 text-sm">
                          {review.isCurrentEmployee && (
                            <Badge variant="outline">Current Employee</Badge>
                          )}
                          {review.wouldRecommend && (
                            <Badge variant="outline" className="bg-green-500/10">
                              Recommends
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            !isSignedIn && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <Star className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Reviews Yet</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    Be the first to share your experience working at {company.name}.
                  </p>
                  <Button onClick={() => navigate("/login")}>
                    Sign In to Write a Review
                  </Button>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Confirmation Dialog for Delete Review */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteReviewConfirm}
        title="Delete Review?"
        description="Are you sure you want to delete your review? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={deletingReview}
      />
    </main>
  );
};

export default CompanyDetail;
