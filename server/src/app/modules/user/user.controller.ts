import { UserService } from "@server/app/modules/user";
import { ok } from "@server/app/utils";
import type { Context } from "hono";

export const getMe = async (c: Context) => {
  const userId = c.get("userId");
  const data = await UserService.profile(userId);
  return ok(c, data);
};
