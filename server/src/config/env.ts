import type { Context } from "hono";
import { env as hEnv } from "hono/adapter";

export function getEnv(c: Context) {
  const e = hEnv<{
    NODE_ENV: string;
    PORT: number;
    DATABASE_URL: string;
    JWT_SECRET: string;
  }>(c);

  return {
    NODE_ENV: e.NODE_ENV,
    PORT: e.PORT,
    DATABASE_URL: e.DATABASE_URL,
    JWT_SECRET: e.JWT_SECRET,
  };
}