import { Hono } from "hono";
import prisma from "../app/db/prisma";

const companyRoutes = new Hono();

// Get company by slug
companyRoutes.get("/slug/:slug", async (c) => {
  try {
    const { slug } = c.req.param();

    if (!slug) {
      return c.json(
        { success: false, message: "Slug is required" },
        400
      );
    }

    const company = await prisma.company.findUnique({
      where: { slug },
    });

    if (!company) {
      return c.json(
        { success: false, message: "Company not found" },
        404
      );
    }

    // Get review stats
    const reviewStats = await prisma.companyReview.aggregate({
      where: { companyId: company.id },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    return c.json({
      success: true,
      data: {
        ...company,
        averageRating: reviewStats._avg.rating || 0,
        totalReviews: reviewStats._count.rating || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching company by slug:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch company",
      },
      500
    );
  }
});

/**
 * Get company name suggestions for autocomplete
 * GET /companies/suggestions?q=google
 * Returns lowercase company names from database only
 */
companyRoutes.get("/suggestions", async (c) => {
  try {
    const query = c.req.query();
    const searchQuery = (query.q || query.search || "").trim();
    
    if (!searchQuery || searchQuery.length < 2) {
      return c.json({ success: true, data: [] });
    }

    // Get distinct company names that match the search query
    const companies = await prisma.company.findMany({
      where: {
        name: {
          contains: searchQuery,
          mode: "insensitive",
        },
      },
      select: {
        name: true,
      },
      distinct: ["name"],
      take: 10, // Limit to 10 suggestions
      orderBy: {
        createdAt: "desc", // Most recent first
      },
    });

    // Extract unique names and convert to lowercase
    const suggestions = [...new Set(companies.map(company => company.name.toLowerCase()))];

    return c.json({ success: true, data: suggestions });
  } catch (error: any) {
    console.error("Error fetching company suggestions:", error);
    return c.json(
      { success: false, message: error.message || "Failed to fetch suggestions" },
      500
    );
  }
});

// Get jobs for a specific company
companyRoutes.get("/:id/jobs", async (c) => {
  try {
    const { id } = c.req.param();

    if (!id) {
      return c.json(
        { success: false, message: "Company ID is required" },
        400
      );
    }

    // Parse pagination
    const query = c.req.query();
    const take = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const skip = (page - 1) * take;

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return c.json(
        { success: false, message: "Company not found" },
        404
      );
    }

    // Parse include parameter
    const include = query.include?.split(",") || [];
    const includeClause: any = {};

    if (include.includes("company")) {
      includeClause.company = true;
    }
    if (include.includes("skills")) {
      includeClause.skills = {
        include: {
          skill: true,
        },
      };
    }
    if (include.includes("categories")) {
      includeClause.categories = {
        include: {
          category: true,
        },
      };
    }
    if (include.includes("recruiterProfile")) {
      includeClause.recruiterProfile = {
        include: {
          user: true,
        },
      };
    }

    // Fetch jobs for this company
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: {
          companyId: id,
          status: "PUBLISHED", // Only show published jobs
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: Object.keys(includeClause).length > 0 ? includeClause : undefined,
      }),
      prisma.job.count({
        where: {
          companyId: id,
          status: "PUBLISHED",
        },
      }),
    ]);

    return c.json({
      success: true,
      data: jobs,
      meta: {
        total,
        page,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Error fetching company jobs:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch jobs",
      },
      500
    );
  }
});

export default companyRoutes;
