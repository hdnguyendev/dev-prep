import { ADMIN_NUMERIC_FIELDS_BY_RESOURCE } from "@/constants/admin";

/**
 * Normalize admin form payload before sending to CRUD endpoints.
 * - Convert known numeric fields from string -> number
 * - Convert empty string -> null for nullable numeric fields
 */
export function normalizeAdminPayload(
  resourceKey: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const numericFields = new Set(ADMIN_NUMERIC_FIELDS_BY_RESOURCE[resourceKey] ?? []);

  const next: Record<string, unknown> = { ...payload };

  for (const field of numericFields) {
    const raw = next[field];
    if (typeof raw === "undefined") continue;

    if (raw === "" || raw === null) {
      next[field] = null;
      continue;
    }

    if (typeof raw === "number") continue;

    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) {
        next[field] = null;
        continue;
      }
      const parsed = Number.parseInt(trimmed, 10);
      next[field] = Number.isFinite(parsed) ? parsed : null;
    }
  }

  return next;
}


