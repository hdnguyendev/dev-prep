-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERN');

-- CreateEnum
CREATE TYPE "WorkModel" AS ENUM ('ON_SITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "JobLevel" AS ENUM ('JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "employment_type" "EmploymentType" NOT NULL,
    "work_model" "WorkModel" NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "min_salary" INTEGER NOT NULL,
    "max_salary" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "experience_min_years" INTEGER NOT NULL,
    "experience_max_years" INTEGER NOT NULL,
    "job_level" "JobLevel" NOT NULL,
    "requirements" TEXT NOT NULL,
    "nice_to_have" TEXT NOT NULL,
    "responsibilities" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");
