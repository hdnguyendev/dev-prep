import { z } from "zod";

export const INTERVIEW_EVALUATION_LANGUAGES = ["en", "vi"] as const;
export type InterviewEvaluationLanguage = (typeof INTERVIEW_EVALUATION_LANGUAGES)[number];

export const INTERVIEW_EVALUATION_SENIORITIES = ["JUNIOR", "MID", "SENIOR"] as const;
export type InterviewEvaluationSeniority = (typeof INTERVIEW_EVALUATION_SENIORITIES)[number];

export type InterviewEvaluationWeights = {
  length: number;
  structure: number;
  examples: number;
  confidence: number;
  keywordMatch: number;
  relevance: number;
};

export const DEFAULT_WEIGHTS: InterviewEvaluationWeights = {
  length: 0.25,
  structure: 0.2,
  examples: 0.2,
  confidence: 0.1,
  keywordMatch: 0.15,
  relevance: 0.1,
};

export const interviewEvaluationOptionsSchema = z.object({
  language: z.enum(INTERVIEW_EVALUATION_LANGUAGES).optional(),
  seniority: z.enum(INTERVIEW_EVALUATION_SENIORITIES).optional(),
  role: z.string().optional(),
  mustHaveKeywords: z.array(z.string()).optional(),
  niceToHaveKeywords: z.array(z.string()).optional(),
  /**
   * Optional synonyms to help keyword matching.
   * Example: { "react": ["reactjs", "react.js"], "typescript": ["ts"] }
   */
  synonyms: z.record(z.string(), z.array(z.string())).optional(),
  /** Optional stopwords for tokenization (lowercase). */
  stopwords: z.array(z.string()).optional(),
  /** Optional filler words for hesitation detection (lowercase). */
  fillerWords: z.array(z.string()).optional(),
  weights: z
    .object({
      length: z.number().min(0).max(1),
      structure: z.number().min(0).max(1),
      examples: z.number().min(0).max(1),
      confidence: z.number().min(0).max(1),
      keywordMatch: z.number().min(0).max(1),
      relevance: z.number().min(0).max(1),
    })
    .partial()
    .optional(),
});

const DICT = {
  en: {
    noAnswer: "No answer provided.",
    tooShort: "Answer is very short; add more detail.",
    addStructure: "Try a clearer structure (problem → action → result).",
    addExample: "Add a concrete example or metric.",
    lessHedging: "Reduce hedging; be more confident and specific.",
    addKeywords: "Try to address the role keywords more explicitly.",
    improveRelevance: "Make sure the answer directly addresses the question.",
    solid: "Solid answer with adequate detail and clarity.",
    summaryStrong: "Strong performance overall with clear, structured answers and good supporting detail.",
    summaryMixed: "Mixed performance: some solid answers, but consistency and depth can be improved.",
    summaryWeak: "Needs improvement: answers are often too brief or lack structure and concrete examples.",
    strengthConsistent: "Consistently detailed and coherent answers.",
    strengthStrongOne: "At least one strong, well-supported answer.",
    improvBrief: "Some answers are too brief or missing key details.",
    improvStar: "Use a consistent structure (STAR / problem-solving narrative).",
    improvEvidence: "Add more concrete examples and measurable impact.",
    improvClarity: "Improve clarity: explain decisions and trade-offs explicitly.",
  },
  vi: {
    noAnswer: "Không có câu trả lời.",
    tooShort: "Câu trả lời quá ngắn; cần thêm chi tiết.",
    addStructure: "Nên trả lời theo cấu trúc rõ hơn (vấn đề → hành động → kết quả).",
    addExample: "Hãy thêm ví dụ cụ thể hoặc số liệu (metric).",
    lessHedging: "Giảm các từ do dự; tự tin và cụ thể hơn.",
    addKeywords: "Hãy đề cập rõ hơn các keyword liên quan tới role.",
    improveRelevance: "Đảm bảo trả lời đúng trọng tâm câu hỏi.",
    solid: "Câu trả lời ổn, đủ chi tiết và tương đối rõ ràng.",
    summaryStrong: "Tổng thể tốt: trả lời rõ ràng, có cấu trúc và có dẫn chứng.",
    summaryMixed: "Tổng thể trung bình: có câu trả lời tốt nhưng cần cải thiện tính nhất quán và độ sâu.",
    summaryWeak: "Cần cải thiện: nhiều câu quá ngắn hoặc thiếu cấu trúc và ví dụ cụ thể.",
    strengthConsistent: "Trả lời khá nhất quán, mạch lạc và có chi tiết.",
    strengthStrongOne: "Có ít nhất một câu trả lời mạnh, có dẫn chứng.",
    improvBrief: "Một số câu trả lời quá ngắn hoặc thiếu ý chính.",
    improvStar: "Dùng cấu trúc nhất quán (STAR / kể câu chuyện giải quyết vấn đề).",
    improvEvidence: "Thêm ví dụ cụ thể và tác động đo lường được.",
    improvClarity: "Cải thiện độ rõ ràng: giải thích quyết định và trade-off.",
  },
} as const;

export const tr = (lang: InterviewEvaluationLanguage, key: keyof (typeof DICT)["en"]) => {
  return (DICT[lang] as any)?.[key] ?? DICT.en[key];
};


