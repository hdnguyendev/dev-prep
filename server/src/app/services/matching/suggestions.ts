/**
 * Suggestion Generator
 * 
 * This module generates actionable suggestions to improve CV-Job match scores.
 * Suggestions are derived directly from the scoring logic and match gaps.
 * 
 * Academic Context:
 * - Input: Match result with score breakdown and details
 * - Processing: Analyze gaps and generate specific, actionable recommendations
 * - Output: Array of prioritized suggestions with impact estimates
 * 
 * @module suggestions
 */

/**
 * Generates suggestions based on match analysis
 * 
 * Algorithm:
 * 1. Identify missing required skills (highest priority)
 * 2. Identify experience gaps
 * 3. Identify title/keyword mismatches
 * 4. Identify location issues
 * 5. Prioritize suggestions by potential score impact
 * 
 * @param matchResult - Complete match result from scoring algorithm
 * @returns Array of actionable suggestions with impact estimates
 */
export function generateSuggestions(matchResult: {
  matchScore: number;
  breakdown: {
    skillScore: number;
    experienceScore: number;
    titleScore: number;
    locationScore: number;
    bonusScore: number;
  };
  details: {
    matchedSkills: string[];
    missingSkills: string[];
    extraSkills: string[];
    experienceGap?: string;
    titleSimilarity: string;
    locationMatch: string;
    bonusFactors: string[];
  };
  jobId: string;
  jobTitle: string;
  jobIsRemote: boolean;
  candidateProjects?: Array<{ technologies?: string[] | null }>;
}): string[] {
  const suggestions: string[] = [];
  const { details, breakdown } = matchResult;
  
  // 1. Missing Skills Suggestions (Highest Impact)
  // Each missing required skill can contribute ~10-15% to skill score
  if (details.missingSkills.length > 0) {
    const skillImpact = Math.round((40 * details.missingSkills.length) / (details.missingSkills.length + details.matchedSkills.length));
    
    if (details.missingSkills.length === 1) {
      suggestions.push(
        `Add "${details.missingSkills[0]}" to your CV to increase skill match by ~${skillImpact}%`
      );
    } else if (details.missingSkills.length <= 3) {
      suggestions.push(
        `Add these required skills to increase match score by ~${skillImpact}%: ${details.missingSkills.join(", ")}`
      );
    } else {
      suggestions.push(
        `Focus on adding these top required skills first: ${details.missingSkills.slice(0, 3).join(", ")}. This could increase your match score by ~${skillImpact}%`
      );
    }
  }
  
  // 2. Experience Gap Suggestions
  if (details.experienceGap) {
    const experienceImpact = Math.round(25 * (1 - breakdown.experienceScore / 100));
    
    if (breakdown.experienceScore < 50) {
      suggestions.push(
        `Experience gap detected: ${details.experienceGap}. Consider gaining more experience or applying for junior-level positions. This gap reduces your score by ~${experienceImpact}%`
      );
    } else if (breakdown.experienceScore < 75) {
      suggestions.push(
        `Experience level is slightly below requirement: ${details.experienceGap}. Highlight relevant projects and achievements to compensate. Current impact: ~${experienceImpact}%`
      );
    }
  }
  
  // 3. Title/Keyword Suggestions
  if (breakdown.titleScore < 70) {
    const titleImpact = Math.round(20 * (1 - breakdown.titleScore / 100));
    
    if (breakdown.titleScore < 40) {
      suggestions.push(
        `Job title mismatch: ${details.titleSimilarity}. Update your headline or position titles to include keywords from the job title "${matchResult.jobTitle}". This could improve your score by ~${titleImpact}%`
      );
    } else {
      suggestions.push(
        `Title similarity is moderate: ${details.titleSimilarity}. Consider emphasizing relevant keywords from the job title in your profile. Potential improvement: ~${titleImpact}%`
      );
    }
  }
  
  // 4. Location Suggestions
  if (breakdown.locationScore < 100 && !matchResult.jobIsRemote) {
    const locationImpact = Math.round(10 * (1 - breakdown.locationScore / 100));
    
    if (breakdown.locationScore < 50) {
      suggestions.push(
        `Location mismatch: ${details.locationMatch}. Consider relocating or applying for remote positions. Current impact: ~${locationImpact}%`
      );
    } else {
      suggestions.push(
        `Location compatibility: ${details.locationMatch}. If relocation is possible, this could improve your match. Potential gain: ~${locationImpact}%`
      );
    }
  }
  
  // 5. Extra Skills Suggestions (Positive reinforcement)
  if (details.extraSkills.length > 0 && details.missingSkills.length === 0) {
    suggestions.push(
      `Great! You have additional skills (${details.extraSkills.slice(0, 3).join(", ")}) beyond the job requirements. Highlight these in your application to stand out.`
    );
  }
  
  // 6. Skill Level Suggestions
  if (details.matchedSkills.length > 0 && breakdown.skillScore < 100) {
    // If candidate has skills but score is not perfect, might be level-related
    const missingCount = details.missingSkills.length;
    const matchedCount = details.matchedSkills.length;
    
    if (missingCount === 0 && matchedCount > 0 && breakdown.skillScore < 90) {
      suggestions.push(
        `You have the required skills. Consider highlighting your proficiency level (e.g., "Expert in ${details.matchedSkills[0]}") to maximize your skill score.`
      );
    }
  }
  
  // 7. Project/Portfolio Suggestions
  if (details.bonusFactors.length === 0 && matchResult.candidateProjects && matchResult.candidateProjects.length === 0) {
    suggestions.push(
      `Add projects to your portfolio showcasing relevant technologies. This can provide a bonus score and demonstrate practical experience.`
    );
  }
  
  // 8. General improvement if score is low
  if (matchResult.matchScore < 50) {
    suggestions.push(
      `Overall match score is ${matchResult.matchScore}%. Focus on the highest-impact improvements above (skills and experience) to significantly increase your match.`
    );
  }
  
  // Limit to top 5 most impactful suggestions
  return suggestions.slice(0, 5);
}

/**
 * Generates a summary explanation of the match score
 * 
 * @param matchResult - Complete match result
 * @returns Human-readable explanation
 */
export function generateMatchExplanation(matchResult: {
  matchScore: number;
  breakdown: {
    skillScore: number;
    experienceScore: number;
    titleScore: number;
    locationScore: number;
    bonusScore: number;
  };
  details: {
    matchedSkills: string[];
    missingSkills: string[];
    extraSkills: string[];
    experienceGap?: string;
    titleSimilarity: string;
    locationMatch: string;
    bonusFactors: string[];
  };
}): string {
  const { matchScore, breakdown, details } = matchResult;
  
  let explanation = `Match Score: ${matchScore}%\n\n`;
  explanation += `Breakdown:\n`;
  explanation += `- Skills: ${breakdown.skillScore}% (${details.matchedSkills.length} matched, ${details.missingSkills.length} missing)\n`;
  explanation += `- Experience: ${breakdown.experienceScore}%${details.experienceGap ? ` (${details.experienceGap})` : ""}\n`;
  explanation += `- Title Similarity: ${breakdown.titleScore}%\n`;
  explanation += `- Location: ${breakdown.locationScore}%\n`;
  explanation += `- Bonus Factors: ${breakdown.bonusScore}%\n\n`;
  
  if (details.matchedSkills.length > 0) {
    explanation += `Matched Skills: ${details.matchedSkills.join(", ")}\n`;
  }
  
  if (details.missingSkills.length > 0) {
    explanation += `Missing Required Skills: ${details.missingSkills.join(", ")}\n`;
  }
  
  if (details.extraSkills.length > 0) {
    explanation += `Extra Skills (Nice-to-have): ${details.extraSkills.slice(0, 5).join(", ")}\n`;
  }
  
  return explanation;
}

