import { appJobs } from "@server/app/jobs";
import { Hono } from "hono";


const jobRoutes = new Hono();

jobRoutes.get("/", async (c) => {
  const jobs = await appJobs.getJobs();
  return c.json({ success: true, data: jobs });
});

jobRoutes.get("/:id", async (c) => {
  const { id } = c.req.param();
  const job = await appJobs.getJobById(id);
  return c.json({ success: true, data: job });
});

jobRoutes.post("/", async (c) => {
  const payload = await c.req.json();
  const job = await appJobs.createJob(payload);
  return c.json({ success: true, data: job });
});

jobRoutes.put("/:id", async (c) => {
  const { id } = c.req.param();
  const payload = await c.req.json();
  const job = await appJobs.updateJob(id, payload);
  return c.json({ success: true, data: job });
});

jobRoutes.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const job = await appJobs.deleteJob(id);
  return c.json({ success: true, data: job });
});

export default jobRoutes;