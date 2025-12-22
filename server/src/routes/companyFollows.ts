import { Hono } from "hono";
import prisma from "../app/db/prisma";
import { getOrCreateClerkUser } from "../utils/clerkAuth";

const companyFollowRoutes = new Hono();

// Get followed companies for authenticated candidate
companyFollowRoutes.get("/", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json(
        {
          success: false,
          message: result.error || "Authentication failed",
        },
        401
      );
    }
    const user = result.user;

    const query = c.req.query();
    const take = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const skip = (page - 1) * take;

    if (!user || !user.candidateProfile) {
      return c.json(
        { success: false, message: "Candidate profile not found" },
        404
      );
    }

    const [follows, total] = await Promise.all([
      prisma.companyFollow.findMany({
        where: { candidateId: user.candidateProfile.id },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          company: true,
        },
      }),
      prisma.companyFollow.count({
        where: { candidateId: user.candidateProfile.id },
      }),
    ]);

    return c.json({
      success: true,
      data: follows.map((f) => f.company),
      meta: {
        total,
        page,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Error fetching followed companies:", error);
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch followed companies",
      },
      500
    );
  }
});

// Check if company is followed by candidate
companyFollowRoutes.get("/check/:companyId", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json(
        {
          success: false,
          message: result.error || "Authentication failed",
        },
        401
      );
    }
    const user = result.user;

    const { companyId } = c.req.param();

    if (!companyId) {
      return c.json(
        { success: false, message: "Company ID is required" },
        400
      );
    }

    if (!user || !user.candidateProfile) {
      return c.json({
        success: true,
        data: { isFollowed: false },
      });
    }

    const follow = await prisma.companyFollow.findUnique({
      where: {
        candidateId_companyId: {
          candidateId: user.candidateProfile.id,
          companyId,
        },
      },
    });

    return c.json({
      success: true,
      data: { isFollowed: !!follow },
    });
  } catch (error) {
    console.error("Error checking company follow:", error);
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to check company follow",
      },
      500
    );
  }
});

// Follow a company
companyFollowRoutes.post("/:companyId", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json(
        {
          success: false,
          message: result.error || "Authentication failed",
        },
        401
      );
    }
    const user = result.user;

    const { companyId } = c.req.param();

    if (!companyId) {
      return c.json(
        { success: false, message: "Company ID is required" },
        400
      );
    }

    if (!user || !user.candidateProfile) {
      return c.json(
        { success: false, message: "Candidate profile not found" },
        404
      );
    }

    // Ensure company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return c.json({ success: false, message: "Company not found" }, 404);
    }

    const follow = await prisma.companyFollow.upsert({
      where: {
        candidateId_companyId: {
          candidateId: user.candidateProfile.id,
          companyId,
        },
      },
      create: {
        candidateId: user.candidateProfile.id,
        companyId,
      },
      update: {},
      include: {
        company: true,
      },
    });

    return c.json({
      success: true,
      message: "Company followed successfully",
      data: follow,
    });
  } catch (error) {
    console.error("Error following company:", error);
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to follow company",
      },
      500
    );
  }
});

// Unfollow a company
companyFollowRoutes.delete("/:companyId", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json(
        {
          success: false,
          message: result.error || "Authentication failed",
        },
        401
      );
    }
    const user = result.user;

    const { companyId } = c.req.param();

    if (!companyId) {
      return c.json(
        { success: false, message: "Company ID is required" },
        400
      );
    }

    if (!user || !user.candidateProfile) {
      return c.json(
        { success: false, message: "Candidate profile not found" },
        404
      );
    }

    await prisma.companyFollow.delete({
      where: {
        candidateId_companyId: {
          candidateId: user.candidateProfile.id,
          companyId,
        },
      },
    });

    return c.json({
      success: true,
      message: "Company unfollowed successfully",
    });
  } catch (error) {
    console.error("Error unfollowing company:", error);
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to unfollow company",
      },
      500
    );
  }
});

export default companyFollowRoutes;


