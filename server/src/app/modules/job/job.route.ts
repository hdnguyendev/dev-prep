import { appMiddlewares } from "@server/app";
import { Hono } from "hono";
import { listJobs } from "./job.controller";
const r = new Hono();

r.get("/", appMiddlewares.authMiddleware(), listJobs);

export default r;


