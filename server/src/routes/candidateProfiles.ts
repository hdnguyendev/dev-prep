import { Hono } from "hono";
import prisma from "../app/db/prisma";
import { getOrCreateClerkUser } from "../utils/clerkAuth";

const candidateProfilesRoutes = new Hono();

const parsePagination = (query: Record<string, string | undefined>) => {
  const take = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const skip = (page - 1) * take;
  return { take, page, skip };
};

/**
 * Public candidate profiles directory (only isPublic=true)
 * Supports:
 * - q: search by headline, firstName, lastName (case-insensitive)
 * - skillId: filter candidates who have a CandidateSkill with this skillId
 */
candidateProfilesRoutes.get("/public/candidate-profiles", async (c) => {
  try {
    const query = c.req.query();
    const { take, page, skip } = parsePagination(query);

    const q = (query.q || "").trim();
    const skillId = (query.skillId || "").trim();

    const where: any = { isPublic: true };

    if (q) {
      where.OR = [
        { headline: { contains: q, mode: "insensitive" } },
        { user: { firstName: { contains: q, mode: "insensitive" } } },
        { user: { lastName: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (skillId) {
      where.skills = { some: { skillId } };
    }

    const [data, total] = await Promise.all([
      prisma.candidateProfile.findMany({
        where,
        take,
        skip,
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          skills: { include: { skill: true } },
        },
      }),
      prisma.candidateProfile.count({ where }),
    ]);

    return c.json({ success: true, data, meta: { page, pageSize: take, total } });
  } catch (error) {
    console.error("Public candidate profiles list error:", error);
    return c.json({ success: false, message: "Failed to fetch profiles" }, 500);
  }
});

/**
 * Public candidate profile (only when isPublic=true)
 */
candidateProfilesRoutes.get("/public/candidate-profiles/:id", async (c) => {
  try {
    const id = c.req.param("id");
    let profile;
    try {
      profile = await prisma.candidateProfile.findFirst({
        where: { id, isPublic: true },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
              notificationEmail: true,
            },
          },
          skills: { include: { skill: true } },
          experiences: true,
          educations: true,
          projects: true,
        },
      });
    } catch (dbError: any) {
      console.error("❌ Database query error in public profile:", dbError);
      // If projects relation doesn't exist, try without it
      if (dbError?.message?.includes('projects') || dbError?.code === 'P2021') {
        console.log("⚠️ Projects relation might not exist, trying without it...");
        profile = await prisma.candidateProfile.findFirst({
          where: { id, isPublic: true },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
                notificationEmail: true,
              },
            },
            skills: { include: { skill: true } },
            experiences: true,
            educations: true,
            // projects: true, // Skip projects if table doesn't exist
          },
        });
      } else {
        throw dbError;
      }
    }

    if (!profile) {
      return c.json({ success: false, message: "Profile not found" }, 404);
    }

    return c.json({ success: true, data: profile });
  } catch (error: any) {
    console.error("❌ Public candidate profile error:", error);
    console.error("Error details:", { message: error?.message, code: error?.code, stack: error?.stack });
    return c.json({ 
      success: false, 
      message: "Failed to fetch profile",
      error: process.env.NODE_ENV === "development" ? error?.message : undefined
    }, 500);
  }
});

/**
 * Secure profile view for recruiters/candidates/admins.
 * - Candidate can view their own profile
 * - Recruiter can view candidate profiles for applications to their jobs (or if profile is public)
 * - Admin can view any
 */
candidateProfilesRoutes.get("/candidate-profiles/:id/view", async (c) => {
  try {
    const id = c.req.param("id");

    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Try custom auth first (recruiter/admin)
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: { candidateProfile: true, recruiterProfile: true },
    });

    // Clerk auth fallback (candidates)
    if (!user) {
      const result = await getOrCreateClerkUser(c);
      if (!result.success || !result.user) {
        return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
      }
      user = result.user;
    }

    if (!user) return c.json({ success: false, message: "User not found" }, 404);

    // Admin: allow
    if (user.role !== "ADMIN") {
      // Candidate: must match their profile id
      if (user.role === "CANDIDATE") {
        if (!user.candidateProfile || user.candidateProfile.id !== id) {
          return c.json({ success: false, message: "Forbidden" }, 403);
        }
      }

      // Recruiter: must have application for their jobs OR profile is public
      if (user.role === "RECRUITER") {
        if (!user.recruiterProfile) return c.json({ success: false, message: "Forbidden" }, 403);

        const isLinked = await prisma.application.findFirst({
          where: {
            candidateId: id,
            job: { recruiterId: user.recruiterProfile.id },
          },
          select: { id: true },
        });

        if (!isLinked) {
          const isPublic = await prisma.candidateProfile.findFirst({
            where: { id, isPublic: true },
            select: { id: true },
          });
          if (!isPublic) return c.json({ success: false, message: "Forbidden" }, 403);
        }
      }
    }

    let profile;
    try {
      profile = await prisma.candidateProfile.findUnique({
        where: { id },
        include: {
          user: true,
          skills: { include: { skill: true } },
          experiences: true,
          educations: true,
          projects: true,
        },
      });
    } catch (dbError: any) {
      console.error("❌ Database query error in profile view:", dbError);
      // If projects relation doesn't exist, try without it
      if (dbError?.message?.includes('projects') || dbError?.code === 'P2021') {
        console.log("⚠️ Projects relation might not exist, trying without it...");
        profile = await prisma.candidateProfile.findUnique({
      where: { id },
      include: {
        user: true,
        skills: { include: { skill: true } },
        experiences: true,
        educations: true,
            // projects: true, // Skip projects if table doesn't exist
      },
    });
      } else {
        throw dbError;
      }
    }

    if (!profile) return c.json({ success: false, message: "Profile not found" }, 404);
    return c.json({ success: true, data: profile });
  } catch (error: any) {
    console.error("❌ Candidate profile view error:", error);
    console.error("Error details:", { message: error?.message, code: error?.code, stack: error?.stack });
    return c.json({ 
      success: false, 
      message: "Failed to fetch profile",
      error: process.env.NODE_ENV === "development" ? error?.message : undefined
    }, 500);
  }
});

/**
 * Candidate updates their own profile (headline, bio, links, isPublic, etc.)
 */
candidateProfilesRoutes.put("/candidate-profiles/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
    }
    const user = result.user;

    if (!user.candidateProfile || user.candidateProfile.id !== id) {
      return c.json({ success: false, message: "Forbidden" }, 403);
    }

    const body = await c.req.json();
    const {
      headline,
      bio,
      website,
      linkedin,
      github,
      address,
      cvUrl,
      isPublic,
      notificationEmail,
    } = body as {
      headline?: string | null;
      bio?: string | null;
      website?: string | null;
      linkedin?: string | null;
      github?: string | null;
      address?: string | null;
      cvUrl?: string | null;
      isPublic?: boolean;
      notificationEmail?: string | null;
    };

    // Build update data object - only include fields that are explicitly provided
    const updateData: Record<string, unknown> = {};
    
    if (headline !== undefined) updateData.headline = headline ?? null;
    if (bio !== undefined) updateData.bio = bio ?? null;
    if (website !== undefined) updateData.website = website ?? null;
    if (linkedin !== undefined) updateData.linkedin = linkedin ?? null;
    if (github !== undefined) updateData.github = github ?? null;
    if (address !== undefined) updateData.address = address ?? null;
    if (cvUrl !== undefined) updateData.cvUrl = cvUrl ?? null;
    if (typeof isPublic === "boolean") updateData.isPublic = isPublic;

    const updated = await prisma.$transaction(async (tx) => {
      const profile = await tx.candidateProfile.update({
        where: { id },
        data: updateData,
      });

      if (typeof notificationEmail === "string") {
        await tx.user.update({
          where: { id: user.id },
          data: { notificationEmail: notificationEmail.trim() || null },
        });
      }

      return profile;
    });

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update candidate profile error:", error);
    return c.json(
      { success: false, message: "Failed to update candidate profile" },
      500
    );
  }
});

export default candidateProfilesRoutes;


