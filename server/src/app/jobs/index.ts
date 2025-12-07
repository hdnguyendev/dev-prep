import { prisma } from "../db";

export const getJobs = async () => {
  const jobs = await prisma.job.findMany();
  return jobs;
};

export const getJobById = async (id: string) => {
  const job = await prisma.job.findUnique({ where: { id } });
  return job;
};

export const createJob = async (payload: any) => {
  const newJob = await prisma.job.create({ data: payload });
  return newJob;
};

export const updateJob = async (id: string, payload: any) => {
  const updatedJob = await prisma.job.update({ where: { id }, data: payload });
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