import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { adminResources } from "@/lib/adminResources";
import { adminClient, useAdminToken } from "@/lib/adminClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdminLoggedIn } from "@/lib/auth";
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
} from "lucide-react";

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
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load detail");
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
      const token = await getToken();
      await adminClient.update(resource.path, resource.primaryKeys, row, formData, token ?? undefined);
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!row || !resource) return;
    if (!confirm("Delete this record?")) return;
    const token = await getToken();
    await adminClient.remove(resource.path, resource.primaryKeys, row, token ?? undefined);
    navigate(-1);
  };

  // Don't render if not authenticated
  if (!isAdminLoggedIn()) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-muted/40">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold">{resource.label} detail</h1>
                  <p className="text-sm text-muted-foreground">ID: {id}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
                  <Button variant="outline" onClick={() => setEditing((v) => !v)} disabled={loading || !!error}>
                    {editing ? "Cancel edit" : "Edit"}
                  </Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={loading || !!error}>
                    Delete
                  </Button>
                </div>
              </div>

        <Card className="shadow-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {loading && <div>Loading...</div>}
            {error && <div className="text-red-600">{error}</div>}
            {!loading && !error && row && (
              <>
                <div className="flex flex-wrap gap-2">
                  {resource.primaryKeys.map((k) => (
                    <Badge key={k} variant="outline">
                      {formatLabel(k)}: {row[k] === undefined || row[k] === null || row[k] === "" ? "N/A" : String(row[k])}
                    </Badge>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {(resource.allowedFields || resource.columns).map((col) => {
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
                      const type = guessInputType(col, val);
                      if (type === "select" && resource.fieldEnums?.[col]) {
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
                              <option value="">-- select --</option>
                              {resource.fieldEnums[col].map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        );
                      }
                      if (type === "checkbox") {
                        return (
                          <label key={col} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(formData[col])}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFormData((prev) => ({ ...prev, [col]: e.target.checked }))
                              }
                              className="h-4 w-4"
                            />
                            {formatLabel(col)}
                          </label>
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
                      <div key={col} className="flex items-start gap-2 rounded-md bg-muted/30 p-2">
                        <span className="font-medium text-foreground min-w-[120px]">{formatLabel(col)}:</span>
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
                          <img
                            src={val as string}
                            alt={col}
                            className="h-16 w-16 rounded-md border object-cover"
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
                        ) : resource.fieldEnums?.[col] ? (
                          renderEnum(col, val)
                        ) : isIdField(col) ? (
                          renderIdLink(col, val)
                        ) : (
                          <span className="whitespace-pre-wrap break-all">{display}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {editing && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setEditing(false); if (row) setFormData((resource.allowedFields || resource.columns).reduce((acc, f) => ({...acc, [f]: row[f] ?? ""}), {})); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>Save</Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default AdminDetail;
