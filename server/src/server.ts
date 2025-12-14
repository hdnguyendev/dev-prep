import { clerkMiddleware } from "@hono/clerk-auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { appDb, appMiddlewares } from "./app";
import routes from "./routes";

const app = new Hono();

// Note: Database connection test removed for Workers compatibility
// Connection happens lazily on first query

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Authorization", "Content-Type"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.use("*", clerkMiddleware());
app.use("*", logger());
app.use("*", appMiddlewares.requestLogger());

// Serve static files from public/uploads
app.use("/uploads/*", serveStatic({ root: "./public" }));

app.notFound((c) => c.json({ ok: false, error: "NOT_FOUND", path: c.req.path }, 404));
app.onError(appMiddlewares.errorHandler);

// Mount all feature routes
app.route("/", routes);

export default app;
