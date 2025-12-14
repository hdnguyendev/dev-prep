export const Env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 3000),
};

// Only validate in non-worker environments
if (typeof process !== 'undefined' && !Env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
  console.error("[ENV] DATABASE_URL is required");
  if (process.exit) process.exit(1);
}