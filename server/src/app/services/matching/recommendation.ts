/**
 * Enhanced Job Recommendation Service
 * 
 * This module provides comprehensive job recommendations based on:
 * 1. Full candidate profile (skills, experiences, education, projects)
 * 2. Behavior signals (views, clicks, applications)
 * 3. Preference matching (job type, location, remote)
 * 4. Freshness boost (recently posted jobs)
 * 
 * @module recommendation
 */

import prisma from "../../db/prisma";
import { calculateMatchScore } from "./scoring";
import { generateSuggestions } from "./suggestions";
import type { MatchResult } from "./types";

/**
 * Calculate behavior boost based on candidate's interaction history
 * 
 * Boost factors:
 * - Jobs with similar tech stack to jobs candidate viewed/clicked/applied
 * - Jobs with similar title to jobs candidate applied
 * - Penalty for jobs candidate already applied/rejected
 */
function calculateBehaviorBoost(
  jobId: string,
  jobTitle: string,
  jobSkills: string[],
  candidateBehavior: {
    viewedJobIds: string[];
    clickedJobIds: string[];
    appliedJobIds: string[];
    rejectedJobIds: string[];
    appliedJobTitles: string[];
    appliedJobSkills: string[][];
  }
): number {
  let boost = 0;

  // Penalty: Already applied or rejected
  if (candidateBehavior.appliedJobIds.includes(jobId)) {
    return -100; // Strong penalty - exclude from recommendations
  }
  if (candidateBehavior.rejectedJobIds.includes(jobId)) {
    return -50; // Medium penalty - less likely to recommend
  }

  // Boost: Similar tech stack to jobs candidate interacted with
  const allInteractedSkills = new Set<string>();
  candidateBehavior.appliedJobSkills.forEach(skills => {
    skills.forEach(skill => allInteractedSkills.add(skill.toLowerCase()));
  });

  if (allInteractedSkills.size > 0) {
    const jobSkillsLower = jobSkills.map(s => s.toLowerCase());
    const commonSkills = jobSkillsLower.filter(s => allInteractedSkills.has(s));
    const skillOverlap = commonSkills.length / Math.max(jobSkillsLower.length, 1);
    boost += skillOverlap * 5; // Max 5 points for tech stack similarity
  }

  // Boost: Similar title to jobs candidate applied
  if (candidateBehavior.appliedJobTitles.length > 0) {
    const jobTitleLower = jobTitle.toLowerCase();
    const titleWords = new Set(jobTitleLower.split(/\s+/).filter(w => w.length > 2));
    
    let maxTitleSimilarity = 0;
    for (const appliedTitle of candidateBehavior.appliedJobTitles) {
      const appliedTitleWords = new Set(appliedTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2));
      const commonWords = Array.from(titleWords).filter(w => appliedTitleWords.has(w));
      const similarity = commonWords.length / Math.max(titleWords.size, appliedTitleWords.size, 1);
      maxTitleSimilarity = Math.max(maxTitleSimilarity, similarity);
    }
    boost += maxTitleSimilarity * 3; // Max 3 points for title similarity
  }

  // Small boost: Candidate viewed or clicked this job
  if (candidateBehavior.viewedJobIds.includes(jobId)) {
    boost += 2; // Viewed = interest
  }
  if (candidateBehavior.clickedJobIds.includes(jobId)) {
    boost += 3; // Clicked = stronger interest
  }

  return Math.min(boost, 10); // Cap at 10 points
}

/**
 * Calculate preference boost based on job type and remote preference
 */
function calculatePreferenceBoost(
  jobType: string,
  jobIsRemote: boolean,
  candidatePreferences: {
    preferredJobTypes?: string[];
    prefersRemote?: boolean;
  }
): number {
  let boost = 0;

  // Job type preference
  if (candidatePreferences.preferredJobTypes && candidatePreferences.preferredJobTypes.length > 0) {
    if (candidatePreferences.preferredJobTypes.includes(jobType)) {
      boost += 3; // Preferred job type
    }
  }

  // Remote preference
  if (candidatePreferences.prefersRemote !== undefined) {
    if (candidatePreferences.prefersRemote && jobIsRemote) {
      boost += 2; // Candidate prefers remote and job is remote
    } else if (!candidatePreferences.prefersRemote && !jobIsRemote) {
      boost += 1; // Candidate prefers on-site and job is on-site
    }
  }

  return Math.min(boost, 5); // Cap at 5 points
}

/**
 * Calculate freshness boost for recently posted jobs
 */
function calculateFreshnessBoost(publishedAt: Date | null): number {
  if (!publishedAt) return 0;

  const now = new Date();
  const daysSincePublished = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSincePublished < 1) {
    return 5; // Posted today - highest boost
  } else if (daysSincePublished < 7) {
    return 3; // Posted this week
  } else if (daysSincePublished < 30) {
    return 1; // Posted this month
  }

  return 0; // Older than a month - no boost
}

/**
 * Enhanced job recommendation for candidate
 * 
 * Uses comprehensive matching including:
 * - Full profile matching (skills, experience, education, projects)
 * - Behavior signals (views, clicks, applications)
 * - Preference matching (job type, remote)
 * - Freshness boost (recently posted)
 * 
 * @param candidateId - Candidate profile ID
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of recommended jobs with enhanced scores
 */
export async function recommendJobsForCandidate(
  candidateId: string,
  limit: number = 20
): Promise<Array<MatchResult & { 
  finalScore: number;
  behaviorBoost: number;
  preferenceBoost: number;
  freshnessBoost: number;
}>> {
  // Fetch full candidate profile with all related data
  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: candidateId },
    include: {
      skills: {
        include: { skill: true },
      },
      experiences: {
        orderBy: { startDate: "desc" },
      },
      educations: {
        orderBy: { startDate: "desc" },
      },
      projects: true,
      applications: {
        select: {
          id: true,
          jobId: true,
          status: true,
          job: {
            select: {
              title: true,
              skills: {
                include: { skill: true },
              },
            },
          },
        },
      },
    },
  });

  if (!candidate) {
    throw new Error("Candidate not found");
  }

  // Fetch candidate's behavior data (views, clicks)
  // Note: Currently views/clicks are tracked per job, not per candidate
  // We'll use applications as a proxy for behavior
  const candidateApplications = candidate.applications || [];
  const appliedJobIds = candidateApplications.map(app => app.jobId).filter(Boolean) as string[];
  const rejectedJobIds = candidateApplications
    .filter(app => app.status === "REJECTED" || app.status === "WITHDRAWN")
    .map(app => app.jobId)
    .filter(Boolean) as string[];
  const appliedJobTitles = candidateApplications
    .map(app => app.job?.title)
    .filter(Boolean) as string[];
  const appliedJobSkills = candidateApplications
    .map(app => app.job?.skills?.map(s => s.skill?.name).filter(Boolean) || [])
    .filter(skills => skills.length > 0) as string[][];

  // Extract candidate preferences from profile
  // For now, infer from address (if address suggests remote preference)
  const candidatePreferences = {
    prefersRemote: candidate.address?.toLowerCase().includes("remote") || false,
    preferredJobTypes: [], // Could be added to profile later
  };

  // Fetch published jobs with full details
  const jobs = await prisma.job.findMany({
    where: {
      status: "PUBLISHED",
      deadline: {
        gte: new Date(), // Only active jobs
      },
    },
    include: {
      skills: {
        include: { skill: true },
      },
      company: {
        select: {
          name: true,
          logoUrl: true,
        },
      },
    },
    orderBy: {
      publishedAt: "desc", // Most recent first
    },
    take: 200, // Fetch more to filter and rank
  });

  // Calculate matches with enhanced scoring
  const matches: Array<MatchResult & {
    finalScore: number;
    behaviorBoost: number;
    preferenceBoost: number;
    freshnessBoost: number;
  }> = [];

  for (const job of jobs) {
    // Skip jobs already applied (unless we want to show them)
    if (appliedJobIds.includes(job.id)) {
      continue;
    }

    // Calculate base match score using existing algorithm
    const matchResult = calculateMatchScore(
      {
        skills: candidate.skills,
        experiences: candidate.experiences,
        education: candidate.educations.map(edu => ({
          degree: edu.degree,
          fieldOfStudy: edu.fieldOfStudy,
          institution: edu.institution,
          graduationYear: edu.endDate ? new Date(edu.endDate).getFullYear() : null,
        })),
        headline: candidate.headline,
        address: candidate.address,
        projects: candidate.projects,
        softSkills: {}, // Not stored in DB currently
        technologies: {}, // Extract from projects if needed
      },
      {
        title: job.title,
        description: job.description || "",
        requirements: job.requirements || "",
        responsibilities: "",
        skills: job.skills,
        experienceLevel: job.experienceLevel,
        requiredDegree: null,
        preferredDegree: null,
        requiredField: null,
        preferredSchools: [],
        educationDescription: null,
        location: job.location,
        isRemote: job.isRemote,
      }
    );

    // Calculate boosts
    const jobSkills = job.skills.map(s => s.skill?.name).filter(Boolean) as string[];
    const behaviorBoost = calculateBehaviorBoost(
      job.id,
      job.title,
      jobSkills,
      {
        viewedJobIds: [], // Could be tracked separately
        clickedJobIds: [], // Could be tracked separately
        appliedJobIds,
        rejectedJobIds,
        appliedJobTitles,
        appliedJobSkills,
      }
    );

    // Skip if strong negative boost (already applied/rejected)
    if (behaviorBoost < -50) {
      continue;
    }

    const preferenceBoost = calculatePreferenceBoost(
      job.type || null,
      job.isRemote,
      candidatePreferences
    );

    const freshnessBoost = calculateFreshnessBoost(job.publishedAt);

    // Calculate final score
    const baseScore = matchResult.matchScore;
    const finalScore = Math.min(
      baseScore + behaviorBoost + preferenceBoost + freshnessBoost,
      100
    );

    // Only include jobs with reasonable match score
    if (finalScore < 30) {
      continue; // Skip very low matches
    }

    const suggestions = generateSuggestions({
      ...matchResult,
      jobId: job.id,
      jobTitle: job.title,
      jobIsRemote: job.isRemote,
      candidateProjects: candidate.projects,
    });

    matches.push({
      jobId: job.id,
      jobTitle: job.title,
      jobIsRemote: job.isRemote,
      matchScore: baseScore,
      finalScore,
      behaviorBoost,
      preferenceBoost,
      freshnessBoost,
      breakdown: matchResult.breakdown,
      details: matchResult.details,
      suggestions,
      candidateProjects: candidate.projects,
    });
  }

  // Sort by final score (descending) and return top N
  return matches
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);
}

