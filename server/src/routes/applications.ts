import { Hono } from "hono";
import prisma from "../app/db/prisma";
import {
  APPROVED_APPLICATION_STATUSES,
  sendApplicationStatusEmail,
} from "../app/services/email";
import { getOrCreateClerkUser } from "../utils/clerkAuth";
import { randomBytes } from "crypto";
import { canCandidatePerformInterview } from "../app/services/membership";

const applicationRoutes = new Hono();

const APPLICATION_STATUSES = [
  "APPLIED",
  "REVIEWING",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEWED",
  "OFFER_SENT",
  "OFFER_ACCEPTED",
  "OFFER_REJECTED",
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
 * 
 * Recruiter can only change status following this flow:
 * APPLIED => REVIEWING => SHORTLISTED => INTERVIEW_SCHEDULED => REJECTED
 * 
 * System-managed statuses (cannot be changed by recruiter):
 * - INTERVIEWED (auto-set after interview completion)
 * - OFFER_SENT (auto-set when offer is sent)
 * - OFFER_ACCEPTED (auto-set when candidate accepts offer)
 * - OFFER_REJECTED (auto-set when candidate rejects offer)
 * - HIRED (cannot be set manually by recruiter)
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

    // Get current application to check current status
    const currentApp = await prisma.application.findUnique({
      where: { id },
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

    if (!currentApp) {
      return c.json(
        { success: false, message: "Application not found" },
        404
      );
    }

    // Get user to check role
    const user = await getUserFromAuth(c);
    if (!user) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // System-managed statuses that recruiters cannot manually change
    const SYSTEM_MANAGED_STATUSES = [
      "INTERVIEWED",      // Auto-set after interview completion
      "OFFER_SENT",       // Auto-set when offer is sent
      "OFFER_ACCEPTED",   // Auto-set when candidate accepts offer
      "OFFER_REJECTED",   // Auto-set when candidate rejects offer
      "HIRED",            // Cannot be set manually by recruiter
    ];

    // If recruiter tries to set a system-managed status, reject
    if (user.role === "RECRUITER" && SYSTEM_MANAGED_STATUSES.includes(status)) {
      return c.json(
        { 
          success: false, 
          message: `Status "${status}" is automatically managed by the system and cannot be changed manually. This status is set automatically when: ${status === "INTERVIEWED" ? "an interview is completed" : status === "OFFER_SENT" ? "an offer is sent" : status === "OFFER_ACCEPTED" ? "a candidate accepts an offer" : status === "OFFER_REJECTED" ? "a candidate rejects an offer" : status === "HIRED" ? "a candidate accepts an offer (final status)" : "system event occurs"}.` 
        },
        403
      );
    }

    // Define allowed status transitions for recruiters
    // HIRED is removed - recruiter cannot manually set HIRED status
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      "APPLIED": ["REVIEWING", "REJECTED"],
      "REVIEWING": ["SHORTLISTED", "REJECTED"],
      "SHORTLISTED": ["INTERVIEW_SCHEDULED", "REJECTED"],
      "INTERVIEW_SCHEDULED": ["REJECTED"], // Can only reject, cannot hire directly
      // Allow transitions from system-managed statuses back to recruiter-managed ones
      "INTERVIEWED": ["REJECTED"], // After interview, recruiter can only reject
      "OFFER_SENT": ["REJECTED"], // After offer sent, recruiter can only reject
      "OFFER_ACCEPTED": ["REJECTED"], // After offer accepted, recruiter can only reject (HIRED is final, set automatically)
      "OFFER_REJECTED": ["REJECTED"], // After offer rejected, can only reject application
    };

    // Validate status transition for recruiters
    if (user.role === "RECRUITER") {
      const currentStatus = currentApp.status;
      const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
      
      if (!allowedNextStatuses.includes(status)) {
        return c.json(
          { 
            success: false, 
            message: `Invalid status transition. Current status is "${currentStatus}". Allowed next statuses are: ${allowedNextStatuses.join(", ")}.` 
          },
          400
        );
      }
    }

    // ADMIN can change to any status (no restrictions)
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
          changedBy: user.role === "ADMIN" ? user.id : (user.recruiterProfile?.id || user.id || "SYSTEM"),
        },
      });
    } catch (historyError) {
      console.error("Failed to create application history:", historyError);
    }

    // Automatically create Interview when status = INTERVIEW_SCHEDULED
    let createdInterview: { accessCode: string; sessionUrl: string } | null = null;
    if (status === "INTERVIEW_SCHEDULED") {
      try {
        // Check if interview already exists (avoid duplicates)
        const existingInterview = await prisma.interview.findFirst({
          where: {
            applicationId: id,
            status: "PENDING",
          },
        });

        if (!existingInterview) {
          // Generate unique access code (8 characters)
          let accessCode: string;
          let isUnique = false;
          while (!isUnique) {
            accessCode = randomBytes(4).toString("hex").toUpperCase().slice(0, 8);
            const existing = await prisma.interview.findUnique({
              where: { accessCode },
            });
            if (!existing) {
              isUnique = true;
            }
          }

          // Get job info to retrieve interviewQuestions
          const applicationWithJob = await prisma.application.findUnique({
            where: { id },
            include: {
              job: true,
              candidate: true,
            },
          });

          if (applicationWithJob?.job && applicationWithJob?.candidate) {
            // Create sessionUrl (interview link)
            const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
            const sessionUrl = `${baseUrl}/interview?accessCode=${accessCode}`;

            // Expiration time: 7 days from now
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            // Create interview
            await prisma.interview.create({
              data: {
                applicationId: id,
                candidateId: applicationWithJob.candidate.id,
                jobId: applicationWithJob.job.id,
                title: `Round 1: AI Screening - ${applicationWithJob.job.title}`,
                type: "AI_VOICE",
                status: "PENDING",
                accessCode: accessCode!,
                sessionUrl,
                expiresAt,
              },
            });

            createdInterview = {
              accessCode: accessCode!,
              sessionUrl,
            };

            console.log(`[Interview] Created interview for application ${id} with access code ${accessCode}`);
          }
        } else {
          // If interview already exists, get info to send email
          createdInterview = {
            accessCode: existingInterview.accessCode,
            sessionUrl: existingInterview.sessionUrl || "",
          };
        }
      } catch (interviewError) {
        // Don't fail request if interview creation fails
        console.error("Failed to create interview:", interviewError);
      }
    }

    // Send email to candidate if new status is in "approved" group or rejected
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

        // If status is INTERVIEW_SCHEDULED and has interview, include access code and link
        const emailPayload: any = {
          to: targetEmail,
          candidateName: `${updated.candidate.user.firstName} ${updated.candidate.user.lastName}`.trim(),
          jobTitle: updated.job?.title ?? undefined,
          newStatus: status as any,
        };

        if (status === "INTERVIEW_SCHEDULED" && createdInterview) {
          emailPayload.interviewAccessCode = createdInterview.accessCode;
          emailPayload.interviewLink = createdInterview.sessionUrl;
        }

        await sendApplicationStatusEmail(emailPayload);
      }
    } catch (emailError) {
      // Don't fail request if email sending fails
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
 * Candidate withdraws their own application
 * POST /applications/:id/withdraw
 */
applicationRoutes.post("/:id/withdraw", async (c) => {
  try {
    const { id } = c.req.param();
    
    // Get or create Clerk user with helper
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({
        success: false,
        message: result.error || "Authentication failed"
      }, 401);
    }

    const user = result.user;
    
    // Only candidates can withdraw their own applications
    if (user.role !== "CANDIDATE" || !user.candidateProfile) {
      return c.json({ success: false, message: "Only candidates can withdraw applications" }, 403);
    }

    // Get application
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: { include: { company: true } },
      },
    });

    if (!application) {
      return c.json({ success: false, message: "Application not found" }, 404);
    }

    // Verify candidate owns this application
    if (application.candidateId !== user.candidateProfile.id) {
      return c.json({ success: false, message: "Forbidden" }, 403);
    }

    // Check if already withdrawn or in final states
    const finalStates = ["WITHDRAWN", "HIRED", "OFFER_ACCEPTED"];
    if (finalStates.includes(application.status)) {
      return c.json(
        { success: false, message: `Cannot withdraw application with status: ${application.status}` },
        400
      );
    }

    // Update application status to WITHDRAWN
    const updated = await prisma.application.update({
      where: { id },
      data: { status: "WITHDRAWN" },
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

    // Create history entry
    try {
      await prisma.applicationHistory.create({
        data: {
          applicationId: id,
          status: "WITHDRAWN",
          note: "Application withdrawn by candidate",
          changedBy: user.id,
        },
      });
    } catch (historyError) {
      console.error("Failed to create application history:", historyError);
    }

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Withdraw application error:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to withdraw application",
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
