import { Hono } from "hono";

const aiRoutes = new Hono();

/**
 * Debug endpoint: list models visible to the configured Gemini API key.
 * Helps diagnose 404 "model not found" issues.
 *
 * NOTE: Only intended for local/dev usage. Consider removing or guarding in production.
 */
aiRoutes.get("/ai/gemini/models", async (c) => {
  try {
    const apiKey =
      process.env.GEMINI_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, message: "GEMINI_AI_API_KEY is not configured" }, 500);
    }

    const fetchModels = async (version: "v1beta" | "v1") => {
      const url = `https://generativelanguage.googleapis.com/${version}/models?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      return { version, ok: res.ok, status: res.status, json };
    };

    const [v1beta, v1] = await Promise.all([fetchModels("v1beta"), fetchModels("v1")]);
    return c.json({ success: true, data: { v1beta, v1 } });
  } catch (error) {
    console.error("List Gemini models error:", error);
    return c.json({ success: false, message: "Failed to list Gemini models" }, 500);
  }
});

export default aiRoutes;


