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
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "title") {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
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

        navigate("/recruiter/jobs");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/recruiter/jobs")}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Job"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-600">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <div className="space-y-6">
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

              {/* Requirements */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Requirements</label>
                <RichTextEditor
                  value={formData.requirements}
                  onChange={handleRichTextChange("requirements")}
                  placeholder="Job requirements... (Supports rich text, images, formatting)"
                />
              </div>

              {/* Responsibilities */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Responsibilities</label>
                <RichTextEditor
                  value={formData.responsibilities}
                  onChange={handleRichTextChange("responsibilities")}
                  placeholder="Key responsibilities... (Supports rich text, images, formatting)"
                />
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Benefits & Perks</label>
                <RichTextEditor
                  value={formData.benefits}
                  onChange={handleRichTextChange("benefits")}
                  placeholder="Benefits and perks... (Supports rich text, images, formatting)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills & Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Skills & Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Skills</label>
                    <span className="text-xs text-muted-foreground">{selectedSkillIds.length} selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2 rounded-md border border-dashed border-muted p-3 min-h-[100px]">
                    {skillOptions.map((opt) => {
                      const active = selectedSkillIds.includes(opt.value);
                      return (
                        <Badge
                          key={opt.value}
                          variant={active ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() =>
                            setSelectedSkillIds((prev) =>
                              prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                            )
                          }
                        >
                          {opt.label}
                        </Badge>
                      );
                    })}
                    {skillOptions.length === 0 && <span className="text-xs text-muted-foreground">No skills</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Categories</label>
                    <span className="text-xs text-muted-foreground">{selectedCategoryIds.length} selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2 rounded-md border border-dashed border-muted p-3 min-h-[100px]">
                    {categoryOptions.map((opt) => {
                      const active = selectedCategoryIds.includes(opt.value);
                      return (
                        <Badge
                          key={opt.value}
                          variant={active ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() =>
                            setSelectedCategoryIds((prev) =>
                              prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                            )
                          }
                        >
                          {opt.label}
                        </Badge>
                      );
                    })}
                    {categoryOptions.length === 0 && (
                      <span className="text-xs text-muted-foreground">No categories</span>
                    )}
                  </div>
                </div>
              </div>
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
                  placeholder="Add interview question..."
                />
                <Button type="button" onClick={handleAddQuestion}>
                  Add
                </Button>
              </div>
              {formData.interviewQuestions.length > 0 && (
                <div className="space-y-2">
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

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Salary */}
          <Card>
            <CardHeader>
              <CardTitle>Salary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}

