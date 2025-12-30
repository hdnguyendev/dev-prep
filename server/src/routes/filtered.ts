import { Hono } from "hono";
import prisma from "../app/db/prisma";
import { getOrCreateClerkUser } from "../utils/clerkAuth";

/**
 * Role-based filtered routes for Applications and Interviews
 * - CANDIDATE: See only their own data
 * - RECRUITER: See data for jobs/companies they manage
 * - ADMIN: See everything (handled in admin panel)
 */
const filteredRoutes = new Hono();

/**
 * Get filtered applications based on user role
 */
filteredRoutes.get("/applications", async (c) => {
  try {
    // Try custom auth first (for recruiter/admin - user ID in token)
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Try to find user by ID first (for custom auth - recruiter/admin)
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: {
        candidateProfile: true,
        recruiterProfile: true,
      },
    });

    // If not found by ID, try Clerk authentication (for candidates)
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

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    // Parse pagination
    const query = c.req.query();
    const take = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const skip = (page - 1) * take;

    // Parse search query
    const searchQuery = (query.q || query.search || "").trim();

    let whereClause: any = {};

    // Additional filter by jobId if provided (for recruiter viewing specific job applications)
    const jobId = query.jobId;

    // Filter based on role
    if (user.role === "CANDIDATE") {
      // CANDIDATE: Only see their own applications
      if (!user.candidateProfile) {
        return c.json({ 
          success: true, 
          data: [], 
          meta: { total: 0, page, pageSize: take } 
        });
      }
      whereClause = { candidateId: user.candidateProfile.id };
      // If jobId is provided, add it to the filter
      if (jobId) {
        whereClause.jobId = jobId;
      }
    } else if (user.role === "RECRUITER") {
      // RECRUITER: See applications for jobs they posted
      if (!user.recruiterProfile) {
        return c.json({ 
          success: true, 
          data: [], 
          meta: { total: 0, page, pageSize: take } 
        });
      }
      // If jobId is provided, verify ownership first, then filter by jobId only
      if (jobId) {
        // Verify the job belongs to this recruiter
        const job = await prisma.job.findUnique({
          where: { id: jobId },
          select: { recruiterId: true },
        });
        if (!job || job.recruiterId !== user.recruiterProfile.id) {
          return c.json({ 
            success: false, 
            message: "Job not found or access denied" 
          }, 403);
        }
        // If verified, filter by jobId only
        whereClause = { jobId: jobId };
      } else {
        // If no jobId, get all jobIds from this recruiter first, then filter by jobId
        const recruiterJobs = await prisma.job.findMany({
          where: { recruiterId: user.recruiterProfile.id },
          select: { id: true },
        });
        const jobIds = recruiterJobs.map((j) => j.id);
        if (jobIds.length === 0) {
          // No jobs, return empty result
          return c.json({ 
            success: true, 
            data: [], 
            meta: { total: 0, page, pageSize: take } 
          });
        }
        whereClause = { jobId: { in: jobIds } };
      }
    } else {
      // ADMIN: See all (but they should use admin panel)
      whereClause = {};
      if (jobId) {
        whereClause.jobId = jobId;
      }
    }

    // Add search filter if provided
    if (searchQuery) {
      const searchConditions = [
        { job: { title: { contains: searchQuery, mode: "insensitive" } } },
        { job: { company: { name: { contains: searchQuery, mode: "insensitive" } } } },
        { status: { contains: searchQuery, mode: "insensitive" } },
      ];
      
      // If whereClause already has conditions, combine with AND
      if (Object.keys(whereClause).length > 0) {
        whereClause = {
          AND: [
            whereClause,
            { OR: searchConditions },
          ],
        };
      } else {
        whereClause.OR = searchConditions;
      }
    }

    const [data, total] = await Promise.all([
      prisma.application.findMany({
        where: whereClause,
        take,
        skip,
        include: {
          job: {
            include: {
              company: true,
              // include scalar fields like interviewQuestions by default
            },
          },
          candidate: {
            include: {
              user: true,
              skills: { include: { skill: true } },
              experiences: true,
            },
          },
          interviews: {
            // Include all interviews (PENDING, IN_PROGRESS, COMPLETED, etc.) so recruiters can see feedback
            orderBy: { createdAt: "desc" },
          },
          offers: {
            // Include all offers so recruiters can manage them
            orderBy: { createdAt: "desc" },
          },
          notes: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { appliedAt: "desc" },
      }),
      prisma.application.count({ where: whereClause }),
    ]);

    return c.json({
      success: true,
      data,
      meta: { total, page, pageSize: take },
    });
  } catch (error) {
    console.error("Applications filter error:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return c.json({ 
      success: false, 
      message: "Failed to fetch applications",
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * Get filtered interviews based on user role
 */
filteredRoutes.get("/interviews", async (c) => {
  try {
    // Try custom auth first (for recruiter/admin - user ID in token)
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Try to find user by ID first (for custom auth - recruiter/admin)
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: {
        candidateProfile: true,
        recruiterProfile: true,
      },
    });

    // If not found by ID, try Clerk authentication (for candidates)
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

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    // Parse pagination
    const query = c.req.query();
    const take = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const skip = (page - 1) * take;

    let whereClause: any = {};

    // Filter based on role
    if (user.role === "CANDIDATE") {
      // CANDIDATE: Interviews linked to their Applications OR standalone interviews linked by candidateId
      if (!user.candidateProfile) {
        return c.json({ 
          success: true, 
          data: [], 
          meta: { total: 0, page, pageSize: take } 
        });
      }
      whereClause = {
        OR: [
          { application: { candidateId: user.candidateProfile.id } },
          { candidateId: user.candidateProfile.id },
        ],
      };
    } else if (user.role === "RECRUITER") {
      // RECRUITER: See interviews for jobs they posted
      if (!user.recruiterProfile) {
        return c.json({ 
          success: true, 
          data: [], 
          meta: { total: 0, page, pageSize: take } 
        });
      }
      // For now, recruiters only see application-linked interviews (standalone interviews are candidate-private)
      whereClause = {
        application: {
          job: {
            recruiterId: user.recruiterProfile.id,
          },
        },
      };
    } else {
      // ADMIN: See all (but they should use admin panel)
      whereClause = {};
    }

    // Additional filter by applicationId if provided
    const applicationId = query.applicationId;
    if (applicationId) {
      whereClause.applicationId = applicationId;
    }

    const [data, total] = await Promise.all([
      prisma.interview.findMany({
        where: whereClause,
        take,
        skip,
        include: {
          application: {
            include: {
              job: {
                include: {
                  company: true,
                },
              },
              candidate: {
                include: {
                  user: true,
                },
              },
            },
          },
          candidate: { include: { user: true } },
          job: { include: { company: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.interview.count({ where: whereClause }),
    ]);

    return c.json({
      success: true,
      data,
      meta: { total, page, pageSize: take },
    });
  } catch (error) {
    console.error("Interviews filter error:", error);
    return c.json({ success: false, message: "Failed to fetch interviews" }, 500);
  }
});

/**
 * Get filtered jobs based on user role
 */
filteredRoutes.get("/jobs", async (c) => {
  try {
    // Try custom auth first (for recruiter/admin - user ID in token)
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Try to find user by ID first (for custom auth - recruiter/admin)
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: {
        recruiterProfile: true,
      },
    });

    // If not found by ID, try Clerk authentication (for candidates)
    if (!user) {
      const result = await getOrCreateClerkUser(c);
      if (result.success && result.user) {
        user = result.user;
        // Re-fetch with recruiterProfile include
        user = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            recruiterProfile: true,
          },
        });
      }
    }

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    // Parse pagination
    const query = c.req.query();
    const take = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const skip = (page - 1) * take;

    // Parse search query
    const searchQuery = (query.q || query.search || "").trim();

    let whereClause: any = {};

    // Filter based on role
    if (user.role === "RECRUITER") {
      // RECRUITER: Only see jobs they posted
      if (!user.recruiterProfile) {
        return c.json({ 
          success: true, 
          data: [], 
          meta: { total: 0, page, pageSize: take } 
        });
      }
      whereClause = {
        recruiterId: user.recruiterProfile.id,
      };
    } else if (user.role === "ADMIN") {
      // ADMIN: See all jobs
      whereClause = {};
    } else {
      // CANDIDATE: See all published jobs (but use public endpoint instead)
      whereClause = {
        status: "PUBLISHED",
      };
    }

    // Add search filter if provided
    if (searchQuery) {
      const searchConditions: any[] = [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
        { requirements: { contains: searchQuery, mode: "insensitive" } },
        { location: { contains: searchQuery, mode: "insensitive" } },
        { company: { name: { contains: searchQuery, mode: "insensitive" } } },
      ];
      
      if (whereClause.OR) {
        // If there's already an OR condition, combine with AND
        whereClause = {
          ...whereClause,
          AND: [
            { OR: whereClause.OR },
            { OR: searchConditions },
          ],
        };
        delete whereClause.OR;
      } else {
        whereClause.OR = searchConditions;
      }
    }

    const [data, total] = await Promise.all([
      prisma.job.findMany({
        where: whereClause,
        take,
        skip,
        include: {
          company: true,
          recruiter: {
            include: {
              user: true,
            },
          },
          skills: {
            include: {
              skill: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.job.count({ where: whereClause }),
    ]);

    // Calculate averageRating for each company
    if (Array.isArray(data) && data.length > 0) {
      const companyIds = [...new Set(data.map((job: any) => job.company?.id).filter(Boolean))];
      
      if (companyIds.length > 0) {
        const reviewStats = await Promise.all(
          companyIds.map(async (companyId: string) => {
            const stats = await prisma.companyReview.aggregate({
              where: { companyId },
              _avg: { rating: true },
              _count: { rating: true },
            });
            return {
              companyId,
              averageRating: stats._avg.rating || 0,
              totalReviews: stats._count.rating || 0,
            };
          })
        );

        const statsMap = new Map(
          reviewStats.map((s) => [s.companyId, { averageRating: s.averageRating, totalReviews: s.totalReviews }])
        );

        // Add rating to each job's company
        data.forEach((job: any) => {
          if (job.company?.id) {
            const stats = statsMap.get(job.company.id);
            if (stats) {
              job.company = {
                ...job.company,
                averageRating: stats.averageRating,
                totalReviews: stats.totalReviews,
              };
            }
          }
        });
      }
    }

    return c.json({
      success: true,
      data,
      meta: { total, page, pageSize: take },
    });
  } catch (error) {
    console.error("Jobs filter error:", error);
    return c.json({ success: false, message: "Failed to fetch jobs" }, 500);
  }
});

/**
 * Update job (for recruiters only)
 */
filteredRoutes.put("/jobs/:id", async (c) => {
  try {
    const { id } = c.req.param();

    // Authentication check
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Get authenticated user
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: { recruiterProfile: true },
    });

    if (!user) {
      const { getOrCreateClerkUser } = await import("../utils/clerkAuth");
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
        { success: false, message: "Only recruiters can update jobs" },
        403
      );
    }

    // Check if job exists and belongs to this recruiter
    const existingJob = await prisma.job.findUnique({
      where: { id },
      select: { recruiterId: true },
    });

    if (!existingJob) {
      return c.json({ success: false, message: "Job not found" }, 404);
    }

    if (existingJob.recruiterId !== user.recruiterProfile.id) {
      return c.json({ success: false, message: "Access denied" }, 403);
    }

    // Get update payload
    const payload = await c.req.json();

    console.log("🔍 Update job payload:", JSON.stringify(payload, null, 2));

    // Filter out immutable fields and nested relations
    // Only allow updating specific fields
    const allowedFields = [
      'title', 'description', 'requirements', 'benefits', 'location', 'locationType',
      'employmentType', 'type', 'salaryMin', 'salaryMax', 'salaryCurrency', 'status',
      'applicationDeadline', 'isUrgent', 'isRemote'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (payload.hasOwnProperty(field)) {
        const value = payload[field];
        // Only include scalar values, not objects/arrays
        if (typeof value !== 'object' || value === null) {
          updateData[field] = value;
        }
      }
    }

    console.log("✅ Filtered update data:", JSON.stringify(updateData, null, 2));

    // Update job
    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData,
      include: {
        company: true,
        recruiter: {
          include: {
            user: true,
          },
        },
        skills: {
          include: {
            skill: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return c.json({ success: true, data: updatedJob });
  } catch (error: any) {
    console.error("Error updating job:", error);
    return c.json(
      {
        success: false,
        message: error.message || "Failed to update job",
      },
      500
    );
  }
});

export default filteredRoutes;
