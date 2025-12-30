/**
 * Type definitions for CV-Job matching system
 * 
 * @module types
 */

/**
 * Complete match result structure
 */
export interface MatchResult {
  jobId: string;
  jobTitle: string;
  jobIsRemote: boolean;
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
  suggestions: string[];
  candidateProjects?: Array<{ technologies?: string[] | null }>;
  // Additional fields for candidate matches (when finding candidates for a job)
  candidateId?: string;
  candidateUserId?: string; // User ID for messaging
  candidateName?: string | null;
  candidateHeadline?: string | null;
  candidateAvatar?: string | null;
  candidateEmail?: string | null;
  candidateNotificationEmail?: string | null;
  candidatePhone?: string | null;
  candidateLocation?: string | null;
  candidateExperience?: string;
  candidateSkills?: string[];
}

/**
 * Candidate data structure for matching
 */
export interface CandidateMatchData {
  id: string;
  skills: Array<{ skill?: { name: string } | null }>;
  experiences: Array<{
    position: string;
    startDate: Date | string;
    endDate?: Date | string | null;
    isCurrent?: boolean;
  }>;
  headline?: string | null;
  address?: string | null;
  projects?: Array<{ technologies?: string[] | null }>;
}

/**
 * Job data structure for matching
 */
export interface JobMatchData {
  id: string;
  title: string;
  skills: Array<{ skill?: { name: string } | null; isRequired?: boolean }>;
  experienceLevel?: string | null;
  location?: string | null;
  isRemote: boolean;
}

