import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export const ok = <T>(c: Context, data: T, status: ContentfulStatusCode = 200) => c.json({ ok: true, data }, status);
export const fail = (c: Context, code: string, message: string, status: ContentfulStatusCode = 400) =>
  c.json({ ok: false, code, message }, status);
