import { Hono } from "hono";
import prisma from "@server/app/db/prisma";
import type { Context } from "hono";
import { Prisma } from "@server/generated/prisma";
import { getNewJobMessage, getJobClosedMessage } from "@server/utils/notificationMessages";

type ResourceConfig = {
  path: string;
  model: Prisma.ModelName;
  primaryKeys: string[];
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  where?: Record<string, unknown>;
  allowedFields: string[];
  searchableFields?: string[];
};

const toClientKey = (model: Prisma.ModelName) => model.charAt(0).toLowerCase() + model.slice(1);

const getModelClient = (model: Prisma.ModelName) => {
  const client = (prisma as any)[toClientKey(model)];
  if (!client) {
    throw new Error(`Unknown Prisma client for model ${model}`);
  }
  return client;
};

const buildWhere = (params: Record<string, string>, primaryKeys: string[]) => {
  if (primaryKeys.length === 1) {
    const key = primaryKeys[0];
    if (!key) throw new Error("Primary key not provided");
    const value = params[key];
    if (typeof value === "undefined") throw new Error(`Missing value for primary key: ${key}`);
    return { [key]: value };
  }

  const compoundName = primaryKeys.join("_");
  const compoundValue: Record<string, string> = {};
  primaryKeys.forEach((key) => {
    if (!key) throw new Error("Primary key not provided");
    const value = params[key];
    if (typeof value === "undefined") throw new Error(`Missing value for primary key: ${key}`);
    compoundValue[key] = value;
  });
  return { [compoundName]: compoundValue };
};

const parsePagination = (query: Record<string, string | undefined>) => {
  const take = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const skip = (page - 1) * take;
  return { take, page, skip };
};

const handlePrismaNotFound = (error: unknown, c: Context) => {
  const code = (error as any)?.code;
  if (code === "P2025") {
    return c.json({ success: false, message: "Record not found" }, 404);
  }
  // Handle foreign key constraint violation
  if (code === "P2003") {
    const meta = (error as any)?.meta;
    const field = meta?.field_name;
    if (field?.includes("Application")) {
      return c.json(
        { 
          success: false, 
          message: "Cannot delete this record because it has associated applications. Please remove all applications first." 
        }, 
        400
      );
    }
    return c.json(
      { 
        success: false, 
        message: "Cannot delete this record because it has associated data. Please remove all related records first." 
      }, 
      400
    );
  }
  throw error;
};

const pickPayload = (payload: Record<string, unknown>, allowed: string[]) => {
  return Object.entries(payload).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (allowed.includes(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const createCrudRouter = (config: ResourceConfig) => {
  const router = new Hono();
  const idPath = config.primaryKeys.map((key) => `:${key}`).join("/");

  router.get("/", async (c) => {
    const client = getModelClient(config.model);
    const { take, page, skip } = parsePagination(c.req.query());

    // Build where clause: combine config.where with query params
    const queryParams = c.req.query();
    const dynamicWhere: any = { ...config.where };
    
    // Support search query (q or search param)
    const searchQuery = (queryParams.q || queryParams.search || "").trim();
    if (searchQuery) {
      // Build OR conditions for searchable fields
      const searchableFields = config.searchableFields || [];
      if (searchableFields.length > 0) {
        dynamicWhere.OR = searchableFields.map((field: string) => {
          // Handle nested fields (e.g., "user.firstName")
          if (field.includes(".")) {
            const parts = field.split(".");
            const relation = parts[0];
            const nestedField = parts[1];
            if (!relation || !nestedField) return {};
            const condition: any = {};
            condition[relation] = {};
            condition[relation][nestedField] = {
              contains: searchQuery,
              mode: "insensitive" as const,
            };
            return condition;
          }
          const condition: any = {};
          condition[field] = {
            contains: searchQuery,
            mode: "insensitive" as const,
          };
          return condition;
        });
      }
    }
    
    // Support filtering by common fields
    for (const [key, value] of Object.entries(queryParams)) {
      if (!value || key === 'q' || key === 'search' || key === 'page' || key === 'pageSize') continue;
      
      // Filter by foreign key IDs (e.g., jobId, candidateId, etc.)
      if (key.endsWith('Id')) {
        dynamicWhere[key] = value;
      }
      // Filter by status fields (e.g., status, role, type)
      else if (key === 'status' || key === 'role' || key === 'type' || key === 'currency') {
        dynamicWhere[key] = value;
      }
      // Filter by boolean fields (e.g., isVerified, isActive, isPublic, isRemote)
      else if (key.startsWith('is') && (value === 'true' || value === 'false')) {
        dynamicWhere[key] = value === 'true';
      }
      // Filter by enum fields
      else if (config.allowedFields?.includes(key)) {
        dynamicWhere[key] = value;
      }
    }

    let [data, total] = await Promise.all([
      client.findMany({ 
        take, 
        skip, 
        where: dynamicWhere,
        include: config.include, 
        orderBy: config.orderBy 
      }),
      client.count({ where: dynamicWhere }),
    ]);

    // Calculate averageRating for companies
    if (Array.isArray(data) && data.length > 0) {
      let companyIds: string[] = [];

      // If this is jobs route and includes company
      if (config.model === Prisma.ModelName.Job && config.include?.company) {
        companyIds = [...new Set(data.map((job: any) => job.company?.id).filter(Boolean))];
      }
      // If this is companies route
      else if (config.model === Prisma.ModelName.Company) {
        companyIds = data.map((company: any) => company.id).filter(Boolean);
      }

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
              averageRating: stats._avg.rating ?? null,
              totalReviews: stats._count.rating || 0,
            };
          })
        );

        const statsMap = new Map(
          reviewStats.map((s) => [s.companyId, { averageRating: s.averageRating, totalReviews: s.totalReviews }])
        );

        // Add rating to each company
        if (config.model === Prisma.ModelName.Job && config.include?.company) {
          // For jobs, add rating to job.company
          data = data.map((job: any) => {
            if (job.company?.id) {
              const stats = statsMap.get(job.company.id);
              if (stats && stats.totalReviews > 0) {
                job.company = {
                  ...job.company,
                  averageRating: stats.averageRating,
                  totalReviews: stats.totalReviews,
                };
              } else {
                job.company = {
                  ...job.company,
                  averageRating: null,
                  totalReviews: 0,
                };
              }
            }
            return job;
          });
        } else if (config.model === Prisma.ModelName.Company) {
          // For companies, add rating directly to company
          data = data.map((company: any) => {
            if (company.id) {
              const stats = statsMap.get(company.id);
              if (stats && stats.totalReviews > 0) {
                return {
                  ...company,
                  averageRating: stats.averageRating,
                  totalReviews: stats.totalReviews,
                };
              } else {
                return {
                  ...company,
                  averageRating: null,
                  totalReviews: 0,
                };
              }
            }
            return company;
          });
        }
      }
    }

    return c.json({ success: true, data, meta: { page, pageSize: take, total } });
  });

  router.get(`/${idPath}`, async (c) => {
    const client = getModelClient(config.model);
    const where = buildWhere(c.req.param(), config.primaryKeys);
    const record = await client.findUnique({ where, include: config.include });

    if (!record) {
      return c.json({ success: false, message: "Record not found" }, 404);
    }

    return c.json({ success: true, data: record });
  });

  router.post("/", async (c) => {
    const payload = await c.req.json();

    const client = getModelClient(config.model);
    const data = pickPayload(payload, config.allowedFields);
    const created = await client.create({ data, include: config.include });

    // Persist notifications in DB for jobs created via admin CRUD – only when PUBLISHED
    if (
      config.model === Prisma.ModelName.Job &&
      (created as any)?.companyId &&
      (created as any)?.status === "PUBLISHED"
    ) {
      const companyId = String((created as any).companyId);
      const follows = await prisma.companyFollow.findMany({
        where: { companyId },
        select: { candidate: { select: { userId: true } } },
      });

      const notificationsData =
        follows
          .map((f) => f.candidate?.userId)
          .filter((u): u is string => Boolean(u))
          .map((userId) => ({
            userId,
            title: "New job posted",
            message: getNewJobMessage((created as any).title ?? "New job"),
            type: "COMPANY_UPDATE",
            link: `/jobs/${(created as any).id}`,
          })) ?? [];

      if (notificationsData.length > 0) {
        await prisma.notification.createMany({ data: notificationsData });
      }
    }

    return c.json({ success: true, data: created }, 201);
  });

  router.put(`/${idPath}`, async (c) => {
    try {
      const payload = await c.req.json();

      const client = getModelClient(config.model);
      const data = pickPayload(payload, config.allowedFields);
      const where = buildWhere(c.req.param(), config.primaryKeys);

      // For jobs, we want to know previous status to detect significant transitions
      let existingJob: { status: string; companyId: string | null; title: string } | null = null;
      if (config.model === Prisma.ModelName.Job) {
        existingJob = await client.findUnique({
          where,
          select: { status: true, companyId: true, title: true },
        });
      }

      const updated = await client.update({ where, data, include: config.include });

      // Persist notifications in DB for job status transitions
      if (
        config.model === Prisma.ModelName.Job &&
        existingJob &&
        existingJob.companyId
      ) {
        const companyId = String(existingJob.companyId);
        const follows = await prisma.companyFollow.findMany({
          where: { companyId },
          select: { candidate: { select: { userId: true } } },
        });

        // Notify when job transitions from DRAFT/CLOSED to PUBLISHED
        if (
          (existingJob.status === "DRAFT" || existingJob.status === "CLOSED") &&
          (updated as any)?.status === "PUBLISHED"
        ) {
          const notificationsData =
            follows
              .map((f) => f.candidate?.userId)
              .filter((u): u is string => Boolean(u))
              .map((userId) => ({
                userId,
                title: "New job posted",
                message: getNewJobMessage((updated as any).title ?? "New job"),
                type: "COMPANY_UPDATE",
                link: `/jobs/${(updated as any).id}`,
              })) ?? [];

          if (notificationsData.length > 0) {
            await prisma.notification.createMany({ data: notificationsData });
          }
        }
        // Notify when job transitions to CLOSED
        else if (
          existingJob.status !== "CLOSED" &&
          (updated as any)?.status === "CLOSED"
        ) {
          const notificationsData =
            follows
              .map((f) => f.candidate?.userId)
              .filter((u): u is string => Boolean(u))
              .map((userId) => ({
                userId,
                title: "Job closed",
                message: getJobClosedMessage((updated as any).title ?? "Job"),
                type: "COMPANY_UPDATE",
                link: `/jobs/${(updated as any).id}`,
              })) ?? [];

          if (notificationsData.length > 0) {
            await prisma.notification.createMany({ data: notificationsData });
          }
        }
      }

      return c.json({ success: true, data: updated });
    } catch (error) {
      return handlePrismaNotFound(error, c);
    }
  });

  router.delete(`/${idPath}`, async (c) => {
    try {
      const client = getModelClient(config.model);
      const where = buildWhere(c.req.param(), config.primaryKeys);
      
      // Check for related applications if deleting a Job
      if (config.model === Prisma.ModelName.Job) {
        const jobId = where.id;
        if (jobId) {
          const applicationCount = await prisma.application.count({
            where: { jobId: jobId as string },
          });
          
          if (applicationCount > 0) {
            return c.json(
              {
                success: false,
                message: `Cannot delete this job because it has ${applicationCount} associated application${applicationCount > 1 ? 's' : ''}. Please remove all applications first.`,
              },
              400
            );
          }
        }
      }
      
      const deleted = await client.delete({ where, include: config.include });
      return c.json({ success: true, data: deleted });
    } catch (error) {
      return handlePrismaNotFound(error, c);
    }
  });

  return router;
};

export const resources: ResourceConfig[] = [
  {
    path: "users",
    model: Prisma.ModelName.User,
    primaryKeys: ["id"],
    allowedFields: [
      "id",
      "email",
      "passwordHash",
      "firstName",
      "lastName",
      "phone",
      "avatarUrl",
      "role",
      "isVerified",
      "isActive",
      "lastLoginAt",
      "createdAt",
      "updatedAt",
    ],
    searchableFields: ["email", "firstName", "lastName", "phone"],
    include: { candidateProfile: true, recruiterProfile: true },
    orderBy: { createdAt: "desc" },
  },
  {
    path: "candidate-profiles",
    model: Prisma.ModelName.CandidateProfile,
    primaryKeys: ["id"],
    allowedFields: [
      "id",
      "userId",
      "headline",
      "bio",
      "website",
      "linkedin",
      "github",
      "cvUrl",
      "isPublic",
      "createdAt",
      "updatedAt",
    ],
    searchableFields: ["headline", "bio", "user.firstName", "user.lastName", "user.email"],
    include: {
      user: true,
      experiences: true,
      educations: true,
      skills: { include: { skill: true } },
      applications: true,
      savedJobs: true,
    },
    orderBy: { createdAt: "desc" },
  },
  {
    path: "recruiter-profiles",
    model: Prisma.ModelName.RecruiterProfile,
    primaryKeys: ["id"],
    allowedFields: ["id", "userId", "companyId", "position", "createdAt", "updatedAt"],
    include: { user: true, company: true, jobsPosted: true },
    orderBy: { createdAt: "desc" },
  },
  {
    path: "experiences",
    model: Prisma.ModelName.Experience,
    primaryKeys: ["id"],
    allowedFields: [
      "id",
      "candidateId",
      "companyName",
      "position",
      "location",
      "startDate",
      "endDate",
      "isCurrent",
      "description",
      "createdAt",
    ],
    include: { candidate: true },
    orderBy: { startDate: "desc" },
  },
  {
    path: "educations",
    model: Prisma.ModelName.Education,
    primaryKeys: ["id"],
    allowedFields: [
      "id",
      "candidateId",
      "institution",
      "degree",
      "fieldOfStudy",
      "startDate",
      "endDate",
      "grade",
      "createdAt",
    ],
    include: { candidate: true },
    orderBy: { startDate: "desc" },
  },
  {
    path: "projects",
    model: Prisma.ModelName.Project,
    primaryKeys: ["id"],
    allowedFields: [
      "id",
      "candidateId",
      "name",
      "description",
      "url",
      "startDate",
      "endDate",
      "isCurrent",
      "technologies",
      "createdAt",
    ],
    include: { candidate: true },
    orderBy: { startDate: "desc" },
  },
  {
    path: "skills",
    model: Prisma.ModelName.Skill,
    primaryKeys: ["id"],
    allowedFields: ["id", "name", "iconUrl"],
    searchableFields: ["name"],
    include: { candidates: true, jobs: true },
    orderBy: { name: "asc" },
  },
  {
    path: "candidate-skills",
    model: Prisma.ModelName.CandidateSkill,
    primaryKeys: ["id"],
    allowedFields: ["id", "candidateId", "skillId", "level"],
    include: { candidate: true, skill: true },
  },
  {
    path: "companies",
    model: Prisma.ModelName.Company,
    primaryKeys: ["id"],
    allowedFields: [
      "id",
      "name",
      "slug",
      "logoUrl",
      "coverUrl",
      "website",
      "description",
      "industry",
      "companySize",
      "foundedYear",
      "address",
      "city",
      "country",
      "isVerified",
      "createdAt",
      "updatedAt",
    ],
    searchableFields: ["name", "industry", "city", "country", "description"],
    include: { recruiters: true, jobs: true },
    orderBy: { createdAt: "desc" },
  },
  {
    path: "jobs",
    model: Prisma.ModelName.Job,
    primaryKeys: ["id"],
    allowedFields: [
      "id",
      "slug",
      "title",
      "companyId",
      "recruiterId",
      "description",
      "requirements",
      "benefits",
      "type",
      "status",
      "location",
      "isRemote",
      "salaryMin",
      "salaryMax",
      "currency",
      "isSalaryNegotiable",
      "experienceLevel",
      "quantity",
      "viewsCount",
      "clicksCount",
      "publishedAt",
      "deadline",
      "interviewQuestions",
      "createdAt",
      "updatedAt",
    ],
    searchableFields: ["title", "description", "requirements", "location"],
    include: {
      company: true,
      recruiter: true,
      skills: { include: { skill: true } },
      categories: { include: { category: true } },
      applications: true,
      savedBy: true,
    },
    orderBy: { createdAt: "desc" },
  },
  {
    path: "categories",
    model: Prisma.ModelName.Category,
    primaryKeys: ["id"],
    allowedFields: ["id", "name", "iconUrl"],
    searchableFields: ["name"],
    include: { jobs: { include: { job: true } } },
    orderBy: { name: "asc" },
  },
  {
    path: "job-categories",
    model: Prisma.ModelName.JobCategory,
    primaryKeys: ["jobId", "categoryId"],
    allowedFields: ["jobId", "categoryId"],
    include: { job: true, category: true },
  },
  {
    path: "job-skills",
    model: Prisma.ModelName.JobSkill,
    primaryKeys: ["jobId", "skillId"],
    allowedFields: ["jobId", "skillId", "isRequired"],
    include: { job: true, skill: true },
  },
  {
    path: "saved-jobs",
    model: Prisma.ModelName.SavedJob,
    primaryKeys: ["id"],
    allowedFields: ["id", "candidateId", "jobId", "savedAt"],
    include: { candidate: true, job: true },
    orderBy: { savedAt: "desc" },
  },
  {
    path: "applications",
    model: Prisma.ModelName.Application,
    primaryKeys: ["id"],
    allowedFields: [
      "id",
      "jobId",
      "candidateId",
      "resumeUrl",
      "coverLetter",
      "status",
      "rejectionReason",
      "appliedAt",
      "updatedAt",
    ],
    searchableFields: ["status", "coverLetter", "candidate.user.firstName", "candidate.user.lastName", "candidate.user.email", "job.title", "job.company.name"],
    include: { job: { include: { company: true } }, candidate: { include: { user: true } }, interviews: true, history: true, notes: true },
    orderBy: { appliedAt: "desc" },
  },
  {
    path: "application-histories",
    model: Prisma.ModelName.ApplicationHistory,
    primaryKeys: ["id"],
    allowedFields: ["id", "applicationId", "status", "changedBy", "note", "createdAt"],
    include: { application: true },
    orderBy: { createdAt: "desc" },
  },
  {
    path: "application-notes",
    model: Prisma.ModelName.ApplicationNote,
    primaryKeys: ["id"],
    allowedFields: ["id", "applicationId", "authorId", "content", "createdAt"],
    include: { application: true },
    orderBy: { createdAt: "desc" },
  },
  {
    path: "interviews",
    model: Prisma.ModelName.Interview,
    primaryKeys: ["id"],
    allowedFields: [
      "id",
      "applicationId",
      "candidateId",
      "jobId",
      "title",
      "type",
      "status",
      "accessCode",
      "sessionUrl",
      "expiresAt",
      "startedAt",
      "endedAt",
      "durationSeconds",
      "overallScore",
      "summary",
      "recommendation",
      "recordingUrl",
      "fullTranscript",
      "aiAnalysisData",
      "createdAt",
      "updatedAt",
    ],
    searchableFields: ["title", "type", "status", "accessCode", "candidate.user.firstName", "candidate.user.lastName", "job.title"],
    include: { application: true, candidate: { include: { user: true } }, job: { include: { company: true } }, exchanges: true },
    orderBy: { createdAt: "desc" },
  },
  {
    path: "interview-exchanges",
    model: Prisma.ModelName.InterviewExchange,
    primaryKeys: ["id"],
    allowedFields: [
      "id",
      "interviewId",
      "orderIndex",
      "questionText",
      "questionCategory",
      "answerText",
      "answerAudioUrl",
      "score",
      "feedback",
      "durationSeconds",
      "createdAt",
    ],
    include: { interview: true },
    orderBy: { orderIndex: "asc" },
  },
  {
    path: "question-banks",
    model: Prisma.ModelName.QuestionBank,
    primaryKeys: ["id"],
    allowedFields: ["id", "content", "category", "difficulty", "expectedKeywords", "createdAt"],
    orderBy: { createdAt: "desc" },
  },
  {
    path: "messages",
    model: Prisma.ModelName.Message,
    primaryKeys: ["id"],
    allowedFields: [
      "id",
      "senderId",
      "receiverId",
      "content",
      "isRead",
      "jobId",
      "applicationId",
      "createdAt",
    ],
    include: { sender: true, receiver: true },
    orderBy: { createdAt: "desc" },
  },
  {
    path: "notifications",
    model: Prisma.ModelName.Notification,
    primaryKeys: ["id"],
    allowedFields: ["id", "userId", "title", "message", "type", "isRead", "link", "createdAt"],
    include: { user: true },
    orderBy: { createdAt: "desc" },
  },
];

const crudRoutes = new Hono();

resources.forEach((resource) => {
  crudRoutes.route(`/${resource.path}`, createCrudRouter(resource));
});

export default crudRoutes;
