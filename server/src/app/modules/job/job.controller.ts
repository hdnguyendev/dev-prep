import { JobService } from "./job.service";
import { ok } from "@server/app/utils";
import type { Context } from "hono";

export const listJobs = async (c: Context) => {
  const data = await JobService.list();
  return ok(c, data);
};


