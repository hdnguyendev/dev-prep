import { Hono } from "hono";
import prisma from "../app/db/prisma";
import { getOrCreateClerkUser } from "../utils/clerkAuth";

const savedJobRoutes = new Hono();

// Get saved jobs for authenticated candidate
savedJobRoutes.get("/", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Parse pagination
    const query = c.req.query();
    const take = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const skip = (page - 1) * take;

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

    // Fetch saved jobs with job details
    const [savedJobs, total] = await Promise.all([
      prisma.savedJob.findMany({
        where: { candidateId: user.candidateProfile.id },
        skip,
        take,
        orderBy: { savedAt: "desc" },
        include: {
          job: {
            include: {
              company: true,
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
          },
        },
      }),
      prisma.savedJob.count({
        where: { candidateId: user.candidateProfile.id },
      }),
    ]);

    return c.json({
      success: true,
      data: savedJobs.map((saved) => saved.job),
      meta: {
        total,
        page,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Error fetching saved jobs:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch saved jobs",
      },
      500
    );
  }
});

// Check if job is saved by candidate
savedJobRoutes.get("/check/:jobId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    const { jobId } = c.req.param();

    if (!jobId) {
      return c.json(
        { success: false, message: "Job ID is required" },
        400
      );
    }

    // Find candidate profile
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
        isSaved: false,
      });
    }

    // Check if saved
    const savedJob = await prisma.savedJob.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: user.candidateProfile.id,
          jobId,
        },
      },
    });

    return c.json({
      success: true,
      isSaved: !!savedJob,
    });
  } catch (error) {
    console.error("Error checking saved job:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to check saved job",
      },
      500
    );
  }
});

// Save a job
savedJobRoutes.post("/:jobId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    const { jobId } = c.req.param();

    if (!jobId) {
      return c.json(
        { success: false, message: "Job ID is required" },
        400
      );
    }

    // Find or create candidate profile
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: { candidateProfile: true },
    });

    if (!user) {
      const clerkUserId = token.substring(0, 20);
      user = await prisma.user.findFirst({
        where: { email: { contains: clerkUserId } },
        include: { candidateProfile: true },
      });

      if (!user) {
        try {
          const newUser = await prisma.user.create({
            data: {
              email: `clerk_${clerkUserId}@candidate.temp`,
              passwordHash: "",
              firstName: "Candidate",
              lastName: clerkUserId.substring(0, 8),
              role: "CANDIDATE",
              isVerified: true,
              isActive: true,
            },
          });

          await prisma.candidateProfile.create({
            data: { userId: newUser.id },
          });

          user = await prisma.user.findUnique({
            where: { id: newUser.id },
            include: { candidateProfile: true },
          });
        } catch (createError) {
          console.error("Failed to create candidate user:", createError);
          return c.json(
            { success: false, message: "Failed to initialize user profile" },
            500
          );
        }
      }
    }

    if (!user || !user.candidateProfile) {
      return c.json(
        { success: false, message: "Candidate profile not found" },
        404
      );
    }

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return c.json({ success: false, message: "Job not found" }, 404);
    }

    // Save job (upsert to avoid duplicates)
    const savedJob = await prisma.savedJob.upsert({
      where: {
        candidateId_jobId: {
          candidateId: user.candidateProfile.id,
          jobId,
        },
      },
      create: {
        candidateId: user.candidateProfile.id,
        jobId,
      },
      update: {},
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    return c.json({
      success: true,
      message: "Job saved successfully",
      data: savedJob,
    });
  } catch (error) {
    console.error("Error saving job:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to save job",
      },
      500
    );
  }
});

// Unsave a job
savedJobRoutes.delete("/:jobId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    const { jobId } = c.req.param();

    if (!jobId) {
      return c.json(
        { success: false, message: "Job ID is required" },
        400
      );
    }

    // Find candidate profile
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

    // Delete saved job
    await prisma.savedJob.delete({
      where: {
        candidateId_jobId: {
          candidateId: user.candidateProfile.id,
          jobId,
        },
      },
    });

    return c.json({
      success: true,
      message: "Job unsaved successfully",
    });
  } catch (error) {
    console.error("Error unsaving job:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to unsave job",
      },
      500
    );
  }
});

export default savedJobRoutes;
