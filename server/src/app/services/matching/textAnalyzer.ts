/**
 * Text Analysis Engine for Job Matching
 *
 * This module implements natural language processing to extract implicit requirements
 * from job descriptions and requirements text. It identifies soft skills, technologies,
 * personality traits, and cultural preferences that aren't explicitly listed.
 *
 * Academic Context:
 * - Input: Raw job description and requirements text
 * - Processing: Keyword extraction, pattern matching, semantic analysis
 * - Output: Structured requirements for enhanced matching accuracy
 *
 * @module textAnalyzer
 */

// Soft skills and personality traits commonly sought in tech
const SOFT_SKILLS_PATTERNS = {
  communication: [
    /\bcommunicat(e|ion|ing|ive)\b/gi,
    /\bverbal\b/gi,
    /\bwritten\b/gi,
    /\bpresentation\b/gi,
    /\binterpersonal\b/gi,
    /\bcollaboration\b/gi,
    /\bteamwork\b/gi,
  ],
  leadership: [
    /\blead(ership|ing|er)\b/gi,
    /\bmentoring\b/gi,
    /\bcoaching\b/gi,
    /\bmanagement\b/gi,
    /\bstrategic\b/gi,
    /\bvision\b/gi,
  ],
  problemSolving: [
    /\bproblem.solv(e|ing)\b/gi,
    /\banalytical\b/gi,
    /\bcritical.think(ing)?\b/gi,
    /\btroubleshoot(ing)?\b/gi,
    /\bdebug(ging)?\b/gi,
  ],
  adaptability: [
    /\badaptable\b/gi,
    /\bflexible\b/gi,
    /\bresilient\b/gi,
    /\bagile\b/gi,
    /\bquick.learner\b/gi,
    /\badapt.to.change\b/gi,
  ],
  creativity: [
    /\bcreativ(e|ity)\b/gi,
    /\binnovative\b/gi,
    /\bdesign.think(ing)?\b/gi,
    /\bout.of.the.box\b/gi,
  ],
  attentionToDetail: [
    /\battention.to.detail\b/gi,
    /\bdetailed.oriented\b/gi,
    /\bmeticulous\b/gi,
    /\bthorough\b/gi,
    /\bprecise\b/gi,
  ],
};

// Technology and framework patterns
const TECH_PATTERNS = {
  frontend: [
    /\breact\b/gi,
    /\bvue\b/gi,
    /\bangular\b/gi,
    /\bjavascript\b/gi,
    /\btypescript\b/gi,
    /\bhtml\b/gi,
    /\bcss\b/gi,
    /\bsass\b/gi,
    /\bscss\b/gi,
  ],
  backend: [
    /\bnode\b/gi,
    /\bexpress\b/gi,
    /\bdjango\b/gi,
    /\bflask\b/gi,
    /\bspring\b/gi,
    /\blaravel\b/gi,
    /\bphp\b/gi,
    /\bpython\b/gi,
    /\bjava\b/gi,
    /\bgo\b/gi,
    /\bruby\b/gi,
  ],
  database: [
    /\bmysql\b/gi,
    /\bpostgresql\b/gi,
    /\bmongodb\b/gi,
    /\bredis\b/gi,
    /\belasticsearch\b/gi,
    /\bsql\b/gi,
    /\bno.sql\b/gi,
  ],
  cloud: [
    /\baw\s*s\b/gi,
    /\bgcp\b/gi,
    /\bazure\b/gi,
    /\bheroku\b/gi,
    /\bdocker\b/gi,
    /\bkubernetes\b/gi,
    /\bterraform\b/gi,
  ],
  tools: [
    /\bgit\b/gi,
    /\bjenkins\b/gi,
    /\bcircle.ci\b/gi,
    /\bgithub.actions\b/gi,
    /\bjira\b/gi,
    /\bslack\b/gi,
    /\bpostman\b/gi,
  ],
};

// Language requirements
const LANGUAGE_PATTERNS = [
  /\b(english|spanish|french|german|chinese|japanese|korean|vietnamese)\b/gi,
  /\bfluent\b/gi,
  /\bproficient\b/gi,
  /\bnative\b/gi,
  /\bconversational\b/gi,
];

// Work environment preferences
const ENVIRONMENT_PATTERNS = {
  startup: [
    /\bstartup\b/gi,
    /\bfast.paced\b/gi,
    /\bdynamic\b/gi,
    /\bagile\b/gi,
    /\bscale.up\b/gi,
  ],
  enterprise: [
    /\benterprise\b/gi,
    /\bcorporate\b/gi,
    /\bstructured\b/gi,
    /\bprocess.oriented\b/gi,
    /\bmethodology\b/gi,
  ],
  remote: [
    /\bremote\b/gi,
    /\bwork.from.home\b/gi,
    /\bdistributed\b/gi,
    /\basynchronous\b/gi,
  ],
  collaborative: [
    /\bcollaborative\b/gi,
    /\bteam.oriented\b/gi,
    /\bcross.functional\b/gi,
    /\binterdisciplinary\b/gi,
  ],
};

/**
 * Analyzes job description and requirements text to extract implicit requirements
 *
 * @param description - Job description text
 * @param requirements - Requirements text
 * @param responsibilities - Responsibilities text
 * @returns Structured analysis of implicit requirements
 */
export function analyzeJobText(
  description: string = "",
  requirements: string = "",
  responsibilities: string = ""
): {
  softSkills: {
    communication: number;
    leadership: number;
    problemSolving: number;
    adaptability: number;
    creativity: number;
    attentionToDetail: number;
  };
  technologies: {
    frontend: string[];
    backend: string[];
    database: string[];
    cloud: string[];
    tools: string[];
  };
  languages: string[];
  environment: {
    startup: number;
    enterprise: number;
    remote: number;
    collaborative: number;
  };
  keywords: string[];
  complexity: number; // 1-5 scale
} {
  // Combine all text for analysis
  const fullText = `${description} ${requirements} ${responsibilities}`.toLowerCase();

  // Analyze soft skills
  const softSkills = {
    communication: countPatternMatches(fullText, SOFT_SKILLS_PATTERNS.communication),
    leadership: countPatternMatches(fullText, SOFT_SKILLS_PATTERNS.leadership),
    problemSolving: countPatternMatches(fullText, SOFT_SKILLS_PATTERNS.problemSolving),
    adaptability: countPatternMatches(fullText, SOFT_SKILLS_PATTERNS.adaptability),
    creativity: countPatternMatches(fullText, SOFT_SKILLS_PATTERNS.creativity),
    attentionToDetail: countPatternMatches(fullText, SOFT_SKILLS_PATTERNS.attentionToDetail),
  };

  // Analyze technologies
  const technologies = {
    frontend: extractUniqueMatches(fullText, TECH_PATTERNS.frontend),
    backend: extractUniqueMatches(fullText, TECH_PATTERNS.backend),
    database: extractUniqueMatches(fullText, TECH_PATTERNS.database),
    cloud: extractUniqueMatches(fullText, TECH_PATTERNS.cloud),
    tools: extractUniqueMatches(fullText, TECH_PATTERNS.tools),
  };

  // Analyze languages
  const languages = extractUniqueMatches(fullText, LANGUAGE_PATTERNS);

  // Analyze work environment
  const environment = {
    startup: countPatternMatches(fullText, ENVIRONMENT_PATTERNS.startup),
    enterprise: countPatternMatches(fullText, ENVIRONMENT_PATTERNS.enterprise),
    remote: countPatternMatches(fullText, ENVIRONMENT_PATTERNS.remote),
    collaborative: countPatternMatches(fullText, ENVIRONMENT_PATTERNS.collaborative),
  };

  // Extract important keywords (excluding common words)
  const keywords = extractKeywords(fullText);

  // Assess complexity based on keywords and requirements
  const complexity = assessComplexity(fullText);

  return {
    softSkills,
    technologies,
    languages,
    environment,
    keywords,
    complexity,
  };
}

/**
 * Counts pattern matches in text
 */
function countPatternMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => {
    const matches = text.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
}

/**
 * Extracts unique matches from patterns
 */
function extractUniqueMatches(text: string, patterns: RegExp[]): string[] {
  const matches = new Set<string>();

  patterns.forEach(pattern => {
    const found = text.match(pattern);
    if (found) {
      found.forEach(match => matches.add(match.toLowerCase()));
    }
  });

  return Array.from(matches);
}

/**
 * Extracts important keywords from job text
 */
function extractKeywords(text: string): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'we', 'are', 'is', 'you', 'your', 'our', 'will', 'have', 'has', 'had', 'do', 'does',
    'be', 'been', 'being', 'can', 'could', 'should', 'would', 'may', 'might', 'must',
    'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'us', 'our', 'ourselves'
  ]);

  // Extract words, filter, and score by importance
  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word.toLowerCase()))
    .map(word => word.toLowerCase());

  // Count frequency and return top keywords
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Assesses job complexity based on text analysis
 */
function assessComplexity(text: string): number {
  let complexity = 3; // Base complexity

  // Increase for technical terms
  const techIndicators = [
    /\bscalability\b/gi,
    /\bperformance\b/gi,
    /\boptimization\b/gi,
    /\barchitecture\b/gi,
    /\bmicroservices\b/gi,
    /\bdistributed\b/gi,
    /\bconcurrency\b/gi,
  ];

  const techMatches = countPatternMatches(text, techIndicators);
  complexity += Math.min(techMatches * 0.2, 1);

  // Increase for leadership terms
  const leadershipIndicators = [
    /\blead\b/gi,
    /\bmanage\b/gi,
    /\barchitect\b/gi,
    /\bdesign\b/gi,
    /\bstrategy\b/gi,
  ];

  const leadershipMatches = countPatternMatches(text, leadershipIndicators);
  complexity += Math.min(leadershipMatches * 0.15, 0.8);

  // Increase for advanced requirements
  const advancedIndicators = [
    /\badvanced\b/gi,
    /\bexpert\b/gi,
    /\bsenior\b/gi,
    /\bprincipal\b/gi,
  ];

  const advancedMatches = countPatternMatches(text, advancedIndicators);
  complexity += Math.min(advancedMatches * 0.1, 0.7);

  return Math.min(Math.max(Math.round(complexity), 1), 5);
}

/**
 * Calculates soft skills compatibility score
 */
export function calculateSoftSkillsScore(
  candidateSoftSkills: {
    communication?: number;
    leadership?: number;
    problemSolving?: number;
    adaptability?: number;
    creativity?: number;
    attentionToDetail?: number;
  },
  jobSoftSkills: {
    communication: number;
    leadership: number;
    problemSolving: number;
    adaptability: number;
    creativity: number;
    attentionToDetail: number;
  }
): {
  score: number;
  matches: string[];
  gaps: string[];
} {
  const skillNames = {
    communication: 'Communication',
    leadership: 'Leadership',
    problemSolving: 'Problem Solving',
    adaptability: 'Adaptability',
    creativity: 'Creativity',
    attentionToDetail: 'Attention to Detail',
  };

  const matches: string[] = [];
  const gaps: string[] = [];
  let totalScore = 0;
  let jobSkillsCount = 0;

  Object.entries(jobSoftSkills).forEach(([skill, jobImportance]) => {
    if (jobImportance > 0) {
      jobSkillsCount++;
      const candidateLevel = candidateSoftSkills[skill as keyof typeof candidateSoftSkills] || 0;
      const skillScore = Math.min((candidateLevel / Math.max(jobImportance, 1)) * 100, 100);
      totalScore += skillScore;

      if (skillScore >= 70) {
        matches.push(skillNames[skill as keyof typeof skillNames]);
      } else if (skillScore < 40) {
        gaps.push(skillNames[skill as keyof typeof skillNames]);
      }
    }
  });

  const finalScore = jobSkillsCount > 0 ? totalScore / jobSkillsCount : 100;

  return {
    score: Math.round(finalScore * 100) / 100,
    matches,
    gaps,
  };
}

/**
 * Calculates technology alignment score
 */
export function calculateTechnologyScore(
  candidateTechnologies: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    cloud?: string[];
    tools?: string[];
  },
  jobTechnologies: {
    frontend: string[];
    backend: string[];
    database: string[];
    cloud: string[];
    tools: string[];
  }
): {
  score: number;
  matched: string[];
  missing: string[];
} {
  const matched: string[] = [];
  const missing: string[] = [];
  let totalJobTechs = 0;
  let matchedCount = 0;

  Object.entries(jobTechnologies).forEach(([category, jobTechs]) => {
    const candidateTechs = candidateTechnologies[category as keyof typeof candidateTechnologies] || [];

    jobTechs.forEach(jobTech => {
      totalJobTechs++;
      const normalizedJobTech = jobTech.toLowerCase();

      const hasMatch = candidateTechs.some(candidateTech =>
        candidateTech.toLowerCase().includes(normalizedJobTech) ||
        normalizedJobTech.includes(candidateTech.toLowerCase())
      );

      if (hasMatch) {
        matched.push(jobTech);
        matchedCount++;
      } else {
        missing.push(jobTech);
      }
    });
  });

  const score = totalJobTechs > 0 ? (matchedCount / totalJobTechs) * 100 : 100;

  return {
    score: Math.round(score * 100) / 100,
    matched,
    missing,
  };
}
