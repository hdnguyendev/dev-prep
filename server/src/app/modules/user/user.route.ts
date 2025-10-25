import { appMiddlewares } from "@server/app";
import { Hono } from "hono";
import { createUser, getMe } from "./user.controller";
const r = new Hono();

r.post("/", createUser);
r.get("/me", appMiddlewares.authMiddleware(), getMe);

export default r;
