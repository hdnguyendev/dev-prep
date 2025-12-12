import "dotenv/config";
import prisma from "../src/app/db/prisma";
import {
  ApplicationStatus,
  Currency,
  InterviewStatus,
  InterviewType,
  JobStatus,
  JobType,
  UserRole,
} from "../src/generated/prisma";

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

const skillSeeds = [
  { name: "Node.js", iconUrl: "https://dummyimage.com/120x120/0f172a/22c55e&text=Node" },
  { name: "React", iconUrl: "https://dummyimage.com/120x120/0f172a/38bdf8&text=React" },
  { name: "TypeScript", iconUrl: "https://dummyimage.com/120x120/0f172a/facc15&text=TS" },
  { name: "PostgreSQL", iconUrl: "https://dummyimage.com/120x120/0f172a/60a5fa&text=PG" },
  { name: "Docker", iconUrl: "https://dummyimage.com/120x120/0f172a/38bdf8&text=Dkr" },
  { name: "Kubernetes", iconUrl: "https://dummyimage.com/120x120/0f172a/8b5cf6&text=K8s" },
  { name: "AWS", iconUrl: "https://dummyimage.com/120x120/0f172a/f97316&text=AWS" },
  { name: "GCP", iconUrl: "https://dummyimage.com/120x120/0f172a/22d3ee&text=GCP" },
  { name: "Python", iconUrl: "https://dummyimage.com/120x120/0f172a/facc15&text=Py" },
  { name: "Terraform", iconUrl: "https://dummyimage.com/120x120/0f172a/22c55e&text=Tf" },
  { name: "Figma", iconUrl: "https://dummyimage.com/120x120/0f172a/f472b6&text=Fg" },
  { name: "Go", iconUrl: "https://dummyimage.com/120x120/0f172a/67e8f9&text=Go" },
  { name: "Rust", iconUrl: "https://dummyimage.com/120x120/0f172a/f97316&text=Rust" },
  { name: "Java", iconUrl: "https://dummyimage.com/120x120/0f172a/ef4444&text=Java" },
  { name: "C#", iconUrl: "https://dummyimage.com/120x120/0f172a/a855f7&text=C%23" },
  { name: "Angular", iconUrl: "https://dummyimage.com/120x120/0f172a/ef4444&text=Ng" },
  { name: "Vue", iconUrl: "https://dummyimage.com/120x120/0f172a/22c55e&text=Vue" },
  { name: "Swift", iconUrl: "https://dummyimage.com/120x120/0f172a/f97316&text=Swift" },
  { name: "Kotlin", iconUrl: "https://dummyimage.com/120x120/0f172a/f59e0b&text=Kt" },
  { name: "Flutter", iconUrl: "https://dummyimage.com/120x120/0f172a/38bdf8&text=Flt" },
] as const;
const categorySeeds = [
  { name: "Engineering", iconUrl: "https://dummyimage.com/120x120/0f172a/38bdf8&text=Eng" },
  { name: "DevOps", iconUrl: "https://dummyimage.com/120x120/0f172a/22c55e&text=Ops" },
  { name: "Product", iconUrl: "https://dummyimage.com/120x120/0f172a/f97316&text=PM" },
  { name: "Design", iconUrl: "https://dummyimage.com/120x120/0f172a/f472b6&text=UX" },
  { name: "Data", iconUrl: "https://dummyimage.com/120x120/0f172a/60a5fa&text=Data" },
  { name: "AI/ML", iconUrl: "https://dummyimage.com/120x120/0f172a/a855f7&text=AI" },
  { name: "Security", iconUrl: "https://dummyimage.com/120x120/0f172a/ef4444&text=Sec" },
  { name: "Mobile", iconUrl: "https://dummyimage.com/120x120/0f172a/f59e0b&text=Mob" },
] as const;
const companySeeds = [
  {
    name: "HiTech Labs",
    slug: "hitech-labs",
    website: "https://hitech.example.com",
    industry: "Software",
    companySize: "51-200",
    city: "Ho Chi Minh City",
    country: "Vietnam",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/0f172a/38bdf8&text=HiTech",
    coverUrl: "https://dummyimage.com/1200x360/020617/38bdf8&text=HiTech+Cover",
  },
  {
    name: "Zen Commerce",
    slug: "zen-commerce",
    website: "https://zencommerce.example.com",
    industry: "E-Commerce",
    companySize: "201-500",
    city: "Hanoi",
    country: "Vietnam",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/0f172a/22c55e&text=Zen",
    coverUrl: "https://dummyimage.com/1200x360/020617/22c55e&text=Zen+Cover",
  },
  {
    name: "Nova Fintech",
    slug: "nova-fintech",
    website: "https://nova-fintech.example.com",
    industry: "Fintech",
    companySize: "101-250",
    city: "Singapore",
    country: "Singapore",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/0f172a/f97316&text=Nova",
    coverUrl: "https://dummyimage.com/1200x360/020617/f97316&text=Nova+Cover",
  },
  {
    name: "Aero Mobility",
    slug: "aero-mobility",
    website: "https://aero-mobility.example.com",
    industry: "Mobility",
    companySize: "51-200",
    city: "Da Nang",
    country: "Vietnam",
    isVerified: false,
    logoUrl: "https://dummyimage.com/200x200/0f172a/60a5fa&text=Aero",
    coverUrl: "https://dummyimage.com/1200x360/020617/60a5fa&text=Aero+Cover",
  },
];

const questionBankSeeds = [
  { content: "Describe how you design a scalable REST API.", category: "Backend", difficulty: "Medium", expectedKeywords: ["caching", "pagination", "rate limit"] },
  { content: "Explain CAP theorem and when to choose AP vs CP.", category: "System Design", difficulty: "Hard", expectedKeywords: ["consistency", "availability", "partition"] },
  { content: "How do you optimize React rendering?", category: "Frontend", difficulty: "Medium", expectedKeywords: ["memo", "suspense", "virtualization"] },
];

const userSeeds = [
  { email: "admin@example.com", passwordHash: "admin", firstName: "Admin", lastName: "User", role: UserRole.ADMIN },
  { email: "recruiter@hitech.com", passwordHash: "pw", firstName: "Huy", lastName: "Tran", role: UserRole.RECRUITER },
  { email: "recruiter@zen.com", passwordHash: "pw", firstName: "Minh", lastName: "Nguyen", role: UserRole.RECRUITER },
  { email: "recruiter@nova.com", passwordHash: "pw", firstName: "Alice", lastName: "Tan", role: UserRole.RECRUITER },
  { email: "linh.candidate@example.com", passwordHash: "pw", firstName: "Linh", lastName: "Pham", role: UserRole.CANDIDATE },
  { email: "tuan.candidate@example.com", passwordHash: "pw", firstName: "Tuan", lastName: "Le", role: UserRole.CANDIDATE },
  { email: "mai.candidate@example.com", passwordHash: "pw", firstName: "Mai", lastName: "Vo", role: UserRole.CANDIDATE },
];

const must = <T>(val: T | undefined | null, name: string): T => {
  if (val === undefined || val === null) throw new Error(`${name} missing`);
  return val;
};

async function main() {
  console.log("🌱 Starting seed...");
  await clearData();

  const companyRecords = await prisma.$transaction(companySeeds.map((c) => prisma.company.create({ data: c })));
  const companyHitech = must(companyRecords[0], "companyHitech");
  const companyZen = must(companyRecords[1], "companyZen");
  const companyNova = must(companyRecords[2], "companyNova");
  const companyAero = must(companyRecords[3], "companyAero");

  const skillRecords = await prisma.$transaction(skillSeeds.map((s) => prisma.skill.create({ data: s })));
  const categoryRecords = await prisma.$transaction(categorySeeds.map((c) => prisma.category.create({ data: c })));
  const skillMap = Object.fromEntries(skillRecords.map((s) => [s.name, s.id]));
  const categoryMap = Object.fromEntries(categoryRecords.map((c) => [c.name, c.id]));
  const sid = (name: string) => must(skillMap[name], `Skill ${name}`);
  const cid = (name: string) => must(categoryMap[name], `Category ${name}`);

  console.log("🏢 Companies, skills, categories created");

  // Users
  const users = await Promise.all(userSeeds.map((u) => prisma.user.create({ data: { ...u, isVerified: true } })));
  const admin = must(users[0], "admin");
  const r1 = must(users[1], "r1");
  const r2 = must(users[2], "r2");
  const r3 = must(users[3], "r3");
  const c1User = must(users[4], "c1User");
  const c2User = must(users[5], "c2User");
  const c3User = must(users[6], "c3User");

  // Recruiters
  const rec1 = await prisma.recruiterProfile.create({ data: { userId: r1.id, companyId: companyHitech.id, position: "Talent Acquisition Manager" } });
  const rec2 = await prisma.recruiterProfile.create({ data: { userId: r2.id, companyId: companyZen.id, position: "Lead Recruiter" } });
  const rec3 = await prisma.recruiterProfile.create({ data: { userId: r3.id, companyId: companyNova.id, position: "Senior Recruiter" } });

  // Candidates
  const candidateProfile1 = await prisma.candidateProfile.create({
    data: {
      userId: c1User.id,
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
          { skillId: sid("Node.js"), level: "Advanced" },
          { skillId: sid("React"), level: "Advanced" },
          { skillId: sid("TypeScript"), level: "Advanced" },
        ],
      },
    },
  });

  const candidateProfile2 = await prisma.candidateProfile.create({
    data: {
      userId: c2User.id,
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
          { skillId: sid("AWS"), level: "Intermediate" },
          { skillId: sid("Docker"), level: "Advanced" },
          { skillId: sid("Kubernetes"), level: "Intermediate" },
        ],
      },
    },
  });

  const candidateProfile3 = await prisma.candidateProfile.create({
    data: {
      userId: c3User.id,
      headline: "Product Designer | UX/UI",
      bio: "4+ years crafting B2B and fintech experiences.",
      linkedin: "https://linkedin.com/in/mai-vo",
      experiences: {
        create: [
          {
            companyName: "PayNow",
            position: "Product Designer",
            location: "Singapore",
            startDate: new Date("2020-03-01"),
            endDate: null,
            isCurrent: true,
            description: "Designing onboarding and payments flows.",
          },
        ],
      },
      skills: {
        create: [
          { skillId: sid("Figma"), level: "Advanced" },
          { skillId: sid("React"), level: "Intermediate" },
        ],
      },
    },
  });

  console.log("📇 Created profiles");

  // Jobs
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        slug: "senior-fullstack-developer",
        title: "Senior Full Stack Developer",
        companyId: companyHitech.id,
        recruiterId: rec1.id,
        description: "Lead development of core platform services and frontend experiences.",
        requirements: "<ul><li>5+ years with Node.js</li><li>React/TS expertise</li></ul>",
        benefits: "<ul><li>Hybrid work</li><li>Premium healthcare</li></ul>",
        type: JobType.FULL_TIME,
        status: JobStatus.PUBLISHED,
        location: "Ho Chi Minh City",
        isRemote: true,
        salaryMin: 2000,
        salaryMax: 3200,
        currency: Currency.USD,
        experienceLevel: "Senior",
        quantity: 2,
        publishedAt: new Date(),
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    }),
    prisma.job.create({
      data: {
        slug: "devops-engineer",
        title: "DevOps Engineer",
        companyId: companyZen.id,
        recruiterId: rec2.id,
        description: "Own CI/CD and cloud infrastructure for e-commerce stack.",
        requirements: "<ul><li>AWS & Docker</li><li>Monitoring & incident response</li></ul>",
        benefits: "<ul><li>Remote friendly</li><li>Learning budget</li></ul>",
        type: JobType.FULL_TIME,
        status: JobStatus.PUBLISHED,
        location: "Hanoi",
        isRemote: true,
        salaryMin: 1800,
        salaryMax: 2800,
        currency: Currency.USD,
        experienceLevel: "Mid",
        quantity: 1,
        publishedAt: new Date(),
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
      },
    }),
    prisma.job.create({
      data: {
        slug: "product-manager",
        title: "Product Manager",
        companyId: companyHitech.id,
        recruiterId: rec1.id,
        description: "Drive product roadmap for AI recruiting platform.",
        requirements: "<ul><li>3+ years PM</li><li>Data-informed decision making</li></ul>",
        benefits: "<ul><li>Stock options</li><li>Training budget</li></ul>",
        type: JobType.FULL_TIME,
        status: JobStatus.PUBLISHED,
        location: "Remote",
        isRemote: true,
        salaryMin: 1800,
        salaryMax: 2600,
        currency: Currency.USD,
        experienceLevel: "Mid",
        quantity: 1,
        publishedAt: new Date(),
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25),
      },
    }),
    prisma.job.create({
      data: {
        slug: "fintech-backend-engineer",
        title: "Fintech Backend Engineer",
        companyId: companyNova.id,
        recruiterId: rec3.id,
        description: "Build payment rails and ledger services.",
        requirements: "<ul><li>Node.js or Python</li><li>Event-driven systems</li></ul>",
        benefits: "<ul><li>ESOP</li><li>Wellness budget</li></ul>",
        type: JobType.FULL_TIME,
        status: JobStatus.PUBLISHED,
        location: "Singapore",
        isRemote: false,
        salaryMin: 3000,
        salaryMax: 4500,
        currency: Currency.USD,
        experienceLevel: "Senior",
        quantity: 2,
        publishedAt: new Date(),
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 35),
      },
    }),
    prisma.job.create({
      data: {
        slug: "ux-ui-designer",
        title: "UX/UI Designer",
        companyId: companyAero.id,
        recruiterId: rec3.id,
        description: "Design mobile experiences for mobility products.",
        requirements: "<ul><li>Figma</li><li>Design systems</li></ul>",
        benefits: "<ul><li>Flexible hours</li><li>Macbook provided</li></ul>",
        type: JobType.FULL_TIME,
        status: JobStatus.PUBLISHED,
        location: "Da Nang",
        isRemote: true,
        salaryMin: 1500,
        salaryMax: 2300,
        currency: Currency.USD,
        experienceLevel: "Mid",
        quantity: 1,
        publishedAt: new Date(),
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18),
      },
    }),
  ]);

  const [job1, job2, job3, job4, job5] = jobs;
  console.log("💼 Created jobs");

  await prisma.jobSkill.createMany({
    data: [
      { jobId: job1.id, skillId: sid("Node.js"), isRequired: true },
      { jobId: job1.id, skillId: sid("React"), isRequired: true },
      { jobId: job1.id, skillId: sid("TypeScript"), isRequired: true },
      { jobId: job2.id, skillId: sid("Docker"), isRequired: true },
      { jobId: job2.id, skillId: sid("AWS"), isRequired: true },
      { jobId: job2.id, skillId: sid("Kubernetes"), isRequired: false },
      { jobId: job3.id, skillId: sid("React"), isRequired: false },
      { jobId: job3.id, skillId: sid("TypeScript"), isRequired: false },
      { jobId: job4.id, skillId: sid("Node.js"), isRequired: true },
      { jobId: job4.id, skillId: sid("PostgreSQL"), isRequired: true },
      { jobId: job4.id, skillId: sid("AWS"), isRequired: true },
      { jobId: job4.id, skillId: sid("Terraform"), isRequired: false },
      { jobId: job5.id, skillId: sid("Figma"), isRequired: true },
      { jobId: job5.id, skillId: sid("React"), isRequired: false },
    ],
  });

  await prisma.jobCategory.createMany({
    data: [
      { jobId: job1.id, categoryId: cid("Engineering") },
      { jobId: job2.id, categoryId: cid("DevOps") },
      { jobId: job3.id, categoryId: cid("Product") },
      { jobId: job4.id, categoryId: cid("Engineering") },
      { jobId: job4.id, categoryId: cid("Data") },
      { jobId: job5.id, categoryId: cid("Design") },
    ],
  });
  console.log("🧩 Linked job skills & categories");

  await prisma.savedJob.createMany({
    data: [
      { candidateId: candidateProfile1.id, jobId: job1.id },
      { candidateId: candidateProfile1.id, jobId: job4.id },
      { candidateId: candidateProfile2.id, jobId: job2.id },
      { candidateId: candidateProfile3.id, jobId: job5.id },
    ],
  });

  const app1 = await prisma.application.create({
    data: {
      jobId: job1.id,
      candidateId: candidateProfile1.id,
      resumeUrl: "https://files.example.com/cv/linhpham.pdf",
      coverLetter: "Excited to contribute to the HiTech platform.",
      status: ApplicationStatus.REVIEWING,
      interviews: {
        create: [
          {
            title: "AI Screening Round",
            type: InterviewType.AI_VIDEO,
            status: InterviewStatus.PENDING,
            accessCode: "AI-SCREEN-001",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
          },
        ],
      },
      history: {
        create: [
          { status: ApplicationStatus.APPLIED, note: "Candidate submitted application." },
          { status: ApplicationStatus.REVIEWING, note: "Recruiter started reviewing CV." },
        ],
      },
    },
  });

  const app2 = await prisma.application.create({
    data: {
      jobId: job2.id,
      candidateId: candidateProfile2.id,
      resumeUrl: "https://files.example.com/cv/tuanle.pdf",
      coverLetter: "Experienced with AWS and k8s, keen to improve reliability.",
      status: ApplicationStatus.APPLIED,
    },
  });

  const app3 = await prisma.application.create({
    data: {
      jobId: job4.id,
      candidateId: candidateProfile1.id,
      status: ApplicationStatus.SHORTLISTED,
      coverLetter: "Payment rails experience, interested in fintech.",
      resumeUrl: "https://files.example.com/cv/linhpham.pdf",
    },
  });

  const app4 = await prisma.application.create({
    data: {
      jobId: job5.id,
      candidateId: candidateProfile3.id,
      status: ApplicationStatus.APPLIED,
      resumeUrl: "https://files.example.com/cv/maivo.pdf",
      coverLetter: "Passionate about mobility UX.",
    },
  });

  await prisma.applicationHistory.createMany({
    data: [
      { applicationId: app2.id, status: ApplicationStatus.APPLIED, note: "Received" },
      { applicationId: app3.id, status: ApplicationStatus.APPLIED, note: "Received" },
      { applicationId: app3.id, status: ApplicationStatus.SHORTLISTED, note: "Skills match" },
    ],
  });

  await prisma.interview.create({
    data: {
      applicationId: app2.id,
      title: "Tech Round",
      type: InterviewType.CODING_TEST,
      status: InterviewStatus.PENDING,
      accessCode: "CODE-DEVOPS-001",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    },
  });

  await prisma.message.createMany({
    data: [
      { senderId: r1.id, receiverId: c1User.id, content: "Thanks for applying, we'll review soon!", jobId: job1.id },
      { senderId: c1User.id, receiverId: r1.id, content: "Happy to provide more details if needed.", jobId: job1.id },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: c1User.id, title: "Application received", message: "We got your application for Senior Full Stack Developer", type: "APPLICATION_UPDATE" },
      { userId: c2User.id, title: "Interview scheduled", message: "Tech round is ready for you", type: "INTERVIEW_REMINDER" },
    ],
  });

  await prisma.questionBank.createMany({ data: questionBankSeeds });

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
