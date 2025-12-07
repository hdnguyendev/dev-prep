import { z } from "zod";

export const CreateJobSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(255),
  slug: z.string().min(3).max(255),
  company_id: z.string().uuid(),
  department_id: z.string().uuid(),
  employment_type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERN"]),
  work_model: z.enum(["ON_SITE", "REMOTE", "HYBRID"]),
  country: z.string().min(3).max(255),
  city: z.string().min(3).max(255),
  address: z.string().min(3).max(255),
  min_salary: z.number(),
  max_salary: z.number(),
  currency: z.string().min(1).max(10),
  experience_min_years: z.number(),
  experience_max_years: z.number(),
  job_level: z.enum(["JUNIOR", "MID", "SENIOR", "LEAD", "MANAGER"]),
  description: z.string(),
  requirements: z.string(),
  nice_to_have: z.string(),
  responsibilities: z.string(),
  skills: z.string(),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;


