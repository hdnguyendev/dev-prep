import "dotenv/config";
import { prisma } from "../src/app/db/prisma";

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data (optional - comment out if you want to keep existing data)
  await prisma.job.deleteMany();
  console.log("🗑️  Cleared existing jobs");

  // Seed sample jobs
  const jobs = [
    {
      title: "Senior Full Stack Developer",
      description: "We are looking for an experienced full stack developer to join our team and help build scalable web applications.",
      slug: "senior-full-stack-developer",
      company_id: "company-1",
      department_id: "dept-engineering",
      employment_type: "FULL_TIME" as const,
      work_model: "REMOTE" as const,
      country: "United States",
      city: "San Francisco",
      address: "123 Tech Street, San Francisco, CA 94102",
      min_salary: 120000,
      max_salary: 180000,
      currency: "USD",
      experience_min_years: 5,
      experience_max_years: 10,
      job_level: "SENIOR" as const,
      requirements: "5+ years of experience with React, Node.js, and TypeScript. Strong understanding of database design and RESTful APIs.",
      nice_to_have: "Experience with GraphQL, Docker, AWS, and microservices architecture.",
      responsibilities: "Design and develop new features, collaborate with cross-functional teams, mentor junior developers, and participate in code reviews.",
      skills: "React, Node.js, TypeScript, PostgreSQL, Git, REST APIs",
    },
    {
      title: "Junior Frontend Developer",
      description: "Great opportunity for a junior developer to grow their skills in a supportive environment.",
      slug: "junior-frontend-developer",
      company_id: "company-1",
      department_id: "dept-engineering",
      employment_type: "FULL_TIME" as const,
      work_model: "HYBRID" as const,
      country: "United States",
      city: "New York",
      address: "456 Innovation Ave, New York, NY 10001",
      min_salary: 60000,
      max_salary: 85000,
      currency: "USD",
      experience_min_years: 0,
      experience_max_years: 2,
      job_level: "JUNIOR" as const,
      requirements: "Basic knowledge of HTML, CSS, and JavaScript. Familiarity with React is a plus.",
      nice_to_have: "Experience with TypeScript, Tailwind CSS, and version control systems.",
      responsibilities: "Build user interfaces, fix bugs, write tests, and collaborate with designers and backend developers.",
      skills: "HTML, CSS, JavaScript, React, Git",
    },
    {
      title: "Lead Backend Engineer",
      description: "Lead our backend engineering team and architect scalable systems.",
      slug: "lead-backend-engineer",
      company_id: "company-2",
      department_id: "dept-engineering",
      employment_type: "FULL_TIME" as const,
      work_model: "ON_SITE" as const,
      country: "United States",
      city: "Seattle",
      address: "789 Cloud Boulevard, Seattle, WA 98101",
      min_salary: 150000,
      max_salary: 220000,
      currency: "USD",
      experience_min_years: 8,
      experience_max_years: 15,
      job_level: "LEAD" as const,
      requirements: "8+ years of backend development experience. Strong leadership skills and experience with distributed systems.",
      nice_to_have: "Experience with Kubernetes, microservices, event-driven architecture, and team management.",
      responsibilities: "Lead backend engineering team, design system architecture, make technical decisions, and mentor engineers.",
      skills: "Node.js, Python, PostgreSQL, Redis, Docker, Kubernetes, System Design",
    },
    {
      title: "DevOps Engineer",
      description: "Join our infrastructure team to build and maintain our cloud infrastructure.",
      slug: "devops-engineer",
      company_id: "company-2",
      department_id: "dept-infrastructure",
      employment_type: "FULL_TIME" as const,
      work_model: "REMOTE" as const,
      country: "United States",
      city: "Austin",
      address: "321 DevOps Drive, Austin, TX 78701",
      min_salary: 110000,
      max_salary: 160000,
      currency: "USD",
      experience_min_years: 3,
      experience_max_years: 7,
      job_level: "MID" as const,
      requirements: "3+ years of DevOps experience. Strong knowledge of AWS, Docker, and CI/CD pipelines.",
      nice_to_have: "Experience with Terraform, Kubernetes, monitoring tools (Datadog, New Relic), and infrastructure as code.",
      responsibilities: "Manage cloud infrastructure, automate deployments, monitor system health, and optimize performance.",
      skills: "AWS, Docker, Kubernetes, CI/CD, Terraform, Linux, Bash",
    },
    {
      title: "Product Manager",
      description: "Drive product strategy and work closely with engineering and design teams.",
      slug: "product-manager",
      company_id: "company-1",
      department_id: "dept-product",
      employment_type: "FULL_TIME" as const,
      work_model: "HYBRID" as const,
      country: "United States",
      city: "Boston",
      address: "654 Product Park, Boston, MA 02101",
      min_salary: 100000,
      max_salary: 150000,
      currency: "USD",
      experience_min_years: 4,
      experience_max_years: 8,
      job_level: "MID" as const,
      requirements: "4+ years of product management experience. Strong analytical and communication skills.",
      nice_to_have: "Technical background, experience with Agile/Scrum, and data analysis tools.",
      responsibilities: "Define product roadmap, gather requirements, work with stakeholders, and prioritize features.",
      skills: "Product Management, Agile, Data Analysis, Communication, Strategy",
    },
  ];

  for (const job of jobs) {
    await prisma.job.create({
      data: job,
    });
    console.log(`✅ Created job: ${job.title}`);
  }

  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
