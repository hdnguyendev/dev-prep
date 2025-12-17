import { Hono } from "hono";
import prisma from "../app/db/prisma";
import { getOrCreateClerkUser } from "../utils/clerkAuth";

const applicationRoutes = new Hono();

const APPLICATION_STATUSES = [
  "APPLIED",
  "REVIEWING",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEWED",
  "OFFER_SENT",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
];

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

/**
 * Update application status (used by recruiter/admin). Adds an entry to ApplicationHistory.
 */
applicationRoutes.patch("/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { status, note } = body as { status?: string; note?: string };

    if (!status || !APPLICATION_STATUSES.includes(status)) {
      return c.json(
        { success: false, message: "Invalid or missing status" },
        400
      );
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status },
      include: {
        job: { include: { company: true } },
        candidate: { include: { user: true } },
      },
    });

    // Log history (best-effort; do not fail request if history fails)
    try {
      await prisma.applicationHistory.create({
        data: {
          applicationId: id,
          status,
          note: note || null,
          changedBy: "SYSTEM", // In future: replace with authenticated recruiter/admin ID
        },
      });
    } catch (historyError) {
      console.error("Failed to create application history:", historyError);
    }

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Application status update error:", error);
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update application status",
      },
      500
    );
  }
});
