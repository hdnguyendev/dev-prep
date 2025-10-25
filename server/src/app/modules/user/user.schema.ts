import { z } from "zod";

export const CreateUserSchema = z.object({
  clerkUserId: z.string().min(1),
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
});

export const UpdateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
