import { Hono } from "hono";
import prisma from "../app/db/prisma";
import { getOrCreateClerkUser } from "../utils/clerkAuth";

const applicationRoutes = new Hono();

/**
 * Create application for authenticated candidate
 * Automatically gets candidateId from Clerk user
 */
applicationRoutes.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { jobId, resumeUrl, coverLetter, status = "APPLIED" } = body;

    // Validate required fields
    if (!jobId) {
      return c.json({
        success: false,
        message: "jobId is required"
      }, 400);
    }

    // Get or create Clerk user with helper
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({
        success: false,
        message: result.error || "Authentication failed"
      }, 401);
    }

    const user = result.user;
    const candidateProfile = user.candidateProfile!

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return c.json({
        success: false,
        message: "Job not found"
      }, 404);
    }

    // Check if already applied
    const existingApplication = await prisma.application.findUnique({
      where: {
        jobId_candidateId: {
          jobId,
          candidateId: candidateProfile.id,
        },
      },
    });

    if (existingApplication) {
      return c.json({
        success: false,
        message: "You have already applied for this job"
      }, 409);
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        jobId,
        candidateId: candidateProfile.id,
        resumeUrl,
        coverLetter,
        status,
      },
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
    });

    return c.json({
      success: true,
      message: "Application submitted successfully",
      data: application,
    }, 201);
  } catch (error) {
    console.error("Application creation error:", error);
    return c.json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to create application"
    }, 500);
  }
});

export default applicationRoutes;
