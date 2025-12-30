/**
 * Skill Normalization Service
 * 
 * This module handles skill name normalization to ensure accurate matching
 * between candidate skills and job requirements.
 * 
 * Academic Context:
 * - Input: Raw skill names from database (e.g., "JavaScript", "JS", "javascript")
 * - Processing: Normalization using lowercase, synonym mapping, and abbreviation expansion
 * - Output: Canonical skill names for comparison
 * 
 * @module skillNormalizer
 */

/**
 * Skill synonym mapping: Maps variations to canonical skill names
 * This ensures that "JS", "JavaScript", "javascript" all map to "JavaScript"
 */
const SKILL_SYNONYMS: Record<string, string> = {
  // JavaScript variations
  "js": "JavaScript",
  "javascript": "JavaScript",
  "ecmascript": "JavaScript",
  "node": "Node.js",
  "nodejs": "Node.js",
  "node.js": "Node.js",
  
  // Python variations
  "python": "Python",
  "py": "Python",
  
  // Java variations
  "java": "Java",
  "java se": "Java",
  "java ee": "Java",
  "j2ee": "Java",
  
  // React variations
  "react": "React",
  "reactjs": "React",
  "react.js": "React",
  
  // Database variations
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "pg": "PostgreSQL",
  "mysql": "MySQL",
  "mongo": "MongoDB",
  "mongodb": "MongoDB",
  "nosql": "MongoDB",
  
  // TypeScript variations
  "ts": "TypeScript",
  "typescript": "TypeScript",
  
  // CSS variations
  "css": "CSS",
  "css3": "CSS",
  "scss": "SASS",
  "sass": "SASS",
  "less": "LESS",
  
  // HTML variations
  "html": "HTML",
  "html5": "HTML",
  
  // Git variations
  "git": "Git",
  "github": "Git",
  "gitlab": "Git",
  
  // Docker variations
  "docker": "Docker",
  "dockerfile": "Docker",
  
  // AWS variations
  "aws": "AWS",
  "amazon web services": "AWS",
  "amazon aws": "AWS",
  
  // REST API variations
  "rest": "REST API",
  "restful": "REST API",
  "rest api": "REST API",
  "api": "REST API",
  
  // GraphQL variations
  "graphql": "GraphQL",
  "gql": "GraphQL",
};

/**
 * Normalizes a skill name to its canonical form
 * 
 * Algorithm:
 * 1. Trim whitespace
 * 2. Convert to lowercase for comparison
 * 3. Check synonym mapping
 * 4. Return canonical name or original (if no mapping found)
 * 
 * @param skillName - Raw skill name from database or user input
 * @returns Canonical skill name for matching
 * 
 * @example
 * normalizeSkill("JS") => "JavaScript"
 * normalizeSkill("PostgreSQL") => "PostgreSQL"
 * normalizeSkill("React.js") => "React"
 */
export function normalizeSkill(skillName: string): string {
  if (!skillName) return "";
  
  // Trim and lowercase for comparison
  const normalized = skillName.trim().toLowerCase();
  
  // Check if we have a synonym mapping
  if (SKILL_SYNONYMS[normalized]) {
    return SKILL_SYNONYMS[normalized];
  }
  
  // If no mapping, return original with proper casing
  // Capitalize first letter of each word
  return skillName
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Normalizes an array of skill names
 * 
 * @param skills - Array of skill names
 * @returns Array of normalized skill names (duplicates removed)
 */
export function normalizeSkills(skills: string[]): string[] {
  const normalized = skills
    .map(skill => normalizeSkill(skill))
    .filter(skill => skill.length > 0);
  
  // Remove duplicates
  return Array.from(new Set(normalized));
}

/**
 * Compares two skill names after normalization
 * 
 * @param skill1 - First skill name
 * @param skill2 - Second skill name
 * @returns true if skills match after normalization
 */
export function skillsMatch(skill1: string, skill2: string): boolean {
  return normalizeSkill(skill1) === normalizeSkill(skill2);
}

/**
 * Finds matching skills between two skill arrays
 * 
 * @param candidateSkills - Skills from candidate profile
 * @param jobSkills - Skills from job requirements
 * @returns Object containing matched, missing, and extra skills
 */
export function compareSkills(
  candidateSkills: string[],
  jobSkills: string[]
): {
  matched: string[];
  missing: string[];
  extra: string[];
} {
  const normalizedCandidate = normalizeSkills(candidateSkills);
  const normalizedJob = normalizeSkills(jobSkills);
  
  const candidateSet = new Set(normalizedCandidate);
  const jobSet = new Set(normalizedJob);
  
  // Find matches (skills present in both)
  const matched = normalizedCandidate.filter(skill => jobSet.has(skill));
  
  // Find missing (required job skills not in candidate)
  const missing = normalizedJob.filter(skill => !candidateSet.has(skill));
  
  // Find extra (candidate skills not required by job - nice to have)
  const extra = normalizedCandidate.filter(skill => !jobSet.has(skill));
  
  return { matched, missing, extra };
}

