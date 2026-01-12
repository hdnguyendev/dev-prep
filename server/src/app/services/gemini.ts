/**
 * Gemini service wrapper for generating structured interview feedback (via @google/genai).
 *
 * Requires ONE of:
 * - GEMINI_AI_API_KEY (preferred)
 * - GOOGLE_GENERATIVE_AI_API_KEY (fallback)
 * - GEMINI_API_KEY (fallback)
 *
 * Optional:
 * - GEMINI_MODEL (default: gemini-1.5-flash)
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

type GeminiFeedbackCategoryScore = {
  name: string;
  score: number; // 0..10
  comment: string;
};

export type GeminiInterviewFeedback = {
  overallScore: number; // 0..100
  recommendation: "HIRE" | "CONSIDER" | "REJECT";
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  categoryScores: GeminiFeedbackCategoryScore[];
  perQuestion: Array<{
    orderIndex: number;
    score: number; // 0..10
    feedback: string;
  }>;
};

type Turn = {
  orderIndex: number;
  questionText: string;
  answerText?: string | null;
};

// Some API keys/environments don't expose all model IDs. Use a safe default + fallback list.
// NOTE: Prefer Gemini 2.5 Flash when available, but keep fallbacks for keys that don't have access.
const DEFAULT_MODEL = "gemini-2.5-flash";

const buildPrompt = (transcript: string, turns: Turn[]) => {
  const turnsText = turns
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((t) => `Q${t.orderIndex}: ${t.questionText}\nA${t.orderIndex}: ${t.answerText || ""}`.trim())
    .join("\n\n");

  return `You are an expert interviewer and evaluator with deep knowledge of technical and behavioral interview assessment.

You will be given a transcript and a structured list of questions and answers from a mock interview.
Your task is to produce a STRICT JSON object (no markdown, no extra text, no code blocks).

## EVALUATION CRITERIA

Evaluate each answer based on these 6 criteria with their weights:

### 1. LENGTH (Weight: 25%)
- Assess answer completeness and detail level
- Minimum words: Junior (18), Mid (25), Senior (35)
- Good length: Junior (25-70), Mid (40-90), Senior (60-120)
- Scoring: 0 (no answer) → 4 (too short) → 7 (adequate) → 8 (optimal)

### 2. STRUCTURE (Weight: 20%)
- Evaluate organization and logical flow
- Look for STAR method: Situation, Task, Action, Result
- Or structured approach: problem → approach → outcome
- Scoring: 4 (unstructured) → 10 (well-structured with STAR/clear narrative)

### 3. EXAMPLES (Weight: 20%)
- Assess use of concrete examples, metrics, and evidence
- Look for: specific numbers (%, users, time, revenue), metrics (KPI, latency, throughput), explicit examples
- Scoring: 4 (no examples) → 10 (clear examples with measurable impact)

### 4. CONFIDENCE (Weight: 10%)
- Evaluate assertiveness and clarity, avoid excessive hedging
- Penalize filler words: "uh", "um", "maybe", "probably", "not sure", "I think", "kind of"
- Scoring: 4 (very hesitant, ≥4 filler words) → 8 (confident and decisive)

### 5. KEYWORD MATCH (Weight: 15%)
- Assess mention of important role-related keywords
- Must-have keywords (weight x3) vs nice-to-have (weight x1)
- Scoring: 0 (no keywords) → 10 (comprehensive keyword coverage)

### 6. RELEVANCE (Weight: 10%)
- Evaluate direct relevance to the question asked
- Compare question and answer tokens/keywords
- Penalize off-topic answers (low relevance but long = max 5/10)
- Scoring: 0 (completely irrelevant) → 10 (directly addresses question)

## QUESTION TYPE ADJUSTMENTS

- TECHNICAL questions: Increase keywordMatch (+8%), relevance (+5%), examples (+3%); Decrease structure (-3%)
- BEHAVIORAL questions: Increase structure (+8%), examples (+5%), confidence (+3%); Decrease keywordMatch (-4%)
- GENERAL questions: Use default weights

## CATEGORY SCORES (0-10 each)

Evaluate these 5 categories:
1. **Clarity**: Overall clarity and understandability of answers
2. **Structure**: Organization and logical flow across all answers
3. **Depth & Evidence**: Depth of answers and use of concrete evidence
4. **Relevance**: Overall relevance of answers to questions
5. **Keyword Match**: Coverage of important role-related keywords

## OVERALL SCORING

- Calculate per-question score (0-10) using weighted criteria above
- Overall Score = (Average per-question score) × 10 (0-100 integer)
- Recommendation:
  - HIRE: ≥80 points (excellent candidate)
  - CONSIDER: 60-79 points (potential, needs consideration)
  - REJECT: <60 points (does not meet requirements)

## FEEDBACK GUIDELINES

For each question, provide:
- Score (0-10 integer)
- Specific, actionable feedback (1-2 sentences)

For overall feedback:
- Summary: 2-3 sentences describing overall performance
- Strengths: 2-4 specific strengths
- Areas for Improvement: 2-4 specific areas to improve
- Category scores with brief comments

## OUTPUT FORMAT

Return ONLY a valid JSON object (no markdown, no code blocks, no extra text):

{
  "overallScore": <0-100 integer>,
  "recommendation": "HIRE" | "CONSIDER" | "REJECT",
  "summary": "<2-3 sentence summary>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "areasForImprovement": ["<improvement 1>", "<improvement 2>", ...],
  "categoryScores": [
    {"name": "Clarity", "score": <0-10 integer>, "comment": "<brief comment>"},
    {"name": "Structure", "score": <0-10 integer>, "comment": "<brief comment>"},
    {"name": "Depth & Evidence", "score": <0-10 integer>, "comment": "<brief comment>"},
    {"name": "Relevance", "score": <0-10 integer>, "comment": "<brief comment>"},
    {"name": "Keyword Match", "score": <0-10 integer>, "comment": "<brief comment>"}
  ],
  "perQuestion": [
    {"orderIndex": <number>, "score": <0-10 integer>, "feedback": "<specific feedback>"},
    ...
  ]
}

## INPUT DATA

Transcript:
${transcript}

Structured Q&A:
${turnsText}

Now evaluate and return the JSON object.`;
};

const feedbackSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  recommendation: z.enum(["HIRE", "CONSIDER", "REJECT"]),
  summary: z.string(),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  categoryScores: z.array(
    z.object({
      name: z.string(),
      score: z.number().int().min(0).max(10),
      comment: z.string(),
    })
  ),
  perQuestion: z.array(
    z.object({
      orderIndex: z.number().int().min(1),
      score: z.number().int().min(0).max(10),
      feedback: z.string(),
    })
  ),
});

type FeedbackObject = z.infer<typeof feedbackSchema>;

type ListModelsResponse = {
  models?: Array<{
    name?: string; // e.g. "models/gemini-1.5-flash"
    supportedGenerationMethods?: string[];
  }>;
};

let cachedResolvedModel: { modelId: string; expiresAt: number } | null = null;

const listModels = async (apiKey: string, apiVersion: "v1beta" | "v1", abortSignal?: AbortSignal) => {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { method: "GET", signal: abortSignal });
  const json = (await res.json()) as ListModelsResponse;
  return { ok: res.ok, status: res.status, json };
};

const pickAvailableModelId = async (apiKey: string, preferred: string[], abortSignal?: AbortSignal) => {
  // Cache for 10 minutes to avoid calling listModels every analyze.
  const now = Date.now();
  if (cachedResolvedModel && cachedResolvedModel.expiresAt > now) return cachedResolvedModel.modelId;

  const candidates = preferred.filter(Boolean);
  const tryVersions: Array<"v1beta" | "v1"> = ["v1beta", "v1"];

  for (const version of tryVersions) {
    try {
      const { ok, json } = await listModels(apiKey, version, abortSignal);
      if (!ok) continue;

      const available = new Set(
        (json.models || [])
          .map((m) => String(m.name || ""))
          .map((n) => (n.startsWith("models/") ? n.slice("models/".length) : n))
      );

      // Prefer models that explicitly support generateContent, but keep a fallback.
      const supportsGenerate = new Set(
        (json.models || [])
          .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
          .map((m) => String(m.name || ""))
          .map((n) => (n.startsWith("models/") ? n.slice("models/".length) : n))
      );

      for (const id of candidates) {
        if (supportsGenerate.has(id) || available.has(id)) {
          cachedResolvedModel = { modelId: id, expiresAt: now + 10 * 60 * 1000 };
          return id;
        }
      }
    } catch {
      // ignore and continue
    }
  }

  return null;
};

/**
 * Tries to parse a JSON object from an LLM text response.
 * The model is instructed to return strict JSON, but this guards against accidental extra text.
 */
const parseStrictJsonObject = (text: string) => {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("Empty Gemini response");

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    // Best-effort extraction of the first top-level JSON object.
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const sliced = raw.slice(start, end + 1);
      return JSON.parse(sliced) as unknown;
    }
    throw new Error("Gemini response is not valid JSON");
  }
};

/**
 * Calls Gemini and returns structured feedback (validated).
 */
export async function generateInterviewFeedbackWithGemini(params: {
  transcript: string;
  turns: Turn[];
  abortSignal?: AbortSignal;
}): Promise<GeminiInterviewFeedback> {
  const apiKey =
    process.env.GEMINI_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_AI_API_KEY is not configured");
  }

  const prompt = buildPrompt(params.transcript, params.turns);

  const ai = new GoogleGenAI({ apiKey });

  const preferredModel = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  const modelCandidates = [
    preferredModel,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
  ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

  // If the API key has restricted model access, auto-pick a model that exists.
  const resolvedFromList = await pickAvailableModelId(apiKey, modelCandidates, params.abortSignal);
  const finalCandidates = resolvedFromList ? [resolvedFromList, ...modelCandidates] : modelCandidates;

  let lastError: unknown = null;
  for (const modelId of finalCandidates) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
      });

      const parsed = parseStrictJsonObject(response.text || "");
      const validated = feedbackSchema.parse(parsed) as FeedbackObject;
      return validated;
    } catch (err) {
      lastError = err;
      const msg = String((err as any)?.message || "");
      const status = Number((err as any)?.statusCode || 0);
      const isNotFound = status === 404 || msg.includes("is not found") || msg.includes("NOT_FOUND");
      if (!isNotFound) break; // don't retry non-404 errors
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini analyze failed");
}


