import { Hono } from "hono";
import prisma from "../app/db/prisma";
import { sendOfferEmail, sendOfferAcceptedEmailToRecruiter, sendOfferRejectedEmailToRecruiter, sendApplicationStatusEmail } from "../app/services/email";

const offerRoutes = new Hono();

/**
 * Get offers for an application
 * GET /offers?applicationId=xxx
 */
offerRoutes.get("/offers", async (c) => {
  try {
    const query = c.req.query();
    const applicationId = query.applicationId;

    if (!applicationId) {
      return c.json({ success: false, message: "applicationId is required" }, 400);
    }

    // Get user from auth
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: token },
      include: { candidateProfile: true, recruiterProfile: true },
    });

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    // Check authorization
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { recruiter: true, company: true } },
        candidate: true,
      },
    });

    if (!application) {
      return c.json({ success: false, message: "Application not found" }, 404);
    }

    // Authorization check
    if (user.role === "CANDIDATE") {
      const candidateId = user.candidateProfile?.id;
      if (candidateId !== application.candidateId) {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }
    } else if (user.role === "RECRUITER") {
      const recruiterId = user.recruiterProfile?.id;
      if (recruiterId !== application.job?.recruiterId) {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }
    } else if (user.role !== "ADMIN") {
      return c.json({ success: false, message: "Forbidden" }, 403);
    }

    const offers = await prisma.offer.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ success: true, data: offers });
  } catch (error) {
    console.error("Get offers error:", error);
    return c.json({ success: false, message: "Failed to get offers" }, 500);
  }
});

/**
 * Create and send an offer
 * POST /offers
 */
offerRoutes.post("/offers", async (c) => {
  try {
    const body = await c.req.json();
    const {
      applicationId,
      title,
      salaryMin,
      salaryMax,
      salaryCurrency = "USD",
      employmentType,
      startDate,
      expirationDate,
      location,
      isRemote = false,
      description,
      benefits,
      terms,
    } = body;

    if (!applicationId || !title || !expirationDate) {
      return c.json(
        { success: false, message: "applicationId, title, and expirationDate are required" },
        400
      );
    }

    // Get user from auth
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: token },
      include: { recruiterProfile: true },
    });

    if (!user || (user.role !== "RECRUITER" && user.role !== "ADMIN")) {
      return c.json({ success: false, message: "Only recruiters can create offers" }, 403);
    }

    // Check application exists and belongs to recruiter's job
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { recruiter: true, company: true } },
        candidate: { include: { user: true } },
      },
    });

    if (!application) {
      return c.json({ success: false, message: "Application not found" }, 404);
    }

    if (user.role === "RECRUITER") {
      const recruiterId = user.recruiterProfile?.id;
      if (recruiterId !== application.job?.recruiterId) {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }
    }

    // Create offer
    const offer = await prisma.offer.create({
      data: {
        applicationId,
        title,
        salaryMin: salaryMin ? parseFloat(salaryMin) : null,
        salaryMax: salaryMax ? parseFloat(salaryMax) : null,
        salaryCurrency,
        employmentType,
        startDate: startDate ? new Date(startDate) : null,
        expirationDate: new Date(expirationDate),
        location,
        isRemote,
        description,
        benefits,
        terms,
        sentBy: user.id,
        status: "PENDING",
      },
    });

    // Update application status to OFFER_SENT
    try {
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: "OFFER_SENT" },
      });

      // Log history
      await prisma.applicationHistory.create({
        data: {
          applicationId,
          status: "OFFER_SENT",
          note: `Offer sent: ${title}`,
          changedBy: user.id,
        },
      });
    } catch (err) {
      console.error("Failed to update application status:", err);
    }

    // Send detailed offer email to candidate
    try {
      if (application.candidate?.user) {
        const targetEmail =
          application.candidate.user.notificationEmail || application.candidate.user.email;
        if (targetEmail) {
          await sendOfferEmail({
            to: targetEmail,
            candidateName: `${application.candidate.user.firstName || ""} ${application.candidate.user.lastName || ""}`.trim(),
            jobTitle: application.job?.title ?? "",
            companyName: application.job?.company?.name ?? null,
            offerTitle: title,
            salaryMin: offer.salaryMin,
            salaryMax: offer.salaryMax,
            salaryCurrency: offer.salaryCurrency,
            employmentType: offer.employmentType,
            startDate: offer.startDate ? offer.startDate.toISOString() : null,
            expirationDate: offer.expirationDate.toISOString(),
            location: offer.location,
            isRemote: offer.isRemote,
            description: offer.description,
            benefits: offer.benefits,
            terms: offer.terms,
            offerId: offer.id,
          });
        }
      }
    } catch (emailError) {
      console.error("Failed to send offer email:", emailError);
    }

    return c.json({ success: true, data: offer });
  } catch (error) {
    console.error("Create offer error:", error);
    return c.json({ success: false, message: "Failed to create offer" }, 500);
  }
});

/**
 * Update offer (recruiter can update pending offers)
 * PUT /offers/:id
 */
offerRoutes.put("/offers/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    // Get user from auth
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: token },
      include: { recruiterProfile: true },
    });

    if (!user || (user.role !== "RECRUITER" && user.role !== "ADMIN")) {
      return c.json({ success: false, message: "Only recruiters can update offers" }, 403);
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            job: { include: { recruiter: true, company: true } },
          },
        },
      },
    });

    if (!offer) {
      return c.json({ success: false, message: "Offer not found" }, 404);
    }

    // Authorization check
    if (user.role === "RECRUITER") {
      const recruiterId = user.recruiterProfile?.id;
      if (recruiterId !== offer.application?.job?.recruiterId) {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }
    }

    // Only allow updating PENDING offers
    if (offer.status !== "PENDING") {
      return c.json(
        { success: false, message: "Can only update pending offers" },
        400
      );
    }

    const updateData: any = {
      title: body.title,
      salaryMin: body.salaryMin ? parseFloat(body.salaryMin) : null,
      salaryMax: body.salaryMax ? parseFloat(body.salaryMax) : null,
      salaryCurrency: body.salaryCurrency,
      employmentType: body.employmentType,
      location: body.location,
      isRemote: body.isRemote,
      description: body.description,
      benefits: body.benefits,
      terms: body.terms,
    };

    // Only update startDate if provided
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    }

    // Only update expirationDate if provided (it's required, so don't set to null)
    if (body.expirationDate) {
      updateData.expirationDate = new Date(body.expirationDate);
    }

    const updated = await prisma.offer.update({
      where: { id },
      data: updateData,
    });

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update offer error:", error);
    return c.json({ success: false, message: "Failed to update offer" }, 500);
  }
});

/**
 * Candidate accepts an offer
 * POST /offers/:id/accept
 */
offerRoutes.post("/offers/:id/accept", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { responseNote } = body;

    // Get user from auth (candidate)
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Try Clerk auth for candidates
    const { getOrCreateClerkUser } = await import("../utils/clerkAuth");
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: "Authentication failed" }, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: result.user.id },
      include: { candidateProfile: true },
    });

    if (!user || !user.candidateProfile) {
      return c.json({ success: false, message: "Candidate profile not found" }, 404);
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            candidate: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            job: {
              include: {
                company: true,
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
              },
            },
          },
        },
      },
    });

    if (!offer) {
      return c.json({ success: false, message: "Offer not found" }, 404);
    }

    // Authorization check
    if (offer.application?.candidateId !== user.candidateProfile.id) {
      return c.json({ success: false, message: "Forbidden" }, 403);
    }

    // Check offer status and expiration
    if (offer.status !== "PENDING") {
      return c.json(
        { success: false, message: "Offer is not pending" },
        400
      );
    }

    if (new Date(offer.expirationDate) < new Date()) {
      // Auto-expire
      await prisma.offer.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      return c.json(
        { success: false, message: "Offer has expired" },
        400
      );
    }

    // Update offer status
    const updated = await prisma.offer.update({
      where: { id },
      data: {
        status: "ACCEPTED",
        responseNote,
        respondedAt: new Date(),
      },
    });

    // Update application status to OFFER_ACCEPTED (candidate accepted the offer)
    try {
      await prisma.application.update({
        where: { id: offer.applicationId },
        data: { status: "OFFER_ACCEPTED" },
      });

      // Log history for OFFER_ACCEPTED
      await prisma.applicationHistory.create({
        data: {
          applicationId: offer.applicationId,
          status: "OFFER_ACCEPTED",
          note: "Candidate accepted the offer",
          changedBy: "CANDIDATE",
        },
      });

      // Automatically set status to HIRED after candidate accepts offer
      await prisma.application.update({
        where: { id: offer.applicationId },
        data: { status: "HIRED" },
      });

      // Log history for HIRED (final status)
      await prisma.applicationHistory.create({
        data: {
          applicationId: offer.applicationId,
          status: "HIRED",
          note: "Automatically set to HIRED after candidate accepted the offer",
          changedBy: "SYSTEM",
        },
      });

      // Send email to candidate about HIRED status
      try {
        const applicationWithCandidate = await prisma.application.findUnique({
          where: { id: offer.applicationId },
          include: {
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
            job: {
              select: {
                title: true,
              },
            },
          },
        });

        if (applicationWithCandidate?.candidate?.user) {
          const candidateUser = applicationWithCandidate.candidate.user;
          const targetEmail = candidateUser.notificationEmail || candidateUser.email;
          if (targetEmail) {
            await sendApplicationStatusEmail({
              to: targetEmail,
              candidateName: `${candidateUser.firstName || ""} ${candidateUser.lastName || ""}`.trim(),
              jobTitle: applicationWithCandidate.job?.title || undefined,
              newStatus: "HIRED" as const,
            });
          }
        }
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error("Failed to send HIRED status email to candidate:", emailError);
      }
    } catch (err) {
      console.error("Failed to update application status:", err);
    }

    // Send email to recruiter
    try {
      if (offer.application?.job?.recruiter?.user && offer.application?.candidate?.user) {
        const recruiterUser = offer.application.job.recruiter.user;
        const candidateUser = offer.application.candidate.user;
        const targetEmail = recruiterUser.notificationEmail || recruiterUser.email;
        if (targetEmail) {
          await sendOfferAcceptedEmailToRecruiter({
            to: targetEmail,
            recruiterName: `${recruiterUser.firstName || ""} ${recruiterUser.lastName || ""}`.trim() || undefined,
            candidateName: `${candidateUser.firstName || ""} ${candidateUser.lastName || ""}`.trim(),
            jobTitle: offer.application.job?.title || "",
            companyName: offer.application.job?.company?.name || null,
            offerTitle: offer.title,
            offerId: offer.id,
            applicationId: offer.applicationId,
            responseNote: responseNote || null,
          });
        }
      }
    } catch (emailError) {
      console.error("Failed to send offer accepted email:", emailError);
    }

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Accept offer error:", error);
    return c.json({ success: false, message: "Failed to accept offer" }, 500);
  }
});

/**
 * Candidate rejects an offer
 * POST /offers/:id/reject
 */
offerRoutes.post("/offers/:id/reject", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { responseNote } = body;

    // Get user from auth (candidate)
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Try Clerk auth for candidates
    const { getOrCreateClerkUser } = await import("../utils/clerkAuth");
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: "Authentication failed" }, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: result.user.id },
      include: { candidateProfile: true },
    });

    if (!user || !user.candidateProfile) {
      return c.json({ success: false, message: "Candidate profile not found" }, 404);
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            candidate: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            job: {
              include: {
                company: true,
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
              },
            },
          },
        },
      },
    });

    if (!offer) {
      return c.json({ success: false, message: "Offer not found" }, 404);
    }

    // Authorization check
    if (offer.application?.candidateId !== user.candidateProfile.id) {
      return c.json({ success: false, message: "Forbidden" }, 403);
    }

    // Check offer status
    if (offer.status !== "PENDING") {
      return c.json(
        { success: false, message: "Offer is not pending" },
        400
      );
    }

    // Update offer status
    const updated = await prisma.offer.update({
      where: { id },
      data: {
        status: "REJECTED",
        responseNote,
        respondedAt: new Date(),
      },
    });

    // Update application status to OFFER_REJECTED
    try {
      await prisma.application.update({
        where: { id: offer.applicationId },
        data: { status: "OFFER_REJECTED" },
      });

      // Log history
      await prisma.applicationHistory.create({
        data: {
          applicationId: offer.applicationId,
          status: "OFFER_REJECTED",
          note: "Candidate rejected the offer",
          changedBy: "CANDIDATE",
        },
      });
    } catch (err) {
      console.error("Failed to update application status:", err);
    }

    // Send email to recruiter
    try {
      if (offer.application?.job?.recruiter?.user && offer.application?.candidate?.user) {
        const recruiterUser = offer.application.job.recruiter.user;
        const candidateUser = offer.application.candidate.user;
        const targetEmail = recruiterUser.notificationEmail || recruiterUser.email;
        if (targetEmail) {
          await sendOfferRejectedEmailToRecruiter({
            to: targetEmail,
            recruiterName: `${recruiterUser.firstName || ""} ${recruiterUser.lastName || ""}`.trim() || undefined,
            candidateName: `${candidateUser.firstName || ""} ${candidateUser.lastName || ""}`.trim(),
            jobTitle: offer.application.job?.title || "",
            companyName: offer.application.job?.company?.name || null,
            offerTitle: offer.title,
            offerId: offer.id,
            applicationId: offer.applicationId,
            responseNote: responseNote || null,
          });
        }
      }
    } catch (emailError) {
      console.error("Failed to send offer rejected email:", emailError);
    }

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Reject offer error:", error);
    return c.json({ success: false, message: "Failed to reject offer" }, 500);
  }
});

/**
 * Recruiter withdraws an offer
 * POST /offers/:id/withdraw
 */
offerRoutes.post("/offers/:id/withdraw", async (c) => {
  try {
    const { id } = c.req.param();

    // Get user from auth
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: token },
      include: { recruiterProfile: true },
    });

    if (!user || (user.role !== "RECRUITER" && user.role !== "ADMIN")) {
      return c.json({ success: false, message: "Only recruiters can withdraw offers" }, 403);
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            job: { include: { recruiter: true, company: true } },
          },
        },
      },
    });

    if (!offer) {
      return c.json({ success: false, message: "Offer not found" }, 404);
    }

    // Authorization check
    if (user.role === "RECRUITER") {
      const recruiterId = user.recruiterProfile?.id;
      if (recruiterId !== offer.application?.job?.recruiterId) {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }
    }

    // Only allow withdrawing PENDING offers
    if (offer.status !== "PENDING") {
      return c.json(
        { success: false, message: "Can only withdraw pending offers" },
        400
      );
    }

    const updated = await prisma.offer.update({
      where: { id },
      data: {
        status: "WITHDRAWN",
      },
    });

    // Optionally update application status back to INTERVIEWED
    try {
      await prisma.application.update({
        where: { id: offer.applicationId },
        data: { status: "INTERVIEWED" },
      });

      await prisma.applicationHistory.create({
        data: {
          applicationId: offer.applicationId,
          status: "INTERVIEWED",
          note: "Offer was withdrawn",
          changedBy: user.id,
        },
      });
    } catch (err) {
      console.error("Failed to update application status:", err);
    }

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Withdraw offer error:", error);
    return c.json({ success: false, message: "Failed to withdraw offer" }, 500);
  }
});

export default offerRoutes;

