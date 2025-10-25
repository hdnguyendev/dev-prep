import type { MiddlewareHandler } from "hono";
import { getAuth } from "@hono/clerk-auth";

export const authMiddleware = (): MiddlewareHandler => async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ ok: false, message: "Unauthorized" }, 401);
  }
  c.set("userId", auth.userId);
  await next();
};
