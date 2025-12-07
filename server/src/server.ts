import { clerkMiddleware } from "@hono/clerk-auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { appDb, appMiddlewares } from "./app";
import routes from "./routes";

const app = new Hono();

// Test database connection on startup
await appDb.testConnection();

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Authorization", "Content-Type"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.use("*", clerkMiddleware());
app.use("*", logger());
app.use("*", appMiddlewares.requestLogger());
app.notFound((c) => c.json({ ok: false, error: "NOT_FOUND", path: c.req.path }, 404));
app.onError(appMiddlewares.errorHandler);

// Mount all feature routes
app.route("/", routes);

export default app;
