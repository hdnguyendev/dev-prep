import { Hono } from "hono";
import jobRoutes from "./jobs";

const routes = new Hono();

routes.get("/health", (c) => c.json({ ok: true, uptime: process.uptime() }));
routes.route("/jobs", jobRoutes);

export default routes;
