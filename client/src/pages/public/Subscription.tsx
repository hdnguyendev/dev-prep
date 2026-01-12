import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Infinity as InfinityIcon, TrendingUp, Sparkles, ArrowRight, User, Briefcase } from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import { getCurrentUser } from "@/lib/auth";

interface MembershipPlan {
  id: string;
  name: string;
  planType: "FREE" | "VIP";
  role: string;
  price: number;
  currency: "VND" | "USD" | "EUR" | "JPY";
  duration: number;
  maxInterviews?: number | null;
  maxMatchingViews?: number | null;
  maxJobPostings?: number | null;
  unlimitedInterviews: boolean;
  fullMatchingInsights: boolean;
  rankedCandidateList: boolean;
  directCandidateContact: boolean;
  features: string[];
  description?: string | null;
}

export default function Subscription() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [candidatePlans, setCandidatePlans] = useState<MembershipPlan[]>([]);
  const [recruiterPlans, setRecruiterPlans] = useState<MembershipPlan[]>([]);
  const [activeTab, setActiveTab] = useState<"candidate" | "recruiter">("candidate");
  const [loading, setLoading] = useState(true);

  // Redirect authenticated users to their membership page
  useEffect(() => {
    if (isSignedIn) {
      // Check if user is candidate, recruiter, or admin
      const customUser = getCurrentUser();
      if (customUser?.role === "CANDIDATE") {
        navigate("/candidate/membership", { replace: true });
      } else if (customUser?.role === "RECRUITER") {
        navigate("/recruiter/dashboard", { replace: true });
      } else if (customUser?.role === "ADMIN") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        // Clerk user but no custom role yet, redirect to candidate membership
        navigate("/candidate/membership", { replace: true });
      }
    }
  }, [isSignedIn, navigate]);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoading(true);
        // Load both candidate and recruiter plans
        const [candidateRes, recruiterRes] = await Promise.all([
          apiClient.getMembershipPlans("CANDIDATE"),
          apiClient.getMembershipPlans("RECRUITER"),
        ]);
        
        if (candidateRes.success && candidateRes.data) {
          setCandidatePlans(candidateRes.data as any);
        }
        if (recruiterRes.success && recruiterRes.data) {
          setRecruiterPlans(recruiterRes.data as any);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  const formatPrice = (price: number, currency: string) => {
    if (currency === "VND") {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0,
      }).format(price);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  const currentPlans = activeTab === "candidate" ? candidatePlans : recruiterPlans;
  const freePlan = currentPlans.find((p) => p.planType === "FREE");
  const vipPlan = currentPlans.find((p) => p.planType === "VIP");

  // Don't render if user is signed in (will redirect)
  if (isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Membership Plans
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Choose the perfect plan for your needs. Whether you're a candidate looking to advance your career or a recruiter seeking top talent.
          </p>

          {/* Tab Switcher */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Button
              variant={activeTab === "candidate" ? "default" : "outline"}
              onClick={() => setActiveTab("candidate")}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              For Candidates
            </Button>
            <Button
              variant={activeTab === "recruiter" ? "default" : "outline"}
              onClick={() => setActiveTab("recruiter")}
              className="gap-2"
            >
              <Briefcase className="h-4 w-4" />
              For Recruiters
            </Button>
          </div>
        </div>

        {/* Membership Plans */}
        <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto mb-12">
          {/* FREE Plan */}
          {freePlan && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  {freePlan.name}
                </CardTitle>
                <CardDescription>{freePlan.description || "Perfect for getting started"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">Free</div>
                  <div className="text-sm text-muted-foreground">Forever</div>
                </div>

                <ul className="space-y-2">
                  {freePlan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {activeTab === "candidate" && freePlan.maxInterviews && (
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        {freePlan.maxInterviews} practice interviews per week
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          (Scheduled interviews via access code are unlimited)
                        </span>
                      </span>
                    </li>
                  )}
                  {activeTab === "recruiter" && freePlan.maxJobPostings && (
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Up to {freePlan.maxJobPostings} job postings
                      </span>
                    </li>
                  )}
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* VIP Plan */}
          {vipPlan && (
            <Card className="border-2 border-primary relative overflow-hidden bg-gradient-to-br from-yellow-50/30 via-orange-50/20 to-background dark:from-yellow-950/10 dark:via-orange-950/10">
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                  <Sparkles className="h-3 w-3 mr-1 fill-white" />
                  Most Popular
                </Badge>
              </div>
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500">
                    <Crown className="h-5 w-5 text-white fill-white" />
                  </div>
                  <span className="text-primary font-bold">{vipPlan.name}</span>
                </CardTitle>
                <CardDescription>{vipPlan.description || "Unlock all premium features"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    {formatPrice(vipPlan.price, vipPlan.currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    per {vipPlan.duration} days
                  </div>
                </div>

                <ul className="space-y-2">
                  {vipPlan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {activeTab === "candidate" && vipPlan.unlimitedInterviews && (
                    <li className="flex items-start gap-2 text-sm">
                      <InfinityIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Unlimited interviews</span>
                    </li>
                  )}
                  {activeTab === "candidate" && vipPlan.fullMatchingInsights && (
                    <li className="flex items-start gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Full CV-Job matching insights</span>
                    </li>
                  )}
                  {activeTab === "recruiter" && vipPlan.rankedCandidateList && (
                    <li className="flex items-start gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Ranked candidate list per job</span>
                    </li>
                  )}
                  {activeTab === "recruiter" && vipPlan.directCandidateContact && (
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Direct candidate contact</span>
                    </li>
                  )}
                  {activeTab === "recruiter" && !vipPlan.maxJobPostings && (
                    <li className="flex items-start gap-2 text-sm">
                      <InfinityIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Unlimited job postings</span>
                    </li>
                  )}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 shadow-md hover:shadow-lg"
                  asChild
                >
                  <Link to="/login">
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to VIP
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Benefits Section */}
        <Card className="max-w-5xl mx-auto bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              Why Choose VIP?
            </CardTitle>
            <CardDescription className="text-base">
              {activeTab === "candidate" 
                ? "Unlock exclusive benefits designed to accelerate your career growth"
                : "Unlock powerful tools to find and hire the best talent"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeTab === "candidate" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                  <h4 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <InfinityIcon className="h-4 w-4" />
                    Unlimited Interviews
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Practice as much as you need with unlimited AI-powered interview sessions. Perfect your answers and build confidence.
                  </p>
                </div>
                <div className="space-y-2 p-3 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30">
                  <h4 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
                    <TrendingUp className="h-4 w-4" />
                    Advanced Matching
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Get detailed insights on how well your CV matches job requirements, with actionable suggestions to improve your profile.
                  </p>
                </div>
                <div className="space-y-2 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                  <h4 className="font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-400">
                    <Zap className="h-4 w-4" />
                    Priority Support
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Get faster response times and priority support for any questions or issues you may have.
                  </p>
                </div>
                <div className="space-y-2 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                  <h4 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Crown className="h-4 w-4" />
                    Exclusive Features
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Access to new features and improvements before they're available to free users.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                  <h4 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <InfinityIcon className="h-4 w-4" />
                    Unlimited Job Postings
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Post as many jobs as you need without any limits. Scale your hiring efforts without restrictions.
                  </p>
                </div>
                <div className="space-y-2 p-3 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30">
                  <h4 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
                    <TrendingUp className="h-4 w-4" />
                    Ranked Candidate List
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Get candidates automatically ranked by match score. See the best fits first and save time in your hiring process.
                  </p>
                </div>
                <div className="space-y-2 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                  <h4 className="font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-400">
                    <Check className="h-4 w-4" />
                    Direct Candidate Contact
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Reach out directly to candidates. Build relationships and move faster in your hiring process.
                  </p>
                </div>
                <div className="space-y-2 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                  <h4 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Crown className="h-4 w-4" />
                    Priority Support
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Get dedicated support and faster response times for all your hiring needs.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <Card className="max-w-2xl mx-auto border-primary/20 bg-gradient-to-r from-primary/10 to-blue-500/10">
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold mb-2">Ready to get started?</h3>
              <p className="text-muted-foreground mb-6">
                {activeTab === "candidate"
                  ? "Join thousands of candidates who are advancing their careers with DevPrep"
                  : "Join hundreds of recruiters who are finding top talent with DevPrep"}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/login">
                    Sign Up Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/">
                    Learn More
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

