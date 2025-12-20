import { Hono } from "hono";
import prisma from "../app/db/prisma";
import { getOrCreateClerkUser } from "../utils/clerkAuth";
import { generateInterviewFeedbackWithGemini } from "../app/services/gemini";
import { interviewEvaluationOptionsSchema } from "../app/constants/interviewEvaluation";
import { buildAutoEvaluationOptions } from "../app/services/interviewAutoEvaluationOptions";
import { generateInterviewFeedbackRuleBased } from "../app/services/interviewRuleEvaluator";

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
            job: true,
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
        const owns = recruiterId && interview.application?.job?.recruiterId === recruiterId;
        if (!owns) return c.json({ success: false, message: "Forbidden" }, 403);
      }
    }

    // Return only feedback-related fields (avoid leaking full transcript by default).
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
      include: { exchanges: true, application: true },
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

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Analyze interview error:", error);
    return c.json({ success: false, message: "Failed to analyze interview" }, 500);
  }
});

export default interviewsRoutes;


