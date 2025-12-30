/**
 * Clerk Authentication Helper
 * Provides consistent user lookup/creation logic across all routes
 */

import type { Context } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { createClerkClient } from '@clerk/backend'
import prisma from "../app/db/prisma";

export async function getOrCreateClerkUser(c: Context) {
  const auth = getAuth(c);
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY || "" })
  const clerkUser = await clerkClient.users.getUser(auth?.userId || "");

  if (!auth?.userId) {
    console.error("❌ No Clerk userId found in auth object");
    return { success: false, error: "Not authenticated with Clerk", user: null };
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress || `clerk_user_${auth?.userId}@clerk.com`;
  const firstName = clerkUser.firstName || "Candidate";
  const lastName = clerkUser.lastName || "User";
  const avatarUrl = clerkUser.imageUrl || "https://ui-avatars.com/api/?name=DevPrep&background=random";
  const notificationEmail = clerkUser.emailAddresses[0]?.emailAddress || email;
  const phone = clerkUser.phoneNumbers[0]?.phoneNumber || "";
  
  // Try to find existing user
  let user = await prisma.user.findFirst({
    where: {
      email,
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
          notificationEmail,
          phone,
          avatarUrl,
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
