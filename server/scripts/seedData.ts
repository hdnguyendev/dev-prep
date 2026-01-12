import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  Currency,
  JobStatus,
  JobType,
  UserRole,
} from "../src/generated/prisma";
import { hashPassword } from "../src/app/utils/crypto";

// Use a single pg Pool + PrismaPg adapter for seeding
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is required for seeding. Please set it in your environment.");
}

const pool = new Pool({
  connectionString: dbUrl,
  max: 5,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["error"],
});

// ============================================
// 1. REAL IT COMPANIES DATA (50 companies)
// ============================================
const itCompanies = [
  { name: "Google", industry: "Technology", city: "Mountain View", country: "USA", foundedYear: 1998 },
  { name: "Microsoft", industry: "Software", city: "Redmond", country: "USA", foundedYear: 1975 },
  { name: "Apple", industry: "Technology", city: "Cupertino", country: "USA", foundedYear: 1976 },
  { name: "Amazon", industry: "E-Commerce & Cloud", city: "Seattle", country: "USA", foundedYear: 1994 },
  { name: "Meta (Facebook)", industry: "Social Media", city: "Menlo Park", country: "USA", foundedYear: 2004 },
  { name: "Netflix", industry: "Streaming", city: "Los Gatos", country: "USA", foundedYear: 1997 },
  { name: "Tesla", industry: "Automotive & Tech", city: "Austin", country: "USA", foundedYear: 2003 },
  { name: "Uber", industry: "Transportation Tech", city: "San Francisco", country: "USA", foundedYear: 2009 },
  { name: "Airbnb", industry: "Hospitality Tech", city: "San Francisco", country: "USA", foundedYear: 2008 },
  { name: "Stripe", industry: "Fintech", city: "San Francisco", country: "USA", foundedYear: 2010 },
  { name: "Shopify", industry: "E-Commerce Platform", city: "Ottawa", country: "Canada", foundedYear: 2006 },
  { name: "Spotify", industry: "Music Streaming", city: "Stockholm", country: "Sweden", foundedYear: 2006 },
  { name: "Adobe", industry: "Software", city: "San Jose", country: "USA", foundedYear: 1982 },
  { name: "Oracle", industry: "Enterprise Software", city: "Austin", country: "USA", foundedYear: 1977 },
  { name: "IBM", industry: "Technology Services", city: "Armonk", country: "USA", foundedYear: 1911 },
  { name: "Intel", industry: "Semiconductors", city: "Santa Clara", country: "USA", foundedYear: 1968 },
  { name: "NVIDIA", industry: "Graphics & AI", city: "Santa Clara", country: "USA", foundedYear: 1993 },
  { name: "Salesforce", industry: "CRM Software", city: "San Francisco", country: "USA", foundedYear: 1999 },
  { name: "LinkedIn", industry: "Professional Network", city: "Sunnyvale", country: "USA", foundedYear: 2002 },
  { name: "Twitter", industry: "Social Media", city: "San Francisco", country: "USA", foundedYear: 2006 },
  { name: "GitHub", industry: "Developer Tools", city: "San Francisco", country: "USA", foundedYear: 2008 },
  { name: "Atlassian", industry: "Collaboration Software", city: "Sydney", country: "Australia", foundedYear: 2002 },
  { name: "Zoom", industry: "Video Conferencing", city: "San Jose", country: "USA", foundedYear: 2011 },
  { name: "Slack", industry: "Team Communication", city: "San Francisco", country: "USA", foundedYear: 2009 },
  { name: "Dropbox", industry: "Cloud Storage", city: "San Francisco", country: "USA", foundedYear: 2007 },
  { name: "Palantir", industry: "Big Data Analytics", city: "Denver", country: "USA", foundedYear: 2003 },
  { name: "Snowflake", industry: "Cloud Data Platform", city: "Bozeman", country: "USA", foundedYear: 2012 },
  { name: "Databricks", industry: "Data & AI Platform", city: "San Francisco", country: "USA", foundedYear: 2013 },
  { name: "MongoDB", industry: "Database Software", city: "New York", country: "USA", foundedYear: 2007 },
  { name: "Elastic", industry: "Search & Analytics", city: "Mountain View", country: "USA", foundedYear: 2012 },
  { name: "Docker", industry: "Container Platform", city: "San Francisco", country: "USA", foundedYear: 2013 },
  { name: "Hashicorp", industry: "Infrastructure Software", city: "San Francisco", country: "USA", foundedYear: 2012 },
  { name: "Twilio", industry: "Cloud Communications", city: "San Francisco", country: "USA", foundedYear: 2008 },
  { name: "Square", industry: "Fintech", city: "San Francisco", country: "USA", foundedYear: 2009 },
  { name: "Coinbase", industry: "Cryptocurrency", city: "San Francisco", country: "USA", foundedYear: 2012 },
  { name: "Robinhood", industry: "Fintech", city: "Menlo Park", country: "USA", foundedYear: 2013 },
  { name: "Notion", industry: "Productivity Software", city: "San Francisco", country: "USA", foundedYear: 2016 },
  { name: "Figma", industry: "Design Software", city: "San Francisco", country: "USA", foundedYear: 2012 },
  { name: "Canva", industry: "Design Platform", city: "Sydney", country: "Australia", foundedYear: 2012 },
  { name: "Grammarly", industry: "Writing Assistant", city: "San Francisco", country: "USA", foundedYear: 2009 },
  { name: "1Password", industry: "Security Software", city: "Toronto", country: "Canada", foundedYear: 2005 },
  { name: "Vercel", industry: "Web Development Platform", city: "San Francisco", country: "USA", foundedYear: 2015 },
  { name: "Netlify", industry: "Web Development Platform", city: "San Francisco", country: "USA", foundedYear: 2014 },
  { name: "Cloudflare", industry: "Web Infrastructure", city: "San Francisco", country: "USA", foundedYear: 2009 },
  { name: "Fastly", industry: "Edge Computing", city: "San Francisco", country: "USA", foundedYear: 2011 },
  { name: "Okta", industry: "Identity Management", city: "San Francisco", country: "USA", foundedYear: 2009 },
  { name: "Auth0", industry: "Authentication Platform", city: "Bellevue", country: "USA", foundedYear: 2013 },
  { name: "Sentry", industry: "Error Tracking", city: "San Francisco", country: "USA", foundedYear: 2012 },
  { name: "Datadog", industry: "Monitoring & Analytics", city: "New York", country: "USA", foundedYear: 2010 },
  { name: "New Relic", industry: "Application Performance", city: "San Francisco", country: "USA", foundedYear: 2008 },
];

// ============================================
// 2. DIVERSE LOCATIONS
// ============================================
const locations = [
  // USA
  "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX", "Boston, MA", "Los Angeles, CA",
  "Chicago, IL", "Denver, CO", "Mountain View, CA", "Redmond, WA", "Cupertino, CA",
  // Asia
  "Ho Chi Minh City, Vietnam", "Hanoi, Vietnam", "Da Nang, Vietnam", "Singapore", "Tokyo, Japan",
  "Seoul, South Korea", "Bangalore, India", "Hyderabad, India", "Shanghai, China", "Hong Kong",
  // Europe
  "London, UK", "Berlin, Germany", "Amsterdam, Netherlands", "Stockholm, Sweden", "Dublin, Ireland",
  "Paris, France", "Barcelona, Spain", "Zurich, Switzerland",
  // Other
  "Sydney, Australia", "Toronto, Canada", "Ottawa, Canada", "Remote",
];

// ============================================
// 3. JOB TITLE VARIATIONS (More diverse)
// ============================================
const jobTitleVariations = {
  fullstack: [
    "Senior Full Stack Developer",
    "Full Stack Software Engineer",
    "Full Stack Web Developer",
    "Full Stack Engineer (Node.js/React)",
    "Senior Full Stack Engineer",
    "Full Stack Developer - Remote",
  ],
  frontend: [
    "Frontend Engineer",
    "Frontend Developer (React)",
    "Senior Frontend Engineer",
    "React Developer",
    "Frontend Software Engineer",
    "UI/UX Frontend Developer",
    "Frontend Engineer - TypeScript",
  ],
  backend: [
    "Backend Engineer",
    "Backend Developer (Node.js)",
    "Backend Software Engineer",
    "Senior Backend Engineer",
    "API Developer",
    "Backend Engineer (Python)",
    "Server-Side Developer",
  ],
  devops: [
    "DevOps Engineer",
    "Site Reliability Engineer (SRE)",
    "Cloud Infrastructure Engineer",
    "DevOps/SRE Engineer",
    "Platform Engineer",
    "Infrastructure Engineer",
    "Senior DevOps Engineer",
  ],
  data: [
    "Data Engineer",
    "Big Data Engineer",
    "Data Pipeline Engineer",
    "Senior Data Engineer",
    "Data Infrastructure Engineer",
    "ETL Developer",
  ],
  mobile: [
    "Mobile Developer",
    "React Native Developer",
    "iOS Developer",
    "Android Developer",
    "Mobile App Developer",
    "Flutter Developer",
    "Cross-Platform Mobile Developer",
  ],
  security: [
    "Security Engineer",
    "Application Security Engineer",
    "Cybersecurity Engineer",
    "Security Software Engineer",
    "Information Security Engineer",
  ],
  ml: [
    "Machine Learning Engineer",
    "ML Engineer",
    "AI Engineer",
    "Deep Learning Engineer",
    "MLOps Engineer",
    "Senior ML Engineer",
  ],
  sre: [
    "Site Reliability Engineer",
    "SRE Engineer",
    "Reliability Engineer",
    "Platform Reliability Engineer",
    "Senior SRE",
  ],
  product: [
    "Product Manager",
    "Technical Product Manager",
    "Senior Product Manager",
    "Product Owner",
    "Associate Product Manager",
  ],
  qa: [
    "QA Automation Engineer",
    "Test Automation Engineer",
    "Quality Assurance Engineer",
    "SDET (Software Development Engineer in Test)",
    "QA Engineer",
  ],
  blockchain: [
    "Blockchain Developer",
    "Smart Contract Developer",
    "Web3 Developer",
    "Blockchain Engineer",
    "Solidity Developer",
  ],
  junior: [
    "Junior Software Engineer",
    "Entry-Level Developer",
    "Software Engineer I",
    "Associate Software Engineer",
    "Junior Full Stack Developer",
  ],
  intern: [
    "Software Engineering Intern",
    "Development Intern",
    "Engineering Intern",
    "Summer Intern - Software Engineering",
  ],
  parttime: [
    "Part-time Frontend Developer",
    "Part-time Backend Developer",
    "Freelance Full Stack Developer",
    "Contract Frontend Developer",
  ],
  contract: [
    "Contract Full Stack Developer",
    "Contract Backend Engineer",
    "Contract Frontend Engineer",
    "Temporary Software Engineer",
  ],
};

// ============================================
// 4. JOB TEMPLATES WITH VARIATIONS
// ============================================
function getJobTemplate(title: string, experienceLevel: string, type: JobType) {
  const titleLower = title.toLowerCase();
  const isJunior = experienceLevel === "Junior";
  const isSenior = experienceLevel === "Senior";
  const isIntern = type === JobType.INTERNSHIP;
  const isPartTime = type === JobType.PART_TIME;
  const isContract = type === JobType.CONTRACT;

  // Base salary ranges (in USD per month)
  let baseSalaryMin = 5000;
  let baseSalaryMax = 8000;

  if (isIntern) {
    baseSalaryMin = 1500;
    baseSalaryMax = 2500;
  } else if (isJunior) {
    baseSalaryMin = 3000;
    baseSalaryMax = 5000;
  } else if (isSenior) {
    baseSalaryMin = 8000;
    baseSalaryMax = 12000;
  } else {
    // Mid level
    baseSalaryMin = 5000;
    baseSalaryMax = 8000;
  }

  // Adjust for part-time/contract
  if (isPartTime) {
    baseSalaryMin = Math.floor(baseSalaryMin * 0.5);
    baseSalaryMax = Math.floor(baseSalaryMax * 0.6);
  } else if (isContract) {
    baseSalaryMin = Math.floor(baseSalaryMin * 0.8);
    baseSalaryMax = Math.floor(baseSalaryMax * 0.9);
  }

  // Generate description and requirements based on title
  let description = "";
  let requirements = "";
  let benefits = "";
  let skills: string[] = [];

  if (titleLower.includes("full stack") || titleLower.includes("fullstack")) {
    description = `<p>We are seeking a <strong>${title}</strong> to join our engineering team. You will work on both frontend and backend systems, building scalable web applications that serve millions of users.</p>
      <p>In this role, you will collaborate with product managers, designers, and other engineers to deliver high-quality features. You'll have the opportunity to work on modern technologies and make architectural decisions.</p>`;
    requirements = `<ul>
      <li><strong>${isJunior ? "1+" : isSenior ? "5+" : "3+"} years</strong> of full stack development experience</li>
      <li>Strong proficiency in <strong>JavaScript/TypeScript</strong>, <strong>Node.js</strong>, and <strong>React</strong></li>
      <li>Experience with databases (<strong>PostgreSQL</strong>, <strong>MongoDB</strong>)</li>
      <li>Knowledge of RESTful APIs and GraphQL</li>
      <li>Experience with cloud platforms (<strong>AWS</strong>, <strong>GCP</strong>, or <strong>Azure</strong>)</li>
      <li>Strong problem-solving skills and attention to detail</li>
    </ul>`;
    skills = ["JavaScript", "TypeScript", "Node.js", "React", "PostgreSQL", "Express", "Next.js"];
  } else if (titleLower.includes("frontend")) {
    description = `<p>Join our frontend team as a <strong>${title}</strong> to build beautiful, performant user interfaces. You'll work with cutting-edge technologies and have a direct impact on user experience.</p>`;
    requirements = `<ul>
      <li><strong>${isJunior ? "1+" : isSenior ? "5+" : "3+"} years</strong> of frontend development experience</li>
      <li>Strong proficiency in <strong>React</strong>, <strong>TypeScript</strong>, and modern JavaScript</li>
      <li>Experience with state management (<strong>Redux</strong>, <strong>Zustand</strong>)</li>
      <li>Knowledge of <strong>CSS-in-JS</strong> or <strong>Tailwind CSS</strong></li>
      <li>Understanding of web performance optimization</li>
    </ul>`;
    skills = ["React", "TypeScript", "JavaScript", "CSS", "HTML", "Redux", "Next.js"];
  } else if (titleLower.includes("backend")) {
    description = `<p>Build robust, scalable APIs and microservices as a <strong>${title}</strong>. You'll work on high-traffic systems serving millions of requests daily.</p>`;
    requirements = `<ul>
      <li><strong>${isJunior ? "1+" : isSenior ? "5+" : "3+"} years</strong> of backend development experience</li>
      <li>Expertise in <strong>Node.js</strong> or <strong>Python</strong></li>
      <li>Experience with database design and optimization</li>
      <li>Knowledge of message queues (<strong>RabbitMQ</strong>, <strong>Kafka</strong>)</li>
      <li>Understanding of system design and scalability</li>
    </ul>`;
    skills = ["Node.js", "Python", "PostgreSQL", "MongoDB", "Express", "REST API", "GraphQL"];
  } else if (titleLower.includes("devops") || titleLower.includes("sre")) {
    description = `<p>Help us build and maintain cloud infrastructure as a <strong>${title}</strong>. You'll work on CI/CD pipelines, monitoring, and automation.</p>`;
    requirements = `<ul>
      <li><strong>${isJunior ? "2+" : isSenior ? "5+" : "4+"} years</strong> of DevOps or SRE experience</li>
      <li>Strong knowledge of <strong>AWS</strong>, <strong>GCP</strong>, or <strong>Azure</strong></li>
      <li>Experience with <strong>Docker</strong>, <strong>Kubernetes</strong></li>
      <li>Proficiency in Infrastructure as Code (<strong>Terraform</strong>)</li>
      <li>Experience with CI/CD tools (<strong>GitHub Actions</strong>, <strong>Jenkins</strong>)</li>
    </ul>`;
    skills = ["Docker", "Kubernetes", "AWS", "Terraform", "Linux", "CI/CD", "Bash"];
  } else if (titleLower.includes("data")) {
    description = `<p>Build and maintain data pipelines as a <strong>${title}</strong>. Work with our data science team to enable analytics and machine learning.</p>`;
    requirements = `<ul>
      <li><strong>${isJunior ? "1+" : isSenior ? "5+" : "3+"} years</strong> of data engineering experience</li>
      <li>Proficiency in <strong>Python</strong> or <strong>Scala</strong></li>
      <li>Experience with data pipelines (<strong>Airflow</strong>, <strong>Spark</strong>)</li>
      <li>Knowledge of data warehouses (<strong>Snowflake</strong>, <strong>BigQuery</strong>)</li>
    </ul>`;
    skills = ["Python", "PostgreSQL", "MongoDB", "Data Science", "Airflow", "Spark"];
  } else if (titleLower.includes("mobile")) {
    description = `<p>Develop cross-platform mobile applications as a <strong>${title}</strong>. Work on user-facing features and performance optimization.</p>`;
    requirements = `<ul>
      <li><strong>${isJunior ? "1+" : isSenior ? "5+" : "3+"} years</strong> of mobile development experience</li>
      <li>Proficiency in <strong>React Native</strong> or <strong>Flutter</strong></li>
      <li>Experience with native iOS (<strong>Swift</strong>) or Android (<strong>Kotlin</strong>)</li>
    </ul>`;
    skills = ["React Native", "Flutter", "Swift", "Kotlin", "iOS", "Android"];
  } else if (titleLower.includes("security")) {
    description = `<p>Protect our systems and data as a <strong>${title}</strong>. Conduct security audits and implement security best practices.</p>`;
    requirements = `<ul>
      <li><strong>${isJunior ? "2+" : isSenior ? "5+" : "4+"} years</strong> of security engineering experience</li>
      <li>Knowledge of security frameworks and standards</li>
      <li>Experience with penetration testing</li>
    </ul>`;
    skills = ["Go", "Python", "AWS", "Linux", "Security"];
  } else if (titleLower.includes("machine learning") || titleLower.includes("ml") || titleLower.includes("ai")) {
    description = `<p>Design and implement ML models as a <strong>${title}</strong>. Work with large datasets and deploy models at scale.</p>`;
    requirements = `<ul>
      <li><strong>${isJunior ? "1+" : isSenior ? "5+" : "3+"} years</strong> of ML engineering experience</li>
      <li>Strong proficiency in <strong>Python</strong> and ML frameworks (<strong>TensorFlow</strong>, <strong>PyTorch</strong>)</li>
    </ul>`;
    skills = ["Python", "TensorFlow", "PyTorch", "Machine Learning", "Data Science"];
  } else if (titleLower.includes("blockchain") || titleLower.includes("web3")) {
    description = `<p>Build decentralized applications as a <strong>${title}</strong>. Work on cutting-edge blockchain technology.</p>`;
    requirements = `<ul>
      <li><strong>${isJunior ? "1+" : isSenior ? "4+" : "2+"} years</strong> of blockchain development experience</li>
      <li>Proficiency in <strong>Solidity</strong> or <strong>Rust</strong></li>
    </ul>`;
    skills = ["Solidity", "Go", "Python", "Blockchain", "Web3", "Ethereum"];
  } else if (titleLower.includes("qa") || titleLower.includes("test")) {
    description = `<p>Build and maintain automated testing frameworks as a <strong>${title}</strong>. Ensure quality across our products.</p>`;
    requirements = `<ul>
      <li><strong>${isJunior ? "1+" : isSenior ? "5+" : "3+"} years</strong> of QA automation experience</li>
      <li><strong>Selenium</strong>, <strong>Cypress</strong>, or <strong>Playwright</strong></li>
    </ul>`;
    skills = ["Python", "JavaScript", "Selenium", "Cypress", "Playwright"];
  } else {
    // Default template
    description = `<p>We are seeking a <strong>${title}</strong> to join our team. You'll work on exciting projects with modern technologies.</p>`;
    requirements = `<ul>
      <li><strong>${isJunior ? "1+" : isSenior ? "5+" : "3+"} years</strong> of relevant experience</li>
      <li>Strong programming skills</li>
      <li>Good problem-solving abilities</li>
    </ul>`;
    skills = ["JavaScript", "Node.js", "React", "TypeScript"];
  }

  benefits = `<ul>
    <li>Competitive salary and equity</li>
    <li>Flexible schedule and remote work options</li>
    <li>Health and dental insurance</li>
    <li>Professional development budget</li>
    <li>Top-tier equipment</li>
  </ul>`;

  const interviewQuestions = [
    `Tell me about a challenging technical problem you solved. What was your approach?`,
    `How do you handle technical debt in a fast-paced environment?`,
    `Describe your experience with ${titleLower.includes("frontend") ? "React" : titleLower.includes("backend") ? "APIs" : "system design"}.`,
  ];

  return {
    description,
    requirements,
    benefits,
    skills,
    interviewQuestions,
    baseSalaryMin,
    baseSalaryMax,
  };
}

// ============================================
// 5. REVIEW TEMPLATES
// ============================================
const positiveReviewTemplates = [
  {
    title: "Great company culture and work-life balance",
    review: "I've been working here for over 2 years and I really enjoy the collaborative environment. The management is supportive and there are plenty of opportunities for growth.",
    pros: "Flexible working hours, great team, learning opportunities, competitive salary",
    cons: "Sometimes meetings can be too frequent",
    rating: 5,
  },
  {
    title: "Excellent learning environment",
    review: "As a developer, I learned so much here. The senior developers are always willing to help and the codebase is well-maintained.",
    pros: "Mentorship program, code reviews, modern tech stack, friendly colleagues",
    cons: "Initial onboarding could be improved",
    rating: 5,
  },
  {
    title: "Innovative projects",
    review: "Working on exciting projects with modern technologies. Great compensation and work-life balance.",
    pros: "Latest technologies, challenging projects, good compensation, remote work option",
    cons: "Fast-paced environment might not suit everyone",
    rating: 4,
  },
];

const negativeReviewTemplates = [
  {
    title: "High turnover and management issues",
    review: "The company has a high turnover rate. Management doesn't seem to value employee feedback.",
    pros: "Some good colleagues",
    cons: "Poor management, high stress, limited growth, below market salary",
    rating: 2,
  },
  {
    title: "Not what I expected",
    review: "The job description didn't match reality. Left after 6 months.",
    pros: "Quick to hire",
    cons: "Misleading job description, lack of support, disorganized processes",
    rating: 2,
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateSlug(title: string, companySlug: string): string {
  return `${companySlug}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

function getRandomElement<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error("Cannot get random element from empty array");
  }
  return array[Math.floor(Math.random() * array.length)]!;
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

function getSalaryForLocation(
  baseMin: number,
  baseMax: number,
  location: string
): { min: number; max: number; currency: Currency } {
  // All salaries in USD per month, adjust based on location
  let multiplier = 1.0;
  
  if (location.includes("San Francisco") || location.includes("New York")) {
    multiplier = 1.2;
  } else if (location.includes("Seattle") || location.includes("Boston") || location.includes("Los Angeles")) {
    multiplier = 1.1;
  } else if (location.includes("Remote")) {
    multiplier = 0.95; // Slightly lower for remote
  } else if (location.includes("Singapore") || location.includes("Tokyo") || location.includes("London")) {
    multiplier = 0.9;
  } else if (location.includes("Vietnam") || location.includes("India") || location.includes("China")) {
    multiplier = 0.6; // Lower cost of living areas
  } else if (location.includes("Europe") || location.includes("Berlin") || location.includes("Amsterdam") || location.includes("Stockholm")) {
    multiplier = 0.85;
  }
  
  return {
    min: Math.floor(baseMin * multiplier),
    max: Math.floor(baseMax * multiplier),
    currency: Currency.USD,
  };
}

// ============================================
// MAIN SEED FUNCTION
// ============================================
async function seedData() {
  console.log("🌱 Starting comprehensive data seed...\n");

  try {
    // ============================================
    // 1. CREATE ADMIN
    // ============================================
    console.log("👤 [1/6] Creating admin user...");
    const adminPasswordHash = hashPassword("admin123");
    const admin = await prisma.user.upsert({
      where: { email: "admin@devprep.com" },
      update: {},
      create: {
        email: "admin@devprep.com",
        passwordHash: adminPasswordHash,
        firstName: "Admin",
        lastName: "User",
        role: UserRole.ADMIN,
        isVerified: true,
        isActive: true,
        notificationEmail: "admin@devprep.com",
      },
    });
    console.log(`   ✅ Admin created: ${admin.email}\n`);

    // ============================================
    // 2. CREATE SKILLS & CATEGORIES
    // ============================================
    console.log("🛠️  [2/6] Creating skills and categories...");
    const skills = [
      // Languages
      "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++", "C#", "PHP", "Ruby", "Swift", "Kotlin",
      // Frontend
      "React", "Vue.js", "Angular", "Next.js", "Svelte", "HTML", "CSS", "SCSS", "Tailwind CSS", "Styled Components",
      // Backend
      "Node.js", "Express", "NestJS", "FastAPI", "Django", "Flask", "Spring Boot", "Laravel", "Rails",
      // Databases
      "PostgreSQL", "MongoDB", "Redis", "MySQL", "Elasticsearch", "DynamoDB", "Cassandra",
      // Cloud & DevOps
      "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform", "Ansible", "Jenkins", "GitHub Actions", "GitLab CI",
      // Other
      "GraphQL", "REST API", "Microservices", "System Design", "React Native", "Flutter", "iOS", "Android",
      "TensorFlow", "PyTorch", "Machine Learning", "Data Science", "Solidity", "Blockchain", "Web3", "Ethereum",
      "CI/CD", "Git", "Linux", "Bash", "Shell Scripting", "Selenium", "Cypress", "Playwright", "Jest",
    ];

    const createdSkills = await Promise.all(
      skills.map((name) =>
        prisma.skill.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );
    const skillMap = Object.fromEntries(createdSkills.map((s) => [s.name, s.id]));

    // Create multiple categories
    const categories = [
      { name: "Frontend Development", iconUrl: "https://dummyimage.com/120x120/3b82f6/ffffff&text=FE" },
      { name: "Backend Development", iconUrl: "https://dummyimage.com/120x120/10b981/ffffff&text=BE" },
      { name: "Full Stack", iconUrl: "https://dummyimage.com/120x120/8b5cf6/ffffff&text=FS" },
      { name: "DevOps & Infrastructure", iconUrl: "https://dummyimage.com/120x120/f59e0b/ffffff&text=DevOps" },
      { name: "Data Engineering", iconUrl: "https://dummyimage.com/120x120/ef4444/ffffff&text=Data" },
      { name: "Mobile Development", iconUrl: "https://dummyimage.com/120x120/ec4899/ffffff&text=Mobile" },
      { name: "Security", iconUrl: "https://dummyimage.com/120x120/14b8a6/ffffff&text=Sec" },
      { name: "Machine Learning", iconUrl: "https://dummyimage.com/120x120/6366f1/ffffff&text=ML" },
    ];

    const createdCategories = await Promise.all(
      categories.map((cat) =>
        prisma.category.upsert({
          where: { name: cat.name },
          update: {},
          create: cat,
        })
      )
    );
    const categoryMap = Object.fromEntries(createdCategories.map((c) => [c.name, c.id]));
    console.log(`   ✅ Created ${createdSkills.length} skills and ${createdCategories.length} categories\n`);

    // ============================================
    // 3. CREATE 50 COMPANIES
    // ============================================
    console.log("🏢 [3/6] Creating 50 IT companies...");
    const companies = await Promise.all(
      itCompanies.map((company) => {
        const slug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const companySize = ["11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"][
          Math.floor(Math.random() * 6)
        ];
        
        return prisma.company.upsert({
          where: { slug },
          update: {},
          create: {
            name: company.name,
            slug,
            website: `https://www.${company.name.toLowerCase().replace(/\s+/g, "")}.com`,
            industry: company.industry,
            companySize,
            foundedYear: company.foundedYear,
            city: company.city,
            country: company.country,
            address: `${Math.floor(Math.random() * 9999) + 1} Main Street, ${company.city}`,
            description: `${company.name} is a leading ${company.industry} company, providing innovative solutions and services to customers worldwide.`,
            isVerified: Math.random() > 0.3,
            logoUrl: `https://dummyimage.com/200x200/6366f1/ffffff&text=${company.name.substring(0, 2)}`,
            coverUrl: `https://dummyimage.com/1200x360/6366f1/ffffff&text=${company.name}`,
          },
        });
      })
    );
    console.log(`   ✅ Created ${companies.length} companies\n`);

    // ============================================
    // 4. CREATE RECRUITERS FOR EACH COMPANY
    // ============================================
    console.log("👥 [4/6] Creating recruiters...");
    const firstNames = ["Minh", "Linh", "David", "An", "Khoa", "Hoa", "Quang", "Sarah", "Tuan", "Mai", "Nam", "Lan", "James", "Thao", "Duc", "Huyen", "Michael", "Phuong", "Long", "Nga"];
    const lastNames = ["Tran", "Nguyen", "Chen", "Le", "Pham", "Vo", "Do", "Lim", "Bui", "Hoang", "Phan", "Truong", "Wong", "Vu", "Nguyen", "Le", "Tan", "Hoang", "Tran", "Do"];
    const positions = ["Talent Acquisition Manager", "Senior Recruiter", "Head of Talent", "Recruiter", "Talent Manager", "HR Manager"];

    const recruitersData = await Promise.all(
      companies.map(async (company, index) => {
        const firstName = firstNames[index % firstNames.length]!;
        const lastName = lastNames[index % lastNames.length]!;
        const email = `recruiter${index + 1}@${company.slug}.com`;
        const passwordHash = hashPassword("password123");

        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            passwordHash,
            firstName,
            lastName,
            role: UserRole.RECRUITER,
            isVerified: true,
            isActive: true,
            notificationEmail: email,
          },
        });

        const recruiter = await prisma.recruiterProfile.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            companyId: company.id,
            position: getRandomElement(positions),
          },
        });

        return { user, recruiter, company };
      })
    );
    console.log(`   ✅ Created ${recruitersData.length} recruiters\n`);

    // ============================================
    // 5. CREATE JOBS FOR EACH COMPANY (5-6 jobs each)
    // ============================================
    console.log("💼 [5/6] Creating jobs...");
    const allJobs = [];
    const allJobTitles = Object.values(jobTitleVariations).flat();
    
    for (const { recruiter, company } of recruitersData) {
      const numJobs = 5 + Math.floor(Math.random() * 2); // 5-6 jobs per company
      const selectedTitles = getRandomElements(allJobTitles, numJobs);

      const companyJobs = await Promise.all(
        selectedTitles.map(async (title) => {
          const slug = generateSlug(title, company.slug);
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + 30 + Math.floor(Math.random() * 30));

          // Determine job type and experience level from title
          const titleLower = title.toLowerCase();
          let type: JobType = JobType.FULL_TIME;
          let experienceLevel = "Mid";
          
          if (titleLower.includes("intern")) {
            type = JobType.INTERNSHIP;
            experienceLevel = "Junior";
          } else if (titleLower.includes("part-time") || titleLower.includes("parttime") || titleLower.includes("freelance")) {
            type = JobType.PART_TIME;
            experienceLevel = "Mid";
          } else if (titleLower.includes("contract") || titleLower.includes("temporary")) {
            type = JobType.CONTRACT;
            experienceLevel = titleLower.includes("senior") ? "Senior" : "Mid";
          } else if (titleLower.includes("junior") || titleLower.includes("entry") || titleLower.includes("associate")) {
            experienceLevel = "Junior";
          } else if (titleLower.includes("senior") || titleLower.includes("lead")) {
            experienceLevel = "Senior";
          }

          // Get template
          const template = getJobTemplate(title, experienceLevel, type);

          // Select location (all salaries in USD per month)
          const location = getRandomElement(locations);
          const isRemote = location === "Remote" || Math.random() > 0.3;

          // Get salary for location (always USD)
          const salary = getSalaryForLocation(
            template.baseSalaryMin,
            template.baseSalaryMax,
            location
          );

          const job = await prisma.job.create({
            data: {
              slug,
              title,
              companyId: company.id,
              recruiterId: recruiter.id,
              description: template.description,
              requirements: template.requirements,
              benefits: template.benefits,
              type,
              status: JobStatus.PUBLISHED,
              location,
              isRemote,
              salaryMin: salary.min,
              salaryMax: salary.max,
              currency: salary.currency,
              experienceLevel,
              quantity: 1,
              publishedAt: new Date(),
              deadline,
              interviewQuestions: template.interviewQuestions,
            },
          });

          // Add job skills
          const jobSkills = getRandomElements(template.skills, Math.min(4, template.skills.length));
          const jobSkillsData = jobSkills
            .map((skillName) => skillMap[skillName])
            .filter((skillId): skillId is string => Boolean(skillId))
            .map((skillId, skillIdx) => ({
              jobId: job.id,
              skillId,
              isRequired: skillIdx < 2,
            }));
          
          if (jobSkillsData.length > 0) {
            await prisma.jobSkill.createMany({
              data: jobSkillsData,
            });
          }

          // Add job category based on title
          let categoryName = "Full Stack";
          if (titleLower.includes("frontend")) {
            categoryName = "Frontend Development";
          } else if (titleLower.includes("backend")) {
            categoryName = "Backend Development";
          } else if (titleLower.includes("devops") || titleLower.includes("sre") || titleLower.includes("infrastructure")) {
            categoryName = "DevOps & Infrastructure";
          } else if (titleLower.includes("data")) {
            categoryName = "Data Engineering";
          } else if (titleLower.includes("mobile")) {
            categoryName = "Mobile Development";
          } else if (titleLower.includes("security")) {
            categoryName = "Security";
          } else if (titleLower.includes("machine learning") || titleLower.includes("ml") || titleLower.includes("ai")) {
            categoryName = "Machine Learning";
          }

          const categoryId = categoryMap[categoryName];
          if (categoryId) {
            await prisma.jobCategory.create({
              data: {
                jobId: job.id,
                categoryId,
              },
            });
          }

          return job;
        })
      );

      allJobs.push(...companyJobs);
      console.log(`   ✅ Created ${companyJobs.length} jobs for ${company.name}`);
    }
    console.log(`\n   ✅ Total jobs created: ${allJobs.length}\n`);

    // ============================================
    // 6. CREATE 50 CANDIDATES
    // ============================================
    console.log("🎓 [6/6] Creating 50 candidates...");
    const candidateFirstNames = ["An", "Binh", "Cuong", "Dung", "Em", "Giang", "Hieu", "Khanh", "Linh", "Minh", "Nam", "Oanh", "Phong", "Quang", "Son", "Thao", "Uyen", "Viet", "Xuan", "Yen"];
    const candidateLastNames = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vu", "Vo", "Do", "Bui", "Dang", "Ngo", "Duong", "Ly", "Truong", "Phan", "Ho", "Dinh", "Dao", "Lam", "Cao"];

    const candidates = await Promise.all(
      Array.from({ length: 50 }, async (_, index) => {
        const email = `student${index + 1}@gmail.com`;
        const firstName = candidateFirstNames[index % candidateFirstNames.length]!;
        const lastName = candidateLastNames[index % candidateLastNames.length]!;
        const passwordHash = hashPassword("password123");

        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            passwordHash,
            firstName,
            lastName,
            role: UserRole.CANDIDATE,
            isVerified: true,
            isActive: true,
            notificationEmail: email,
          },
        });

        const candidate = await prisma.candidateProfile.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            headline: `${firstName} ${lastName} - Software Developer`,
            bio: `Experienced software developer with passion for technology and innovation. Always learning and growing.`,
            isPublic: Math.random() > 0.5,
          },
        });

        return { user, candidate };
      })
    );
    console.log(`   ✅ Created ${candidates.length} candidates\n`);

    // ============================================
    // 7. CREATE COMPANY REVIEWS (3 per company: 1 bad, 2 good)
    // ============================================
    console.log("⭐ Creating company reviews...");
    let totalReviews = 0;

    for (const company of companies) {
      const shuffledCandidates = [...candidates].sort(() => Math.random() - 0.5);
      const selectedCandidates = shuffledCandidates.slice(0, 3);

      // 1 negative review
      const negativeTemplate = getRandomElement(negativeReviewTemplates);
      if (selectedCandidates[0]?.candidate) {
        await prisma.companyReview.create({
          data: {
            companyId: company.id,
            candidateId: selectedCandidates[0].candidate.id,
          rating: negativeTemplate.rating,
          title: negativeTemplate.title,
          review: negativeTemplate.review,
          pros: negativeTemplate.pros,
          cons: negativeTemplate.cons,
          isCurrentEmployee: false,
            wouldRecommend: false,
          },
        });
        totalReviews++;
      }

      // 2 positive reviews
      for (let i = 1; i < 3; i++) {
        const candidate = selectedCandidates[i]?.candidate;
        if (candidate) {
          const positiveTemplate = getRandomElement(positiveReviewTemplates);
          await prisma.companyReview.create({
            data: {
              companyId: company.id,
              candidateId: candidate.id,
              rating: positiveTemplate.rating,
              title: positiveTemplate.title,
              review: positiveTemplate.review,
              pros: positiveTemplate.pros,
              cons: positiveTemplate.cons,
              isCurrentEmployee: Math.random() > 0.5,
              wouldRecommend: true,
            },
          });
          totalReviews++;
        }
      }
    }
    console.log(`   ✅ Created ${totalReviews} reviews (3 per company)\n`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log("=".repeat(60));
    console.log("✅ SEED COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("\n📊 Summary:");
    console.log(`   👤 Admin: 1 (admin@devprep.com)`);
    console.log(`   🏢 Companies: ${companies.length}`);
    console.log(`   👥 Recruiters: ${recruitersData.length}`);
    console.log(`   💼 Jobs: ${allJobs.length}`);
    console.log(`   🎓 Candidates: ${candidates.length}`);
    console.log(`   ⭐ Reviews: ${totalReviews}`);
    console.log(`   🛠️  Skills: ${createdSkills.length}`);
    console.log(`   📁 Categories: ${createdCategories.length}`);
    console.log("\n💡 Login credentials:");
    console.log(`   Admin: admin@devprep.com / admin123`);
    console.log(`   Recruiters: recruiter{N}@{company-slug}.com / password123`);
    console.log(`   Candidates: student{N}@gmail.com / password123`);
    console.log("\n✨ All done!");

  } catch (error) {
    console.error("\n❌ Error during seed:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Run seed
seedData()
  .then(() => {
    console.log("\n🎉 Seed script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Seed script failed:", error);
    process.exit(1);
  });
