import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { isRecruiterLoggedIn, getCurrentUser } from "@/lib/auth";
import {
  ArrowLeft,
  Save,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type Job = {
  id: string;
  title: string;
  slug: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  interviewQuestions?: string[];
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
  benefits: string;
  interviewQuestions: string[];
  location: string;
  locationType: string;
  employmentType: string;
  experienceLevel: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  status: string;
};

const jobStatusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  DRAFT: {
    label: "Draft",
    icon: <FileText className="h-3.5 w-3.5" />,
    color: "bg-slate-100 dark:bg-slate-950/30 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800",
  },
  PUBLISHED: {
    label: "Published",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  CLOSED: {
    label: "Closed",
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  },
  ARCHIVED: {
    label: "Archived",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
};

const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

export default function RecruiterJobForm() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const currentUser = getCurrentUser();
  const userId = currentUser?.id;
  const isEditMode = Boolean(jobId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [skillOptions, setSkillOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    slug: "",
    description: "",
    requirements: "",
    responsibilities: "",
    benefits: "",
    interviewQuestions: [],
    location: "",
    locationType: "REMOTE",
    employmentType: "FULL_TIME",
    experienceLevel: "MID_LEVEL",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "USD",
    status: "DRAFT",
  });
  const [questionInput, setQuestionInput] = useState("");
  const [showRequirements, setShowRequirements] = useState(false);
  const [showResponsibilities, setShowResponsibilities] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  // Check auth
  useEffect(() => {
    if (!isRecruiterLoggedIn()) {
      navigate("/login");
    }
  }, [navigate]);

  // Load job data if editing
  useEffect(() => {
    const loadJob = async () => {
      if (!jobId || !userId) return;

      try {
        const response = await fetch(`${API_BASE}/jobs/${jobId}?include=company,recruiter,skills,categories`, {
          headers: {
            "Authorization": `Bearer ${userId}`,
          },
        });

        const data = await response.json();
        if (data.success && data.data) {
          const job = data.data as Job;
          setFormData({
            title: job.title,
            slug: job.slug,
            description: job.description,
            requirements: job.requirements || "",
            responsibilities: job.responsibilities || "",
            benefits: job.benefits || "",
            interviewQuestions: job.interviewQuestions || [],
            location: job.location || "",
            locationType: job.locationType || "REMOTE",
            employmentType: job.employmentType || "FULL_TIME",
            experienceLevel: job.experienceLevel || "MID_LEVEL",
            salaryMin: job.salaryMin?.toString() || "",
            salaryMax: job.salaryMax?.toString() || "",
            salaryCurrency: job.salaryCurrency || "USD",
            status: job.status,
          });

          // Auto-show sections if they have content
          if (job.requirements) setShowRequirements(true);
          if (job.responsibilities) setShowResponsibilities(true);
          if (job.benefits) setShowBenefits(true);

          // Load skills and categories
          if (job.skills) {
            setSelectedSkillIds(job.skills.map((s: any) => String(s.skillId)));
          }
          if (job.categories) {
            setSelectedCategoryIds(job.categories.map((c: any) => String(c.categoryId)));
          }
        }
      } catch (err) {
        console.error("Failed to load job:", err);
        setError("Failed to load job data");
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode) {
      loadJob();
    } else {
      setLoading(false);
    }
  }, [jobId, userId, isEditMode]);

  // Load skills and categories options
  useEffect(() => {
    const loadOptions = async () => {
      if (!userId) return;

      try {
        const [skillsRes, categoriesRes] = await Promise.all([
          fetch(`${API_BASE}/skills?pageSize=500`, {
            headers: { "Authorization": `Bearer ${userId}` },
          }),
          fetch(`${API_BASE}/categories?pageSize=500`, {
            headers: { "Authorization": `Bearer ${userId}` },
          }),
        ]);

        const [skillsData, categoriesData] = await Promise.all([
          skillsRes.json(),
          categoriesRes.json(),
        ]);

        if (skillsData.success) {
          setSkillOptions(
            (skillsData.data || []).map((s: any) => ({
              value: String(s.id),
              label: s.name,
            }))
          );
        }

        if (categoriesData.success) {
          setCategoryOptions(
            (categoriesData.data || []).map((c: any) => ({
              value: String(c.id),
              label: c.name,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load options:", err);
      }
    };

    loadOptions();
  }, [userId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-save status when changed (only in edit mode)
    if (name === "status" && isEditMode && jobId) {
      const oldStatus = formData.status;
      setFormData((prev) => ({ ...prev, [name]: value }));
      handleStatusChange(value, oldStatus);
      return;
    }

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "title") {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  const handleStatusChange = async (newStatus: string, oldStatus: string) => {
    if (!currentUser || !userId || !jobId) return;

    setSaving(true);
    setError(null);

    try {
      const meResponse = await fetch(`${API_BASE}/auth/me`, {
        headers: { "Authorization": `Bearer ${userId}` },
      });
      const meData = await meResponse.json();

      if (!meData.success || !meData.recruiterProfile) {
        setError("Recruiter profile not found");
        setFormData((prev) => ({ ...prev, status: oldStatus }));
        return;
      }

      const payload: any = {
        status: newStatus,
      };

      const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Failed to update status");
        // Revert status on error
        setFormData((prev) => ({ ...prev, status: oldStatus }));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      setError("Network error");
      // Revert status on error
      setFormData((prev) => ({ ...prev, status: oldStatus }));
    } finally {
      setSaving(false);
    }
  };

  const handleRichTextChange = (field: keyof JobFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddQuestion = () => {
    const trimmed = questionInput.trim();
    if (!trimmed) return;
    setFormData((prev) => ({
      ...prev,
      interviewQuestions: [...prev.interviewQuestions, trimmed],
    }));
    setQuestionInput("");
  };

  const handleRemoveQuestion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      interviewQuestions: prev.interviewQuestions.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!currentUser || !userId) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const meResponse = await fetch(`${API_BASE}/auth/me`, {
        headers: { "Authorization": `Bearer ${userId}` },
      });
      const meData = await meResponse.json();

      if (!meData.success || !meData.recruiterProfile) {
        setError("Recruiter profile not found");
        return;
      }

      const payload: any = {
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        description: formData.description,
        requirements: formData.requirements || null,
        responsibilities: formData.responsibilities || null,
        benefits: formData.benefits || null,
        interviewQuestions: formData.interviewQuestions.filter((q) => q.trim().length > 0),
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

      const url = isEditMode
        ? `${API_BASE}/jobs/${jobId}`
        : `${API_BASE}/jobs`;
      
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        const savedJobId = (data.data?.id as string | undefined) || jobId;

        // Sync selected skills/categories to join tables
        if (savedJobId) {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userId}`,
          };
          const [jobSkillsRes, jobCatsRes] = await Promise.all([
            fetch(`${API_BASE}/job-skills?pageSize=500`, { headers }),
            fetch(`${API_BASE}/job-categories?pageSize=500`, { headers }),
          ]);
          const [jobSkillsJson, jobCatsJson] = await Promise.all([
            jobSkillsRes.json(),
            jobCatsRes.json(),
          ]);
          const existingSkills = ((jobSkillsJson?.data || []) as any[]).filter(
            (r) => String(r.jobId) === String(savedJobId)
          );
          const existingCats = ((jobCatsJson?.data || []) as any[]).filter(
            (r) => String(r.jobId) === String(savedJobId)
          );

          const existingSkillIds = new Set(existingSkills.map((r) => String(r.skillId)));
          const existingCatIds = new Set(existingCats.map((r) => String(r.categoryId)));

          await Promise.all(
            existingSkills
              .filter((r) => !selectedSkillIds.includes(String(r.skillId)))
              .map((r) =>
                fetch(
                  `${API_BASE}/job-skills/${encodeURIComponent(String(r.jobId))}/${encodeURIComponent(String(r.skillId))}`,
                  {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${userId}` },
                  }
                )
              )
          );
          await Promise.all(
            selectedSkillIds
              .filter((sid) => !existingSkillIds.has(String(sid)))
              .map((sid) =>
                fetch(`${API_BASE}/job-skills`, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ jobId: savedJobId, skillId: sid, isRequired: true }),
                })
              )
          );

          await Promise.all(
            existingCats
              .filter((r) => !selectedCategoryIds.includes(String(r.categoryId)))
              .map((r) =>
                fetch(
                  `${API_BASE}/job-categories/${encodeURIComponent(String(r.jobId))}/${encodeURIComponent(String(r.categoryId))}`,
                  {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${userId}` },
                  }
                )
              )
          );
          await Promise.all(
            selectedCategoryIds
              .filter((cid) => !existingCatIds.has(String(cid)))
              .map((cid) =>
                fetch(`${API_BASE}/job-categories`, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ jobId: savedJobId, categoryId: cid }),
                })
              )
          );
        }

        // Show success message
        setSuccessMessage(isEditMode ? "Job updated successfully!" : "Job created successfully!");
        
        // If creating new job, navigate to edit page
        if (!isEditMode && savedJobId) {
          // Update URL to edit mode without navigation
          window.history.replaceState(null, "", `/recruiter/jobs/${savedJobId}/edit`);
          // Reload job data
          const reloadResponse = await fetch(`${API_BASE}/jobs/${savedJobId}?include=company,recruiter,skills,categories`, {
            headers: {
              "Authorization": `Bearer ${userId}`,
            },
          });
          const reloadData = await reloadResponse.json();
          if (reloadData.success) {
            const job = reloadData.data;
            setFormData({
              title: job.title || "",
              slug: job.slug || "",
              description: job.description || "",
              requirements: job.requirements || "",
              responsibilities: job.responsibilities || "",
              benefits: job.benefits || "",
              interviewQuestions: job.interviewQuestions || [],
              location: job.location || "",
              locationType: job.locationType || "REMOTE",
              employmentType: job.employmentType || "FULL_TIME",
              experienceLevel: job.experienceLevel || "MID_LEVEL",
              salaryMin: job.salaryMin?.toString() || "",
              salaryMax: job.salaryMax?.toString() || "",
              salaryCurrency: job.salaryCurrency || "USD",
              status: job.status || "DRAFT",
            });
            setSelectedSkillIds((job.skills || []).map((s: any) => String(s.skillId)));
            setSelectedCategoryIds((job.categories || []).map((c: any) => String(c.categoryId)));
          }
        }
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="sm" onClick={() => navigate("/recruiter/jobs")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode ? "Edit Job" : "Create New Job"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode ? "Update job details" : "Fill in the details to create a new job posting"}
            </p>
          </div>
        </div>
        {/* Status Selector */}
        <div className="relative inline-flex items-center">
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className={`inline-flex h-9 items-center gap-1.5 pl-8 pr-8 text-sm font-medium rounded-md border cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              jobStatusConfig[formData.status]?.color || "bg-muted text-muted-foreground border-border"
            }`}
          >
            {Object.keys(jobStatusConfig).map((key) => (
              <option key={key} value={key}>
                {jobStatusConfig[key].label}
              </option>
            ))}
          </select>
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
            {jobStatusConfig[formData.status]?.icon ?? <Clock className="h-3.5 w-3.5" />}
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>


      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <CardContent className="p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Form */}
        <div className="grid gap-6 lg:grid-cols-10">
          {/* Left Column - 70% (7 columns) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <RichTextEditor
                    value={formData.description}
                    onChange={handleRichTextChange("description")}
                    placeholder="Job description... (Supports rich text, images, formatting)"
                  />
                </div>

                {/* Requirements - Collapsible */}
                {!showRequirements ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRequirements(true)}
                    className="w-full justify-start"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Requirements (Optional)
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Requirements</label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowRequirements(false);
                          setFormData((prev) => ({ ...prev, requirements: "" }));
                        }}
                        className="h-7 px-2"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <RichTextEditor
                      value={formData.requirements}
                      onChange={handleRichTextChange("requirements")}
                      placeholder="Job requirements... (Supports rich text, images, formatting)"
                    />
                  </div>
                )}

                {/* Responsibilities - Collapsible */}
                {!showResponsibilities ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResponsibilities(true)}
                    className="w-full justify-start"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Responsibilities (Optional)
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Responsibilities</label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowResponsibilities(false);
                          setFormData((prev) => ({ ...prev, responsibilities: "" }));
                        }}
                        className="h-7 px-2"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <RichTextEditor
                      value={formData.responsibilities}
                      onChange={handleRichTextChange("responsibilities")}
                      placeholder="Key responsibilities... (Supports rich text, images, formatting)"
                    />
                  </div>
                )}

                {/* Benefits - Collapsible */}
                {!showBenefits ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBenefits(true)}
                    className="w-full justify-start"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Benefits & Perks (Optional)
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Benefits & Perks</label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowBenefits(false);
                          setFormData((prev) => ({ ...prev, benefits: "" }));
                        }}
                        className="h-7 px-2"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <RichTextEditor
                      value={formData.benefits}
                      onChange={handleRichTextChange("benefits")}
                      placeholder="Benefits and perks... (Supports rich text, images, formatting)"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interview Questions */}
            <Card>
              <CardHeader>
                <CardTitle>Interview Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddQuestion();
                      }
                    }}
                    placeholder="Add question..."
                  />
                  <Button type="button" onClick={handleAddQuestion}>
                    Add
                  </Button>
                </div>
                {formData.interviewQuestions.length > 0 && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {formData.interviewQuestions.map((q, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                        <span className="text-sm flex-1">{q}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQuestion(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 30% (3 columns) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Job Details & Salary - Combined */}
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <option value="FREELANCE">Freelance</option>
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
                  </select>
                </div>
                
                <div className="pt-4 border-t space-y-4">
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
              </CardContent>
            </Card>

            {/* Skills & Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Skills & Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Skills */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Skills</label>
                    <span className="text-xs text-muted-foreground">{selectedSkillIds.length} selected</span>
                  </div>
                  
                  {/* Selected Skills - Compact display */}
                  {selectedSkillIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-2">
                      {selectedSkillIds.map((skillId) => {
                        const skill = skillOptions.find((s) => s.value === skillId);
                        if (!skill) return null;
                        return (
                          <Badge
                            key={skillId}
                            variant="default"
                            className="text-xs px-2 py-0.5 cursor-pointer hover:bg-primary/80"
                            onClick={() =>
                              setSelectedSkillIds((prev) => prev.filter((v) => v !== skillId))
                            }
                          >
                            {skill.label}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      placeholder="Search skills..."
                      className="pl-8 h-9 text-sm"
                    />
                  </div>

                  {/* Skills List - Scrollable */}
                  <div className="max-h-[120px] overflow-y-auto rounded-md border border-dashed border-muted p-2">
                    <div className="flex flex-wrap gap-1.5">
                      {skillOptions
                        .filter((opt) =>
                          opt.label.toLowerCase().includes(skillSearch.toLowerCase())
                        )
                        .map((opt) => {
                          const active = selectedSkillIds.includes(opt.value);
                          return (
                            <Badge
                              key={opt.value}
                              variant={active ? "default" : "outline"}
                              className={`text-xs px-2 py-0.5 cursor-pointer transition-colors ${
                                active
                                  ? "bg-primary hover:bg-primary/80"
                                  : "hover:bg-muted"
                              }`}
                              onClick={() =>
                                setSelectedSkillIds((prev) =>
                                  prev.includes(opt.value)
                                    ? prev.filter((v) => v !== opt.value)
                                    : [...prev, opt.value]
                                )
                              }
                            >
                              {opt.label}
                            </Badge>
                          );
                        })}
                      {skillOptions.filter((opt) =>
                        opt.label.toLowerCase().includes(skillSearch.toLowerCase())
                      ).length === 0 && (
                        <span className="text-xs text-muted-foreground py-2">No skills found</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Categories</label>
                    <span className="text-xs text-muted-foreground">{selectedCategoryIds.length} selected</span>
                  </div>

                  {/* Selected Categories - Compact display */}
                  {selectedCategoryIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-2">
                      {selectedCategoryIds.map((categoryId) => {
                        const category = categoryOptions.find((c) => c.value === categoryId);
                        if (!category) return null;
                        return (
                          <Badge
                            key={categoryId}
                            variant="default"
                            className="text-xs px-2 py-0.5 cursor-pointer hover:bg-primary/80"
                            onClick={() =>
                              setSelectedCategoryIds((prev) => prev.filter((v) => v !== categoryId))
                            }
                          >
                            {category.label}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search categories..."
                      className="pl-8 h-9 text-sm"
                    />
                  </div>

                  {/* Categories List - Scrollable */}
                  <div className="max-h-[120px] overflow-y-auto rounded-md border border-dashed border-muted p-2">
                    <div className="flex flex-wrap gap-1.5">
                      {categoryOptions
                        .filter((opt) =>
                          opt.label.toLowerCase().includes(categorySearch.toLowerCase())
                        )
                        .map((opt) => {
                          const active = selectedCategoryIds.includes(opt.value);
                          return (
                            <Badge
                              key={opt.value}
                              variant={active ? "default" : "outline"}
                              className={`text-xs px-2 py-0.5 cursor-pointer transition-colors ${
                                active
                                  ? "bg-primary hover:bg-primary/80"
                                  : "hover:bg-muted"
                              }`}
                              onClick={() =>
                                setSelectedCategoryIds((prev) =>
                                  prev.includes(opt.value)
                                    ? prev.filter((v) => v !== opt.value)
                                    : [...prev, opt.value]
                                )
                              }
                            >
                              {opt.label}
                            </Badge>
                          );
                        })}
                      {categoryOptions.filter((opt) =>
                        opt.label.toLowerCase().includes(categorySearch.toLowerCase())
                      ).length === 0 && (
                        <span className="text-xs text-muted-foreground py-2">No categories found</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => navigate("/recruiter/jobs")}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Job"}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Toast - Fixed at top right corner */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 fade-in-0">
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 shadow-lg min-w-[300px]">
            <CardContent className="p-4 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{successMessage}</span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

