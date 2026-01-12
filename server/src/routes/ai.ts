import { Hono } from "hono";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

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

/**
 * Generate a single interview question based on role, type, level, and tech stack
 * POST /ai/generate-question
 */
aiRoutes.post("/ai/generate-question", async (c) => {
  try {
    const apiKey =
      process.env.GEMINI_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, message: "GEMINI_AI_API_KEY is not configured" }, 500);
    }

    const body = await c.req.json();
    const schema = z.object({
      role: z.string().min(1),
      type: z.string().min(1),
      level: z.string().min(1),
      techstack: z.string().optional(),
      existingQuestions: z.array(z.string()).optional(), // To avoid duplicates
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, message: "Invalid request body", errors: parsed.error.errors }, 400);
    }

    const { role, type, level, techstack, existingQuestions = [] } = parsed.data;

    // Normalize level for better prompt
    const levelUpper = level.toUpperCase();
    const isJunior = levelUpper.includes("JUNIOR") || levelUpper.includes("ENTRY") || levelUpper.includes("INTERN");
    const isSenior = levelUpper.includes("SENIOR") || levelUpper.includes("LEAD") || levelUpper.includes("PRINCIPAL") || levelUpper.includes("ARCHITECT");
    const isMid = !isJunior && !isSenior;

    // Build prompt for generating a single interview question
    const prompt = `You are an expert technical interviewer with years of experience. Generate ONE professional interview question that is commonly asked in real job interviews.

Job Details:
- Role: ${role}
- Job Type: ${type}
- Level: ${level}${isJunior ? " (Entry-level/Junior)" : isSenior ? " (Senior/Lead)" : " (Mid-level)"}
${techstack ? `- Tech Stack: ${techstack}` : ""}

${existingQuestions.length > 0 ? `\nExisting questions (avoid similar ones):\n${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}` : ""}

## Level-Specific Requirements:

${isJunior ? `**JUNIOR/ENTRY-LEVEL**: 
- Focus on fundamental concepts, basic knowledge, and learning ability
- Questions should assess: understanding of core concepts, problem-solving approach, willingness to learn
- Examples: "What is [concept]?", "How would you approach [basic task]?", "Tell me about a project you worked on"
- Avoid overly complex system design or architecture questions` : isSenior ? `**SENIOR/LEAD LEVEL**:
- Focus on architecture, design patterns, scalability, leadership, and best practices
- Questions should assess: system design skills, technical leadership, trade-off analysis, mentoring ability
- Examples: "How would you design [system]?", "Explain trade-offs between [options]", "How do you ensure code quality at scale?"
- Should demonstrate deep technical expertise and strategic thinking` : `**MID-LEVEL**:
- Focus on practical experience, problem-solving, and intermediate technical skills
- Questions should assess: hands-on experience, debugging skills, optimization, collaboration
- Examples: "Describe a challenging bug you fixed", "How do you optimize [performance]?", "Tell me about a time you improved a system"
- Balance between fundamentals and advanced concepts`}

## Question Type Guidelines:
- Generate questions that are **commonly asked in real interviews** for this role and level
- Mix of technical questions (if tech stack provided) and behavioral/experience questions
- Questions should be specific, clear, and help assess the candidate's actual qualifications
- Avoid generic or overly theoretical questions
- Make it sound natural and conversational (like a real interviewer would ask)

## Requirements:
- Generate ONLY ONE question
- The question must be appropriate for ${level} level candidates
- The question should be relevant to the role and tech stack (if provided)
- Avoid questions that are too similar to existing ones (if provided)
- The question should be realistic and commonly used in actual interviews

CRITICAL OUTPUT FORMAT:
- Return ONLY the question text
- No numbering (no "1.", "2.", etc.)
- No prefix (no "Q:", "Question:", etc.)
- No explanation or additional text
- Just the question itself, ending with a question mark
- Make it sound natural and conversational

Example of correct output for ${isJunior ? "Junior" : isSenior ? "Senior" : "Mid"}-level:
${isJunior ? '"Can you explain what [core concept] is and how you\'ve used it in a project?"' : isSenior ? '"How would you design a scalable system to handle [specific requirement]? What are the key trade-offs you\'d consider?"' : '"Describe a time when you had to debug a complex issue. What was your approach and how did you solve it?"'}

Now generate the question:`;

    const ai = new GoogleGenAI({ apiKey });
    const DEFAULT_MODEL = "gemini-2.5-flash";
    const modelCandidates = [
      DEFAULT_MODEL,
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash",
    ].filter(Boolean);

    let lastError: unknown = null;
    for (const modelId of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: prompt,
        });

        const question = (response.text || "").trim();
        
        // Clean up the question (remove numbering, prefixes, etc.)
        const cleanedQuestion = question
          .replace(/^\d+[\.\)]\s*/, "") // Remove numbering like "1. " or "1) "
          .replace(/^Q\d+:\s*/i, "") // Remove "Q1: " prefix
          .replace(/^Question:\s*/i, "") // Remove "Question: " prefix
          .trim();

        if (cleanedQuestion.length > 0) {
          return c.json({ success: true, data: { question: cleanedQuestion } });
        }
      } catch (err) {
        lastError = err;
        const msg = String((err as any)?.message || "");
        const status = Number((err as any)?.statusCode || 0);
        const isNotFound = status === 404 || msg.includes("is not found") || msg.includes("NOT_FOUND");
        if (!isNotFound) break; // don't retry non-404 errors
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Failed to generate question");
  } catch (error) {
    console.error("Generate question error:", error);
    return c.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to generate question" },
      500
    );
  }
});

export default aiRoutes;


