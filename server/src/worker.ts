/**
 * Cloudflare Workers Entry Point
 * This file adapts the Hono server for Cloudflare Workers runtime
 * 
 * Note: File upload routes are disabled on Workers.
 * Use Cloudflare R2 or external storage for file uploads.
 */

import { clerkMiddleware } from "@hono/clerk-auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { appMiddlewares } from "./app";

// Import routes individually (excluding upload)
import crudRoutes from "./routes/crud";
import swaggerRoutes from "./routes/swagger";
import authRoutes from "./routes/auth";
import filteredRoutes from "./routes/filtered";
import applicationRoutes from "./routes/applications";
import companyRoutes from "./routes/companies";
import reviewRoutes from "./routes/reviews";
import savedJobRoutes from "./routes/savedJobs";

// Cloudflare Workers environment bindings type
type Env = {
  DATABASE_URL: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

// Set DATABASE_URL globally so Prisma can access it
app.use("*", async (c, next) => {
  // @ts-ignore
  globalThis.DATABASE_URL = c.env.DATABASE_URL;
  await next();
});

// CORS - Allow all origins for now (configure specific domains in production)
app.use("*", cors({
  origin: "*",
  allowHeaders: ["Authorization", "Content-Type", "X-Requested-With"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  exposeHeaders: ["Content-Length", "X-Request-Id"],
  maxAge: 86400, // 24 hours
  credentials: true,
}));

// Middleware
app.use("*", clerkMiddleware());
app.use("*", logger());
app.use("*", appMiddlewares.requestLogger());

// Health check
app.get("/health", (c) => c.json({ ok: true, uptime: 0 }));

// Mount routes (upload routes excluded for Workers)
app.route("/auth", authRoutes);
app.route("/api", filteredRoutes);
app.route("/applications", applicationRoutes);
app.route("/companies", companyRoutes);
app.route("/reviews", reviewRoutes);
app.route("/saved-jobs", savedJobRoutes);
app.route("/", crudRoutes);
app.route("/", swaggerRoutes);

// Error handlers
app.notFound((c) => c.json({ ok: false, error: "NOT_FOUND", path: c.req.path }, 404));
app.onError(appMiddlewares.errorHandler);

// Export for Cloudflare Workers
export default app;
