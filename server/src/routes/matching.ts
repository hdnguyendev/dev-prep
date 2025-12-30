/**
 * CV-Job Matching API Routes
 * 
 * This module provides REST API endpoints for the matching system.
 * 
 * Endpoints:
 * - GET /matching/candidate/:candidateId/jobs - Find matching jobs for a candidate
 * - GET /matching/job/:jobId/candidates - Find matching candidates for a job
 * - GET /matching/candidate/:candidateId/job/:jobId - Calculate specific match
 * 
 * @module matchingRoutes
 */

import { Hono } from "hono";
import prisma from "../app/db/prisma";
import {
  findMatchingJobsForCandidate,
  findMatchingCandidatesForJob,
  calculateCandidateJobMatch,
} from "../app/services/matching";

const matchingRoutes = new Hono();

/**
 * Get matching jobs for a candidate
 * 
 * GET /matching/candidate/:candidateId/jobs?limit=10
 * 
 * Returns top N matching jobs sorted by match score (descending)
 * 
 * Membership Feature Gating:
 * - FREE members: Limited to 3 jobs, no detailed insights
 * - VIP members: Full access to all matches with detailed insights
 */
matchingRoutes.get("/matching/candidate/:candidateId/jobs", async (c) => {
  try {
    // Authentication check
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Get authenticated user
    const { getOrCreateClerkUser } = await import("../utils/clerkAuth");
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: { candidateProfile: true },
    });

    if (!user) {
      const clerkResult = await getOrCreateClerkUser(c);
      if (!clerkResult.success || !clerkResult.user) {
        return c.json({ success: false, message: "Not authenticated" }, 401);
      }
      user = clerkResult.user;
    }

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    // Check membership for feature access
    const { getActiveMembership, getFreePlan } = await import("../app/services/membership");
    const membership = await getActiveMembership(user.id, "CANDIDATE");
    const isVIP = membership && membership.plan.planType === "VIP" && membership.plan.fullMatchingInsights;

    const candidateId = c.req.param("candidateId");
    const limitParam = c.req.query("limit");
    let requestedLimit = limitParam ? parseInt(limitParam, 10) : 10;

    if (isNaN(requestedLimit) || requestedLimit < 1 || requestedLimit > 50) {
      return c.json(
        { success: false, message: "Limit must be between 1 and 50" },
        400
      );
    }

    // FREE members: Limit to 3 jobs max
    const freePlan = await getFreePlan("CANDIDATE");
    const freeLimit = freePlan.maxMatchingViews || 3;
    const effectiveLimit = isVIP ? requestedLimit : Math.min(requestedLimit, freeLimit);

    // Get all matches first to know total count (for FREE members to see how many they're missing)
    const allMatches = await findMatchingJobsForCandidate(candidateId, isVIP ? requestedLimit : 50);
    const totalMatches = allMatches.length;
    
    // Limit results for FREE members
    const matches = isVIP ? allMatches : allMatches.slice(0, effectiveLimit);

    // For FREE members, remove detailed insights (suggestions, matched skills, missing skills)
    const processedMatches = isVIP
      ? matches
      : matches.map((match) => ({
          ...match,
          suggestions: [], // Hide suggestions for FREE members
          details: {
            ...match.details,
            matchedSkills: [], // Hide matched skills for FREE members
            missingSkills: [], // Hide missing skills for FREE members
            extraSkills: [], // Hide extra skills for FREE members
            experienceGap: undefined, // Hide experience gap for FREE members
            titleSimilarity: undefined, // Hide title similarity for FREE members
            bonusFactors: [], // Hide bonus factors for FREE members
          },
        }));

    return c.json({
      success: true,
      data: processedMatches,
      count: processedMatches.length,
      totalMatches: !isVIP ? totalMatches : undefined, // Total available matches for FREE members
      isVIP,
      freeLimit: !isVIP ? freeLimit : undefined,
      message: !isVIP
        ? `You're viewing ${processedMatches.length} of ${totalMatches} recommended jobs. Upgrade to VIP to see all matches with detailed insights.`
        : undefined,
    });
  } catch (error: any) {
    console.error("Error finding matching jobs:", error);
    return c.json(
      {
        success: false,
        message: error.message || "Failed to find matching jobs",
      },
      500
    );
  }
});

/**
 * Get matching candidates for a job
 * 
 * GET /matching/job/:jobId/candidates?limit=10
 * 
 * Returns top N matching candidates sorted by match score (descending)
 * Only returns candidates with public profiles
 * 
 * VIP Recruiter Feature:
 * - VIP recruiters can view ranked candidate list with full match details
 * - FREE recruiters cannot access this endpoint (returns 403)
 */
matchingRoutes.get("/matching/job/:jobId/candidates", async (c) => {
  try {
    const jobId = c.req.param("jobId");

    // Authentication check
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Get authenticated user
    const { getOrCreateClerkUser } = await import("../utils/clerkAuth");
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: { recruiterProfile: true, candidateProfile: true },
    });

    if (!user) {
      const clerkResult = await getOrCreateClerkUser(c);
      if (!clerkResult.success || !clerkResult.user) {
        return c.json({ success: false, message: "Not authenticated" }, 401);
      }
      user = clerkResult.user;
    }

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    // Check if user is a recruiter
    if (!user.recruiterProfile) {
      return c.json(
        { success: false, message: "This endpoint is only available for recruiters" },
        403
      );
    }

    // Check VIP membership for ranked candidate list
    const { getActiveMembership, getFreePlan } = await import("../app/services/membership");
    const membership = await getActiveMembership(user.id, "RECRUITER");
    const isVIP = membership && membership.plan.planType === "VIP" && membership.plan.rankedCandidateList;

    console.log("🔍 Server VIP Check Debug:", {
      userId: user.id,
      userRole: user.role,
      hasMembership: !!membership,
      membershipPlanType: membership?.plan?.planType,
      rankedCandidateList: membership?.plan?.rankedCandidateList,
      isVIP: isVIP,
      membershipEndDate: membership?.endDate
    });

    // FREE members: Show summary statistics only
    if (!isVIP) {
      // Get all matches for statistics
      const allMatches = await findMatchingCandidatesForJob(jobId, 50);
      const matchCount = allMatches.length;

      // Calculate breakdown
      const highMatches = allMatches.filter(m => m.matchScore >= 80).length;
      const mediumMatches = allMatches.filter(m => m.matchScore >= 60 && m.matchScore < 80).length;
      const lowMatches = allMatches.filter(m => m.matchScore < 60).length;

      console.log("🔍 Sending FREE summary data:", {
        totalMatches: matchCount,
        breakdown: { highMatches, mediumMatches, lowMatches }
      });

      return c.json({
        success: true,
        data: [], // No individual candidate data for FREE users
        count: 0,
        totalMatches: matchCount,
        isVIP: false,
        teaserData: {
          totalMatches: matchCount,
          breakdown: {
            highMatches,
            mediumMatches,
            lowMatches,
          },
        },
      });
    }
    const limitParam = c.req.query("limit");
    let requestedLimit = limitParam ? parseInt(limitParam, 10) : 10;

    if (isNaN(requestedLimit) || requestedLimit < 1 || requestedLimit > 50) {
      return c.json(
        { success: false, message: "Limit must be between 1 and 50" },
        400
      );
    }

    // Verify recruiter owns this job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { recruiter: true },
    });

    if (!job) {
      return c.json({ success: false, message: "Job not found" }, 404);
    }

    if (job.recruiterId !== user.recruiterProfile.id && user.role !== "ADMIN") {
      return c.json(
        { success: false, message: "You don't have permission to view candidates for this job" },
        403
      );
    }

    // Get all matches first to know total count
    const allMatches = await findMatchingCandidatesForJob(jobId, 50);
    const totalMatches = allMatches.length;
    
    // Limit results (VIP can request up to limit, but we'll return all available)
    const matches = allMatches.slice(0, requestedLimit);

    return c.json({
      success: true,
      data: matches,
      count: matches.length,
      totalMatches,
      isVIP: true,
    });
  } catch (error: any) {
    console.error("Error finding matching candidates:", error);
    return c.json(
      {
        success: false,
        message: error.message || "Failed to find matching candidates",
      },
      500
    );
  }
});

/**
 * Calculate match score for a specific candidate-job pair
 * 
 * GET /matching/candidate/:candidateId/job/:jobId
 * 
 * Returns detailed match result with score, breakdown, and suggestions
 */
matchingRoutes.get(
  "/matching/candidate/:candidateId/job/:jobId",
  async (c) => {
    try {
      const candidateId = c.req.param("candidateId");
      const jobId = c.req.param("jobId");

      const match = await calculateCandidateJobMatch(candidateId, jobId);

      return c.json({
        success: true,
        data: match,
      });
    } catch (error: any) {
      console.error("Error calculating match:", error);
      return c.json(
        {
          success: false,
          message: error.message || "Failed to calculate match",
        },
        500
      );
    }
  }
);

export default matchingRoutes;

