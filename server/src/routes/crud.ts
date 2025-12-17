import { Hono } from "hono";
import prisma from "@server/app/db/prisma";
import type { Context } from "hono";
import { Prisma } from "@server/generated/prisma";

type ResourceConfig = {
  path: string;
  model: Prisma.ModelName;
  primaryKeys: string[];
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  where?: Record<string, unknown>;
  allowedFields: string[];
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
    
    // Support filtering by foreign key IDs (e.g., jobId, candidateId, etc.)
    for (const [key, value] of Object.entries(queryParams)) {
      if (key.endsWith('Id') && value && typeof value === 'string') {
        dynamicWhere[key] = value;
      }
    }

    const [data, total] = await Promise.all([
      client.findMany({ 
        take, 
        skip, 
        where: dynamicWhere,
        include: config.include, 
        orderBy: config.orderBy 
      }),
      client.count({ where: dynamicWhere }),
    ]);

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
    return c.json({ success: true, data: created }, 201);
  });

  router.put(`/${idPath}`, async (c) => {
    try {
      const payload = await c.req.json();

      const client = getModelClient(config.model);
      const data = pickPayload(payload, config.allowedFields);
      const where = buildWhere(c.req.param(), config.primaryKeys);
      const updated = await client.update({ where, data, include: config.include });
      return c.json({ success: true, data: updated });
    } catch (error) {
      return handlePrismaNotFound(error, c);
    }
  });

  router.delete(`/${idPath}`, async (c) => {
    try {
      const client = getModelClient(config.model);
      const where = buildWhere(c.req.param(), config.primaryKeys);
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
      "createdAt",
      "updatedAt",
    ],
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
    path: "skills",
    model: Prisma.ModelName.Skill,
    primaryKeys: ["id"],
    allowedFields: ["id", "name", "iconUrl"],
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
    include: {
      company: true,
      recruiter: true,
      skills: { include: { skill: true } },
      categories: { include: { category: true } },
      applications: true,
      savedBy: true,
    },
    orderBy: { createdAt: "desc" },
    where: { status: "PUBLISHED" }, // Only show published jobs
  },
  {
    path: "categories",
    model: Prisma.ModelName.Category,
    primaryKeys: ["id"],
    allowedFields: ["id", "name", "iconUrl"],
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
    include: { job: true, candidate: true, interviews: true, history: true, notes: true },
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
    include: { application: true, exchanges: true },
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
