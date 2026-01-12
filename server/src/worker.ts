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
import companyFollowRoutes from "./routes/companyFollows";
import offerRoutes from "./routes/offers";
import notificationRoutes from "./routes/notifications";
import matchingRoutes from "./routes/matching";
import jobRoutes from "./routes/jobs";
import membershipRoutes from "./routes/membership";
import candidateProfileRoutes from "./routes/candidateProfiles";
import aiRoutes from "./routes/ai";

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
  R2_STORAGE?: any; // Optional R2 bucket for file uploads
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

// Mount routes
app.route("/auth", authRoutes);
app.route("/api", filteredRoutes);
app.route("/applications", applicationRoutes);
app.route("/companies", companyRoutes);
app.route("/reviews", reviewRoutes);
app.route("/saved-jobs", savedJobRoutes);
app.route("/company-follows", companyFollowRoutes);
app.route("/notifications", notificationRoutes);
app.route("/matching", matchingRoutes);
app.route("/jobs", jobRoutes);
app.route("/", membershipRoutes);
app.route("/", candidateProfileRoutes);
app.route("/", aiRoutes);
app.route("/", offerRoutes);
app.route("/", crudRoutes);
app.route("/", swaggerRoutes);

// Upload routes (using R2 for Cloudflare Workers)
app.post("/upload/resume", async (c) => {
  try {
    // Check if R2 is configured
    if (!c.env.R2_STORAGE) {
      // Fallback: Return error with setup instructions
      return c.json({ 
        success: false, 
        message: "File storage not configured. R2 bucket required.",
        setup: {
          step1: "Enable R2 in Cloudflare Dashboard: https://dash.cloudflare.com → R2 → Get Started",
          step2: "Create bucket: wrangler r2 bucket create dev-prep-uploads",
          step3: "Uncomment R2 binding in wrangler.toml and redeploy"
        }
      }, 503);
    }

    const body = await c.req.parseBody();
    const file = body["file"] as File | undefined;

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, message: "No file uploaded" }, 400);
    }

    // Validate file type (PDF, DOC, DOCX)
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        success: false, 
        message: "Invalid file type. Only PDF, DOC, and DOCX are allowed" 
      }, 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return c.json({ 
        success: false, 
        message: "File too large. Maximum size is 5MB" 
      }, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const ext = file.name.split(".").pop() || "pdf";
    const filename = `resumes/resume_${timestamp}_${randomStr}.${ext}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_STORAGE.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Generate public URL using R2 public bucket or custom domain
    // Option 1: If R2 bucket is public, use: https://<account-id>.r2.cloudflarestorage.com/<bucket-name>/<filename>
    // Option 2: Use custom domain if configured
    // For now, return a proxy URL through the Worker
    // Get base URL correctly - extract origin from request URL
    let baseUrl: string;
    try {
      const requestUrl = new URL(c.req.url);
      // Get origin (protocol + host) without path
      baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    } catch {
      // Fallback: try to get from headers
      const host = c.req.header('host') || c.req.header('x-forwarded-host');
      const protocol = c.req.header('x-forwarded-proto') || 'https';
      if (host) {
        baseUrl = `${protocol}://${host}`;
      } else {
        // Last resort: use environment variable or default
        baseUrl = process.env.VITE_API_URL || "https://dev-prep-api.hdnguyen-dev.workers.dev";
      }
    }
    
    const fileUrl = `${baseUrl}/files/${filename}`;

    return c.json({
      success: true,
      data: {
        url: fileUrl,
        filename,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to upload file" 
    }, 500);
  }
});

// Serve uploaded files from R2
app.get("/files/*", async (c) => {
  try {
    if (!c.env.R2_STORAGE) {
      return c.json({ success: false, message: "File storage not configured" }, 503);
    }

    const path = c.req.path.replace("/files/", "");
    const object = await c.env.R2_STORAGE.get(path);

    if (!object) {
      return c.json({ success: false, message: "File not found" }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("File serve error:", error);
    return c.json({ success: false, message: "Failed to serve file" }, 500);
  }
});

// Error handlers
app.notFound((c) => c.json({ ok: false, error: "NOT_FOUND", path: c.req.path }, 404));
app.onError(appMiddlewares.errorHandler);

// Export for Cloudflare Workers
// Export both fetch handler and scheduled handler
export default {
  fetch: app.fetch,
  async scheduled(
    event: { cron: string; scheduledTime: number },
    env: Env,
  ): Promise<void> {
    console.log("[SCHEDULED] Cron trigger received:", event.cron, event.scheduledTime);

    // Set up environment for Prisma
    let connectionString: string | undefined;
    if (env.HYPERDRIVE?.connectionString) {
      connectionString = env.HYPERDRIVE.connectionString;
    } else if (env.DATABASE_URL) {
      connectionString = env.DATABASE_URL;
    }

    if (connectionString) {
      // @ts-ignore
      globalThis.DATABASE_URL = connectionString;
      if (typeof process !== 'undefined') {
        process.env.DATABASE_URL = connectionString;
      }
    }

    try {
      // Import job function dynamically to ensure env is set
      const { cleanupExpiredInterviewsJob } = await import("./app/jobs/cleanupExpiredInterviews.job");
      
      const result = await cleanupExpiredInterviewsJob();
      
      console.log("[SCHEDULED] Cleanup completed:", {
        expired: result.expired,
        deleted: result.deleted,
        errors: result.errors.length,
      });

      if (result.errors.length > 0) {
        console.error("[SCHEDULED] Errors during cleanup:", result.errors);
      }
    } catch (error) {
      console.error("[SCHEDULED] Failed to run cleanup job:", error);
    }
  },
};
