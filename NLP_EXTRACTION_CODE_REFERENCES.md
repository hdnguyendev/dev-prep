# Đoạn Code NLP Extraction trong Job Matching

## 📍 Vị trí các file

1. **Text Analyzer**: `server/src/app/services/matching/textAnalyzer.ts`
2. **Scoring Service**: `server/src/app/services/matching/scoring.ts`

---

## 1️⃣ Soft Skills Patterns Definition

**File**: `textAnalyzer.ts` (dòng 17-63)

```17:63:server/src/app/services/matching/textAnalyzer.ts
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
```

---

## 2️⃣ Technology Patterns Definition

**File**: `textAnalyzer.ts` (dòng 65-118)

```65:118:server/src/app/services/matching/textAnalyzer.ts
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
```

---

## 3️⃣ Main Extraction Function

**File**: `textAnalyzer.ts` (dòng 167-244)

```167:244:server/src/app/services/matching/textAnalyzer.ts
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
```

---

## 4️⃣ Helper Functions

### 4.1. Count Pattern Matches

**File**: `textAnalyzer.ts` (dòng 246-254)

```246:254:server/src/app/services/matching/textAnalyzer.ts
/**
 * Counts pattern matches in text
 */
function countPatternMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => {
    const matches = text.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
}
```

### 4.2. Extract Unique Matches

**File**: `textAnalyzer.ts` (dòng 256-270)

```256:270:server/src/app/services/matching/textAnalyzer.ts
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
```

### 4.3. Extract Keywords

**File**: `textAnalyzer.ts` (dòng 272-301)

```272:301:server/src/app/services/matching/textAnalyzer.ts
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
```

---

## 5️⃣ Sử dụng trong Scoring Algorithm

**File**: `scoring.ts` (dòng 732-749)

```732:749:server/src/app/services/matching/scoring.ts
  // Analyze job text for implicit requirements
  const jobTextAnalysis = analyzeJobText(
    jobData.description,
    jobData.requirements,
    jobData.responsibilities
  );

  // Calculate soft skills compatibility
  const softSkillsResult = calculateSoftSkillsScore(
    candidateData.softSkills || {},
    jobTextAnalysis.softSkills
  );

  // Calculate technology alignment
  const technologyResult = calculateTechnologyScore(
    candidateData.technologies || {},
    jobTextAnalysis.technologies
  );
```

---

## 6️⃣ Soft Skills Score Calculation

**File**: `textAnalyzer.ts` (dòng 361-431)

```361:431:server/src/app/services/matching/textAnalyzer.ts
/**
 * Calculates soft skills compatibility score
 * 
 * Handles missing candidate soft skills data gracefully:
 * - If candidate has no soft skills data: Returns neutral score (50) to avoid unfair penalty
 * - If candidate has partial data: Calculates based on available data
 * - If candidate has complete data: Full calculation with matching
 * 
 * Rationale: Candidate profiles may not include soft skills assessment.
 * Giving 0 points would unfairly penalize candidates who haven't completed
 * soft skills evaluation, so we use a neutral score (50) instead.
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

  // Check if candidate has any soft skills data
  const hasCandidateData = candidateSoftSkills && Object.values(candidateSoftSkills).some(val => val !== undefined && val !== null && val > 0);
  
  // If no candidate data available, return neutral score (50) to avoid unfair penalty
  if (!hasCandidateData) {
    return {
      score: 50, // Neutral score: neither reward nor penalty
      matches: [],
      gaps: [],
    };
  }

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
```

---

## 7️⃣ Technology Score Calculation

**File**: `textAnalyzer.ts` (dòng 433-489)

```433:489:server/src/app/services/matching/textAnalyzer.ts
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
```

---

## 📊 Tóm tắt Flow

1. **Input**: `jobData.description`, `jobData.requirements`, `jobData.responsibilities`
2. **Extraction**: `analyzeJobText()` → Trích xuất soft skills và technologies bằng regex patterns
3. **Scoring**: 
   - `calculateSoftSkillsScore()` → So sánh candidate vs job soft skills
   - `calculateTechnologyScore()` → So sánh candidate vs job technologies
4. **Output**: Scores được dùng trong tổng điểm matching (12% và 8% weight)

---

## 🔑 Điểm quan trọng

- **Không phải True NLP**: Sử dụng regex pattern matching, không phải ML
- **Rule-based**: Dựa trên patterns được định nghĩa sẵn
- **Nhanh và rẻ**: Không cần AI API, xử lý local
- **Minh bạch**: Dễ hiểu và maintain

