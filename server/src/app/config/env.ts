export const Env = {
  DATABASE_URL: Bun.env.DATABASE_URL!,
  JWT_SECRET: Bun.env.JWT_SECRET || "dev-secret",
  NODE_ENV: Bun.env.NODE_ENV || "development",
  PORT: Number(Bun.env.PORT || 3000),
};

if (!Env.DATABASE_URL) {
  console.error("[ENV] DATABASE_URL is required");
  process.exit(1);
}