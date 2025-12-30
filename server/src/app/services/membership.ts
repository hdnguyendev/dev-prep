/**
 * Membership Service
 * 
 * This service manages user memberships, including:
 * - Membership activation and expiration
 * - Feature access control
 * - Membership upgrades and renewals
 * 
 * Design Decisions:
 * 1. Single Active Membership: One active membership per user at a time
 * 2. Auto-expiration: Memberships automatically expire based on endDate
 * 3. Feature Gating: Centralized logic for checking feature access
 * 4. Audit Trail: All membership changes are logged
 * 
 * Business Rules:
 * - FREE membership is assigned automatically on user registration
 * - VIP membership is purchased via PayOS
 * - Expired memberships revert to FREE plan features
 */

import prisma from "../db/prisma";
import { MembershipPlanType, MembershipStatus, UserRole } from "../../generated/prisma";

/**
 * Get current active VIP membership for a user
 * Returns the active VIP membership or null (which means FREE plan)
 * 
 * Design Decision: FREE plan doesn't need a database record.
 * If user has no VIP membership, they are on FREE plan by default.
 */
export async function getActiveMembership(userId: string, role: UserRole) {
  // Find active, non-expired VIP membership only
  const membership = await prisma.userMembership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      endDate: {
        gt: new Date(),
      },
      plan: {
        planType: "VIP", // Only VIP memberships are stored in DB
      },
    },
    include: {
      plan: true,
    },
    orderBy: {
      endDate: "desc", // Get the latest one
    },
  });

  // Return null if no VIP membership (means FREE plan)
  return membership || null;
}

/**
 * Get FREE plan for a role (used when user has no VIP membership)
 */
export async function getFreePlan(role: UserRole) {
  const freePlan = await prisma.membershipPlan.findFirst({
    where: {
      role,
      planType: "FREE",
      isActive: true,
    },
  });

  if (!freePlan) {
    throw new Error(`FREE plan not found for role: ${role}`);
  }

  return freePlan;
}

/**
 * Activate VIP membership after successful payment
 * 
 * @param userId - User ID
 * @param planId - VIP plan ID
 * @param durationDays - Duration in days (from plan or custom)
 */
export async function activateVIPMembership(
  userId: string,
  planId: string,
  durationDays?: number
) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error("Membership plan not found");
  }

  if (plan.planType !== "VIP") {
    throw new Error("Only VIP plans can be activated via payment");
  }

  // Calculate end date
  const duration = durationDays || plan.duration;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + duration);

  // Check if user has existing active membership
  const existingMembership = await prisma.userMembership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      endDate: {
        gt: new Date(),
      },
    },
  });

  if (existingMembership) {
    // Extend existing membership if it's already VIP, otherwise upgrade
    if (existingMembership.planId === planId) {
      // Extend: update endDate
      return await prisma.userMembership.update({
        where: { id: existingMembership.id },
        data: {
          endDate: new Date(existingMembership.endDate.getTime() + duration * 24 * 60 * 60 * 1000),
        },
        include: {
          plan: true,
        },
      });
    } else {
      // Upgrade: expire old membership and create new one
      await prisma.userMembership.update({
        where: { id: existingMembership.id },
        data: { status: "CANCELED" },
      });
    }
  }

  // Create new VIP membership
  const newMembership = await prisma.userMembership.create({
    data: {
      userId,
      planId,
      startDate: new Date(),
      endDate,
      status: "ACTIVE",
    },
    include: {
      plan: true,
    },
  });

  return newMembership;
}

/**
 * Check if membership has expired and update status
 * Should be called periodically (via cron job) or before feature checks
 */
export async function checkAndUpdateExpiredMemberships() {
  const now = new Date();

  // Find expired memberships that are still marked as ACTIVE
  const expiredMemberships = await prisma.userMembership.updateMany({
    where: {
      status: "ACTIVE",
      endDate: {
        lte: now,
      },
    },
    data: {
      status: "EXPIRED",
    },
  });

  return expiredMemberships.count;
}

/**
 * Feature Access Control
 * Centralized functions to check if user has access to premium features
 */

/**
 * Check if candidate can perform an interview
 * FREE: Limited to maxInterviews per week (only practice interviews, scheduled interviews don't count)
 * VIP: Unlimited
 * 
 * Note: Scheduled interviews (with applicationId) are not counted towards the limit
 * Only practice interviews (applicationId IS NULL) are counted
 */
export async function canCandidatePerformInterview(
  userId: string,
  candidateId: string,
  isPracticeInterview: boolean = true // true = practice, false = scheduled (with access code)
): Promise<{ allowed: boolean; reason?: string; remainingInterviews?: number }> {
  const membership = await getActiveMembership(userId, "CANDIDATE");

  // VIP: Unlimited interviews
  if (membership && membership.plan.planType === "VIP" && membership.plan.unlimitedInterviews) {
    return { allowed: true };
  }

  // Scheduled interviews (with access code) don't count towards limit
  if (!isPracticeInterview) {
    return { allowed: true };
  }

  // FREE: Get FREE plan and check limit (only for practice interviews)
  const freePlan = await getFreePlan("CANDIDATE");
  const maxInterviews = freePlan.maxInterviews;
  
  if (maxInterviews === null) {
    return { allowed: true }; // No limit set
  }

  // Calculate start of current week (Monday 00:00:00)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  // Count completed practice interviews this week (applicationId IS NULL)
  const interviewCount = await prisma.interview.count({
    where: {
      candidateId,
      applicationId: null, // Only count practice interviews
      status: {
        in: ["COMPLETED", "PROCESSING"],
      },
      createdAt: {
        gte: startOfWeek, // This week only
      },
    },
  });

  const remaining = Math.max(0, maxInterviews - interviewCount);

  if (remaining > 0) {
    return { allowed: true, remainingInterviews: remaining };
  }

  return {
    allowed: false,
    reason: `You have reached the weekly limit of ${maxInterviews} practice interviews for your FREE plan. Upgrade to VIP for unlimited interviews.`,
    remainingInterviews: 0,
  };
}

/**
 * Check if candidate can view CV-Job matching insights
 * FREE: Limited views or basic matching
 * VIP: Full insights with suggestions
 */
export async function canCandidateViewMatchingInsights(
  userId: string
): Promise<{ allowed: boolean; fullInsights: boolean; reason?: string }> {
  const membership = await getActiveMembership(userId, "CANDIDATE");

  // VIP: Full insights
  if (membership && membership.plan.planType === "VIP" && membership.plan.fullMatchingInsights) {
    return { allowed: true, fullInsights: true };
  }

  // FREE: Basic matching only (no detailed insights)
  return {
    allowed: true,
    fullInsights: false,
    reason: "Upgrade to VIP to see detailed matching insights and improvement suggestions.",
  };
}

/**
 * Check if recruiter can view ranked candidate list
 * FREE: Cannot view ranked list
 * VIP: Can view ranked list with match scores
 */
export async function canRecruiterViewRankedCandidates(
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const membership = await getActiveMembership(userId, "RECRUITER");

  // VIP: Can view ranked candidates
  if (membership && membership.plan.planType === "VIP" && membership.plan.rankedCandidateList) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "This feature is only available for VIP recruiters. Upgrade to VIP to view ranked candidate matches.",
  };
}

/**
 * Check if recruiter can contact candidates directly
 * FREE: Cannot contact directly
 * VIP: Can contact candidates
 */
export async function canRecruiterContactCandidate(
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const membership = await getActiveMembership(userId, "RECRUITER");

  // VIP: Can contact directly
  if (membership && membership.plan.planType === "VIP" && membership.plan.directCandidateContact) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Direct candidate contact is only available for VIP recruiters. Upgrade to VIP to unlock this feature.",
  };
}

/**
 * Check if recruiter can post a new job
 * FREE: Limited to maxJobPostings
 * VIP: Unlimited (if maxJobPostings is null)
 * 
 * @param userId - User ID
 * @param recruiterId - Recruiter profile ID
 * @returns Object with allowed status, reason, and remaining jobs count
 */
export async function canRecruiterPostJob(
  userId: string,
  recruiterId: string
): Promise<{ allowed: boolean; reason?: string; remainingJobs?: number }> {
  const membership = await getActiveMembership(userId, "RECRUITER");
  const freePlan = await getFreePlan("RECRUITER");
  const plan = membership?.plan || freePlan;

  // VIP with unlimited job postings
  if (membership && membership.plan.planType === "VIP" && plan.maxJobPostings === null) {
    return { allowed: true };
  }

  // Check limit
  if (plan.maxJobPostings === null) {
    return { allowed: true }; // No limit
  }

  // Count existing jobs
  const jobCount = await prisma.job.count({
    where: {
      recruiterId,
      ...(membership ? {
        createdAt: {
          gte: membership.startDate,
        },
      } : {}), // For FREE, count all time
    },
  });

  const remaining = Math.max(0, plan.maxJobPostings - jobCount);

  if (remaining > 0) {
    return { allowed: true, remainingJobs: remaining };
  }

  return {
    allowed: false,
    reason: `You have reached the limit of ${plan.maxJobPostings} job postings for your FREE plan. Upgrade to VIP for unlimited job postings.`,
    remainingJobs: 0,
  };
}

/**
 * Get membership usage statistics for a user
 * Useful for displaying remaining quotas
 */
export async function getMembershipUsage(userId: string, role: UserRole) {
  const membership = await getActiveMembership(userId, role);
  const freePlan = await getFreePlan(role);

  // Use VIP membership if exists, otherwise use FREE plan
  const plan = membership?.plan || freePlan;
  const startDate = membership?.startDate || new Date(); // For FREE, use current date

  const usage: any = {
    planType: plan.planType,
    planName: plan.name,
    startDate: startDate,
    endDate: membership?.endDate || null, // FREE plan has no end date
    isExpired: false, // FREE plan never expires
  };

  // For candidates: count practice interviews (scheduled interviews don't count)
  if (role === "CANDIDATE") {
    const candidateProfile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (candidateProfile) {
      // For FREE plan: count practice interviews this week only
      // For VIP plan: count all practice interviews since membership start
      let dateFilter: { gte: Date } | undefined;
      
      if (membership) {
        // VIP: count since membership start
        dateFilter = { gte: membership.startDate };
      } else {
        // FREE: count this week only
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - daysToMonday);
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = { gte: startOfWeek };
      }

      const interviewCount = await prisma.interview.count({
        where: {
          candidateId: candidateProfile.id,
          applicationId: null, // Only count practice interviews (scheduled interviews don't count)
          status: {
            in: ["COMPLETED", "PROCESSING"],
          },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      usage.interviewsUsed = interviewCount;
      usage.interviewsLimit = plan.maxInterviews;
      usage.interviewsRemaining =
        plan.maxInterviews !== null
          ? Math.max(0, plan.maxInterviews - interviewCount)
          : null;
    }
  }

  // For recruiters: count job postings (if limited)
  if (role === "RECRUITER") {
    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (recruiterProfile) {
      const jobCount = await prisma.job.count({
        where: {
          recruiterId: recruiterProfile.id,
          ...(membership ? {
            createdAt: {
              gte: membership.startDate,
            },
          } : {}), // For FREE, count all time
        },
      });

      usage.jobsPosted = jobCount;
      usage.jobsLimit = plan.maxJobPostings;
      usage.jobsRemaining =
        plan.maxJobPostings !== null
          ? Math.max(0, plan.maxJobPostings - jobCount)
          : null;
    }
  }

  return usage;
}

