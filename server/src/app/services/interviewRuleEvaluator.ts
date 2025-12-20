/**
 * Rule-based interview evaluator (offline).
 *
 * This module intentionally avoids calling any external AI APIs.
 * It scores answers using simple heuristics and returns a structured feedback object
 * compatible with what the app already persists for Gemini evaluations.
 */
import { z } from "zod";
import {
  DEFAULT_WEIGHTS,
  type InterviewEvaluationLanguage,
  type InterviewEvaluationSeniority,
  type InterviewEvaluationWeights,
  interviewEvaluationOptionsSchema,
  tr,
} from "../constants/interviewEvaluation";

export type InterviewTurn = {
  orderIndex: number;
  questionText: string;
  questionCategory?: string | null;
  answerText?: string | null;
};

export type InterviewEvaluationOptions = {
  /** Output language for generated feedback strings. */
  language?: InterviewEvaluationLanguage;
  /** Used to slightly adjust expectations (e.g., longer/more structured answers for SENIOR). */
  seniority?: InterviewEvaluationSeniority;
  /** Optional context label only (not used for scoring directly unless you use keywords). */
  role?: string;
  /** Keywords the candidate should ideally mention (e.g., from JD or rubric). */
  mustHaveKeywords?: string[];
  /** Nice-to-have keywords (lower impact than must-have). */
  niceToHaveKeywords?: string[];
  /** Optional synonyms to improve keyword matching. */
  synonyms?: Record<string, string[]>;
  /** Optional stopwords for tokenization (lowercase). */
  stopwords?: string[];
  /** Optional filler words for hesitation detection (lowercase). */
  fillerWords?: string[];
  /**
   * Weighting for the scoring heuristics (0..1 each).
   * If omitted, defaults are applied.
   */
  weights?: Partial<InterviewEvaluationWeights>;
};

export type InterviewFeedbackCategoryScore = {
  name: string;
  score: number; // 0..10
  comment: string;
};

export type InterviewFeedback = {
  overallScore: number; // 0..100
  recommendation: "HIRE" | "CONSIDER" | "REJECT";
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  categoryScores: InterviewFeedbackCategoryScore[];
  perQuestion: Array<{
    orderIndex: number;
    score: number; // 0..10
    feedback: string;
  }>;
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

const clampInt = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const safeText = (v?: string | null) => String(v || "").trim();

const stripDiacritics = (text: string) =>
  safeText(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const DEFAULT_STOPWORDS_VI = [
  "la",
  "va",
  "nhung",
  "nhieu",
  "mot",
  "cai",
  "cua",
  "toi",
  "minh",
  "ban",
  "anh",
  "chi",
  "em",
  "co",
  "khong",
  "se",
  "da",
  "dang",
  "duoc",
  "cho",
  "ve",
] as const;

const DEFAULT_STOPWORDS_EN = [
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "was",
  "were",
  "i",
  "we",
  "you",
] as const;

const DEFAULT_FILLER_WORDS = [
  "uh",
  "um",
  "maybe",
  "probably",
  "not sure",
  "i think",
  "kind of",
  "sort of",
  "kiểu",
  "ờ",
  "ừm",
  "chắc",
  "không chắc",
] as const;

const countWords = (text: string) => {
  const t = safeText(text);
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
};

const normalizeKeyword = (kw: string) => safeText(kw).toLowerCase();

const normalizeKeywords = (kws?: string[]) =>
  (kws || []).map(normalizeKeyword).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);

const expandKeywordsWithSynonyms = (keywords: string[], synonyms?: Record<string, string[]>) => {
  if (!synonyms) return keywords;
  const out: string[] = [];
  for (const kw of keywords) {
    out.push(kw);
    const syns = synonyms[kw] || synonyms[kw.toLowerCase()] || [];
    for (const s of syns) out.push(normalizeKeyword(s));
  }
  return out.filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const countKeywordMatches = (text: string, keywords: string[]) => {
  const t = safeText(text).toLowerCase();
  if (!t || keywords.length === 0) return 0;
  let hits = 0;
  for (const kw of keywords) {
    if (!kw) continue;
    // Prefer word-boundary match for alphanumeric keywords to reduce false positives.
    if (/^[a-z0-9]+$/.test(kw)) {
      const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
      if (re.test(t)) hits += 1;
      continue;
    }

    // Fallback to containment for tokens like "c#", "c++", ".net", "next.js".
    if (t.includes(kw)) hits += 1;
  }
  return hits;
};

const tokenize = (text: string, lang: InterviewEvaluationLanguage, stopwords: string[]) => {
  const lowered = stripDiacritics(text).toLowerCase();
  const tokens = lowered
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => t.length >= (lang === "vi" ? 2 : 3));
  const stop = new Set(stopwords.map((s) => stripDiacritics(s).toLowerCase()));
  return tokens.filter((t) => !stop.has(t));
};

const jaccard = (a: string[], b: string[]) => {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
};

type QuestionKind = "TECHNICAL" | "BEHAVIORAL" | "GENERAL";

const detectQuestionKind = (questionText: string, questionCategory?: string | null): QuestionKind => {
  const cat = safeText(questionCategory).toLowerCase();
  const q = safeText(questionText).toLowerCase();

  if (cat.includes("tech") || cat.includes("coding") || cat.includes("system") || cat.includes("algorithm")) return "TECHNICAL";
  if (cat.includes("behavior") || cat.includes("communication") || cat.includes("culture")) return "BEHAVIORAL";

  // Heuristic fallback from question text
  if (/\b(implement|optimi[sz]e|complexity|big[-\s]?o|api|database|sql|index|cache|latency|throughput|react|typescript|node|system design)\b/.test(q))
    return "TECHNICAL";
  if (/\b(tell me about|conflict|challenge|failure|mistake|team|leadership|stakeholder|pressure|deadline|feedback)\b/.test(q))
    return "BEHAVIORAL";

  return "GENERAL";
};

const resolveWeightsForKind = (base: InterviewEvaluationWeights, kind: QuestionKind): InterviewEvaluationWeights => {
  // Reweight without changing shape. Keep it simple and deterministic.
  if (kind === "TECHNICAL") {
    return {
      ...base,
      keywordMatch: clamp01(base.keywordMatch + 0.08),
      relevance: clamp01(base.relevance + 0.05),
      examples: clamp01(base.examples + 0.03),
      structure: clamp01(base.structure - 0.03),
    };
  }
  if (kind === "BEHAVIORAL") {
    return {
      ...base,
      structure: clamp01(base.structure + 0.08),
      examples: clamp01(base.examples + 0.05),
      confidence: clamp01(base.confidence + 0.03),
      keywordMatch: clamp01(base.keywordMatch - 0.04),
    };
  }
  return base;
};

const hasExamplesSignal = (text: string) => {
  const t = safeText(text).toLowerCase();
  if (!t) return false;
  // Simple signals: numeric metrics, time references, or explicit "for example".
  return (
    /\bfor example\b|\be\.g\.\b|\bví dụ\b|\bchẳng hạn\b/.test(t) ||
    /\b\d+%|\b\d+\s*(ms|s|sec|secs|minutes|min|hours|hrs|days|weeks|months|years)\b/.test(t) ||
    /\b(kpi|metric|metrics|latency|throughput|roi)\b/.test(t)
  );
};

const hasStructureSignal = (text: string) => {
  const t = safeText(text).toLowerCase();
  if (!t) return false;
  // STAR-ish / structured story signals.
  return /\b(situation|task|action|result)\b|\bproblem\b|\bapproach\b|\boutcome\b|\btrade-?off\b/.test(t);
};

const isVeryHesitant = (text: string) => {
  const t = safeText(text).toLowerCase();
  if (!t) return true;
  // Excessive hedging signals.
  const hits = t.match(/\b(i think|maybe|not sure|probably|kind of|sort of|uh|um)\b/g)?.length || 0;
  return hits >= 4;
};

const resolveWeights = (partial?: Partial<InterviewEvaluationWeights>): InterviewEvaluationWeights => ({
  length: clamp01(partial?.length ?? DEFAULT_WEIGHTS.length),
  structure: clamp01(partial?.structure ?? DEFAULT_WEIGHTS.structure),
  examples: clamp01(partial?.examples ?? DEFAULT_WEIGHTS.examples),
  confidence: clamp01(partial?.confidence ?? DEFAULT_WEIGHTS.confidence),
  keywordMatch: clamp01(partial?.keywordMatch ?? DEFAULT_WEIGHTS.keywordMatch),
  relevance: clamp01(partial?.relevance ?? DEFAULT_WEIGHTS.relevance),
});

const resolveLanguage = (lang?: InterviewEvaluationLanguage): InterviewEvaluationLanguage => (lang === "vi" ? "vi" : "en");

const scoreAnswer0to10 = (params: {
  answerText: string;
  questionText: string;
  questionCategory?: string | null;
  seniority: InterviewEvaluationSeniority;
  mustHaveKeywords: string[];
  niceToHaveKeywords: string[];
  weights: InterviewEvaluationWeights;
  language: InterviewEvaluationLanguage;
  stopwords: string[];
}) => {
  const words = countWords(params.answerText);
  const hasExamples = hasExamplesSignal(params.answerText);
  const hasStructure = hasStructureSignal(params.answerText);
  const hesitant = isVeryHesitant(params.answerText);
  const mustHits = countKeywordMatches(params.answerText, params.mustHaveKeywords);
  const niceHits = countKeywordMatches(params.answerText, params.niceToHaveKeywords);
  const relevance = jaccard(
    tokenize(params.questionText, params.language, params.stopwords),
    tokenize(params.answerText, params.language, params.stopwords)
  );

  const seniority = params.seniority;
  const minGoodWords = seniority === "SENIOR" ? 60 : seniority === "MID" ? 40 : 25;
  const okWords = seniority === "SENIOR" ? 120 : seniority === "MID" ? 90 : 70;

  const lengthSubScore =
    words === 0 ? 0 : words < minGoodWords ? 4 : words < okWords ? 7 : 8; // 0..8
  const structureSubScore = hasStructure ? 10 : 4; // 4..10
  const examplesSubScore = hasExamples ? 10 : 4; // 4..10
  const confidenceSubScore = hesitant ? 4 : 8; // 4..8
  const keywordSubScore = clampInt(mustHits * 3 + niceHits * 1, 0, 10); // 0..10
  const relevanceSubScore = clampInt(relevance * 10, 0, 10);

  const kind = detectQuestionKind(params.questionText, params.questionCategory);
  const w = resolveWeightsForKind(params.weights, kind);
  // Weighted blend → map to 0..10.
  const blended =
    lengthSubScore * w.length +
    structureSubScore * w.structure +
    examplesSubScore * w.examples +
    confidenceSubScore * w.confidence +
    keywordSubScore * w.keywordMatch +
    relevanceSubScore * w.relevance;

  // Normalize by total weight actually used (in case user sets some to 0).
  const totalW = w.length + w.structure + w.examples + w.confidence + w.keywordMatch + w.relevance;
  const normalized = totalW > 0 ? blended / totalW : 0;

  // Off-topic penalty: if relevance is very low but answer is long, cap score to avoid rewarding rambles.
  const offTopic = relevance > 0 && relevance < 0.08 && words >= 40;
  const capped = offTopic ? Math.min(normalized, 5) : normalized;

  return clampInt(capped, 0, 10);
};

const recommendationFromOverall = (overallScore: number): InterviewFeedback["recommendation"] => {
  if (overallScore >= 80) return "HIRE";
  if (overallScore >= 60) return "CONSIDER";
  return "REJECT";
};

/**
 * Generates structured interview feedback using offline rule-based heuristics.
 */
export async function generateInterviewFeedbackRuleBased(params: {
  transcript: string;
  turns: InterviewTurn[];
  options?: InterviewEvaluationOptions;
}): Promise<InterviewFeedback> {
  const optionsParsed = interviewEvaluationOptionsSchema.safeParse(params.options || {});
  const options = optionsParsed.success ? optionsParsed.data : {};
  const language = resolveLanguage(options.language);
  const seniority: InterviewEvaluationSeniority = options.seniority || "MID";
  const stopwordsProvided = normalizeKeywords(options.stopwords);
  const stopwords = stopwordsProvided.length
    ? stopwordsProvided
    : language === "vi"
      ? [...DEFAULT_STOPWORDS_VI]
      : [...DEFAULT_STOPWORDS_EN];

  const fillerProvided = normalizeKeywords(options.fillerWords);
  const fillerWords = fillerProvided.length ? fillerProvided : [...DEFAULT_FILLER_WORDS];

  const mustHaveKeywords = expandKeywordsWithSynonyms(normalizeKeywords(options.mustHaveKeywords), options.synonyms as any);
  const niceToHaveKeywords = expandKeywordsWithSynonyms(normalizeKeywords(options.niceToHaveKeywords), options.synonyms as any);
  const weights = resolveWeights(options.weights);

  const turns = (params.turns || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);

  const perQuestion = turns.map((t) => {
    const answer = safeText(t.answerText);
    const qText = safeText(t.questionText);
    const score = scoreAnswer0to10({
      answerText: answer,
      questionText: qText,
      questionCategory: t.questionCategory,
      seniority,
      mustHaveKeywords,
      niceToHaveKeywords,
      weights,
      language,
      stopwords,
    });

    const words = countWords(answer);
    const notes: string[] = [];
    if (words === 0) notes.push(tr(language, "noAnswer"));
    else {
      const minWords = seniority === "SENIOR" ? 35 : seniority === "MID" ? 25 : 18;
      if (words < minWords) notes.push(tr(language, "tooShort"));
      if (!hasStructureSignal(answer)) notes.push(tr(language, "addStructure"));
      if (!hasExamplesSignal(answer)) notes.push(tr(language, "addExample"));
      // Filler/hesitation: use configurable filler list.
      const lowered = safeText(answer).toLowerCase();
      const fillerHits = fillerWords.reduce((acc, w) => (w && lowered.includes(w) ? acc + 1 : acc), 0);
      if (isVeryHesitant(answer) || fillerHits >= 2) notes.push(tr(language, "lessHedging"));
      if (mustHaveKeywords.length > 0 && countKeywordMatches(answer, mustHaveKeywords) === 0) {
        notes.push(tr(language, "addKeywords"));
      }
      const rel = jaccard(
        tokenize(qText, language, stopwords),
        tokenize(answer, language, stopwords)
      );
      if (rel > 0 && rel < 0.12) notes.push(tr(language, "improveRelevance"));
    }

    const feedback = notes.length ? notes.join(" ") : tr(language, "solid");

    return {
      orderIndex: t.orderIndex,
      score,
      feedback,
    };
  });

  const avg = perQuestion.length
    ? perQuestion.reduce((acc, q) => acc + q.score, 0) / perQuestion.length
    : 0;
  const overallScore = clampInt(avg * 10, 0, 100);

  const strengths: string[] = [];
  const areasForImprovement: string[] = [];

  if (overallScore >= 75) strengths.push(tr(language, "strengthConsistent"));
  if (perQuestion.some((q) => q.score >= 8)) strengths.push(tr(language, "strengthStrongOne"));
  if (perQuestion.some((q) => q.score <= 3)) areasForImprovement.push(tr(language, "improvBrief"));

  // Derive category scores from the same heuristics so the UI still has structure.
  const clarityScore = clampInt(
    perQuestion.length ? (perQuestion.reduce((acc, q) => acc + (q.score >= 6 ? 1 : 0), 0) / perQuestion.length) * 10 : 0,
    0,
    10
  );
  const depthScore = clampInt(avg + (turns.some((t) => hasExamplesSignal(safeText(t.answerText))) ? 1 : 0), 0, 10);
  const structureScore = clampInt(
    turns.length ? (turns.filter((t) => hasStructureSignal(safeText(t.answerText))).length / turns.length) * 10 : 0,
    0,
    10
  );
  const relevanceScore = clampInt(
    turns.length
      ? turns.reduce((acc, t) => {
          const q = safeText(t.questionText);
          const a = safeText(t.answerText);
          const rel = jaccard(tokenize(q, language, stopwords), tokenize(a, language, stopwords));
          return acc + rel * 10;
        }, 0) / turns.length
      : 0,
    0,
    10
  );
  const keywordScore = clampInt(
    mustHaveKeywords.length + niceToHaveKeywords.length === 0
      ? 0
      : (turns.reduce((acc, t) => {
          const a = safeText(t.answerText);
          return acc + Math.min(10, countKeywordMatches(a, mustHaveKeywords) * 3 + countKeywordMatches(a, niceToHaveKeywords));
        }, 0) /
          Math.max(1, turns.length)),
    0,
    10
  );

  if (structureScore < 6) areasForImprovement.push(tr(language, "improvStar"));
  if (depthScore < 6) areasForImprovement.push(tr(language, "improvEvidence"));
  if (clarityScore < 6) areasForImprovement.push(tr(language, "improvClarity"));
  if (mustHaveKeywords.length > 0 && keywordScore < 6) areasForImprovement.push(tr(language, "addKeywords"));

  const categoryScores: InterviewFeedbackCategoryScore[] = [
    {
      name: "Clarity",
      score: clarityScore,
      comment: clarityScore >= 7 ? "OK" : "Needs improvement",
    },
    {
      name: "Structure",
      score: structureScore,
      comment: structureScore >= 7 ? "OK" : "Needs improvement",
    },
    {
      name: "Depth & Evidence",
      score: depthScore,
      comment: depthScore >= 7 ? "OK" : "Needs improvement",
    },
    {
      name: "Relevance",
      score: relevanceScore,
      comment: relevanceScore >= 7 ? "OK" : "Needs improvement",
    },
    ...(mustHaveKeywords.length + niceToHaveKeywords.length > 0
      ? [
          {
            name: "Keyword Match",
            score: keywordScore,
            comment: keywordScore >= 7 ? "OK" : "Needs improvement",
          } satisfies InterviewFeedbackCategoryScore,
        ]
      : []),
  ];

  const recommendation = recommendationFromOverall(overallScore);
  const summary =
    overallScore >= 80
      ? tr(language, "summaryStrong")
      : overallScore >= 60
        ? tr(language, "summaryMixed")
        : tr(language, "summaryWeak");

  const result: InterviewFeedback = {
    overallScore,
    recommendation,
    summary,
    strengths: strengths.length ? strengths : [language === "vi" ? "Có tiềm năng; một số câu trả lời đi đúng hướng." : "Shows potential; some answers are on the right track."],
    areasForImprovement: areasForImprovement.length
      ? Array.from(new Set(areasForImprovement))
      : [language === "vi" ? "Cải thiện tính nhất quán giữa các câu trả lời." : "Improve consistency across answers."],
    categoryScores,
    perQuestion,
  };

  // Ensure output always conforms to the contract.
  return feedbackSchema.parse(result);
}


export type { InterviewEvaluationSeniority, InterviewEvaluationLanguage };

