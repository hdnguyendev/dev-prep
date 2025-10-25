import type { MiddlewareHandler } from "hono";
import { nanoid } from "nanoid";

export const requestLogger = (): MiddlewareHandler => async (c, next) => {
  const reqId = nanoid(12);
  c.set("reqId", reqId);
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`[${reqId}] ${c.req.method} ${c.req.path} ${ms}ms`);
};
