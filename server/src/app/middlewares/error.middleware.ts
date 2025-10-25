import { ErrorCodes } from "../config/constants";
import type { Context } from "hono";

export const errorHandler = (err: any, c: Context) => {
  const status = err.status || 500;
  const code = err.code || ErrorCodes.INTERNAL;
  const message = err.message || "Internal Server Error";
  return c.json({ ok: false, code, message }, status);
};
