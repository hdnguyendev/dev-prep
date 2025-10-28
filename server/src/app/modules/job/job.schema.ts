import { z } from "zod";

export const CreateJobSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().min(1),
  type: z.string().min(1),
  salary: z.string().min(1),
  tags: z.array(z.string()).min(1),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;


