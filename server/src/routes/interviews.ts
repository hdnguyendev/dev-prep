import { Hono } from "hono";
import prisma from "../app/db/prisma";
import { getOrCreateClerkUser } from "../utils/clerkAuth";
import { generateInterviewFeedbackWithGemini } from "../app/services/gemini";
import { interviewEvaluationOptionsSchema } from "../app/constants/interviewEvaluation";
import { buildAutoEvaluationOptions } from "../app/services/interviewAutoEvaluationOptions";
import { generateInterviewFeedbackRuleBased } from "../app/services/interviewRuleEvaluator";
import { sendInterviewCompletedEmailToRecruiter } from "../app/services/email";
import { canCandidatePerformInterview } from "../app/services/membership";

const interviewsRoutes = new Hono();

const resolveAuthedUser = async (c: any) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  // Try custom auth (recruiter/admin)
  const custom = await prisma.user.findUnique({
    where: { id: token },
    include: { candidateProfile: true, recruiterProfile: true },
  });
  if (custom) return custom;

  // Clerk auth fallback (candidate)
  const result = await getOrCreateClerkUser(c);
  if (!result.success || !result.user) return null;
  const clerkUser = await prisma.user.findUnique({
    where: { id: result.user.id },
    include: { candidateProfile: true, recruiterProfile: true },
  });
  return clerkUser;
};

/**
 * Generate interview feedback via Gemini and persist results:
 * - Interview: status COMPLETED, overallScore, summary, recommendation, aiAnalysisData
 * - InterviewExchange: per-question score + feedback
 */
interviewsRoutes.get("/interviews/:id/feedback", async (c) => {
  try {
    const { id } = c.req.param();
    const user = await resolveAuthedUser(c);
    if (!user) return c.json({ success: false, message: "Not authenticated" }, 401);

    const interview = await prisma.interview.findUnique({
      where: { id },
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
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        candidate: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        job: {
          include: {
            company: true,
          },
        },
        exchanges: { orderBy: { orderIndex: "asc" } },
      },
    });
    if (!interview) return c.json({ success: false, message: "Interview not found" }, 404);

    // Authorization: same as /analyze
    if (user.role !== "ADMIN") {
      if (user.role === "CANDIDATE") {
        const candidateId = user.candidateProfile?.id;
        const ownsStandalone = candidateId && interview.candidateId === candidateId;
        const ownsApplication = candidateId && interview.application?.candidateId === candidateId;
        if (!ownsStandalone && !ownsApplication) return c.json({ success: false, message: "Forbidden" }, 403);
      }
      if (user.role === "RECRUITER") {
        const recruiterId = user.recruiterProfile?.id;
        // Recruiter can view interview if:
        // 1. Interview is linked to an application and the job belongs to the recruiter
        // 2. Interview is standalone but linked to a job that belongs to the recruiter
        const ownsViaApplication = recruiterId && interview.application?.job?.recruiterId === recruiterId;
        const ownsViaJob = recruiterId && interview.job?.recruiterId === recruiterId;
        if (!ownsViaApplication && !ownsViaJob) {
          return c.json({ 
            success: false, 
            message: "You don't have permission to view this interview feedback. This interview is not associated with any job you manage." 
          }, 403);
        }
      }
    }

    // Return feedback-related fields with context (candidate, job info for recruiters)
    const data = {
      id: interview.id,
      status: interview.status,
      overallScore: interview.overallScore,
      summary: interview.summary,
      recommendation: interview.recommendation,
      aiAnalysisData: interview.aiAnalysisData,
      perQuestion: interview.exchanges.map((e) => ({
        orderIndex: e.orderIndex,
        questionText: e.questionText,
        questionCategory: e.questionCategory,
        score: e.score,
        feedback: e.feedback,
      })),
      // Add context for recruiters
      candidate: interview.application?.candidate?.user
        ? {
            name: `${interview.application.candidate.user.firstName || ""} ${interview.application.candidate.user.lastName || ""}`.trim() || interview.application.candidate.user.email,
            email: interview.application.candidate.user.email,
          }
        : interview.candidate?.user
        ? {
            name: `${interview.candidate.user.firstName || ""} ${interview.candidate.user.lastName || ""}`.trim() || interview.candidate.user.email,
            email: interview.candidate.user.email,
          }
        : null,
      job: interview.application?.job
        ? {
            title: interview.application.job.title,
            company: interview.application.job.company?.name,
          }
        : interview.job
        ? {
            title: interview.job.title,
            company: interview.job.company?.name,
          }
        : null,
      createdAt: interview.createdAt,
      startedAt: interview.startedAt,
      endedAt: interview.endedAt,
    };

    return c.json({ success: true, data });
  } catch (error) {
    console.error("Get interview feedback error:", error);
    return c.json({ success: false, message: "Failed to get interview feedback" }, 500);
  }
});

interviewsRoutes.post("/interviews/:id/analyze", async (c) => {
  try {
    const { id } = c.req.param();
    const user = await resolveAuthedUser(c);
    if (!user) return c.json({ success: false, message: "Not authenticated" }, 401);

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            job: {
              include: {
                skills: { include: { skill: true } },
                categories: { include: { category: true } },
              },
            },
          },
        },
        job: {
          include: {
            skills: { include: { skill: true } },
            categories: { include: { category: true } },
          },
        },
        exchanges: { orderBy: { orderIndex: "asc" } },
      },
    });
    if (!interview) return c.json({ success: false, message: "Interview not found" }, 404);

    // Authorization:
    // - Candidate: must own (application-linked or standalone by candidateId)
    // - Recruiter: must own the job for application-linked interviews
    // - Admin: allow
    if (user.role !== "ADMIN") {
      if (user.role === "CANDIDATE") {
        const candidateId = user.candidateProfile?.id;
        const ownsStandalone = candidateId && interview.candidateId === candidateId;
        const ownsApplication = candidateId && interview.application?.candidateId === candidateId;
        if (!ownsStandalone && !ownsApplication) return c.json({ success: false, message: "Forbidden" }, 403);
      }
      if (user.role === "RECRUITER") {
        const recruiterId = user.recruiterProfile?.id;
        const owns = recruiterId && interview.application?.job?.recruiterId === recruiterId;
        if (!owns) return c.json({ success: false, message: "Forbidden" }, 403);
      }
    }

    const transcript = interview.fullTranscript || "";
    if (!transcript.trim()) {
      return c.json({ success: false, message: "Interview transcript is empty" }, 400);
    }

    const turns = interview.exchanges.map((e) => ({
      orderIndex: e.orderIndex,
      questionText: e.questionText,
      questionCategory: e.questionCategory,
      answerText: e.answerText,
    }));

    // Optional: allow client to pass evaluation options (keywords/weights/language).
    // Backward compatible: if body is empty or invalid JSON, we ignore it.
    let evaluationOptions: unknown = undefined;
    try {
      const body = (await c.req.json().catch(() => null)) as any;
      evaluationOptions = body?.evaluationOptions ?? body?.options ?? undefined;
    } catch {
      evaluationOptions = undefined;
    }

    const parsedOptions = interviewEvaluationOptionsSchema.safeParse(evaluationOptions || {});
    const clientOptions = parsedOptions.success ? parsedOptions.data : undefined;

    // Auto-fill options from JD/job context to make rule-based evaluation more relevant by default.
    // Client-provided options override auto-generated fields.
    const jobForAuto = interview.application?.job || interview.job || null;
    const autoOptions = buildAutoEvaluationOptions({ transcript, job: jobForAuto });
    const mergedOptions = {
      ...autoOptions,
      ...(clientOptions || {}),
      // Merge keywords (client overrides if provided, else keep auto).
      mustHaveKeywords: clientOptions?.mustHaveKeywords ?? autoOptions.mustHaveKeywords,
      niceToHaveKeywords: clientOptions?.niceToHaveKeywords ?? autoOptions.niceToHaveKeywords,
      // Merge synonyms (merge objects; client wins on key conflicts).
      synonyms: {
        ...(autoOptions.synonyms || {}),
        ...((clientOptions as any)?.synonyms || {}),
      },
    };

    const evaluatorMode = String(process.env.INTERVIEW_EVALUATOR_MODE || "RULE_BASED").toUpperCase();
    const feedback =
      evaluatorMode === "GEMINI"
        ? await generateInterviewFeedbackWithGemini({ transcript, turns })
        : await generateInterviewFeedbackRuleBased({ transcript, turns, options: mergedOptions });

    // Persist interview summary + per-question scoring
    const updated = await prisma.interview.update({
      where: { id: interview.id },
      data: {
        status: "COMPLETED",
        overallScore: feedback.overallScore,
        summary: feedback.summary || null,
        recommendation: feedback.recommendation,
        aiAnalysisData: feedback as any,
      },
      include: {
        exchanges: true,
        application: {
          include: {
            job: {
              include: {
                recruiter: {
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
                company: true,
              },
            },
            candidate: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Update per-question scores (best-effort)
    await Promise.allSettled(
      feedback.perQuestion.map((pq) =>
        prisma.interviewExchange.updateMany({
          where: { interviewId: interview.id, orderIndex: pq.orderIndex },
          data: {
            score: pq.score,
            feedback: pq.feedback || null,
          },
        })
      )
    );

    // Automatically change application status to INTERVIEWED if interview has applicationId
    if (updated.applicationId && updated.application) {
      try {
        // Only update if current status is INTERVIEW_SCHEDULED
        const currentApp = await prisma.application.findUnique({
          where: { id: updated.applicationId },
        });

        if (currentApp && currentApp.status === "INTERVIEW_SCHEDULED") {
          await prisma.application.update({
            where: { id: updated.applicationId },
            data: { status: "INTERVIEWED" },
          });

          // Log history
          try {
            await prisma.applicationHistory.create({
              data: {
                applicationId: updated.applicationId,
                status: "INTERVIEWED",
                note: "Automatically changed after interview completion",
                changedBy: "SYSTEM",
              },
            });
          } catch (historyError) {
            console.error("Failed to create application history:", historyError);
          }

          // Send notification email to recruiter
          if (updated.application.job?.recruiter?.user) {
            const recruiterUser = updated.application.job.recruiter.user;
            const targetEmail = recruiterUser.notificationEmail || recruiterUser.email;

            if (targetEmail) {
              try {
                await sendInterviewCompletedEmailToRecruiter({
                  to: targetEmail,
                  recruiterName: `${recruiterUser.firstName || ''} ${recruiterUser.lastName || ''}`.trim() || "Recruiter",
                  candidateName: `${updated.application.candidate?.user?.firstName || ''} ${updated.application.candidate?.user?.lastName || ''}`.trim() || updated.application.candidate?.user?.email || "Candidate",
                  jobTitle: updated.application.job.title,
                  companyName: updated.application.job.company?.name,
                  interviewId: updated.id,
                  overallScore: feedback.overallScore,
                  recommendation: feedback.recommendation,
                  applicationId: updated.applicationId,
                });
              } catch (emailError) {
                console.error("Failed to send interview completed email to recruiter:", emailError);
              }
            }
          }
        }
      } catch (appUpdateError) {
        // Don't fail request if application update fails
        console.error("Failed to update application status:", appUpdateError);
      }
    }

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Analyze interview error:", error);
    return c.json({ success: false, message: "Failed to analyze interview" }, 500);
  }
});

/**
 * Get interview information by access code (for candidate to join interview)
 */
interviewsRoutes.get("/interviews/access-code/:accessCode", async (c) => {
  try {
    const { accessCode } = c.req.param();

    if (!accessCode || accessCode.trim().length === 0) {
      return c.json({ success: false, message: "Access code is required" }, 400);
    }

    const interview = await prisma.interview.findUnique({
      where: { accessCode: accessCode.toUpperCase() },
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
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        job: {
          include: {
            company: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
        candidate: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!interview) {
      return c.json({ success: false, message: "Interview not found" }, 404);
    }

    // Check if application status is already INTERVIEWED (prevent re-interviewing)
    if (interview.applicationId && interview.application?.status === "INTERVIEWED") {
      return c.json(
        {
          success: false,
          message: "This interview has already been completed. The application status is already INTERVIEWED.",
          data: { ...interview, alreadyCompleted: true },
        },
        403
      );
    }

    // Check expiration
    if (new Date(interview.expiresAt) < new Date()) {
      return c.json(
        {
          success: false,
          message: "Interview has expired",
          data: { ...interview, expired: true },
        },
        410
      );
    }

    // Check status
    if (interview.status === "COMPLETED" || interview.status === "FAILED") {
      return c.json({
        success: true,
        data: { ...interview, completed: true },
      });
    }

    return c.json({ success: true, data: interview });
  } catch (error) {
    console.error("Get interview by access code error:", error);
    return c.json(
      {
        success: false,
        message: "Failed to get interview",
      },
      500
    );
  }
});

/**
 * Manual trigger cleanup job (for testing/admin)
 * POST /interviews/cleanup-expired
 */
interviewsRoutes.post("/interviews/cleanup-expired", async (c) => {
  try {
    const user = await resolveAuthedUser(c);
    if (!user) return c.json({ success: false, message: "Not authenticated" }, 401);
    
    // Only admin can trigger manually
    if (user.role !== "ADMIN") {
      return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
    }

    const { cleanupExpiredInterviewsJob } = await import("../app/jobs/cleanupExpiredInterviews.job");
    const result = await cleanupExpiredInterviewsJob();

    return c.json({
      success: true,
      message: "Cleanup job completed",
      data: result,
    });
  } catch (error) {
    console.error("Manual cleanup trigger error:", error);
    return c.json(
      {
        success: false,
        message: "Failed to run cleanup job",
      },
      500
    );
  }
});

export default interviewsRoutes;


