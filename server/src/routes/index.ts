import { Hono } from "hono";
import crudRoutes from "./crud";
import swaggerRoutes from "./swagger";
import uploadRoutes from "./upload";

const routes = new Hono();

routes.get("/health", (c) => c.json({ ok: true, uptime: process.uptime() }));
routes.route("/", uploadRoutes);
routes.route("/", crudRoutes);
routes.route("/", swaggerRoutes);

export default routes;
