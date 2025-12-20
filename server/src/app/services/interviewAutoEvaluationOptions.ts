import type { InterviewEvaluationLanguage, InterviewEvaluationOptions, InterviewEvaluationSeniority } from "./interviewRuleEvaluator";

type JobSkillLike = { isRequired: boolean; skill?: { name?: string | null } | null };
type JobCategoryLike = { category?: { name?: string | null } | null };

type JobLike = {
  title?: string | null;
  description?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  interviewQuestions?: string[] | null;
  experienceLevel?: string | null;
  skills?: JobSkillLike[] | null;
  categories?: JobCategoryLike[] | null;
};

const safeText = (v?: string | null) => String(v || "").trim();

const stripHtml = (html?: string | null) =>
  safeText(html)
    // remove tags
    .replace(/<[^>]*>/g, " ")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

const normalizeKw = (kw: string) => safeText(kw).toLowerCase();

const uniq = (arr: string[]) => arr.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

const buildAutoSynonyms = (keywords: string[]) => {
  const syn: Record<string, string[]> = {};

  const add = (base: string, v: string) => {
    const b = normalizeKw(base);
    const val = normalizeKw(v);
    if (!b || !val || b === val) return;
    syn[b] = syn[b] || [];
    if (!syn[b].includes(val)) syn[b].push(val);
  };

  for (const kw of keywords) {
    const k = normalizeKw(kw);
    if (!k) continue;

    // Heuristic variants: remove punctuation and common separators.
    const noDots = k.replace(/\./g, "");
    const noSpaces = k.replace(/\s+/g, "");
    const noHyphen = k.replace(/-/g, "");
    if (noDots !== k) add(k, noDots);
    if (noSpaces !== k) add(k, noSpaces);
    if (noHyphen !== k) add(k, noHyphen);

    // Special tech patterns.
    if (k === "typescript") add(k, "ts");
    if (k === "javascript") add(k, "js");
    if (k === "node.js") add(k, "nodejs");
    if (k === "react.js") add(k, "reactjs");
    if (k === "next.js") add(k, "nextjs");
    if (k === "postgresql") add(k, "postgres");
    if (k === "dotnet") add(k, ".net");
    if (k === ".net") add(k, "dotnet");
  }

  return syn;
};

const detectLanguage = (text: string): InterviewEvaluationLanguage => {
  const t = safeText(text);
  if (!t) return "en";
  // Vietnamese diacritics heuristic.
  if (/[ăâđêôơưáàảãạíìỉĩịúùủũụéèẻẽẹóòỏõọýỳỷỹỵ]/i.test(t)) return "vi";
  return "en";
};

const seniorityFromExperienceLevel = (experienceLevel?: string | null): InterviewEvaluationSeniority => {
  const t = normalizeKw(experienceLevel || "");
  if (!t) return "MID";
  if (t.includes("intern") || t.includes("junior") || t.includes("jr")) return "JUNIOR";
  if (t.includes("senior") || t.includes("sr") || t.includes("lead") || t.includes("principal") || t.includes("staff"))
    return "SENIOR";
  return "MID";
};

const extractKeywordsFromFreeText = (text: string) => {
  // Lightweight extraction: keep tech tokens (c#, c++, .net, node.js, next.js), avoid too much noise.
  const raw = stripHtml(text);
  if (!raw) return [];
  const tokens = raw
    .toLowerCase()
    // keep: letters, digits, +, #, ., /, -
    .replace(/[^a-z0-9+\s.#/-]/g, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    // keep short tech tokens
    .filter((x) => x.length >= 3 || ["c#", "c++", ".net", "js", "ts"].includes(x))
    // avoid obvious noise
    .filter((x) => !["and", "the", "with", "for", "you", "your"].includes(x));
  return uniq(tokens).slice(0, 40);
};

/**
 * Builds evaluation options from interview/job context (offline).
 * This is used when the client doesn't provide evaluationOptions.
 */
export function buildAutoEvaluationOptions(params: {
  transcript: string;
  job?: JobLike | null;
}): InterviewEvaluationOptions {
  const language = detectLanguage(params.transcript);
  const job = params.job || null;

  const requiredSkills = uniq(
    (job?.skills || [])
      .filter((s) => Boolean(s?.isRequired))
      .map((s) => normalizeKw(s?.skill?.name || ""))
      .filter(Boolean)
  );
  const niceSkills = uniq(
    (job?.skills || [])
      .filter((s) => s && s.isRequired === false)
      .map((s) => normalizeKw(s?.skill?.name || ""))
      .filter(Boolean)
  );

  const categories = uniq((job?.categories || []).map((c) => normalizeKw(c?.category?.name || "")).filter(Boolean));

  const jdKeywords = extractKeywordsFromFreeText(
    [job?.title, job?.requirements, job?.description, job?.benefits, ...(job?.interviewQuestions || [])]
      .map((x) => safeText(x))
      .filter(Boolean)
      .join("\n")
  );

  const mustHaveKeywords = uniq([...requiredSkills, ...jdKeywords]).slice(0, 25);
  const niceToHaveKeywords = uniq([...niceSkills, ...categories]).slice(0, 25);
  const synonyms = buildAutoSynonyms([...mustHaveKeywords, ...niceToHaveKeywords]);

  const seniority = seniorityFromExperienceLevel(job?.experienceLevel);

  return {
    language,
    seniority,
    role: safeText(job?.title) || undefined,
    mustHaveKeywords: mustHaveKeywords.length ? mustHaveKeywords : undefined,
    niceToHaveKeywords: niceToHaveKeywords.length ? niceToHaveKeywords : undefined,
    synonyms: Object.keys(synonyms).length ? synonyms : undefined,
  };
}


