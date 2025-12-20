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
    const profile = await prisma.candidateProfile.findFirst({
      where: { id, isPublic: true },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        skills: { include: { skill: true } },
        experiences: true,
        educations: true,
      },
    });

    if (!profile) {
      return c.json({ success: false, message: "Profile not found" }, 404);
    }

    return c.json({ success: true, data: profile });
  } catch (error) {
    console.error("Public candidate profile error:", error);
    return c.json({ success: false, message: "Failed to fetch profile" }, 500);
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

    const profile = await prisma.candidateProfile.findUnique({
      where: { id },
      include: {
        user: true,
        skills: { include: { skill: true } },
        experiences: true,
        educations: true,
      },
    });

    if (!profile) return c.json({ success: false, message: "Profile not found" }, 404);
    return c.json({ success: true, data: profile });
  } catch (error) {
    console.error("Candidate profile view error:", error);
    return c.json({ success: false, message: "Failed to fetch profile" }, 500);
  }
});

export default candidateProfilesRoutes;


