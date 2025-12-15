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

    let whereClause: any = {};

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
    } else if (user.role === "RECRUITER") {
      // RECRUITER: See applications for jobs they posted
      if (!user.recruiterProfile) {
        return c.json({ 
          success: true, 
          data: [], 
          meta: { total: 0, page, pageSize: take } 
        });
      }
      whereClause = {
        job: {
          recruiterId: user.recruiterProfile.id,
        },
      };
    } else {
      // ADMIN: See all (but they should use admin panel)
      whereClause = {};
    }

    // Additional filter by jobId if provided (for recruiter viewing specific job applications)
    const jobId = query.jobId;
    if (jobId) {
      whereClause.jobId = jobId;
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
            },
          },
          candidate: {
            include: {
              user: true,
            },
          },
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
    return c.json({ success: false, message: "Failed to fetch applications" }, 500);
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
      // CANDIDATE: Only see their own interviews
      if (!user.candidateProfile) {
        return c.json({ 
          success: true, 
          data: [], 
          meta: { total: 0, page, pageSize: take } 
        });
      }
      whereClause = {
        application: {
          candidateId: user.candidateProfile.id,
        },
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

    let whereClause = {};

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
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.job.count({ where: whereClause }),
    ]);

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

export default filteredRoutes;
