import { Hono } from "hono";
import crudRoutes from "./crud";
import swaggerRoutes from "./swagger";
import uploadRoutes from "./upload";
import authRoutes from "./auth";
import filteredRoutes from "./filtered";
import applicationRoutes from "./applications";
import companyRoutes from "./companies";
import reviewRoutes from "./reviews";
import savedJobRoutes from "./savedJobs";

const routes = new Hono();

routes.get("/health", (c) => c.json({ ok: true, uptime: process.uptime() }));
routes.route("/auth", authRoutes);
routes.route("/api", filteredRoutes);
routes.route("/applications", applicationRoutes); // Custom application endpoint
routes.route("/companies", companyRoutes); // Company endpoints
routes.route("/reviews", reviewRoutes); // Review endpoints
routes.route("/saved-jobs", savedJobRoutes); // Saved jobs endpoints
routes.route("/upload", uploadRoutes); // Upload endpoints
routes.route("/", crudRoutes);
routes.route("/", swaggerRoutes);

export default routes;
