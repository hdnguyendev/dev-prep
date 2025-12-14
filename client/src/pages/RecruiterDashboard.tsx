import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isRecruiterLoggedIn, logout, getCurrentUser } from "@/lib/auth";
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
  Building2,
  MapPin,
  Globe,
  Edit,
  Save,
  X,
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

type Company = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  website?: string | null;
  industry?: string | null;
  companySize?: string | null;  // Backend uses "companySize" not "size"
  foundedYear?: number | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;  // Backend uses "coverUrl" not "coverImageUrl"
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  const [company, setCompany] = useState<Company | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Only allow RECRUITER role (Admin has their own dashboard)
    const user = getCurrentUser();
    console.log("RecruiterDashboard - Current user:", user);
    
    if (!isRecruiterLoggedIn()) {
      console.log("Not logged in as recruiter, redirecting to /login");
      navigate("/login");
    } else {
      console.log("Recruiter authenticated");
      setIsAuthenticated(true);
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentUser = getCurrentUser();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";
        
        // Get auth header
        const headers: Record<string, string> = {};
        if (currentUser) {
          headers["Authorization"] = `Bearer ${currentUser.id}`;
        }
        
        // Fetch recruiter profile with company info
        const meRes = await fetch(`${apiBase}/auth/me`, { headers });
        const meData = await meRes.json();
        console.log("Auth /me response:", meData);
        if (meData.success && meData.recruiterProfile?.company) {
          console.log("Setting company:", meData.recruiterProfile.company);
          setCompany(meData.recruiterProfile.company);
        } else {
          console.log("No company found in response");
        }
        
        // Fetch jobs (use filtered API endpoint to get only recruiter's jobs)
        const jobsRes = await fetch(`${apiBase}/api/jobs?pageSize=100`, { headers });
        const jobsData = await jobsRes.json();
        const jobs = jobsData.data || [];
        
        // Fetch applications (use filtered API endpoint)
        const appsRes = await fetch(`${apiBase}/api/applications?pageSize=100`, { headers });
        const appsData = await appsRes.json();
        const applications = appsData.data || [];
        
        // Fetch interviews (use filtered API endpoint)
        const interviewsRes = await fetch(`${apiBase}/api/interviews?pageSize=100`, { headers });
        const interviewsData = await interviewsRes.json();
        const interviews = interviewsData.data || [];

        // Calculate stats
        const activeJobs = jobs.filter((j: Job) => j.status === "PUBLISHED").length;
        const pendingApps = applications.filter((a: any) => a.status === "APPLIED" || a.status === "REVIEWING").length;
        const upcoming = interviews.filter((i: any) => 
          i.scheduledAt && new Date(i.scheduledAt) > new Date() && i.status === "SCHEDULED"
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

    if (isAuthenticated && currentUser) {
      loadData();
    }
  }, [isAuthenticated, currentUser?.id]);

  const handleEditCompany = () => {
    if (company) {
      setEditForm(company);
      setShowEditModal(true);
    }
  };

  const handleSaveCompany = async () => {
    if (!company || !currentUser) return;

    try {
      setSaving(true);
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";
      
      const response = await fetch(`${apiBase}/companies/${company.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`,
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();
      
      if (data.success) {
        setCompany(data.data);
        setShowEditModal(false);
        // Show success message (you can add a toast here)
      } else {
        alert(data.message || "Failed to update company");
      }
    } catch (err) {
      console.error("Failed to save company:", err);
      alert("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-dvh bg-muted/40 py-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Redirecting to Login...</h2>
          <p className="text-muted-foreground">Please log in as a Recruiter</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-muted/40 py-8">
      <div className="container mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {currentUser?.email || "Manage recruitment pipeline"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <BriefcaseBusiness className="h-3 w-3" />
              {currentUser?.role || "Recruiter"}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse space-y-4">
                  <p className="text-muted-foreground text-lg">Loading dashboard...</p>
                  <div className="flex justify-center gap-2">
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Company Info Card */}
                {company && (
                  <Card className="border-primary/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={company.name}
                              className="h-16 w-16 rounded-lg object-cover border"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-8 w-8 text-primary" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-2xl">{company.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {company.industry || "No industry specified"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEditCompany}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Company
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          {company.description && (
                            <div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {company.description}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{company.city || company.country || "Location not set"}</span>
                          </div>
                          {company.website && (
                            <div className="flex items-center gap-2 text-sm">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={company.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {company.website}
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          {company.companySize && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{company.companySize} employees</span>
                            </div>
                          )}
                          {company.foundedYear && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>Founded {company.foundedYear}</span>
                            </div>
                          )}
                          {company.address && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{company.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                      onClick={() => navigate("/recruiter/jobs")}
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
                      onClick={() => navigate("/recruiter/jobs")}
                    >
                      <Users className="h-5 w-5" />
                      <span className="text-sm">Create New Job</span>
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
                            onClick={() => navigate(`/recruiter/jobs/${job.id}/applications`)}
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

        {/* Edit Company Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Company Information</DialogTitle>
              <DialogDescription>
                Update your company details. These changes will be reflected across all job postings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={editForm.industry || ""}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    placeholder="Technology"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Brief description of your company..."
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={editForm.city || ""}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="San Francisco"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={editForm.country || ""}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    placeholder="United States"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={editForm.address || ""}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="123 Main St, Suite 100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={editForm.website || ""}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Input
                    id="companySize"
                    value={editForm.companySize || ""}
                    onChange={(e) => setEditForm({ ...editForm, companySize: e.target.value })}
                    placeholder="1-50, 51-200, etc."
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="foundedYear">Founded Year</Label>
                  <Input
                    id="foundedYear"
                    type="number"
                    value={editForm.foundedYear || ""}
                    onChange={(e) => setEditForm({ ...editForm, foundedYear: parseInt(e.target.value) || undefined })}
                    placeholder="2020"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={editForm.logoUrl || ""}
                    onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverUrl">Cover Image URL</Label>
                <Input
                  id="coverUrl"
                  value={editForm.coverUrl || ""}
                  onChange={(e) => setEditForm({ ...editForm, coverUrl: e.target.value })}
                  placeholder="https://example.com/cover.png"
                />
              </div>

              {editForm.logoUrl && (
                <div className="space-y-2">
                  <Label>Logo Preview</Label>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <img
                      src={editForm.logoUrl}
                      alt="Logo preview"
                      className="h-20 w-20 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveCompany} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </main>
  );
};

export default RecruiterDashboard;
