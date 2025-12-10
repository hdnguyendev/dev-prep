import "dotenv/config";
import prisma from "../src/app/db/prisma";

async function clearData() {
  console.log("🧹 Clearing existing data...");

  await prisma.$transaction([
    prisma.jobSkill.deleteMany(),
    prisma.jobCategory.deleteMany(),
    prisma.savedJob.deleteMany(),
    prisma.interviewExchange.deleteMany(),
    prisma.interview.deleteMany(),
    prisma.applicationHistory.deleteMany(),
    prisma.applicationNote.deleteMany(),
    prisma.application.deleteMany(),
    prisma.experience.deleteMany(),
    prisma.education.deleteMany(),
    prisma.candidateSkill.deleteMany(),
    prisma.job.deleteMany(),
    prisma.category.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.recruiterProfile.deleteMany(),
    prisma.candidateProfile.deleteMany(),
    prisma.message.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.company.deleteMany(),
    prisma.user.deleteMany(),
    prisma.questionBank.deleteMany(),
  ]);
}

async function main() {
  console.log("🌱 Starting seed...");
  await clearData();

  // Base data (auto-generated ids)
  const companyHitech = await prisma.company.create({
    data: {
      name: "HiTech Labs",
      slug: "hitech-labs",
      website: "https://hitech.example.com",
      industry: "Software",
      companySize: "51-200",
      city: "Ho Chi Minh City",
      country: "Vietnam",
      isVerified: true,
    },
  });

  const companyZen = await prisma.company.create({
    data: {
      name: "Zen Commerce",
      slug: "zen-commerce",
      website: "https://zencommerce.example.com",
      industry: "E-Commerce",
      companySize: "201-500",
      city: "Hanoi",
      country: "Vietnam",
      isVerified: true,
    },
  });
  console.log("🏢 Created companies");

  const skillRecords = await prisma.$transaction([
    prisma.skill.create({ data: { name: "Node.js" } }),
    prisma.skill.create({ data: { name: "React" } }),
    prisma.skill.create({ data: { name: "TypeScript" } }),
    prisma.skill.create({ data: { name: "PostgreSQL" } }),
    prisma.skill.create({ data: { name: "Docker" } }),
    prisma.skill.create({ data: { name: "Kubernetes" } }),
    prisma.skill.create({ data: { name: "AWS" } }),
  ]);

  const categoryRecords = await prisma.$transaction([
    prisma.category.create({ data: { name: "Engineering" } }),
    prisma.category.create({ data: { name: "DevOps" } }),
    prisma.category.create({ data: { name: "Product" } }),
  ]);

  const skillMap = Object.fromEntries(skillRecords.map((s) => [s.name, s.id]));
  const categoryMap = Object.fromEntries(categoryRecords.map((c) => [c.name, c.id]));
  const getSkillId = (name: keyof typeof skillMap) => {
    const id = skillMap[name];
    if (!id) {
      throw new Error(`Skill not found: ${name}`);
    }
    return id;
  };
  const getCategoryId = (name: keyof typeof categoryMap) => {
    const id = categoryMap[name];
    if (!id) {
      throw new Error(`Category not found: ${name}`);
    }
    return id;
  };
  console.log("🛠️  Created skills & categories");

  // Users
  const [admin, recruiter1, recruiter2, candidate1, candidate2] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@example.com",
        passwordHash: "admin-password-hash",
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "recruiter@hitech.com",
        passwordHash: "recruiter-password-hash",
        firstName: "Huy",
        lastName: "Tran",
        role: "RECRUITER",
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "recruiter@zen.com",
        passwordHash: "recruiter2-password-hash",
        firstName: "Minh",
        lastName: "Nguyen",
        role: "RECRUITER",
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "linh.candidate@example.com",
        passwordHash: "candidate-password-hash",
        firstName: "Linh",
        lastName: "Pham",
        role: "CANDIDATE",
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "tuan.candidate@example.com",
        passwordHash: "candidate2-password-hash",
        firstName: "Tuan",
        lastName: "Le",
        role: "CANDIDATE",
        isVerified: true,
      },
    }),
  ]);
  console.log("👤 Created users");

  // Profiles
  const recruiterProfile1 = await prisma.recruiterProfile.create({
    data: {
      userId: recruiter1.id,
      companyId: companyHitech.id,
      position: "Talent Acquisition Manager",
    },
  });

  const recruiterProfile2 = await prisma.recruiterProfile.create({
    data: {
      userId: recruiter2.id,
      companyId: companyZen.id,
      position: "Lead Recruiter",
    },
  });

  const candidateProfile1 = await prisma.candidateProfile.create({
    data: {
      userId: candidate1.id,
      headline: "Full Stack Developer | Node.js / React",
      bio: "5+ years building web apps with focus on DX and scalability.",
      linkedin: "https://linkedin.com/in/linhpham",
      github: "https://github.com/linhpham",
      experiences: {
        create: [
          {
            companyName: "StartTech",
            position: "Full Stack Developer",
            location: "Ho Chi Minh City",
            startDate: new Date("2021-06-01"),
            endDate: null,
            isCurrent: true,
            description: "Building internal tools with Node.js, React, and PostgreSQL.",
          },
        ],
      },
      educations: {
        create: [
          {
            institution: "HCMC University of Technology",
            degree: "Bachelor of Computer Science",
            fieldOfStudy: "Software Engineering",
            startDate: new Date("2016-09-01"),
            endDate: new Date("2020-06-01"),
            grade: "GPA 3.5/4",
          },
        ],
      },
      skills: {
        create: [
          { skillId: getSkillId("Node.js"), level: "Advanced" },
          { skillId: getSkillId("React"), level: "Advanced" },
          { skillId: getSkillId("TypeScript"), level: "Advanced" },
        ],
      },
    },
  });

  const candidateProfile2 = await prisma.candidateProfile.create({
    data: {
      userId: candidate2.id,
      headline: "DevOps Engineer | AWS / Kubernetes",
      bio: "3+ years automating cloud infra and observability.",
      github: "https://github.com/tuanle",
      experiences: {
        create: [
          {
            companyName: "Cloudify",
            position: "DevOps Engineer",
            location: "Da Nang",
            startDate: new Date("2022-01-01"),
            endDate: null,
            isCurrent: true,
            description: "Maintaining CI/CD pipelines and k8s workloads.",
          },
        ],
      },
      skills: {
        create: [
          { skillId: getSkillId("AWS"), level: "Intermediate" },
          { skillId: getSkillId("Docker"), level: "Advanced" },
          { skillId: getSkillId("Kubernetes"), level: "Intermediate" },
        ],
      },
    },
  });

  console.log("📇 Created profiles");

  // Jobs
  const job1 = await prisma.job.create({
    data: {
      slug: "senior-fullstack-developer",
      title: "Senior Full Stack Developer",
      companyId: companyHitech.id,
      recruiterId: recruiterProfile1.id,
      description: "Lead development of core platform services and frontend experiences.",
      requirements: "<ul><li>5+ years with Node.js</li><li>React/TS expertise</li></ul>",
      benefits: "<ul><li>Hybrid work</li><li>Premium healthcare</li></ul>",
      type: "FULL_TIME",
      status: "PUBLISHED",
      location: "Ho Chi Minh City",
      isRemote: true,
      salaryMin: 2000,
      salaryMax: 3200,
      currency: "USD",
      experienceLevel: "Senior",
      quantity: 2,
      publishedAt: new Date(),
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  const job2 = await prisma.job.create({
    data: {
      slug: "devops-engineer",
      title: "DevOps Engineer",
      companyId: companyZen.id,
      recruiterId: recruiterProfile2.id,
      description: "Own CI/CD and cloud infrastructure for e-commerce stack.",
      requirements: "<ul><li>AWS & Docker</li><li>Monitoring & incident response</li></ul>",
      benefits: "<ul><li>Remote friendly</li><li>Learning budget</li></ul>",
      type: "FULL_TIME",
      status: "PUBLISHED",
      location: "Hanoi",
      isRemote: true,
      salaryMin: 1800,
      salaryMax: 2800,
      currency: "USD",
      experienceLevel: "Mid",
      quantity: 1,
      publishedAt: new Date(),
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
    },
  });

  const job3 = await prisma.job.create({
    data: {
      slug: "product-manager",
      title: "Product Manager",
      companyId: companyHitech.id,
      recruiterId: recruiterProfile1.id,
      description: "Drive product roadmap for AI recruiting platform.",
      requirements: "<ul><li>3+ years PM</li><li>Data-informed decision making</li></ul>",
      benefits: "<ul><li>Stock options</li><li>Training budget</li></ul>",
      type: "FULL_TIME",
      status: "PUBLISHED",
      location: "Remote",
      isRemote: true,
      salaryMin: 1800,
      salaryMax: 2600,
      currency: "USD",
      experienceLevel: "Mid",
      quantity: 1,
      publishedAt: new Date(),
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25),
    },
  });

  console.log("💼 Created jobs");

  await prisma.jobSkill.createMany({
    data: [
      { jobId: job1.id, skillId: getSkillId("Node.js"), isRequired: true },
      { jobId: job1.id, skillId: getSkillId("React"), isRequired: true },
      { jobId: job1.id, skillId: getSkillId("TypeScript"), isRequired: true },
      { jobId: job2.id, skillId: getSkillId("Docker"), isRequired: true },
      { jobId: job2.id, skillId: getSkillId("AWS"), isRequired: true },
      { jobId: job2.id, skillId: getSkillId("Kubernetes"), isRequired: false },
      { jobId: job3.id, skillId: getSkillId("React"), isRequired: false },
      { jobId: job3.id, skillId: getSkillId("TypeScript"), isRequired: false },
    ],
  });

  await prisma.jobCategory.createMany({
    data: [
      { jobId: job1.id, categoryId: getCategoryId("Engineering") },
      { jobId: job2.id, categoryId: getCategoryId("DevOps") },
      { jobId: job3.id, categoryId: getCategoryId("Product") },
    ],
  });

  console.log("🧩 Linked job skills & categories");

  // Candidate interactions
  await prisma.savedJob.createMany({
    data: [
      { candidateId: candidateProfile1.id, jobId: job1.id },
      { candidateId: candidateProfile2.id, jobId: job2.id },
    ],
  });

  await prisma.application.create({
    data: {
      jobId: job1.id,
      candidateId: candidateProfile1.id,
      resumeUrl: "https://files.example.com/cv/linhpham.pdf",
      coverLetter: "Excited to contribute to the HiTech platform.",
      status: "REVIEWING",
      interviews: {
        create: [
          {
            title: "AI Screening Round",
            type: "AI_VIDEO",
            status: "PENDING",
            accessCode: "AI-SCREEN-001",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
          },
        ],
      },
      history: {
        create: [
          { status: "APPLIED", note: "Candidate submitted application." },
          { status: "REVIEWING", note: "Recruiter started reviewing CV." },
        ],
      },
    },
  });

  await prisma.application.create({
    data: {
      jobId: job2.id,
      candidateId: candidateProfile2.id,
      resumeUrl: "https://files.example.com/cv/tuanle.pdf",
      coverLetter: "Experienced with AWS and k8s, keen to improve reliability.",
      status: "APPLIED",
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
