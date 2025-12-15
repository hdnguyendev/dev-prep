import { Hono } from "hono";
import prisma from "../app/db/prisma";
import { getOrCreateClerkUser } from "../utils/clerkAuth";

const reviewRoutes = new Hono();

// Get reviews for a company
reviewRoutes.get("/companies/:companyId", async (c) => {
  try {
    const { companyId } = c.req.param();

    if (!companyId) {
      return c.json(
        { success: false, message: "Company ID is required" },
        400
      );
    }

    // Parse pagination
    const query = c.req.query();
    const take = Math.min(Math.max(Number(query.pageSize) || 10, 1), 50);
    const page = Math.max(Number(query.page) || 1, 1);
    const skip = (page - 1) * take;

    // Fetch reviews with candidate info
    const [reviews, total, stats] = await Promise.all([
      prisma.companyReview.findMany({
        where: { companyId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          candidate: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      prisma.companyReview.count({
        where: { companyId },
      }),
      prisma.companyReview.aggregate({
        where: { companyId },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      }),
    ]);

    return c.json({
      success: true,
      data: reviews,
      meta: {
        total,
        page,
        pageSize: take,
        totalPages: Math.ceil(total / take),
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count.rating || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching company reviews:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch reviews",
      },
      500
    );
  }
});

// Get review statistics for a company
reviewRoutes.get("/companies/:companyId/stats", async (c) => {
  try {
    const { companyId } = c.req.param();

    if (!companyId) {
      return c.json(
        { success: false, message: "Company ID is required" },
        400
      );
    }

    // Use Promise.all instead of transaction for better Cloudflare Workers compatibility
    const [stats, rating5, rating4, rating3, rating2, rating1] = await Promise.all([
      prisma.companyReview.aggregate({
        where: { companyId },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      }),
      // Get count for each rating (1-5) - parallel queries instead of transaction
      prisma.companyReview.count({ where: { companyId, rating: 5 } }),
      prisma.companyReview.count({ where: { companyId, rating: 4 } }),
      prisma.companyReview.count({ where: { companyId, rating: 3 } }),
      prisma.companyReview.count({ where: { companyId, rating: 2 } }),
      prisma.companyReview.count({ where: { companyId, rating: 1 } }),
    ]);

    const ratingDistribution = [rating5, rating4, rating3, rating2, rating1];

    const recommendCount = await prisma.companyReview.count({
      where: {
        companyId,
        wouldRecommend: true,
      },
    });

    return c.json({
      success: true,
      data: {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count.rating || 0,
        ratingDistribution: {
          5: ratingDistribution[0],
          4: ratingDistribution[1],
          3: ratingDistribution[2],
          2: ratingDistribution[3],
          1: ratingDistribution[4],
        },
        recommendPercentage:
          stats._count.rating > 0
            ? Math.round((recommendCount / stats._count.rating) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching review stats:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch stats",
      },
      500
    );
  }
});

// Create or update a review
reviewRoutes.post("/", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    const body = await c.req.json();
    const {
      companyId,
      rating,
      title,
      review,
      pros,
      cons,
      isCurrentEmployee,
      wouldRecommend,
    } = body;

    // Validate required fields
    if (!companyId || !rating) {
      return c.json(
        { success: false, message: "Company ID and rating are required" },
        400
      );
    }

    if (rating < 1 || rating > 5) {
      return c.json(
        { success: false, message: "Rating must be between 1 and 5" },
        400
      );
    }

    // Find user by ID (custom auth) or get/create from Clerk
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: { candidateProfile: true },
    });

    if (!user) {
      const result = await getOrCreateClerkUser(c);
      if (!result.success || !result.user) {
        return c.json({
          success: false,
          message: result.error || "Authentication failed"
        }, 401);
      }
      user = result.user;
    }

    if (!user || !user.candidateProfile) {
      return c.json(
        { success: false, message: "Candidate profile not found" },
        404
      );
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return c.json({ success: false, message: "Company not found" }, 404);
    }

    // Upsert review (create or update)
    const companyReview = await prisma.companyReview.upsert({
      where: {
        companyId_candidateId: {
          companyId,
          candidateId: user.candidateProfile.id,
        },
      },
      create: {
        companyId,
        candidateId: user.candidateProfile.id,
        rating,
        title: title || null,
        review: review || null,
        pros: pros || null,
        cons: cons || null,
        isCurrentEmployee: isCurrentEmployee || false,
        wouldRecommend: wouldRecommend !== undefined ? wouldRecommend : true,
      },
      update: {
        rating,
        title: title || null,
        review: review || null,
        pros: pros || null,
        cons: cons || null,
        isCurrentEmployee: isCurrentEmployee || false,
        wouldRecommend: wouldRecommend !== undefined ? wouldRecommend : true,
        updatedAt: new Date(),
      },
      include: {
        candidate: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        company: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    return c.json({
      success: true,
      message: "Review submitted successfully",
      data: companyReview,
    }, 201);
  } catch (error) {
    console.error("Error creating review:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create review",
      },
      500
    );
  }
});

// Delete a review
reviewRoutes.delete("/:reviewId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    const { reviewId } = c.req.param();

    if (!reviewId) {
      return c.json(
        { success: false, message: "Review ID is required" },
        400
      );
    }

    // Find user and candidate profile
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: { candidateProfile: true },
    });

    if (!user) {
      const result = await getOrCreateClerkUser(c);
      if (result.success && result.user) {
        user = result.user;
      }
    }

    if (!user || !user.candidateProfile) {
      return c.json(
        { success: false, message: "Candidate profile not found" },
        404
      );
    }

    // Find review
    const review = await prisma.companyReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return c.json({ success: false, message: "Review not found" }, 404);
    }

    // Check ownership
    if (review.candidateId !== user.candidateProfile.id) {
      return c.json(
        { success: false, message: "Not authorized to delete this review" },
        403
      );
    }

    // Delete review
    await prisma.companyReview.delete({
      where: { id: reviewId },
    });

    return c.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete review",
      },
      500
    );
  }
});

// Get candidate's review for a specific company
reviewRoutes.get("/my-review/:companyId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    const { companyId } = c.req.param();

    if (!companyId) {
      return c.json(
        { success: false, message: "Company ID is required" },
        400
      );
    }

    // Find user and candidate profile
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: { candidateProfile: true },
    });

    if (!user) {
      const result = await getOrCreateClerkUser(c);
      if (result.success && result.user) {
        user = result.user;
      }
    }

    if (!user || !user.candidateProfile) {
      return c.json({
        success: true,
        data: null,
        message: "No candidate profile found",
      });
    }

    // Find review
    const review = await prisma.companyReview.findUnique({
      where: {
        companyId_candidateId: {
          companyId,
          candidateId: user.candidateProfile.id,
        },
      },
      include: {
        candidate: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return c.json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error("Error fetching user review:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch review",
      },
      500
    );
  }
});

export default reviewRoutes;
