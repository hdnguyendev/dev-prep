import prisma from "@server/app/db/prisma";
import { getNewJobMessage, getJobClosedMessage } from "@server/utils/notificationMessages";
import { sendNewJobEmailToFollower } from "@server/app/services/email";

type JobInput = {
  title: string;
  slug: string;
  description: string;
  requirements?: string | null;
  interviewQuestions?: string[];
  location?: string | null;
  locationType?: string;
  employmentType?: string;
  experienceLevel?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  status: string;
  companyId: string;
  recruiterId: string;
  type?: string;
  benefits?: string | null;
  isRemote?: boolean;
  isSalaryNegotiable?: boolean;
  quantity?: number;
  currency?: string;
};

export const getJobs = async (searchQuery?: string, page?: number, pageSize?: number) => {
  // Build where clause
  const baseWhere: any = {
    status: {
      notIn: ["DRAFT", "CLOSED"],
    },
  };

  // Add search filter if provided
  let whereClause: any = baseWhere;
  if (searchQuery && searchQuery.trim()) {
    const trimmedQuery = searchQuery.trim();
    const searchConditions = [
      { title: { contains: trimmedQuery, mode: "insensitive" } },
      { description: { contains: trimmedQuery, mode: "insensitive" } },
      { requirements: { contains: trimmedQuery, mode: "insensitive" } },
      { location: { contains: trimmedQuery, mode: "insensitive" } },
      { company: { name: { contains: trimmedQuery, mode: "insensitive" } } },
    ];
    
    // Combine status filter with search conditions using AND
    whereClause = {
      AND: [
        baseWhere,
        { OR: searchConditions },
      ],
    };
  }

  // Parse pagination
  // If pageSize is provided, use it (max 1000 to prevent abuse)
  // If not provided, return all jobs (no limit)
  const take = pageSize ? Math.min(Math.max(pageSize, 1), 1000) : undefined;
  const skip = page && take ? (page - 1) * take : undefined;

  // Public jobs listing should not include DRAFT or CLOSED jobs
  const jobs = await prisma.job.findMany({
    where: whereClause,
    skip,
    take,
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
    orderBy: { createdAt: "desc" },
  });

  // Calculate averageRating for each company
  if (jobs.length > 0) {
    const companyIds = [...new Set(jobs.map((job) => job.company?.id).filter(Boolean))];
    
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
      jobs.forEach((job: any) => {
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

  return jobs;
};

export const getJobById = async (id: string) => {
  const job = await prisma.job.findUnique({
    where: { id },
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
  });

  // Calculate averageRating for company if job exists
  if (job?.company?.id) {
    const stats = await prisma.companyReview.aggregate({
      where: { companyId: job.company.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    if (job.company) {
      job.company = {
        ...job.company,
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count.rating || 0,
      };
    }
  }

  return job;
};

export const getJobBySlug = async (slug: string) => {
  const job = await prisma.job.findUnique({
    where: { slug },
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
  });

  // Calculate averageRating for company if job exists
  if (job?.company?.id) {
    const stats = await prisma.companyReview.aggregate({
      where: { companyId: job.company.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    if (job.company) {
      job.company = {
        ...job.company,
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count.rating || 0,
      };
    }
  }

  return job;
};

export const createJob = async (payload: JobInput) => {
  // Filter out and map fields that don't exist in Prisma schema
  const { responsibilities, locationType, employmentType, salaryCurrency, ...rest } = payload as any;
  
  // Map frontend fields to Prisma fields
  const prismaData: any = {
    ...rest,
    isRemote: locationType === "REMOTE" || payload.isRemote || false,
    type: employmentType || payload.type || "FULL_TIME",
    currency: salaryCurrency || payload.currency || "VND",
  };
  
  const newJob = await prisma.job.create({
    data: prismaData,
  });

  // Notify followers only when a new PUBLISHED job is created
  if (newJob.companyId && newJob.status === "PUBLISHED") {
    const companyId = String(newJob.companyId);
    const follows = await prisma.companyFollow.findMany({
      where: { companyId },
      select: {
        candidate: {
          select: {
            userId: true,
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

    const notificationsData =
      follows
        .map((f) => f.candidate?.userId)
        .filter((u): u is string => Boolean(u))
        .map((userId) => ({
          userId,
          title: "New job posted",
          message: getNewJobMessage(newJob.title),
          type: "COMPANY_UPDATE",
          link: `/jobs/${newJob.id}`,
        })) ?? [];

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({ data: notificationsData });
    }

    // Gửi email cho candidate follow company (fire-and-forget, không block request)
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    const jobLink = `/jobs/${newJob.id}`;

    Promise.allSettled(
      (follows || [])
        .map((f) => f.candidate)
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
        .map((candidate) => {
          const email =
            candidate.user?.notificationEmail || candidate.user?.email;
          if (!email) return null;
          const candidateName = `${candidate.user?.firstName ?? ""} ${candidate.user?.lastName ?? ""}`.trim() || undefined;

          return sendNewJobEmailToFollower({
            to: email,
            candidateName,
            jobTitle: newJob.title,
            companyName: company?.name ?? null,
            jobLink: (process.env.APP_BASE_URL || process.env.VITE_APP_URL || "http://localhost:5173") + jobLink,
          });
        })
        .filter((p): p is Promise<void> => Boolean(p))
    ).catch((err) => {
      console.error("[EMAIL:NewJobFollower] Error sending follower emails:", err);
    });
  }

  return newJob;
};

export const updateJob = async (id: string, payload: JobInput) => {
  // Fetch previous status to detect significant transitions
  const existingJob = await prisma.job.findUnique({
    where: { id },
    select: { status: true, companyId: true, title: true },
  });

  // Filter out and map fields that don't exist in Prisma schema
  const { responsibilities, locationType, employmentType, salaryCurrency, ...rest } = payload as any;
  
  // Map frontend fields to Prisma fields
  const prismaData: any = {
    ...rest,
  };
  
  // Only update these fields if they're provided
  if (locationType !== undefined) {
    prismaData.isRemote = locationType === "REMOTE" || payload.isRemote || false;
  }
  if (employmentType !== undefined) {
    prismaData.type = employmentType || payload.type;
  }
  if (salaryCurrency !== undefined) {
    prismaData.currency = salaryCurrency || payload.currency;
  }
  
  const updatedJob = await prisma.job.update({
    where: { id },
    data: prismaData,
  });

  if (!existingJob || !existingJob.companyId) {
    return updatedJob;
  }

  const companyId = String(updatedJob.companyId);
  const follows = await prisma.companyFollow.findMany({
    where: { companyId },
    select: {
      candidate: {
        select: {
          userId: true,
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

  // Transition from DRAFT/CLOSED -> PUBLISHED => treat as new job posted
  if (
    (existingJob.status === "DRAFT" || existingJob.status === "CLOSED") &&
    updatedJob.status === "PUBLISHED"
  ) {
    const notificationsData =
      follows
        .map((f) => f.candidate?.userId)
        .filter((u): u is string => Boolean(u))
        .map((userId) => ({
          userId,
          title: "New job posted",
          message: getNewJobMessage(updatedJob.title),
          type: "COMPANY_UPDATE",
          link: `/jobs/${updatedJob.id}`,
        })) ?? [];

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({ data: notificationsData });
    }

    // Gửi email giống như createJob khi job được publish từ DRAFT/CLOSED
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    const jobLink = `/jobs/${updatedJob.id}`;

    Promise.allSettled(
      (follows || [])
        .map((f) => f.candidate)
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
        .map((candidate) => {
          const email =
            candidate.user?.notificationEmail || candidate.user?.email;
          if (!email) return null;
          const candidateName = `${candidate.user?.firstName ?? ""} ${candidate.user?.lastName ?? ""}`.trim() || undefined;

          return sendNewJobEmailToFollower({
            to: email,
            candidateName,
            jobTitle: updatedJob.title,
            companyName: company?.name ?? null,
            jobLink: (process.env.APP_BASE_URL || process.env.VITE_APP_URL || "http://localhost:5173") + jobLink,
          });
        })
        .filter((p): p is Promise<void> => Boolean(p))
    ).catch((err) => {
      console.error("[EMAIL:NewJobFollower] Error sending follower emails on publish:", err);
    });
  }
  // Transition to CLOSED => job closed notification
  else if (existingJob.status !== "CLOSED" && updatedJob.status === "CLOSED") {
    const notificationsData =
      follows
        .map((f) => f.candidate?.userId)
        .filter((u): u is string => Boolean(u))
        .map((userId) => ({
          userId,
          title: "Job closed",
          message: getJobClosedMessage(updatedJob.title),
          type: "COMPANY_UPDATE",
          link: `/jobs/${updatedJob.id}`,
        })) ?? [];

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({ data: notificationsData });
    }
  }

  return updatedJob;
};

export const deleteJob = async (id: string) => {
  const deletedJob = await prisma.job.delete({ where: { id } });
  return deletedJob;
};

/**
 * Increment view count for a job
 * Used when a user views a job detail page
 */
export const incrementViewCount = async (jobId: string) => {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        viewsCount: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error(`[Jobs] Failed to increment view count for job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Increment click count for a job
 * Used when a user clicks on a job card/listing
 */
export const incrementClickCount = async (jobId: string) => {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        clicksCount: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error(`[Jobs] Failed to increment click count for job ${jobId}:`, error);
    throw error;
  }
};

export const appJobs = {
  getJobs,
  getJobById,
  getJobBySlug,
  createJob,
  updateJob,
  deleteJob,
  incrementViewCount,
  incrementClickCount,
};