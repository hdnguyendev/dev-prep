import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BriefcaseBusiness,
  Users,
  ClipboardList,
  Calendar,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

type Stats = {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  totalInterviews: number;
  pendingApplications: number;
  upcomingInterviews: number;
};

type Job = {
  id: string;
  title: string;
  status: string;
  location?: string;
  applicationsCount: number;
  createdAt: string;
};

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    totalInterviews: 0,
    pendingApplications: 0,
    upcomingInterviews: 0,
  });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";
        
        // Fetch jobs
        const jobsRes = await fetch(`${apiBase}/jobs?pageSize=100`);
        const jobsData = await jobsRes.json();
        const jobs = jobsData.data || [];
        
        // Fetch applications
        const appsRes = await fetch(`${apiBase}/applications?pageSize=100`);
        const appsData = await appsRes.json();
        const applications = appsData.data || [];
        
        // Fetch interviews
        const interviewsRes = await fetch(`${apiBase}/interviews?pageSize=100`);
        const interviewsData = await interviewsRes.json();
        const interviews = interviewsData.data || [];

        // Calculate stats
        const activeJobs = jobs.filter((j: Job) => j.status === "PUBLISHED").length;
        const pendingApps = applications.filter((a: any) => a.status === "APPLIED" || a.status === "REVIEWING").length;
        const upcoming = interviews.filter((i: any) => 
          new Date(i.scheduledAt) > new Date() && i.status === "SCHEDULED"
        ).length;

        setStats({
          totalJobs: jobs.length,
          activeJobs,
          totalApplications: applications.length,
          totalInterviews: interviews.length,
          pendingApplications: pendingApps,
          upcomingInterviews: upcoming,
        });

        // Recent jobs
        setRecentJobs(jobs.slice(0, 5));
      } catch (err) {
        console.error("Failed to load recruiter data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <main className="min-h-dvh bg-muted/40 py-8">
          <div className="container mx-auto px-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Manage recruitment pipeline
                </p>
              </div>
              <Badge variant="default" className="gap-1">
                <BriefcaseBusiness className="h-3 w-3" />
                Recruiter
              </Badge>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading dashboard...</p>
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                      <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalJobs}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.activeJobs} active
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Applications</CardTitle>
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalApplications}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.pendingApplications} pending review
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Interviews</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalInterviews}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.upcomingInterviews} upcoming
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <Button
                        variant="outline"
                        className="h-auto flex-col gap-2 py-4"
                        onClick={() => navigate("/jobs")}
                      >
                        <BriefcaseBusiness className="h-5 w-5" />
                        <span className="text-sm">Manage Jobs</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto flex-col gap-2 py-4"
                        onClick={() => navigate("/applications")}
                      >
                        <ClipboardList className="h-5 w-5" />
                        <span className="text-sm">View Applications</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto flex-col gap-2 py-4"
                        onClick={() => navigate("/interviews")}
                      >
                        <Calendar className="h-5 w-5" />
                        <span className="text-sm">Schedule Interviews</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto flex-col gap-2 py-4"
                        onClick={() => navigate("/admin/candidate-profiles")}
                      >
                        <Users className="h-5 w-5" />
                        <span className="text-sm">View Candidates</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Jobs */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Job Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentJobs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No jobs posted yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {recentJobs.map((job) => (
                          <div
                            key={job.id}
                            className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition cursor-pointer"
                            onClick={() => navigate(`/jobs/${job.id}`)}
                          >
                            <div className="flex-1">
                              <h3 className="font-medium">{job.title}</h3>
                              <p className="text-xs text-muted-foreground">
                                {job.location || "Remote"} • Posted {new Date(job.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm font-medium">{job.applicationsCount || 0}</div>
                                <div className="text-xs text-muted-foreground">applications</div>
                              </div>
                              <Badge
                                variant={job.status === "PUBLISHED" ? "default" : "outline"}
                                className="gap-1"
                              >
                                {job.status === "PUBLISHED" ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : job.status === "DRAFT" ? (
                                  <Clock className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                {job.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Overview */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Hiring Pipeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>New Applications</span>
                          <span className="font-medium">{stats.pendingApplications}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Scheduled Interviews</span>
                          <span className="font-medium">{stats.upcomingInterviews}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Active Job Posts</span>
                          <span className="font-medium">{stats.activeJobs}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Quick Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Review pending applications daily</li>
                        <li>• Schedule interviews within 48 hours</li>
                        <li>• Keep job descriptions updated</li>
                        <li>• Respond to candidate inquiries promptly</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </main>
      </SignedIn>
    </>
  );
};

export default RecruiterDashboard;
