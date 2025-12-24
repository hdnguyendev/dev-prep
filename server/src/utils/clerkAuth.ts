/**
 * Clerk Authentication Helper
 * Provides consistent user lookup/creation logic across all routes
 */

import type { Context } from "hono";
import { getAuth } from "@hono/clerk-auth";
import prisma from "../app/db/prisma";

export async function getOrCreateClerkUser(c: Context) {
  const auth = getAuth(c);
  
  if (!auth?.userId) {
    return { success: false, error: "Not authenticated with Clerk", user: null };
  }

  const clerkUserId = auth.userId;
  
  
  // Try different field names that Clerk might use
  const sessionClaims = auth.sessionClaims as any;
  const email = sessionClaims?.email as string || `clerk_${clerkUserId}@devprep.com`;
  // Use default names - user will update via profile form
  const firstName = "Candidate";
  const lastName = "User";
  
  // Try to find existing user
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { contains: clerkUserId } }, // Match clerk ID in email
        { email }, // Match exact email
      ],
    },
    include: {
      candidateProfile: true,
      recruiterProfile: true,
    },
  });

  // Don't sync name from Clerk - user manages name in database via profile form

  // If not found, create new user + candidate profile
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: "",
          firstName,
          lastName,
          role: "CANDIDATE",
          isVerified: true,
          isActive: true,
          candidateProfile: {
            create: {}, // Auto-create candidate profile
          },
        },
        include: {
          candidateProfile: true,
          recruiterProfile: true,
        },
      });
    } catch (error) {
      console.error("Failed to create Clerk user:", error);
      return { success: false, error: "Failed to create user profile", user: null };
    }
  }

  // Ensure candidate profile exists
  if (!user.candidateProfile) {
    try {
      await prisma.candidateProfile.create({
        data: { userId: user.id },
      });
      
      // Re-fetch with full includes
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          candidateProfile: {
            include: {
              skills: { include: { skill: true } },
              experiences: true,
              educations: true,
              projects: true,
            },
          },
          recruiterProfile: true,
        },
      });
      
      if (!user?.candidateProfile) {
        console.error("⚠️ Failed to fetch candidateProfile after creation for user:", user?.id);
      }
    } catch (error) {
      console.error("Failed to create candidate profile:", error);
      // Try to fetch again in case it was created by another request
      user = await prisma.user.findUnique({
        where: { id: user?.id },
        include: {
          candidateProfile: {
            include: {
              skills: { include: { skill: true } },
              experiences: true,
              educations: true,
              projects: true,
            },
          },
          recruiterProfile: true,
        },
      });
    }
  }

  return { success: true, error: null, user };
}
