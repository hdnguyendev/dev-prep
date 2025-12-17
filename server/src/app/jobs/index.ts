import prisma from "@server/app/db/prisma";

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
  const jobs = await prisma.job.findMany();
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
  return newJob;
};

export const updateJob = async (id: string, payload: JobInput) => {
  const updatedJob = await prisma.job.update({
    where: { id },
    data: payload,
  });
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