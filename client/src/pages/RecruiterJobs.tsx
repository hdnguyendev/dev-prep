import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isRecruiterLoggedIn, getCurrentUser } from "@/lib/auth";
import {
  BriefcaseBusiness,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Save,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  DollarSign,
  Building2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type Job = {
  id: string;
  title: string;
  slug: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  location?: string;
  locationType?: string;
  employmentType?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  status: string;
  companyId: string;
  recruiterId: string;
  createdAt: string;
  company?: {
    id: string;
    name: string;
    logo?: string;
  };
};

type JobFormData = {
  title: string;
  slug: string;
  description: string;
  requirements: string;
  responsibilities: string;
  location: string;
  locationType: string;
  employmentType: string;
  experienceLevel: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  status: string;
};

const RecruiterJobs = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    slug: "",
    description: "",
    requirements: "",
    responsibilities: "",
    location: "",
    locationType: "REMOTE",
    employmentType: "FULL_TIME",
    experienceLevel: "MID_LEVEL",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "USD",
    status: "DRAFT",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check auth
  useEffect(() => {
    if (!isRecruiterLoggedIn()) {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const headers: Record<string, string> = {
          "Authorization": `Bearer ${currentUser.id}`,
        };
        
        const response = await fetch(`${API_BASE}/api/jobs?pageSize=100`, { headers });
        const data = await response.json();
        
        if (data.success) {
          setJobs(data.data || []);
        } else {
          setError(data.message || "Failed to fetch jobs");
        }
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [currentUser?.id]);

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Handle form input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-generate slug when title changes
      if (name === "title") {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  // Open create modal
  const handleCreate = async () => {
    if (!currentUser) return;

    try {
      // Fetch recruiter profile to get companyId
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          "Authorization": `Bearer ${currentUser.id}`,
        },
      });
      const data = await response.json();
      
      if (!data.recruiterProfile) {
        setError("Recruiter profile not found");
        return;
      }

      setModalMode("create");
      setFormData({
        title: "",
        slug: "",
        description: "",
        requirements: "",
        responsibilities: "",
        location: "",
        locationType: "REMOTE",
        employmentType: "FULL_TIME",
        experienceLevel: "MID_LEVEL",
        salaryMin: "",
        salaryMax: "",
        salaryCurrency: "USD",
        status: "DRAFT",
      });
      setShowModal(true);
    } catch (err) {
      console.error("Failed to prepare create:", err);
      setError("Failed to prepare create form");
    }
  };

  // Open edit modal
  const handleEdit = (job: Job) => {
    setModalMode("edit");
    setSelectedJob(job);
    setFormData({
      title: job.title,
      slug: job.slug,
      description: job.description,
      requirements: job.requirements || "",
      responsibilities: job.responsibilities || "",
      location: job.location || "",
      locationType: job.locationType || "REMOTE",
      employmentType: job.employmentType || "FULL_TIME",
      experienceLevel: job.experienceLevel || "MID_LEVEL",
      salaryMin: job.salaryMin?.toString() || "",
      salaryMax: job.salaryMax?.toString() || "",
      salaryCurrency: job.salaryCurrency || "USD",
      status: job.status,
    });
    setShowModal(true);
  };

  // Save job (create or update)
  const handleSave = async () => {
    if (!currentUser) return;

    try {
      setSaving(true);
      setError(null);

      // Get recruiter profile for companyId and recruiterId
      const meResponse = await fetch(`${API_BASE}/auth/me`, {
        headers: { "Authorization": `Bearer ${currentUser.id}` },
      });
      const meData = await meResponse.json();
      
      if (!meData.recruiterProfile) {
        setError("Recruiter profile not found");
        return;
      }

      const payload: any = {
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        description: formData.description,
        requirements: formData.requirements || null,
        responsibilities: formData.responsibilities || null,
        location: formData.location || null,
        locationType: formData.locationType,
        employmentType: formData.employmentType,
        experienceLevel: formData.experienceLevel,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : null,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : null,
        salaryCurrency: formData.salaryCurrency,
        status: formData.status,
        companyId: meData.recruiterProfile.companyId,
        recruiterId: meData.recruiterProfile.id,
      };

      const url = modalMode === "create" 
        ? `${API_BASE}/jobs`
        : `${API_BASE}/jobs/${selectedJob?.id}`;
      
      const method = modalMode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh jobs list
        const jobsResponse = await fetch(`${API_BASE}/api/jobs?pageSize=100`, {
          headers: { "Authorization": `Bearer ${currentUser.id}` },
        });
        const jobsData = await jobsResponse.json();
        
        if (jobsData.success) {
          setJobs(jobsData.data || []);
        }
        
        setShowModal(false);
        setSelectedJob(null);
      } else {
        setError(data.message || "Failed to save job");
      }
    } catch (err) {
      console.error("Failed to save job:", err);
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  // Delete job
  const handleDelete = async (job: Job) => {
    if (!currentUser) return;
    if (!confirm(`Delete job "${job.title}"?`)) return;

    try {
      const response = await fetch(`${API_BASE}/jobs/${job.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${currentUser.id}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setJobs((prev) => prev.filter((j) => j.id !== job.id));
      } else {
        setError(data.message || "Failed to delete job");
      }
    } catch (err) {
      console.error("Failed to delete job:", err);
      setError("Network error");
    }
  };

  // View applications for a job
  const handleViewApplications = (job: Job) => {
    navigate(`/recruiter/jobs/${job.id}/applications`);
  };

  if (!isRecruiterLoggedIn()) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-muted/40 py-8">
      <div className="container mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Jobs</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage your job postings
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Job
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BriefcaseBusiness className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No jobs yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Create your first job posting to start recruiting
              </p>
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <Card key={job.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base line-clamp-2">
                        {job.title}
                      </CardTitle>
                      {job.company && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {job.company.name}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={
                        job.status === "PUBLISHED"
                          ? "default"
                          : job.status === "DRAFT"
                          ? "outline"
                          : "outline"
                      }
                      className="gap-1 shrink-0"
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
                </CardHeader>
                <CardContent className="flex-1 space-y-3 text-sm">
                  <div className="space-y-1 text-muted-foreground">
                    {job.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </div>
                    )}
                    {(job.salaryMin || job.salaryMax) && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3" />
                        {job.salaryMin && job.salaryMax
                          ? `${job.salaryMin} - ${job.salaryMax} ${job.salaryCurrency || "USD"}`
                          : job.salaryMin
                          ? `From ${job.salaryMin} ${job.salaryCurrency || "USD"}`
                          : `Up to ${job.salaryMax} ${job.salaryCurrency || "USD"}`}
                      </div>
                    )}
                    <div className="text-xs">
                      Posted {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewApplications(job)}
                      className="gap-1 flex-1"
                    >
                      <Eye className="h-3 w-3" />
                      Applications
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(job)}
                      className="gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(job)}
                      className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle>
                {modalMode === "create" ? "Create New Job" : "Edit Job"}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowModal(false);
                  setSelectedJob(null);
                  setError(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Senior Frontend Developer"
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <Input
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="auto-generated-from-title"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-generated from title, or customize
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Description <span className="text-red-500">*</span>
                </label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Job description..."
                  rows={4}
                  required
                />
              </div>

              {/* Requirements */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Requirements</label>
                <Textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  placeholder="Job requirements..."
                  rows={3}
                />
              </div>

              {/* Responsibilities */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Responsibilities</label>
                <Textarea
                  name="responsibilities"
                  value={formData.responsibilities}
                  onChange={handleInputChange}
                  placeholder="Key responsibilities..."
                  rows={3}
                />
              </div>

              {/* Location & Type */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location Type</label>
                  <select
                    name="locationType"
                    value={formData.locationType}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="REMOTE">Remote</option>
                    <option value="ONSITE">On-site</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
              </div>

              {/* Employment & Experience */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Employment Type</label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Experience Level</label>
                  <select
                    name="experienceLevel"
                    value={formData.experienceLevel}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="ENTRY_LEVEL">Entry Level</option>
                    <option value="MID_LEVEL">Mid Level</option>
                    <option value="SENIOR_LEVEL">Senior Level</option>
                    <option value="LEAD">Lead</option>
                    <option value="EXECUTIVE">Executive</option>
                  </select>
                </div>
              </div>

              {/* Salary */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Salary Min</label>
                  <Input
                    name="salaryMin"
                    type="number"
                    value={formData.salaryMin}
                    onChange={handleInputChange}
                    placeholder="50000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Salary Max</label>
                  <Input
                    name="salaryMax"
                    type="number"
                    value={formData.salaryMax}
                    onChange={handleInputChange}
                    placeholder="100000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    name="salaryCurrency"
                    value={formData.salaryCurrency}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="VND">VND</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="CLOSED">Closed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedJob(null);
                    setError(null);
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : modalMode === "create" ? "Create" : "Update"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
};

export default RecruiterJobs;
