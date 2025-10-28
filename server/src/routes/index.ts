import { appModules } from "@server/app";
import { Hono } from "hono";

const routes = new Hono();

routes.route("/users", appModules.userRoute);
routes.route("/jobs", appModules.jobRoute);

routes.get("/health", (c) => c.json({ ok: true, uptime: process.uptime() }));
export default routes;
