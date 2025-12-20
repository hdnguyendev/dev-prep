export const FOUNDED_YEAR_SPAN = 120;

/**
 * Build a descending list of years from current year -> (current year - span).
 */
export function getFoundedYearOptions(span: number = FOUNDED_YEAR_SPAN): number[] {
  const currentYear = new Date().getFullYear();
  const safeSpan = Math.max(0, Math.min(span, 300));
  return Array.from({ length: safeSpan + 1 }, (_, i) => currentYear - i);
}

export const COMPANY_SIZE_OPTIONS: string[] = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+",
];

/**
 * Ensure current value is present in options list (useful for legacy data).
 */
export function getCompanySizeOptions(current?: string | null): string[] {
  const base = COMPANY_SIZE_OPTIONS.slice();
  const v = (current ?? "").trim();
  if (!v) return base;
  if (base.includes(v)) return base;
  return [v, ...base];
}


