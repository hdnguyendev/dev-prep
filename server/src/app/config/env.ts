export const Env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
  GEMINI_AI_API_KEY: process.env.GEMINI_AI_API_KEY,
  INTERVIEW_EVALUATOR_MODE: process.env.INTERVIEW_EVALUATOR_MODE || "RULE_BASED",
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 3000),
  // Email / SMTP
  APP_BASE_URL: process.env.APP_BASE_URL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER,
  EMAIL_SENDING_ENABLED:
    process.env.EMAIL_SENDING_ENABLED === "true" ||
    process.env.EMAIL_SENDING_ENABLED === "1",
};

// Only validate in non-worker environments
if (typeof process !== 'undefined' && !Env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
  console.error("[ENV] DATABASE_URL is required");
  if (process.exit) process.exit(1);
}