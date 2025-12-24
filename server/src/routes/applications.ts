import { Hono } from "hono";
import prisma from "../app/db/prisma";
import {
  APPROVED_APPLICATION_STATUSES,
  sendApplicationStatusEmail,
} from "../app/services/email";
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

async function getUserFromAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  // Recruiter/Admin custom auth: token is user.id
  const user = await prisma.user.findUnique({
    where: { id: token },
    include: { recruiterProfile: true, candidateProfile: true },
  });
  return user;
}

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
        candidate: {
          include: {
            user: {
              select: {
                email: true,
                notificationEmail: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
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

    // Gửi email cho ứng viên nếu status mới nằm trong nhóm "được duyệt" hoặc bị từ chối
    try {
      if (
        (APPROVED_APPLICATION_STATUSES.includes(status as any) ||
          status === "REJECTED") &&
        updated.candidate?.user
      ) {
        const targetEmail =
          updated.candidate.user.notificationEmail || updated.candidate.user.email;

        if (!targetEmail) {
          console.warn(
            "[EMAIL:ApplicationStatus] Missing both notificationEmail and email for user"
          );
          return;
        }

        await sendApplicationStatusEmail({
          to: targetEmail,
          candidateName: `${updated.candidate.user.firstName} ${updated.candidate.user.lastName}`.trim(),
          jobTitle: updated.job?.title ?? undefined,
          newStatus: status as any,
        });
      }
    } catch (emailError) {
      // Không được làm fail request nếu gửi email lỗi
      console.error("Failed to send application status email:", emailError);
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

/**
 * Recruiter notes on an application
 * - Recruiter can add/edit/delete their own notes
 */
applicationRoutes.get("/:id/notes", async (c) => {
  try {
    const { id } = c.req.param();
    const user = await getUserFromAuth(c);
    if (!user) return c.json({ success: false, message: "Not authenticated" }, 401);
    if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
      return c.json({ success: false, message: "Forbidden" }, 403);
    }

    const app = await prisma.application.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!app) return c.json({ success: false, message: "Application not found" }, 404);

    if (user.role === "RECRUITER") {
      if (!user.recruiterProfile || app.job.recruiterId !== user.recruiterProfile.id) {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }
    }

    const notes = await prisma.applicationNote.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ success: true, data: notes });
  } catch (error) {
    console.error("Application notes list error:", error);
    return c.json({ success: false, message: "Failed to load notes" }, 500);
  }
});

applicationRoutes.post("/:id/notes", async (c) => {
  try {
    const { id } = c.req.param();
    const user = await getUserFromAuth(c);
    if (!user) return c.json({ success: false, message: "Not authenticated" }, 401);
    if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
      return c.json({ success: false, message: "Forbidden" }, 403);
    }

    const body = await c.req.json();
    const content = (body?.content as string | undefined)?.trim();
    if (!content) return c.json({ success: false, message: "content is required" }, 400);

    const app = await prisma.application.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!app) return c.json({ success: false, message: "Application not found" }, 404);

    let authorId = "SYSTEM";
    if (user.role === "RECRUITER") {
      if (!user.recruiterProfile || app.job.recruiterId !== user.recruiterProfile.id) {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }
      authorId = user.recruiterProfile.id;
    }

    const created = await prisma.applicationNote.create({
      data: { applicationId: id, authorId, content },
    });
    return c.json({ success: true, data: created }, 201);
  } catch (error) {
    console.error("Application note create error:", error);
    return c.json({ success: false, message: "Failed to create note" }, 500);
  }
});

applicationRoutes.put("/:id/notes/:noteId", async (c) => {
  try {
    const { id, noteId } = c.req.param();
    const user = await getUserFromAuth(c);
    if (!user) return c.json({ success: false, message: "Not authenticated" }, 401);
    if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
      return c.json({ success: false, message: "Forbidden" }, 403);
    }

    const body = await c.req.json();
    const content = (body?.content as string | undefined)?.trim();
    if (!content) return c.json({ success: false, message: "content is required" }, 400);

    const app = await prisma.application.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!app) return c.json({ success: false, message: "Application not found" }, 404);

    const note = await prisma.applicationNote.findUnique({ where: { id: noteId } });
    if (!note || note.applicationId !== id) {
      return c.json({ success: false, message: "Note not found" }, 404);
    }

    if (user.role === "RECRUITER") {
      if (!user.recruiterProfile || app.job.recruiterId !== user.recruiterProfile.id) {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }
      if (note.authorId !== user.recruiterProfile.id) {
        return c.json({ success: false, message: "Can only edit your own notes" }, 403);
      }
    }

    const updated = await prisma.applicationNote.update({
      where: { id: noteId },
      data: { content },
    });
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Application note update error:", error);
    return c.json({ success: false, message: "Failed to update note" }, 500);
  }
});

applicationRoutes.delete("/:id/notes/:noteId", async (c) => {
  try {
    const { id, noteId } = c.req.param();
    const user = await getUserFromAuth(c);
    if (!user) return c.json({ success: false, message: "Not authenticated" }, 401);
    if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
      return c.json({ success: false, message: "Forbidden" }, 403);
    }

    const app = await prisma.application.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!app) return c.json({ success: false, message: "Application not found" }, 404);

    const note = await prisma.applicationNote.findUnique({ where: { id: noteId } });
    if (!note || note.applicationId !== id) {
      return c.json({ success: false, message: "Note not found" }, 404);
    }

    if (user.role === "RECRUITER") {
      if (!user.recruiterProfile || app.job.recruiterId !== user.recruiterProfile.id) {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }
      if (note.authorId !== user.recruiterProfile.id) {
        return c.json({ success: false, message: "Can only delete your own notes" }, 403);
      }
    }

    const deleted = await prisma.applicationNote.delete({ where: { id: noteId } });
    return c.json({ success: true, data: deleted });
  } catch (error) {
    console.error("Application note delete error:", error);
    return c.json({ success: false, message: "Failed to delete note" }, 500);
  }
});
