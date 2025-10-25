import { getAuth } from "@hono/clerk-auth";
import { CreateUserSchema, UserService } from "@server/app/modules/user";
import { ok } from "@server/app/utils";
import type { Context } from "hono";

export const createUser = async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ ok: false, message: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const parsed = CreateUserSchema.safeParse({ ...body, clerkUserId: auth.userId });
  if (!parsed.success) {
    return c.json({ ok: false, code: "VALIDATION_ERROR", errors: parsed.error.format() }, 422);
  }
  const data = await UserService.register(parsed.data);
  return ok(c, data, 201);
};

export const getMe = async (c: Context) => {
  const userId = c.get("userId");
  const data = await UserService.profile(userId);
  return ok(c, data);
};


export const updateMe = async (c: Context) => {
};
