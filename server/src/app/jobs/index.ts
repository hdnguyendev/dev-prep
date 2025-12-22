import prisma from "@server/app/db/prisma";
import { getNewJobMessage, getJobClosedMessage } from "@server/utils/notificationMessages";

type JobInput = {
  title: string;
  slug: string;
  description: string;
  requirements?: string | null;
  responsibilities?: string | null;
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

export const getJobs = async () => {
  // Public jobs listing should not include DRAFT or CLOSED jobs
  const jobs = await prisma.job.findMany({
    where: {
      status: {
        notIn: ["DRAFT", "CLOSED"],
      },
    },
  });
  return jobs;
};

export const getJobById = async (id: string) => {
  const job = await prisma.job.findUnique({
    where: { id },
  });
  return job;
};

export const createJob = async (payload: JobInput) => {
  const newJob = await prisma.job.create({
    data: payload,
  });

  // Notify followers only when a new PUBLISHED job is created
  if (newJob.companyId && newJob.status === "PUBLISHED") {
    const companyId = String(newJob.companyId);
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
          message: getNewJobMessage(newJob.title),
          type: "COMPANY_UPDATE",
          link: `/jobs/${newJob.id}`,
        })) ?? [];

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({ data: notificationsData });
    }
  }

  return newJob;
};

export const updateJob = async (id: string, payload: JobInput) => {
  // Fetch previous status to detect significant transitions
  const existingJob = await prisma.job.findUnique({
    where: { id },
    select: { status: true, companyId: true, title: true },
  });

  const updatedJob = await prisma.job.update({
    where: { id },
    data: payload,
  });

  if (!existingJob || !existingJob.companyId) {
    return updatedJob;
  }

  const companyId = String(updatedJob.companyId);
  const follows = await prisma.companyFollow.findMany({
    where: { companyId },
    select: { candidate: { select: { userId: true } } },
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

export const appJobs = {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
};