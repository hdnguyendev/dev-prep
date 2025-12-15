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

// Cloudflare Workers environment bindings
type Env = {
  DATABASE_URL?: string; // Fallback for local dev
  HYPERDRIVE?: {
    connectionString: string;
  };
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  JWT_SECRET: string;
  NODE_ENV?: string;
};

const app = new Hono<{ Bindings: Env }>();

console.log("[Worker] 🚀 worker.ts loaded");

// ⚠️ CRITICAL: Middleware to expose Cloudflare env to globalThis
// Cloudflare Workers ONLY provide env via c.env, NOT process.env at module load
// This middleware MUST run BEFORE any Prisma initialization
app.use("*", async (c, next) => {
  // Get connection string from Hyperdrive (preferred) or DATABASE_URL (fallback)
  let connectionString: string | undefined;
  
  console.log("[Worker] 🔍 Checking for database connection...");
  console.log("[Worker] HYPERDRIVE exists?", !!c.env.HYPERDRIVE);
  console.log("[Worker] HYPERDRIVE type:", typeof c.env.HYPERDRIVE);
  if (c.env.HYPERDRIVE) {
    console.log("[Worker] HYPERDRIVE keys:", Object.keys(c.env.HYPERDRIVE));
    console.log("[Worker] HYPERDRIVE.connectionString exists?", !!c.env.HYPERDRIVE.connectionString);
    console.log("[Worker] HYPERDRIVE.connectionString length:", c.env.HYPERDRIVE.connectionString?.length || 0);
  }
  console.log("[Worker] DATABASE_URL exists?", !!c.env.DATABASE_URL);
  
  if (c.env.HYPERDRIVE?.connectionString) {
    connectionString = c.env.HYPERDRIVE.connectionString;
    console.log("[Worker] ✅ Using Hyperdrive connection string");
  } else if (c.env.DATABASE_URL) {
    connectionString = c.env.DATABASE_URL;
    console.log("[Worker] ⚠️ Using DATABASE_URL (Hyperdrive not configured)");
  } else {
    console.error("[Worker] ❌ No database connection string found!");
  }
  
  // Set connection string globally for Prisma
  if (connectionString) {
    // @ts-ignore - Set on globalThis for Prisma
    globalThis.DATABASE_URL = connectionString;
    // Also set on process.env for compatibility
    if (typeof process !== 'undefined') {
      process.env.DATABASE_URL = connectionString;
    }
    console.log("[Worker] ✅ Connection string set, length:", connectionString.length);
  }
  
  // Set Clerk env vars
  if (c.env.CLERK_PUBLISHABLE_KEY) {
    if (typeof process !== 'undefined') {
      process.env.CLERK_PUBLISHABLE_KEY = c.env.CLERK_PUBLISHABLE_KEY;
    }
  }
  if (c.env.CLERK_SECRET_KEY) {
    if (typeof process !== 'undefined') {
      process.env.CLERK_SECRET_KEY = c.env.CLERK_SECRET_KEY;
    }
  }
  if (c.env.JWT_SECRET) {
    if (typeof process !== 'undefined') {
      process.env.JWT_SECRET = c.env.JWT_SECRET;
    }
  }
  
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

// Debug endpoint to check environment
app.get("/debug/env", (c) => {
  const envKeys = Object.keys(c.env);
  const hasDB = !!c.env.DATABASE_URL;
  const dbLength = c.env.DATABASE_URL?.length || 0;
  
  // @ts-ignore
  const globalHasDB = !!globalThis.DATABASE_URL;
  const processHasDB = !!(typeof process !== 'undefined' && process.env?.DATABASE_URL);
  
  return c.json({
    ok: true,
    cloudflare_env_keys: envKeys,
    has_DATABASE_URL_in_c_env: hasDB,
    DATABASE_URL_length_in_c_env: dbLength,
    has_DATABASE_URL_in_globalThis: globalHasDB,
    has_DATABASE_URL_in_process_env: processHasDB,
  });
});

// Debug endpoint to test database connection
app.get("/debug/db", async (c) => {
  try {
    // Import at runtime to ensure env vars are set first
    const prismaModule = await import("./app/db/prisma");
    const prisma = prismaModule.getPrisma();
    
    console.log("[Debug] Got Prisma instance, running test query...");
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("[Debug] ✅ Query successful:", result);
    
    return c.json({ ok: true, result, message: "Database connection successful" });
  } catch (error: any) {
    console.error("[Debug] ❌ Query failed:", error);
    return c.json({ 
      ok: false, 
      error: error?.message || String(error),
      stack: error?.stack 
    }, 500);
  }
});

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
