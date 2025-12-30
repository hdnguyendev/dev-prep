/**
 * CV-Job Matching Service
 * 
 * Main entry point for the matching system.
 * 
 * This module orchestrates the matching process:
 * 1. Data preparation
 * 2. Score calculation
 * 3. Suggestion generation
 * 4. Result formatting
 * 
 * Academic Context:
 * - This is the orchestrator that combines all matching components
 * - It provides a clean API for the matching functionality
 * - All logic is deterministic and explainable
 * 
 * @module matching
 */

import prisma from "../../db/prisma";
import { calculateMatchScore } from "./scoring";
import { generateSuggestions, generateMatchExplanation } from "./suggestions";
import type { MatchResult, CandidateMatchData, JobMatchData } from "./types";

/**
 * Finds top matching jobs for a given candidate
 * 
 * Algorithm:
 * 1. Fetch candidate profile with all related data
 * 2. Fetch all published jobs with their requirements
 * 3. Calculate match score for each job
 * 4. Sort by score (descending)
 * 5. Return top N results with suggestions
 * 
 * @param candidateId - Candidate profile ID
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Array of match results sorted by score
 */
export async function findMatchingJobsForCandidate(
  candidateId: string,
  limit: number = 10
): Promise<MatchResult[]> {
  // Fetch candidate data
  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: candidateId },
    include: {
      skills: {
        include: { skill: true },
      },
      experiences: {
        orderBy: { startDate: "desc" },
      },
      projects: true,
    },
  });

  if (!candidate) {
    throw new Error("Candidate not found");
  }

  // Fetch published jobs
  const jobs = await prisma.job.findMany({
    where: {
      status: "PUBLISHED",
    },
    include: {
      skills: {
        include: { skill: true },
      },
      company: {
        select: { name: true },
      },
    },
    take: 100, // Limit initial fetch for performance
  });

  // Calculate matches
  const matches: MatchResult[] = [];

  for (const job of jobs) {
    const matchResult = calculateMatchScore(
      {
        skills: candidate.skills,
        experiences: candidate.experiences,
        education: (candidate as any).education || [],
        headline: candidate.headline,
        address: candidate.address,
        projects: candidate.projects,
        softSkills: (candidate as any).softSkills || {},
        technologies: (candidate as any).technologies || {},
      },
      {
        title: job.title,
        description: job.description || "",
        requirements: job.requirements || "",
        responsibilities: (job as any).responsibilities || "",
        skills: job.skills,
        experienceLevel: job.experienceLevel,
        requiredDegree: job.experienceLevel || undefined,
        preferredDegree: null,
        requiredField: null,
        preferredSchools: [],
        educationDescription: null,
        location: job.location,
        isRemote: job.isRemote,
      }
    );

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
      matchScore: matchResult.matchScore,
      breakdown: matchResult.breakdown,
      details: matchResult.details,
      suggestions,
      candidateProjects: candidate.projects,
    });
  }

  // Sort by score (descending) and return top N
  return matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

/**
 * Finds top matching candidates for a given job
 * 
 * Algorithm:
 * 1. Fetch job requirements
 * 2. Fetch all public candidate profiles
 * 3. Calculate match score for each candidate
 * 4. Sort by score (descending)
 * 5. Return top N results with suggestions
 * 
 * @param jobId - Job ID
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Array of match results sorted by score
 */
export async function findMatchingCandidatesForJob(
  jobId: string,
  limit: number = 10
): Promise<MatchResult[]> {
  // Fetch job data
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      skills: {
        include: { skill: true },
      },
      company: {
        select: { name: true },
      },
    },
  });

  if (!job) {
    throw new Error("Job not found");
  }

  // Fetch public candidate profiles
  const candidates = await prisma.candidateProfile.findMany({
    where: {
      isPublic: true,
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          avatarUrl: true,
          email: true,
          notificationEmail: true,
          phone: true,
        },
      },
      skills: {
        include: { skill: true },
      },
      experiences: {
        orderBy: { startDate: "desc" },
      },
      projects: true,
    },
    take: 100, // Limit initial fetch for performance
  });

  // Calculate matches
  const matches: MatchResult[] = [];

  for (const candidate of candidates) {
    const matchResult = calculateMatchScore(
      {
        skills: candidate.skills,
        experiences: candidate.experiences,
        headline: candidate.headline,
        address: candidate.address,
        projects: candidate.projects,
      },
      {
        title: job.title,
        skills: job.skills,
        experienceLevel: job.experienceLevel,
        location: job.location,
        isRemote: job.isRemote,
      }
    );

    const suggestions = generateSuggestions({
      ...matchResult,
      jobId: job.id,
      jobTitle: job.title,
      jobIsRemote: job.isRemote,
      candidateProjects: candidate.projects,
    });

    // Calculate experience years
    const experienceYears = candidate.experiences.length > 0 ? Math.max(1, Math.floor(
      candidate.experiences.reduce((total, exp) => {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return total + years;
      }, 0)
    )) : 0;

    matches.push({
      candidateId: candidate.id,
      candidateUserId: candidate.userId, // Add userId for messaging
      candidateName: candidate.user ? `${candidate.user.firstName} ${candidate.user.lastName}` : null,
      candidateHeadline: candidate.headline,
      candidateAvatar: candidate.user?.avatarUrl,
      candidateEmail: candidate.user?.email,
      candidateNotificationEmail: candidate.user?.notificationEmail,
      candidatePhone: candidate.user?.phone,
      candidateLocation: candidate.address,
      candidateExperience: experienceYears.toString(),
      candidateSkills: candidate.skills.map(s => s.skill?.name).filter(Boolean) as string[],
      jobId: job.id,
      jobTitle: job.title,
      jobIsRemote: job.isRemote,
      matchScore: matchResult.matchScore,
      breakdown: matchResult.breakdown,
      details: matchResult.details,
      suggestions,
      candidateProjects: candidate.projects,
    } as any);
  }

  // Sort by score (descending) and return top N
  return matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

/**
 * Calculates match score for a specific candidate-job pair
 * 
 * @param candidateId - Candidate profile ID
 * @param jobId - Job ID
 * @returns Match result with score and suggestions
 */
export async function calculateCandidateJobMatch(
  candidateId: string,
  jobId: string
): Promise<MatchResult> {
  // Fetch candidate data
  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: candidateId },
    include: {
      skills: {
        include: { skill: true },
      },
      experiences: {
        orderBy: { startDate: "desc" },
      },
      projects: true,
    },
  });

  if (!candidate) {
    throw new Error("Candidate not found");
  }

  // Fetch job data
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      skills: {
        include: { skill: true },
      },
      company: {
        select: { name: true },
      },
    },
  });

  if (!job) {
    throw new Error("Job not found");
  }

  // Calculate match
  const matchResult = calculateMatchScore(
    {
      skills: candidate.skills,
      experiences: candidate.experiences,
      headline: candidate.headline,
      address: candidate.address,
      projects: candidate.projects,
    },
    {
      title: job.title,
      skills: job.skills,
      experienceLevel: job.experienceLevel,
      location: job.location,
      isRemote: job.isRemote,
    }
  );

  const suggestions = generateSuggestions({
    ...matchResult,
    jobId: job.id,
    jobTitle: job.title,
    jobIsRemote: job.isRemote,
    candidateProjects: candidate.projects,
  });

  return {
    jobId: job.id,
    jobTitle: job.title,
    jobIsRemote: job.isRemote,
    matchScore: matchResult.matchScore,
    breakdown: matchResult.breakdown,
    details: matchResult.details,
    suggestions,
    candidateProjects: candidate.projects,
  };
}

