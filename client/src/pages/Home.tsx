import illGrowth from "@/assets/illustration-career-growth.svg";
import illInterview from "@/assets/illustration-interview.svg";
import illJobSearch from "@/assets/illustration-job-search.svg";
import logo from "@/assets/logo.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { apiClient, type Job } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import {
  ArrowRight,
  Briefcase,
  Building2,
  MapPin,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

const Home = () => {
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [heroQuery, setHeroQuery] = useState("");
  const [heroLocation, setHeroLocation] = useState("");
  
  const slides = useMemo(
    () => [
      {
        title: "Land Your Dream Job",
        subtitle: "Connect with top companies hiring now",
        color: "from-blue-500/20 via-purple-500/20 to-pink-500/20",
        icon: <Briefcase className="h-16 w-16" />,
      },
      {
        title: "AI-Powered Interview Prep",
        subtitle: "Practice with our intelligent interview system",
        color: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
        icon: <Sparkles className="h-16 w-16" />,
      },
      {
        title: "Track Your Applications",
        subtitle: "Never miss an opportunity with smart tracking",
        color: "from-orange-500/20 via-red-500/20 to-pink-500/20",
        icon: <TrendingUp className="h-16 w-16" />,
      },
    ],
    []
  );
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 4000);
    return () => clearInterval(id);
  }, [slides.length]);

  // Scroll-reveal for sections
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-show");
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Fetch featured jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoadingJobs(true);
        const token = await getToken();
        const response = await apiClient.listJobs({ page: 1, pageSize: 6 }, token ?? undefined);
        if (response.success) {
          setFeaturedJobs(response.data.slice(0, 3));
        }
      } catch {
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchJobs();
  }, [getToken]);

  // Animated counters
  const countersRef = useRef<Array<HTMLSpanElement | null>>([]);
  useEffect(() => {
    const targets = [2400, 1200, 35000, 4.9];
    const durationMs = 2000;
    const startTs = performance.now();

    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const t = Math.min(1, (now - startTs) / durationMs);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      targets.forEach((target, i) => {
        const el = countersRef.current[i];
        if (!el) return;
        const val = i === 3 ? (ease * target).toFixed(1) : Math.round(ease * target).toLocaleString();
        el.textContent = i === 0 ? `${val}+` : i === 1 ? `${val}+` : i === 2 ? `${val}` : `${val}/5`;
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const getCompanyInitial = (job: Job) => {
    return job.company?.name?.[0]?.toUpperCase() || "C";
  };

  const getCompanyColor = (index: number) => {
    const colors = [
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-pink-500",
      "from-orange-500 to-red-500",
    ];
    return colors[index % colors.length];
  };

  const getLocation = (job: Job) => job.isRemote ? "Remote" : job.location || "Not specified";

  const getSalaryRange = (job: Job) => {
    if (job.isSalaryNegotiable) return "Negotiable";
    if (job.salaryMin && job.salaryMax) {
      return `$${(job.salaryMin / 1000).toFixed(0)}k-${(job.salaryMax / 1000).toFixed(0)}k`;
    }
    if (job.salaryMin) return `From $${(job.salaryMin / 1000).toFixed(0)}k`;
    if (job.salaryMax) return `Up to $${(job.salaryMax / 1000).toFixed(0)}k`;
    return "Negotiable";
  };

  const getSkillTags = (job: Job): string[] =>
    (job.skills || [])
      .map((s) => s.skill?.name)
      .filter((x): x is string => Boolean(x))
      .slice(0, 3);

  const goToJobsWithSearch = () => {
    const q = heroQuery.trim();
    const loc = heroLocation.trim();
    const params = new URLSearchParams();
    if (q) params.set("query", q);
    if (loc) params.set("location", loc);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    navigate(`/jobs${suffix}`);
  };

  return (
    <>
      <main className="min-h-dvh">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          <div className="container relative mx-auto px-4 py-20 md:py-32">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div className="space-y-8 reveal">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-sm backdrop-blur">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">AI-Powered Career Platform</span>
                  <Badge className="ml-1">New</Badge>
                </div>
                
                <h1 className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
                  Your Next{" "}
                  <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Dream Job
                  </span>{" "}
                  Awaits
                </h1>
                
                <p className="text-lg text-muted-foreground md:text-xl">
                  Connect with top companies, practice AI-powered interviews, and track your applications
                  all in one beautiful platform.
                </p>
                
                <div className="flex flex-wrap items-center gap-4">
                  <Button size="lg" onClick={() => navigate("/jobs")} className="gap-2 group">
                    Explore Jobs
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate("/interview")} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Try AI Interview
                  </Button>
                </div>

                <Card className="border-2 bg-background/70 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={heroQuery}
                          onChange={(e) => setHeroQuery(e.target.value)}
                          placeholder="Job title, skills, keywords..."
                          className="h-11 pl-9"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") goToJobsWithSearch();
                          }}
                        />
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={heroLocation}
                          onChange={(e) => setHeroLocation(e.target.value)}
                          placeholder="Location (or Remote)"
                          className="h-11 pl-9"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") goToJobsWithSearch();
                          }}
                        />
                      </div>
                      <Button className="h-11 px-8 gap-2" onClick={goToJobsWithSearch}>
                        <Search className="h-4 w-4" />
                        Search
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex flex-wrap items-center gap-3 pt-4">
                  <Badge variant="outline" className="gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Verified companies
                  </Badge>
                  <Badge variant="outline" className="gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Fast apply flow
                  </Badge>
                  <Badge variant="outline" className="gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    4.9/5 user rating
                  </Badge>
                </div>
              </div>

              {/* Hero Visual */}
              <div className="relative reveal">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-purple-500/20 to-pink-500/20 blur-3xl" />
                <div className="relative overflow-hidden rounded-3xl border-2 bg-background/70 shadow-2xl backdrop-blur">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />
                  <img
                    src={illJobSearch}
                    alt="Job search illustration"
                    className="relative w-full h-auto"
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 py-20 reveal">
          <div className="mb-12 text-center">
            <Badge className="mb-4">How it works</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">A simple flow that feels effortless</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Search, apply, and practice interviews — all in one place.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Search smarter",
                desc: "Use keywords, skills, and location to narrow down quickly.",
                img: illJobSearch,
              },
              {
                title: "Practice interviews",
                desc: "Run AI interview sessions and get structured feedback.",
                img: illInterview,
              },
              {
                title: "Track your growth",
                desc: "See your activity and improve with every attempt.",
                img: illGrowth,
              },
            ].map((s) => (
              <Card key={s.title} className="overflow-hidden border-2 hover:shadow-xl transition-all">
                <div className="bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
                  <img src={s.img} alt={s.title} className="w-full h-48 object-cover" draggable={false} />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">{s.title}</CardTitle>
                  <CardDescription>{s.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20 reveal">
          <div className="mb-12 text-center">
            <Badge className="mb-4">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything You Need to Succeed</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful tools to accelerate your job search
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Briefcase className="h-8 w-8" />,
                title: "Curated Job Listings",
                description: "Access thousands of verified positions from top companies worldwide",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: <Sparkles className="h-8 w-8" />,
                title: "AI Interview Practice",
                description: "Master interviews with our advanced AI-powered preparation system",
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: <TrendingUp className="h-8 w-8" />,
                title: "Smart Tracking",
                description: "Keep track of all applications, interviews, and offers in one place",
                color: "from-orange-500 to-red-500",
              },
              {
                icon: <Shield className="h-8 w-8" />,
                title: "Verified Companies",
                description: "Apply only to legitimate, verified employers for your safety",
                color: "from-green-500 to-emerald-500",
              },
              {
                icon: <Zap className="h-8 w-8" />,
                title: "Instant Notifications",
                description: "Never miss an update with real-time application status alerts",
                color: "from-yellow-500 to-orange-500",
              },
              {
                icon: <Target className="h-8 w-8" />,
                title: "Perfect Match",
                description: "Get matched with jobs that fit your skills and career goals",
                color: "from-indigo-500 to-purple-500",
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className="group relative overflow-hidden border-2 transition-all hover:-translate-y-2 hover:shadow-xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 transition-opacity group-hover:opacity-10`} />
                <CardHeader>
                  <div className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Animated Carousel */}
        <section className="container mx-auto px-4 py-20 reveal">
          <div className="relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-background via-primary/5 to-background shadow-2xl">
            <div className="relative h-80 md:h-96">
              {slides.map((s, i) => (
                <div
                  key={i}
                  className={`absolute inset-0 grid place-items-center transition-opacity duration-1000 ${i === current ? "opacity-100" : "opacity-0"}`}
                >
                  <div className="relative mx-auto w-full max-w-3xl px-8 py-16 text-center">
                    <div className={`pointer-events-none absolute -inset-12 -z-10 rounded-3xl bg-gradient-to-br ${s.color} blur-3xl`} />
                    <div className="mb-6 inline-flex justify-center text-primary">
                      {s.icon}
                    </div>
                    <h3 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">{s.title}</h3>
                    <p className="text-lg text-muted-foreground md:text-xl">{s.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-3">
              {slides.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all ${i === current ? "w-12 bg-primary" : "w-2 bg-muted"}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y bg-gradient-to-br from-primary/5 via-background to-purple-500/5 reveal">
          <div className="container mx-auto grid grid-cols-2 gap-8 px-4 py-16 text-center md:grid-cols-4">
            {[
              { label: "Open Roles", ref: 0, icon: <Briefcase className="h-6 w-6" /> },
              { label: "Hiring Companies", ref: 1, icon: <Building2 className="h-6 w-6" /> },
              { label: "Active Candidates", ref: 2, icon: <Users className="h-6 w-6" /> },
              { label: "User Rating", ref: 3, icon: <Star className="h-6 w-6" /> },
            ].map((stat, i) => (
              <div key={i} className="space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {stat.icon}
                </div>
                <div className="text-4xl font-bold">
                  <span ref={(el) => { countersRef.current[stat.ref] = el; }}>0</span>
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Jobs */}
        <section className="container mx-auto px-4 py-20 reveal">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <Badge className="mb-4">Featured</Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Hot Jobs Right Now</h2>
              <p className="mt-2 text-muted-foreground">Latest opportunities from top companies</p>
            </div>
            <Button variant="ghost" onClick={() => navigate("/jobs")} className="gap-2 group">
              View All
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {loadingJobs ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-2">
                  <CardHeader className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                      <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-muted animate-pulse rounded" />
                      <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t">
                    <div className="h-8 w-full bg-muted animate-pulse rounded" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : featuredJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No jobs available yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Check back soon for new opportunities
                </p>
                <Button onClick={() => navigate("/jobs")}>Browse All Jobs</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredJobs.map((job, i) => (
                <Card
                  key={job.id}
                  className="group relative overflow-hidden border-2 transition-all hover:-translate-y-2 hover:shadow-2xl cursor-pointer h-full flex flex-col"
                  onClick={async () => {
                    // Track click for candidates
                    if (isSignedIn) {
                      const token = await getToken();
                      if (token) {
                        apiClient.trackJobClick(job.id, token);
                      }
                    }
                    navigate(`/jobs/${job.id}`);
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardHeader className="relative">
                    <div className="mb-4 flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${getCompanyColor(i)} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}>
                        {getCompanyInitial(job)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardDescription className="text-xs truncate">
                          {job.company?.name || "Company"}
                        </CardDescription>
                        <CardTitle className="text-lg truncate">{job.title}</CardTitle>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">{getLocation(job)}</Badge>
                      <Badge variant="outline" className="text-xs">
                        {job.type === "FULL_TIME" ? "Full-time" : 
                         job.type === "PART_TIME" ? "Part-time" : 
                         job.type === "CONTRACT" ? "Contract" : job.type}
                      </Badge>
                      {getSalaryRange(job) !== "Negotiable" && (
                        <Badge variant="outline" className="text-xs">{getSalaryRange(job)}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="relative flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {job.description || "No description available"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5 min-h-[1.5rem]">
                      {getSkillTags(job).length > 0 ? (
                        getSkillTags(job).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground/50">No skills listed</span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="relative justify-between border-t bg-muted/30">
                    <span className="text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                    <Button size="sm" variant="ghost" className="gap-1 group-hover:gap-2 transition-all">
                      Apply
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Proof / Social */}
        <section className="container mx-auto px-4 pb-20 reveal">
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Verified employers",
                desc: "Browse companies with clear profiles, websites, and ratings.",
                icon: <Shield className="h-6 w-6" />,
                color: "from-green-500 to-emerald-500",
              },
              {
                title: "AI interview practice",
                desc: "Practice, get feedback, and improve confidence for real interviews.",
                icon: <Sparkles className="h-6 w-6" />,
                color: "from-purple-500 to-pink-500",
              },
              {
                title: "Stay organized",
                desc: "Track jobs, interviews, and saved opportunities in one dashboard.",
                icon: <TrendingUp className="h-6 w-6" />,
                color: "from-blue-500 to-cyan-500",
              },
            ].map((b) => (
              <Card key={b.title} className="border-2 hover:shadow-xl transition-all">
                <CardHeader>
                  <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${b.color} text-white`}>
                    {b.icon}
                  </div>
                  <CardTitle className="text-lg">{b.title}</CardTitle>
                  <CardDescription>{b.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-purple-500 to-pink-500 text-white reveal">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:50px_50px]" />
          <div className="container relative mx-auto px-4 py-20 text-center">
            <div className="mx-auto max-w-3xl space-y-6">
              <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
                Ready to Start Your Journey?
              </h2>
              <p className="text-lg text-white/90 md:text-xl">
                Join thousands of professionals who found their dream jobs through our platform
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate("/jobs")}
                  className="gap-2 group"
                >
                  Get Started Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/companies")}
                  className="border-white bg-transparent text-white hover:bg-white/10"
                >
                  Browse Companies
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t">
          <div className="container mx-auto px-4 py-12">
            <div className="grid gap-8 md:grid-cols-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <img src={logo} alt="Logo" className="h-8 w-8" />
                  <span className="text-xl font-bold">DevPrep</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your AI-powered career companion for landing dream jobs.
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Product</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="cursor-pointer hover:text-foreground">Features</div>
                  <div className="cursor-pointer hover:text-foreground">Pricing</div>
                  <div className="cursor-pointer hover:text-foreground">FAQ</div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Company</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="cursor-pointer hover:text-foreground">About</div>
                  <div className="cursor-pointer hover:text-foreground">Blog</div>
                  <div className="cursor-pointer hover:text-foreground">Careers</div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Legal</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="cursor-pointer hover:text-foreground">Privacy</div>
                  <div className="cursor-pointer hover:text-foreground">Terms</div>
                  <div className="cursor-pointer hover:text-foreground">Contact</div>
                </div>
              </div>
            </div>
            <Separator className="my-8" />
            <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
              <div>© {new Date().getFullYear()} DevPrep. All rights reserved.</div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Verified Platform
                </Badge>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
};

export default Home;
