import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { adminResources } from "@/lib/adminResources";
import { adminClient, useAdminToken } from "@/lib/adminClient";
import { normalizeAdminPayload } from "@/lib/adminNormalize";
import { getCompanySizeOptions, getFoundedYearOptions } from "@/constants/company";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdminLoggedIn } from "@/lib/auth";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import {
  CheckCircle2,
  XCircle,
  Shield,
  Circle,
  PauseCircle,
  AlertTriangle,
  Ban,
  AlarmClock,
  Sparkles,
  ExternalLink,
  Blocks,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

type AdminRow = Record<string, unknown>;

const isImageField = (field: string) => /(avatar|logo|cover|image|photo|picture|icon)/i.test(field);

const formatLabel = (field: string) => {
  const clean = field.replace(/^is([A-Z])/, (_, c) => c.toUpperCase());
  return clean
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
};

const AdminDetail = () => {
  const { resource: resourcePath, id } = useParams();
  const navigate = useNavigate();
  const getToken = useAdminToken();
  const [row, setRow] = useState<AdminRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [jobSkillIds, setJobSkillIds] = useState<string[]>([]);
  const [jobCategoryIds, setJobCategoryIds] = useState<string[]>([]);
  const [skillOptions, setSkillOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);

  // Check admin authentication
  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate("/login");
    }
  }, [navigate]);
  const getInitials = (r: AdminRow) => {
    const first = (r.firstName as string | undefined) || "";
    const last = (r.lastName as string | undefined) || "";
    const email = (r.email as string | undefined) || "";
    const base = `${first} ${last}`.trim() || email;
    return base ? base.trim().slice(0, 2).toUpperCase() : "NA";
  };
  const resource = useMemo(
    () => adminResources.find((r) => r.path === resourcePath || r.key === resourcePath),
    [resourcePath]
  );

  const isIdField = (field: string) =>
    field === "id" || field.endsWith("Id") || (resource?.primaryKeys || []).includes(field);

  const relationMap = useMemo(
    () =>
      ({
        userId: { path: "users" },
        companyId: { path: "companies" },
        recruiterId: { path: "recruiter-profiles" },
        candidateId: { path: "candidate-profiles" },
        jobId: { path: "jobs" },
        categoryId: { path: "categories" },
        skillId: { path: "skills" },
        applicationId: { path: "applications" },
      }) as Record<string, { path: string }>,
    []
  );

  const renderIdLink = useCallback(
    (field: string, val: unknown) => {
      if (val === undefined || val === null || val === "") return "N/A";
      const rel = relationMap[field];
      if (rel) {
        return (
          <Button
            variant="link"
            className="h-auto p-0 text-xs gap-1"
            onClick={() => navigate(`/admin/${rel.path}/${encodeURIComponent(String(val))}`)}
          >
            <ExternalLink className="h-3 w-3" />
            {String(val)}
          </Button>
        );
      }
      return <span className="text-xs text-muted-foreground">{String(val)}</span>;
    },
    [navigate, relationMap]
  );

  useEffect(() => {
    const load = async () => {
      if (!resource || !id) return;
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        const res = await adminClient.get(resource.path, id, token ?? undefined);
        if (!res?.success) {
          setError(res?.message || "Failed to load detail");
        } else {
          setRow(res.data);
          const payload: Record<string, unknown> = {};
          (resource.allowedFields || resource.columns).forEach((f) => (payload[f] = res.data?.[f] ?? ""));
          setFormData(payload);

          // For jobs: prefill selected skills/categories from included relations
          if ((resource.key === "jobs" || resource.path === "jobs") && res.data) {
            const skills = Array.isArray((res.data as any).skills) ? ((res.data as any).skills as any[]) : [];
            const categories = Array.isArray((res.data as any).categories) ? ((res.data as any).categories as any[]) : [];
            const sIds = skills
              .map((it) => (it?.skillId as string | undefined) || (it?.skill?.id as string | undefined))
              .filter((v): v is string => Boolean(v));
            const cIds = categories
              .map((it) => (it?.categoryId as string | undefined) || (it?.category?.id as string | undefined))
              .filter((v): v is string => Boolean(v));
            setJobSkillIds(sIds);
            setJobCategoryIds(cIds);
          }
        }

        // For jobs: load selectable options
        if ((resource.key === "jobs" || resource.path === "jobs") && token) {
          const [skillsRes, catsRes] = await Promise.all([
            adminClient.list("skills", { page: 1, pageSize: 200 }, token ?? undefined),
            adminClient.list("categories", { page: 1, pageSize: 200 }, token ?? undefined),
          ]);
          setSkillOptions(
            (skillsRes.data || []).map((r: AdminRow) => ({ value: String(r.id), label: String(r.name ?? r.id) }))
          );
          setCategoryOptions(
            (catsRes.data || []).map((r: AdminRow) => ({ value: String(r.id), label: String(r.name ?? r.id) }))
          );
        }
      } catch {
        setError("Failed to load detail");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getToken, id, resource]);

  if (!resource) {
    return (
      <main className="min-h-dvh bg-muted/40">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="text-sm text-red-600">Resource not found.</div>
          <Button className="mt-3" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </main>
    );
  }

  const guessInputType = (field: string, value: unknown) => {
    if (resource?.fieldEnums && resource.fieldEnums[field]) return "select";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "checkbox";
    if (field.startsWith("is")) return "checkbox";
    if (
      field.toLowerCase().includes("description") ||
      field.toLowerCase().includes("summary") ||
      field.toLowerCase().includes("content") ||
      field.toLowerCase().includes("letter")
    ) {
      return "textarea";
    }
    return "text";
  };

  // Ẩn các field tuyệt đối không nên hiển thị trong UI admin
  const hiddenDetailFields = new Set<string>(["passwordHash"]);

  const renderEnum = (field: string, value: unknown) => {
    const _field = field;
    void _field;
    if (!value) return null;
    const v = String(value);
    const statusStyles: Record<string, { icon: React.ReactNode; className: string }> = {
      DRAFT: { icon: <Circle className="h-3 w-3" />, className: "text-slate-600" },
      PUBLISHED: { icon: <CheckCircle2 className="h-3 w-3" />, className: "text-green-700" },
      ARCHIVED: { icon: <PauseCircle className="h-3 w-3" />, className: "text-amber-700" },
      CLOSED: { icon: <Ban className="h-3 w-3" />, className: "text-red-700" },
      APPLIED: { icon: <Circle className="h-3 w-3" />, className: "text-slate-700" },
      REVIEWING: { icon: <AlarmClock className="h-3 w-3" />, className: "text-amber-700" },
      SHORTLISTED: { icon: <Sparkles className="h-3 w-3" />, className: "text-purple-700" },
      INTERVIEW_SCHEDULED: { icon: <AlarmClock className="h-3 w-3" />, className: "text-blue-700" },
      INTERVIEWED: { icon: <CheckCircle2 className="h-3 w-3" />, className: "text-green-700" },
      OFFER_SENT: { icon: <Sparkles className="h-3 w-3" />, className: "text-emerald-700" },
      HIRED: { icon: <CheckCircle2 className="h-3 w-3" />, className: "text-emerald-700" },
      REJECTED: { icon: <Ban className="h-3 w-3" />, className: "text-red-700" },
      WITHDRAWN: { icon: <PauseCircle className="h-3 w-3" />, className: "text-slate-600" },
      PENDING: { icon: <Circle className="h-3 w-3" />, className: "text-slate-600" },
      IN_PROGRESS: { icon: <AlarmClock className="h-3 w-3" />, className: "text-amber-700" },
      PROCESSING: { icon: <AlarmClock className="h-3 w-3" />, className: "text-amber-700" },
      COMPLETED: { icon: <CheckCircle2 className="h-3 w-3" />, className: "text-green-700" },
      FAILED: { icon: <AlertTriangle className="h-3 w-3" />, className: "text-red-700" },
      EXPIRED: { icon: <XCircle className="h-3 w-3" />, className: "text-slate-700" },
    };
    const style = statusStyles[v];
    return (
      <Badge variant="outline" className={`gap-1 ${style?.className ?? ""}`}>
        {style?.icon}
        {v}
      </Badge>
    );
  };

  const handleSave = async () => {
    if (!row || !resource) return;
    try {
      setSaving(true);
      setError(null);
      const token = await getToken();
      
      // Filter formData to only include editable fields (same logic as Admin.tsx)
      const exclude = new Set<string>([
        "id", 
        "createdAt", 
        "updatedAt", 
        "passwordHash",
        "email",
        "userId",
        "candidateId",
        "recruiterId",
        "companyId",
        "jobId",
        "applicationId",
        "senderId",
        "receiverId",
        "lastLoginAt",
        ...resource.primaryKeys
      ]);
      
      // Determine which fields are actually editable
      let editableFields: string[] = [];
      if (resource.key === "companies") {
        editableFields = ["description", "industry", "companySize", "foundedYear", "address", "city", "country", "logoUrl", "coverUrl", "website"];
      } else if (resource.key === "jobs") {
        editableFields = ["description", "requirements", "benefits", "location", "salaryMin", "salaryMax", "currency", "isSalaryNegotiable", "experienceLevel", "quantity"];
      } else if (resource.key === "users") {
        editableFields = ["firstName", "lastName", "phone", "avatarUrl", "isActive"];
      } else {
        editableFields = (resource.allowedFields || resource.columns).filter((f) => !exclude.has(f));
      }
      
      // Filter formData to only include editable fields
      const filteredFormData: Record<string, unknown> = {};
      editableFields.forEach((field) => {
        if (field in formData) {
          filteredFormData[field] = formData[field];
        }
      });
      
      const normalizedFormData = normalizeAdminPayload(resource.key, filteredFormData);
      await adminClient.update(
        resource.path,
        resource.primaryKeys,
        row,
        normalizedFormData,
        token ?? undefined
      );

      // For jobs: sync relations to join tables
      if ((resource.key === "jobs" || resource.path === "jobs") && id) {
        const [jobSkillsRes, jobCatsRes] = await Promise.all([
          adminClient.list("job-skills", { page: 1, pageSize: 500 }, token ?? undefined),
          adminClient.list("job-categories", { page: 1, pageSize: 500 }, token ?? undefined),
        ]);
        const existingSkills = ((jobSkillsRes.data || []) as AdminRow[]).filter((r) => r.jobId === id);
        const existingCats = ((jobCatsRes.data || []) as AdminRow[]).filter((r) => r.jobId === id);

        const existingSkillIds = new Set(existingSkills.map((r) => String(r.skillId)));
        const existingCatIds = new Set(existingCats.map((r) => String(r.categoryId)));

        await Promise.all(
          existingSkills
            .filter((r) => !jobSkillIds.includes(String(r.skillId)))
            .map((r) => adminClient.remove("job-skills", ["jobId", "skillId"], r, token ?? undefined))
        );
        await Promise.all(
          jobSkillIds
            .filter((sid) => !existingSkillIds.has(sid))
            .map((sid) => adminClient.create("job-skills", { jobId: id, skillId: sid, isRequired: true }, token ?? undefined))
        );

        await Promise.all(
          existingCats
            .filter((r) => !jobCategoryIds.includes(String(r.categoryId)))
            .map((r) => adminClient.remove("job-categories", ["jobId", "categoryId"], r, token ?? undefined))
        );
        await Promise.all(
          jobCategoryIds
            .filter((cid) => !existingCatIds.has(cid))
            .map((cid) => adminClient.create("job-categories", { jobId: id, categoryId: cid }, token ?? undefined))
        );
      }

      // Stay on detail page: refetch latest row + refresh form state
      if (id) {
        const res = await adminClient.get(resource.path, id, token ?? undefined);
        if (res?.success) {
          setRow(res.data);
          const payload: Record<string, unknown> = {};
          (resource.allowedFields || resource.columns).forEach(
            (f) => (payload[f] = res.data?.[f] ?? "")
          );
          setFormData(payload);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Update failed";
      setError(errorMessage);
      // Show more detailed error if available
      if (err instanceof Error && err.message.includes("500")) {
        setError("Server error: Please check the console for details. Make sure you're only editing allowed fields.");
      }
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!row || !resource) return;
    try {
      setDeleting(true);
      const token = await getToken();
      await adminClient.remove(resource.path, resource.primaryKeys, row, token ?? undefined);
      setDeleteConfirmOpen(false);
      navigate(-1);
    } catch (err) {
      setError("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  // Don't render if not authenticated
  if (!isAdminLoggedIn()) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-lg hover:bg-muted"
            >
              <ExternalLink className="h-5 w-5 rotate-180" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{resource.label} Detail</h1>
              <p className="text-sm text-muted-foreground mt-1">
                ID: <span className="font-mono font-medium">{id}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={editing ? "outline" : "default"}
              onClick={() => setEditing((v) => !v)}
              disabled={loading || !!error}
              className="gap-2"
            >
              {editing ? (
                <>
                  <XCircle className="h-4 w-4" />
                  Cancel Edit
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={loading || !!error || deleting}
              className="gap-2"
            >
              <Ban className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Card className="shadow-lg border">
          <CardHeader className="pb-4 border-b bg-muted/30">
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Record Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading record...</p>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Error loading record</span>
                </div>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-2">{error}</p>
              </div>
            )}
            {!loading && !error && row && (
              <div className="space-y-6">
                {/* Primary Keys */}
                <div className="flex flex-wrap gap-2 p-4 rounded-lg bg-muted/30 border">
                  {resource.primaryKeys.map((k) => (
                    <Badge key={k} variant="outline" className="px-3 py-1 font-mono text-xs">
                      <span className="font-semibold">{formatLabel(k)}:</span>{" "}
                      {row[k] === undefined || row[k] === null || row[k] === "" ? (
                        <span className="text-muted-foreground">N/A</span>
                      ) : (
                        <span className="text-foreground">{String(row[k])}</span>
                      )}
                    </Badge>
                  ))}
                </div>

                {/* Skills & Categories for Jobs */}
                {(resource.key === "jobs" || resource.path === "jobs") && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          Skills
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {editing ? (
                          <div className="flex flex-wrap gap-2">
                            {skillOptions.map((opt) => {
                              const active = jobSkillIds.includes(opt.value);
                              return (
                                <Badge
                                  key={opt.value}
                                  variant={active ? "default" : "outline"}
                                  className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1"
                                  onClick={() =>
                                    setJobSkillIds((prev) =>
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
                            {skillOptions.length === 0 && (
                              <span className="text-sm text-muted-foreground">No skills available</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {(Array.isArray((row as any).skills) ? ((row as any).skills as any[]) : [])
                              .map((it) => it?.skill?.name as string | undefined)
                              .filter((n): n is string => Boolean(n))
                              .slice(0, 20)
                              .map((n) => (
                                <Badge key={`skill-${n}`} variant="outline" className="px-3 py-1">
                                  {n}
                                </Badge>
                              ))}
                            {(!Array.isArray((row as any).skills) || ((row as any).skills as any[]).length === 0) && (
                              <span className="text-sm text-muted-foreground">No skills assigned</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Blocks className="h-4 w-4 text-blue-600" />
                          Categories
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {editing ? (
                          <div className="flex flex-wrap gap-2">
                            {categoryOptions.map((opt) => {
                              const active = jobCategoryIds.includes(opt.value);
                              return (
                                <Badge
                                  key={opt.value}
                                  variant={active ? "default" : "outline"}
                                  className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1"
                                  onClick={() =>
                                    setJobCategoryIds((prev) =>
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
                            {categoryOptions.length === 0 && (
                              <span className="text-sm text-muted-foreground">No categories available</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {(Array.isArray((row as any).categories) ? ((row as any).categories as any[]) : [])
                              .map((it) => it?.category?.name as string | undefined)
                              .filter((n): n is string => Boolean(n))
                              .slice(0, 20)
                              .map((n) => (
                                <Badge key={`cat-${n}`} variant="outline" className="px-3 py-1">
                                  {n}
                                </Badge>
                              ))}
                            {(!Array.isArray((row as any).categories) || ((row as any).categories as any[]).length === 0) && (
                              <span className="text-sm text-muted-foreground">No categories assigned</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Fields Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  {(resource.allowedFields || resource.columns)
                    .filter((col) => !hiddenDetailFields.has(col))
                    .map((col) => {
                    const val = editing ? formData[col] : row[col];
                    const isImg = isImageField(col) && typeof val === "string" && /^https?:\/\//i.test(val);
                    const isBool = typeof val === "boolean";
                    const isRole = col === "role";
                    const isAvatar = col === "avatarUrl";
                    const display =
                      val === undefined || val === null || val === ""
                        ? "N/A"
                        : typeof val === "object"
                          ? JSON.stringify(val, null, 2)
                          : String(val);

                    if (editing) {
                      const isCompanies = resource.key === "companies" || resource.path === "companies";

                      if (isCompanies && col === "foundedYear") {
                        const years = getFoundedYearOptions();
                        return (
                          <div key={col} className="space-y-1 text-xs">
                            <span className="font-medium text-foreground">{formatLabel(col)}</span>
                            <select
                              value={String(formData[col] ?? "")}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const v = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  [col]: v === "" ? null : Number.parseInt(v, 10),
                                }));
                              }}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">—</option>
                              {years.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      if (isCompanies && col === "companySize") {
                        const options = getCompanySizeOptions(String(formData[col] ?? ""));
                        return (
                          <div key={col} className="space-y-1 text-xs">
                            <span className="font-medium text-foreground">{formatLabel(col)}</span>
                            <select
                              value={String(formData[col] ?? "")}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setFormData((prev) => ({ ...prev, [col]: e.target.value }))
                              }
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">—</option>
                              {options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      const type = guessInputType(col, val);
                      if (type === "select" && resource.fieldEnums?.[col]) {
                        const enumOptions = resource.fieldEnums[col];
                        return (
                          <div key={col} className="space-y-2 text-xs">
                            <span className="font-medium text-foreground text-sm">{formatLabel(col)}</span>
                            <div className="flex flex-wrap gap-2">
                              {enumOptions.map((opt) => {
                                const active = formData[col] === opt;
                                return (
                                  <Badge
                                    key={`${col}-chip-${opt}`}
                                    variant={active ? "default" : "outline"}
                                    className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1 text-xs"
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        [col]: opt,
                                      }))
                                    }
                                  >
                                    {opt}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      if (type === "checkbox") {
                        return (
                          <div
                            key={col}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm font-medium text-foreground">
                              {formatLabel(col)}
                            </span>
                            <Switch
                              checked={Boolean(formData[col])}
                              onCheckedChange={(checked: boolean) =>
                                setFormData((prev) => ({ ...prev, [col]: checked }))
                              }
                            />
                          </div>
                        );
                      }
                      if (type === "textarea") {
                        return (
                          <div key={col} className="space-y-1 text-xs">
                            <span className="font-medium text-foreground">{formatLabel(col)}</span>
                            <textarea
                              value={String(formData[col] ?? "")}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                setFormData((prev) => ({ ...prev, [col]: e.target.value }))
                              }
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                            />
                          </div>
                        );
                      }
                      return (
                        <div key={col} className="space-y-1 text-xs">
                          <span className="font-medium text-foreground">{formatLabel(col)}</span>
                          <input
                            type={type === "number" ? "number" : "text"}
                            value={String(formData[col] ?? "")}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData((prev) => ({
                                ...prev,
                                [col]: type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={col}
                        className="flex min-w-0 items-start gap-3 rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-semibold text-foreground min-w-[140px] text-sm">{formatLabel(col)}:</span>
                        {isAvatar ? (
                          <div className="flex items-center gap-2">
                            <div className="h-12 w-12 rounded-full border overflow-hidden bg-muted">
                              {typeof val === "string" && val ? (
                                <img
                                  src={val}
                                  alt={col}
                                  className="h-full w-full object-cover"
                                  onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.display = "none")}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-600">
                                  {getInitials(row)}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground line-clamp-1 break-all">{display}</span>
                          </div>
                        ) : isImg ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={val as string}
                              alt={col}
                              className="h-20 w-20 rounded-lg border-2 object-cover shadow-sm"
                              onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.display = "none")}
                            />
                            <a
                              href={val as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View image
                            </a>
                          </div>
                        ) : isBool ? (
                          <div className="flex items-center gap-1 text-xs font-medium">
                            {val ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="text-green-700">Yes</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-red-600">No</span>
                              </>
                            )}
                          </div>
                        ) : isRole ? (
                          <Badge variant="outline" className="gap-1">
                            <Shield className="h-3 w-3" />
                            {display}
                          </Badge>
                        ) : resource.fieldEnums?.[col] ? (
                          renderEnum(col, val)
                        ) : isIdField(col) ? (
                          renderIdLink(col, val)
                        ) : (
                          <span className="text-sm text-foreground whitespace-pre-wrap break-words break-all max-w-full flex-1 overflow-hidden">
                            {display}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Edit Actions */}
                {editing && (
                  <div className="flex items-center justify-between gap-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {saving ? "Saving changes..." : "Make your changes and click Save"}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditing(false);
                          if (row) {
                            const payload: Record<string, unknown> = {};
                            (resource.allowedFields || resource.columns).forEach(
                              (f) => (payload[f] = row[f] ?? "")
                            );
                            setFormData(payload);
                          }
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
                        {saving ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Record?"
        description="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={deleting}
      />
    </main>
  );
};

export default AdminDetail;
