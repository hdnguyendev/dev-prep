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
  
  // Debug: Log all available session claims
  console.log("🔍 Clerk sessionClaims:", JSON.stringify(auth.sessionClaims, null, 2));
  
  // Try different field names that Clerk might use
  const sessionClaims = auth.sessionClaims as any;
  const email = sessionClaims?.email as string || `clerk_${clerkUserId}@candidate.temp`;
  const firstName = sessionClaims?.firstName 
    || sessionClaims?.first_name 
    || sessionClaims?.given_name 
    || sessionClaims?.name?.split(' ')[0]
    || "Candidate";
  const lastName = sessionClaims?.lastName 
    || sessionClaims?.last_name 
    || sessionClaims?.family_name 
    || sessionClaims?.name?.split(' ').slice(1).join(' ')
    || "User";
  
  console.log(`📝 Extracted: email=${email}, firstName=${firstName}, lastName=${lastName}`);

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
      
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          candidateProfile: true,
          recruiterProfile: true,
        },
      });
    } catch (error) {
      console.error("Failed to create candidate profile:", error);
    }
  }

  return { success: true, error: null, user };
}
