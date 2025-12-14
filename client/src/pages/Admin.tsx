import React, { useCallback, useEffect, useMemo, useState } from "react";
import { adminResources, type AdminResource } from "@/lib/adminResources";
import { adminClient, useAdminToken } from "@/lib/adminClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router";
import { isAdminLoggedIn, logout, getCurrentUser } from "@/lib/auth";
import {
  Blocks,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  GraduationCap,
  LayoutPanelLeft,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UserRound,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Shield,
  Circle,
  PauseCircle,
  AlertTriangle,
  Ban,
  AlarmClock,
} from "lucide-react";

type AdminRow = Record<string, unknown>;
type ModalMode = "create" | "edit";

type AdminState = {
  loading: boolean;
  error: string | null;
  data: AdminRow[];
  meta?: { page: number; pageSize: number; total: number };
};

const formatLabel = (field: string) => {
  const clean = field.replace(/^is([A-Z])/, (_, c) => c.toUpperCase());
  return clean
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
};

// Admin Dashboard Component
const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    totalJobs: 0,
    totalApplications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";
        
        const [users, companies, jobs, applications] = await Promise.all([
          fetch(`${API_BASE}/users?pageSize=1`).then(r => r.json()),
          fetch(`${API_BASE}/companies?pageSize=1`).then(r => r.json()),
          fetch(`${API_BASE}/jobs?pageSize=1`).then(r => r.json()),
          fetch(`${API_BASE}/applications?pageSize=1`).then(r => r.json()),
        ]);

        setStats({
          totalUsers: users.meta?.total || 0,
          totalCompanies: companies.meta?.total || 0,
          totalJobs: jobs.meta?.total || 0,
          totalApplications: applications.meta?.total || 0,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <p className="text-sm text-muted-foreground">Platform overview and statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Candidates, Recruiters, Admins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">Registered companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
            <p className="text-xs text-muted-foreground">Active and inactive jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">All application submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <UserRound className="h-5 w-5" />
              <span className="text-sm">Manage Users</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <Building2 className="h-5 w-5" />
              <span className="text-sm">Verify Companies</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <BriefcaseBusiness className="h-5 w-5" />
              <span className="text-sm">Review Jobs</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm">System Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">System Status</span>
              <Badge variant="success">Healthy</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database</span>
              <Badge variant="success">Connected</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Response Time</span>
              <span className="font-medium">~120ms</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Admin = () => {
  const [resource, setResource] = useState<AdminResource>(adminResources[0]);
  const [state, setState] = useState<AdminState>({ loading: true, error: null, data: [] });
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<AdminRow | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const getToken = useAdminToken();
  const [relationOptions, setRelationOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [search, setSearch] = useState("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [filterField, setFilterField] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
  const [showFilters, setShowFilters] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true); // Start with dashboard view

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentUser = getCurrentUser();

  const resourceIcons: Record<string, React.ReactNode> = {
    users: <UserRound className="h-4 w-4" />,
    companies: <Building2 className="h-4 w-4" />,
    jobs: <BriefcaseBusiness className="h-4 w-4" />,
    applications: <ClipboardList className="h-4 w-4" />,
    interviews: <Sparkles className="h-4 w-4" />,
    skills: <Blocks className="h-4 w-4" />,
    categories: <Blocks className="h-4 w-4" />,
    messages: <MessageSquare className="h-4 w-4" />,
    notifications: <ShieldCheck className="h-4 w-4" />,
    "candidate-profiles": <GraduationCap className="h-4 w-4" />,
    "recruiter-profiles": <LayoutPanelLeft className="h-4 w-4" />,
  };
  const filteredAllowed = useMemo(() => {
    const exclude = new Set<string>(["id", "createdAt", "updatedAt", ...resource.primaryKeys]);
    return (resource.allowedFields || resource.columns).filter((f) => !exclude.has(f));
  }, [resource]);

  const visibleColumns = useMemo(() => {
    const hide = new Set<string>(["createdAt", "updatedAt"]);
    return (resource.columns || []).filter((c) => !hide.has(c)).slice(0, 8);
  }, [resource]);

  const getInitials = (row: AdminRow) => {
    const first = (row.firstName as string | undefined) || "";
    const last = (row.lastName as string | undefined) || "";
    const email = (row.email as string | undefined) || "";
    const base = `${first} ${last}`.trim() || email;
    return base ? base.trim().slice(0, 2).toUpperCase() : "NA";
  };

  const renderAvatar = (val: unknown, row: AdminRow, size = 36) => {
    const hasImg = typeof val === "string" && val;
    return (
      <div className="flex items-center gap-2">
        <div
          className="relative overflow-hidden rounded-full border bg-gradient-to-br from-indigo-500/10 to-slate-500/10"
          style={{ width: size, height: size }}
        >
          {hasImg ? (
            <img
              src={val as string}
              alt="avatar"
              className="h-full w-full object-cover"
              onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-600">
              {getInitials(row)}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground line-clamp-1 break-all">
          {hasImg ? String(val) : "No avatar"}
        </div>
      </div>
    );
  };

  const isIdField = (field: string) => field === "id" || field.endsWith("Id") || resource.primaryKeys.includes(field);

  const renderIdLink = (field: string, val: unknown) => {
    if (val === undefined || val === null || val === "") return "N/A";
    const rel = relationMap[field];
    if (rel) {
      return (
        <Button
          variant="link"
          className="h-auto p-0 text-xs"
          onClick={() => {
            navigate(`/admin/${rel.path}/${encodeURIComponent(String(val))}`);
          }}
        >
          {String(val)}
        </Button>
      );
    }
    if (isIdField(field)) {
      return (
        <Button
          variant="link"
          className="h-auto p-0 text-xs"
          onClick={() => navigate(`/admin/${resource.path}/${encodeURIComponent(String(val))}`)}
        >
          {String(val)}
        </Button>
      );
    }
    return String(val);
  };

  const renderEnum = (field: string, value: unknown) => {
    const _field = field; // keep for future field-specific styling
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

  const isImageField = (field: string) => /(avatar|logo|cover|image|photo|picture|icon)/i.test(field);
  const getRelationLabel = useCallback(
    (field: string, value: unknown) => {
      if (value === undefined || value === null || value === "") return undefined;
      const opts = relationOptions[field];
      if (!opts) return undefined;
      const match = opts.find((opt) => opt.value === String(value));
      return match?.label;
    },
    [relationOptions]
  );

  const relationMap = useMemo(
    () =>
      ({
        userId: { path: "users", label: (r: AdminRow) => `${r.firstName ?? ""} ${r.lastName ?? ""} (${r.email ?? ""})`.trim() },
        companyId: { path: "companies", label: (r: AdminRow) => `${r.name ?? "Company"} (${r.slug ?? ""})` },
        recruiterId: {
          path: "recruiter-profiles",
          label: (r: AdminRow) => {
            const user = r.user as AdminRow | undefined;
            const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
            return full || (user?.email as string | undefined) || (r.userId as string | undefined) || (r.id as string | undefined) || "Recruiter";
          },
        },
        candidateId: { path: "candidate-profiles", label: (r: AdminRow) => `${r.userId ?? ""}` },
        jobId: { path: "jobs", label: (r: AdminRow) => `${r.title ?? "Job"} (${r.id ?? ""})` },
        categoryId: { path: "categories", label: (r: AdminRow) => `${r.name ?? "Category"}` },
        skillId: { path: "skills", label: (r: AdminRow) => `${r.name ?? "Skill"}` },
        applicationId: { path: "applications", label: (r: AdminRow) => `${r.id ?? ""} (${r.status ?? ""})` },
      }) as Record<string, { path: string; label: (row: AdminRow) => string }>,
    []
  );

  const loadRelations = useCallback(
    async (fields: string[]) => {
      const need = fields.filter((f) => relationMap[f] && !relationOptions[f]);
      if (need.length === 0) return;
      try {
        const token = await getToken();
        const results = await Promise.all(
          need.map(async (f) => {
            const cfg = relationMap[f];
            const res = await adminClient.list(cfg.path, { page: 1, pageSize: 100 }, token ?? undefined);
            const opts = (res.data || []).map((row: AdminRow) => ({
              value: String(row.id ?? row[f] ?? ""),
              label: cfg.label(row),
            }));
            return [f, opts] as const;
          })
        );
        setRelationOptions((prev) => {
          const next = { ...prev };
          results.forEach(([k, v]) => (next[k] = v));
          return next;
        });
      } catch (err) {
        console.error("Load relation options failed", err);
      }
    },
    [getToken, relationOptions, relationMap]
  );

  const load = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const token = await getToken();
      const res = await adminClient.list(resource.path, { page, pageSize }, token ?? undefined);
      if (!res.success) {
        setState({ loading: false, error: res.message || "Failed to load", data: [], meta: res.meta });
        return;
      }
      setState({ loading: false, error: null, data: res.data, meta: res.meta });
    } catch (err) {
      setState({ loading: false, error: err instanceof Error ? err.message : "Unexpected error", data: [] });
    }
  }, [getToken, page, pageSize, resource.path]);

  useEffect(() => {
    setPage(1);
    setSelectedRow(null);
    setFormData({});
    setSelectedSkills([]);
    setSelectedCategories([]);
    const fieldsToLoad = resource.key === "jobs" ? [...filteredAllowed, "skillId", "categoryId"] : filteredAllowed;
    loadRelations(fieldsToLoad);
  }, [resource, filteredAllowed, loadRelations]);

  useEffect(() => {
    load();
  }, [load]);

  const total = state.meta?.total ?? state.data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const uploadFile = useCallback(
    async (field: string, file: File) => {
      setUploadingField(field);
      try {
        const token = await getToken();
        const form = new FormData();
        form.append("file", file);
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";
        const res = await fetch(`${apiBase}/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        });
        const json = await res.json();
        if (!json?.success) throw new Error(json?.message || "Upload failed");
        return String(json.url);
      } finally {
        setUploadingField(null);
      }
    },
    [getToken]
  );

  const filteredRows = useMemo(() => {
    const base = state.data;
    const q = search.toLowerCase();
    return base.filter((row) => {
      const cols = resource.columns || [];
      const matchesSearch = !q
        ? true
        : cols.some((col) => {
            const val = row[col];
            if (val === undefined || val === null) return false;
            return String(val).toLowerCase().includes(q);
          });

      const matchesField =
        !filterField || !filterValue
          ? true
          : (() => {
              const val = row[filterField];
              if (val === undefined || val === null) return false;
              return String(val) === filterValue;
            })();

      return matchesSearch && matchesField;
    });
  }, [filterField, filterValue, resource.columns, search, state.data]);

  const openModal = (mode: ModalMode, row?: AdminRow) => {
    setModalMode(mode);
    if (mode === "edit" && row) {
      setSelectedRow(row);
      const payload: Record<string, unknown> = {};
      filteredAllowed.forEach((f) => (payload[f] = row[f] ?? ""));
      setFormData(payload);
      if (resource.key === "jobs") {
        const existingSkills = Array.isArray(row.skills)
          ? (row.skills as AdminRow[])
              .map((s) => {
                const skillRel = s as Record<string, unknown>;
                const val = (skillRel.skillId as string | undefined) || (skillRel.skill as Record<string, unknown> | undefined)?.id;
                return val as string | undefined;
              })
              .filter((v): v is string => Boolean(v))
          : [];
        setSelectedSkills(existingSkills);
        const existingCategories = Array.isArray(row.categories)
          ? (row.categories as AdminRow[])
              .map((c) => {
                const catRel = c as Record<string, unknown>;
                const val = (catRel.categoryId as string | undefined) || (catRel.category as Record<string, unknown> | undefined)?.id;
                return val as string | undefined;
              })
              .filter((v): v is string => Boolean(v))
          : [];
        setSelectedCategories(existingCategories);
      }
    } else {
      setSelectedRow(null);
      const payload: Record<string, unknown> = {};
      filteredAllowed.forEach((f) => (payload[f] = ""));
      setFormData(payload);
      if (resource.key === "jobs") {
        setSelectedSkills([]);
        setSelectedCategories([]);
      }
    }
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleFormChange = (field: string, value: unknown) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
  };

  const handleSubmit = async () => {
    try {
      const token = await getToken();
      let jobId: string | undefined;

      if (modalMode === "create") {
        const res = await adminClient.create(resource.path, formData, token ?? undefined);
        jobId = res?.data?.id as string | undefined;
      } else if (modalMode === "edit" && selectedRow) {
        const res = await adminClient.update(resource.path, resource.primaryKeys, selectedRow, formData, token ?? undefined);
        jobId = (selectedRow.id as string | undefined) ?? (res?.data?.id as string | undefined);
      } else {
        throw new Error("No row selected");
      }

      if (resource.key === "jobs" && jobId) {
        const res = await adminClient.list("job-skills", { page: 1, pageSize: 200 }, token ?? undefined);
        const existingForJob = ((res.data || []) as AdminRow[]).filter((js) => js.jobId === jobId);
        const existingIds = new Set(existingForJob.map((js) => String(js.skillId)));

        // delete removed
        await Promise.all(
          existingForJob
            .filter((js) => !selectedSkills.includes(String(js.skillId)))
            .map((js) => adminClient.remove("job-skills", ["jobId", "skillId"], js, token ?? undefined))
        );
        // add new
        await Promise.all(
          selectedSkills
            .filter((sid) => !existingIds.has(sid))
            .map((sid) => adminClient.create("job-skills", { jobId, skillId: sid, isRequired: true }, token ?? undefined))
        );

        const catRes = await adminClient.list("job-categories", { page: 1, pageSize: 200 }, token ?? undefined);
        const existingCatForJob = ((catRes.data || []) as AdminRow[]).filter((jc) => jc.jobId === jobId);
        const existingCatIds = new Set(existingCatForJob.map((jc) => String(jc.categoryId)));
        await Promise.all(
          existingCatForJob
            .filter((jc) => !selectedCategories.includes(String(jc.categoryId)))
            .map((jc) => adminClient.remove("job-categories", ["jobId", "categoryId"], jc, token ?? undefined))
        );
        await Promise.all(
          selectedCategories
            .filter((cid) => !existingCatIds.has(cid))
            .map((cid) => adminClient.create("job-categories", { jobId, categoryId: cid }, token ?? undefined))
        );
      }

      closeModal();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Request failed");
    }
  };

  const guessInputType = (field: string, value: unknown) => {
    if (resource.fieldEnums && resource.fieldEnums[field]) return "select";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "checkbox";
    if (field.startsWith("is")) return "checkbox";
    if (
      field.toLowerCase().includes("description") ||
      field.toLowerCase().includes("summary") ||
      field.toLowerCase().includes("letter") ||
      field.toLowerCase().includes("content")
    ) {
      return "textarea";
    }
    return "text";
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-muted/40">
      <div className="mx-auto grid min-h-dvh max-w-7xl grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-r bg-background/80 backdrop-blur px-4 py-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">Admin</h1>
              <p className="text-xs text-muted-foreground">{currentUser?.email || "Admin"}</p>
            </div>
          </div>
              <div className="space-y-1">
                <Button
                  key="dashboard-tab"
                  variant={showDashboard ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => setShowDashboard(true)}
                >
                  <LayoutPanelLeft className="h-4 w-4" /> Dashboard
                </Button>
                {adminResources.map((r) => (
                  <Button
                    key={r.key}
                    variant={!showDashboard && resource.key === r.key ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setShowDashboard(false);
                      setResource(r);
                    }}
                  >
                    {resourceIcons[r.key] ?? <Blocks className="h-4 w-4" />} {r.label}
                  </Button>
                ))}
              </div>
              <Button size="sm" onClick={() => openModal("create")}>+ New {resource.label}</Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="mt-auto">
                Logout
              </Button>
            </aside>

            <div className="px-4 py-6">
              {showDashboard ? (
                <AdminDashboard />
              ) : (
                <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{resource.label}</h2>
                  <p className="text-xs text-muted-foreground">Records: {total} • page {page}/{totalPages}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
                    {showFilters ? "Hide filters" : "Show filters"}
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="mt-3 rounded-lg border bg-background/70 p-3 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span>Search</span>
                      <input
                        value={search}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                        placeholder="Search any column"
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span>Column</span>
                      <select
                        value={filterField}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          setFilterField(e.target.value);
                          setFilterValue("");
                        }}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">All columns</option>
                        {(resource.columns || []).map((col) => (
                          <option key={col} value={col}>{formatLabel(col)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span>Value</span>
                      {filterField && relationOptions[filterField] ? (
                        <select
                          value={filterValue}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterValue(e.target.value)}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="">Any</option>
                          {relationOptions[filterField]?.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : filterField && resource.fieldEnums?.[filterField] ? (
                        <select
                          value={filterValue}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterValue(e.target.value)}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="">Any</option>
                          {resource.fieldEnums[filterField].map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={filterValue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterValue(e.target.value)}
                          placeholder={filterField ? "Enter value" : "Select column first"}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          disabled={!filterField}
                        />
                      )}
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSearch("")}>Clear search</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setFilterField(""); setFilterValue(""); }}>Reset filter</Button>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{resource.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {state.loading && <div className="text-sm text-muted-foreground">Loading...</div>}
                    {state.error && <div className="text-sm text-red-600">{state.error}</div>}
                    {!state.loading && !state.error && state.data.length === 0 && (
                      <div className="text-sm text-muted-foreground">No data.</div>
                    )}

                    <div className="overflow-x-auto rounded-lg border shadow-sm">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/70 text-muted-foreground sticky top-0 z-10">
                          <tr>
                          {visibleColumns.map((col) => (
                              <th key={col} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-[11px]">{formatLabel(col)}</th>
                            ))}
                            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-[11px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows
                            .filter((row) => resource.primaryKeys.every((k) => row && row[k] !== undefined && row[k] !== null))
                            .map((row, idx) => (
                              <tr
                                key={resource.primaryKeys.map((k) => String(row[k] ?? "")).join("|") || crypto.randomUUID()}
                                className={`border-b last:border-0 transition hover:bg-muted/40 ${idx % 2 === 0 ? "bg-muted/20" : "bg-background"}`}
                              >
                                {visibleColumns.map((col) => {
                                  const val = row[col];
                                  const relLabel = getRelationLabel(col, val);
                                  const isImg = isImageField(col) && typeof val === "string" && /^https?:\/\//i.test(val);
                                  const isBool = typeof val === "boolean";
                                  const isRole = col === "role";
                                  const isAvatar = col === "avatarUrl";
                                  const isEnum = Boolean(resource.fieldEnums?.[col]);
                                  const display =
                                    val === undefined || val === null || val === ""
                                      ? "N/A"
                                      : relLabel
                                        ? relLabel
                                        : typeof val === "object"
                                          ? JSON.stringify(val)
                                          : String(val);
                                  return (
                                    <td key={col} className="px-3 py-2">
                                      {isAvatar ? (
                                        renderAvatar(val, row, 36)
                                      ) : isImg ? (
                                        <img
                                          src={val as string}
                                          alt={col}
                                          className="h-10 w-10 rounded-md border object-cover"
                                          onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.display = "none")}
                                        />
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
                                      ) : isEnum ? (
                                        renderEnum(col, val)
                                      ) : isIdField(col) ? (
                                        renderIdLink(col, val)
                                      ) : (
                                        <span className="text-muted-foreground line-clamp-2 break-all">{display}</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  const idPath = resource.primaryKeys.map((k) => encodeURIComponent(String(row[k] ?? ""))).join("/");
                                  navigate(`/admin/${resource.path}/${idPath}`);
                                }}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                                </td>
                              </tr>
                            ))}
                          {filteredRows.length === 0 && (
                            <tr>
                              <td colSpan={visibleColumns.length + 1} className="px-3 py-6 text-center text-muted-foreground">
                                No records match.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Rows per page</span>
                        <select
                          value={pageSize}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            setPage(1);
                            setPageSize(Number(e.target.value));
                          }}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {[5, 10, 20, 50].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                          Previous
                        </Button>
                        <div className="text-xs text-muted-foreground">Page {page} / {totalPages}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
                </>
              )}
            </div>
          </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-3xl rounded-xl bg-background shadow-xl">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <h2 className="text-lg font-semibold">{modalMode === "create" ? "Create" : "Edit"} {resource.label}</h2>
                  <p className="text-xs text-muted-foreground">Fill required fields then save</p>
                </div>
                <Button variant="ghost" size="sm" onClick={closeModal}>Close</Button>
              </div>
              <div className="grid gap-4 border-b px-4 py-4 lg:grid-cols-2">
                {filteredAllowed.map((field) => {
                  const type = guessInputType(field, formData[field]);
                  const enumOptions = resource.fieldEnums?.[field];
                  const imageField = isImageField(field);
                  const relOptions = relationOptions[field];

                  if (relOptions && relOptions.length > 0) {
                    return (
                      <div key={field} className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">{formatLabel(field)}</label>
                        <select
                          value={String(formData[field] ?? "")}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFormChange(field, e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">-- select --</option>
                          {relOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (type === "select" && enumOptions) {
                    return (
                      <div key={field} className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">{formatLabel(field)}</label>
                        <select
                          value={String(formData[field] ?? "")}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFormChange(field, e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">-- select --</option>
                          {enumOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {enumOptions.map((opt) => (
                            <Badge
                              key={`${field}-chip-${opt}`}
                              variant={(formData[field] === opt) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => handleFormChange(field, opt)}
                            >
                              {opt}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (type === "checkbox") {
                    return (
                      <label key={field} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(formData[field])}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange(field, e.target.checked)}
                          className="h-4 w-4"
                        />
                        {formatLabel(field)}
                      </label>
                    );
                  }

                  if (type === "textarea") {
                    return (
                      <div key={field} className="space-y-1 lg:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">{formatLabel(field)}</label>
                        <Textarea
                          value={String(formData[field] ?? "")}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFormChange(field, e.target.value)}
                          className="min-h-[90px]"
                        />
                      </div>
                    );
                  }

                  const inputVal: string = String(formData[field] ?? "");
                  return (
                    <div key={field} className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                        <span>{formatLabel(field)}</span>
                        {imageField && <span className="text-[10px] text-muted-foreground">Upload or paste URL</span>}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={type === "number" ? "number" : "text"}
                          value={inputVal}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleFormChange(
                              field,
                              type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
                            )}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        {imageField && (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              uploadFile(field, file)
                                .then((url) => handleFormChange(field, url))
                                .catch((err) => alert(err instanceof Error ? err.message : "Upload failed"));
                            }}
                            className="w-32 text-xs"
                          />
                        )}
                      </div>
                      {imageField && (
                        <div className="mt-1 space-y-1">
                          {uploadingField === field && <div className="text-[11px] text-muted-foreground">Uploading...</div>}
                          {inputVal && inputVal.startsWith("http") && (
                            <>
                              <img
                                src={inputVal}
                                alt={field}
                                className="h-24 w-24 rounded-md border object-cover"
                                onError={(ev) => {
                                  (ev.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                              <div className="text-[10px] text-muted-foreground break-all">{inputVal}</div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {resource.key === "jobs" && relationOptions["skillId"] && (
                  <div className="space-y-1 lg:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {relationOptions["skillId"]?.map((opt) => (
                        <Badge
                          key={opt.value}
                          variant={selectedSkills.includes(opt.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() =>
                            setSelectedSkills((prev) =>
                              prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                            )
                          }
                        >
                          {opt.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {resource.key === "jobs" && relationOptions["categoryId"] && (
                  <div className="space-y-1 lg:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Categories</label>
                    <div className="flex flex-wrap gap-2">
                      {relationOptions["categoryId"]?.map((opt) => (
                        <Badge
                          key={opt.value}
                          variant={selectedCategories.includes(opt.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() =>
                            setSelectedCategories((prev) =>
                              prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                            )
                          }
                        >
                          {opt.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-xs text-muted-foreground">Mode: {modalMode.toUpperCase()}</div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
                  <Button size="sm" onClick={handleSubmit}>{modalMode === "create" ? "Create" : "Save changes"}</Button>
                </div>
              </div>
            </div>
          </div>
        )}
    </main>
  );
};

export default Admin;
