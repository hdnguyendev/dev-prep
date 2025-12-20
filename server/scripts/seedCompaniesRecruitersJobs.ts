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

// IT Companies data - Expanded with diverse industries and locations
const companiesData = [
  {
    name: "TechVenture Solutions",
    slug: "techventure-solutions",
    website: "https://techventure.com",
    industry: "Software Development",
    companySize: "201-500",
    foundedYear: 2015,
    city: "Ho Chi Minh City",
    country: "Vietnam",
    address: "123 Nguyen Hue Street, District 1",
    description: "Leading software development company specializing in enterprise solutions and cloud services.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/6366f1/ffffff&text=TV",
    coverUrl: "https://dummyimage.com/1200x360/6366f1/ffffff&text=TechVenture",
  },
  {
    name: "CloudScale Technologies",
    slug: "cloudscale-technologies",
    website: "https://cloudscale.io",
    industry: "Cloud Infrastructure",
    companySize: "101-250",
    foundedYear: 2018,
    city: "Hanoi",
    country: "Vietnam",
    address: "456 Le Loi Boulevard, Hoan Kiem",
    description: "Modern cloud infrastructure provider helping businesses scale with AWS, GCP, and Azure solutions.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/22c55e/ffffff&text=CS",
    coverUrl: "https://dummyimage.com/1200x360/22c55e/ffffff&text=CloudScale",
  },
  {
    name: "DataFlow Analytics",
    slug: "dataflow-analytics",
    website: "https://dataflow.ai",
    industry: "Data & AI",
    companySize: "51-200",
    foundedYear: 2019,
    city: "Singapore",
    country: "Singapore",
    address: "789 Orchard Road, #10-01",
    description: "AI and data analytics company building intelligent systems for enterprise clients.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/06b6d4/ffffff&text=DF",
    coverUrl: "https://dummyimage.com/1200x360/06b6d4/ffffff&text=DataFlow",
  },
  {
    name: "CodeCraft Studios",
    slug: "codecraft-studios",
    website: "https://codecraft.dev",
    industry: "Software Development",
    companySize: "11-50",
    foundedYear: 2020,
    city: "Da Nang",
    country: "Vietnam",
    address: "321 Tran Phu Street",
    description: "Boutique software development studio focused on modern web and mobile applications.",
    isVerified: false,
    logoUrl: "https://dummyimage.com/200x200/f97316/ffffff&text=CC",
    coverUrl: "https://dummyimage.com/1200x360/f97316/ffffff&text=CodeCraft",
  },
  {
    name: "SecureNet Systems",
    slug: "securenet-systems",
    website: "https://securenet.systems",
    industry: "Cybersecurity",
    companySize: "51-200",
    foundedYear: 2017,
    city: "Ho Chi Minh City",
    country: "Vietnam",
    address: "555 Le Van Viet Street, District 9",
    description: "Cybersecurity firm providing enterprise security solutions and penetration testing services.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/ef4444/ffffff&text=SN",
    coverUrl: "https://dummyimage.com/1200x360/ef4444/ffffff&text=SecureNet",
  },
  {
    name: "MobileFirst Apps",
    slug: "mobilefirst-apps",
    website: "https://mobilefirst.app",
    industry: "Mobile Development",
    companySize: "51-200",
    foundedYear: 2016,
    city: "Ho Chi Minh City",
    country: "Vietnam",
    address: "888 Vo Van Tan Street, District 3",
    description: "Mobile app development company specializing in iOS and Android native and cross-platform solutions.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/a855f7/ffffff&text=MF",
    coverUrl: "https://dummyimage.com/1200x360/a855f7/ffffff&text=MobileFirst",
  },
  {
    name: "DevOps Pro",
    slug: "devops-pro",
    website: "https://devopspro.io",
    industry: "DevOps & Infrastructure",
    companySize: "11-50",
    foundedYear: 2021,
    city: "Hanoi",
    country: "Vietnam",
    address: "999 Ba Trieu Street, Hai Ba Trung",
    description: "DevOps consulting and managed services for startups and enterprises.",
    isVerified: false,
    logoUrl: "https://dummyimage.com/200x200/10b981/ffffff&text=DO",
    coverUrl: "https://dummyimage.com/1200x360/10b981/ffffff&text=DevOps+Pro",
  },
  {
    name: "BlockChain Labs",
    slug: "blockchain-labs",
    website: "https://blockchainlabs.tech",
    industry: "Blockchain & Web3",
    companySize: "51-200",
    foundedYear: 2018,
    city: "Singapore",
    country: "Singapore",
    address: "111 Marina Bay, #15-02",
    description: "Blockchain development and consulting company building DeFi and NFT platforms.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/f59e0b/ffffff&text=BC",
    coverUrl: "https://dummyimage.com/1200x360/f59e0b/ffffff&text=BlockChain+Labs",
  },
  {
    name: "AI Innovations",
    slug: "ai-innovations",
    website: "https://aiinnovations.com",
    industry: "AI/ML",
    companySize: "101-250",
    foundedYear: 2019,
    city: "Ho Chi Minh City",
    country: "Vietnam",
    address: "222 Nguyen Dinh Chieu Street, District 3",
    description: "AI and machine learning company developing custom ML models and AI solutions for businesses.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/ec4899/ffffff&text=AI",
    coverUrl: "https://dummyimage.com/1200x360/ec4899/ffffff&text=AI+Innovations",
  },
  {
    name: "FullStack Dynamics",
    slug: "fullstack-dynamics",
    website: "https://fullstack.dynamics",
    industry: "Software Development",
    companySize: "51-200",
    foundedYear: 2017,
    city: "Hanoi",
    country: "Vietnam",
    address: "333 Hoang Dieu Street, Ba Dinh",
    description: "Full-stack development agency building scalable web applications and APIs.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/3b82f6/ffffff&text=FS",
    coverUrl: "https://dummyimage.com/1200x360/3b82f6/ffffff&text=FullStack",
  },
  {
    name: "WebDev Agency",
    slug: "webdev-agency",
    website: "https://webdev.agency",
    industry: "Web Development",
    companySize: "11-50",
    foundedYear: 2019,
    city: "Can Tho",
    country: "Vietnam",
    address: "456 Nguyen Van Cu Street",
    description: "Web development agency creating modern, responsive websites and web applications.",
    isVerified: false,
    logoUrl: "https://dummyimage.com/200x200/8b5cf6/ffffff&text=WD",
    coverUrl: "https://dummyimage.com/1200x360/8b5cf6/ffffff&text=WebDev",
  },
  {
    name: "GameStudio Pro",
    slug: "gamestudio-pro",
    website: "https://gamestudio.pro",
    industry: "Game Development",
    companySize: "51-200",
    foundedYear: 2016,
    city: "Ho Chi Minh City",
    country: "Vietnam",
    address: "789 Le Van Luong Street, District 7",
    description: "Game development studio creating mobile and PC games with cutting-edge graphics.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/f43f5e/ffffff&text=GS",
    coverUrl: "https://dummyimage.com/1200x360/f43f5e/ffffff&text=GameStudio",
  },
  {
    name: "FinTech Solutions",
    slug: "fintech-solutions",
    website: "https://fintech.solutions",
    industry: "Fintech",
    companySize: "201-500",
    foundedYear: 2014,
    city: "Singapore",
    country: "Singapore",
    address: "222 Raffles Place, #30-01",
    description: "Financial technology company providing payment solutions and banking software.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/14b8a6/ffffff&text=FT",
    coverUrl: "https://dummyimage.com/1200x360/14b8a6/ffffff&text=FinTech",
  },
  {
    name: "E-Commerce Platform",
    slug: "ecommerce-platform",
    website: "https://ecommerce.platform",
    industry: "E-Commerce",
    companySize: "501-1000",
    foundedYear: 2013,
    city: "Ho Chi Minh City",
    country: "Vietnam",
    address: "111 Dong Khoi Street, District 1",
    description: "Leading e-commerce platform connecting buyers and sellers across Southeast Asia.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/0ea5e9/ffffff&text=EC",
    coverUrl: "https://dummyimage.com/1200x360/0ea5e9/ffffff&text=E-Commerce",
  },
  {
    name: "StartupHub",
    slug: "startuphub",
    website: "https://startuphub.io",
    industry: "Software Development",
    companySize: "11-50",
    foundedYear: 2022,
    city: "Hanoi",
    country: "Vietnam",
    address: "555 Ba Dinh Square",
    description: "Startup incubator and software development company supporting early-stage tech companies.",
    isVerified: false,
    logoUrl: "https://dummyimage.com/200x200/84cc16/ffffff&text=SH",
    coverUrl: "https://dummyimage.com/1200x360/84cc16/ffffff&text=StartupHub",
  },
  {
    name: "Digital Marketing Tech",
    slug: "digital-marketing-tech",
    website: "https://digitalmarketing.tech",
    industry: "Marketing Technology",
    companySize: "51-200",
    foundedYear: 2018,
    city: "Ho Chi Minh City",
    country: "Vietnam",
    address: "333 Nguyen Trai Street, District 5",
    description: "Marketing technology company providing digital marketing tools and analytics platforms.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/d946ef/ffffff&text=DM",
    coverUrl: "https://dummyimage.com/1200x360/d946ef/ffffff&text=Digital+Marketing",
  },
  {
    name: "HealthTech Innovations",
    slug: "healthtech-innovations",
    website: "https://healthtech.innovations",
    industry: "Health Technology",
    companySize: "101-250",
    foundedYear: 2017,
    city: "Singapore",
    country: "Singapore",
    address: "444 Orchard Road, #20-05",
    description: "Healthcare technology company developing telemedicine and health management solutions.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/10b981/ffffff&text=HT",
    coverUrl: "https://dummyimage.com/1200x360/10b981/ffffff&text=HealthTech",
  },
  {
    name: "EdTech Solutions",
    slug: "edtech-solutions",
    website: "https://edtech.solutions",
    industry: "Education Technology",
    companySize: "51-200",
    foundedYear: 2019,
    city: "Hanoi",
    country: "Vietnam",
    address: "666 Hoang Quoc Viet Street",
    description: "Educational technology company creating online learning platforms and educational software.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/3b82f6/ffffff&text=ET",
    coverUrl: "https://dummyimage.com/1200x360/3b82f6/ffffff&text=EdTech",
  },
  {
    name: "IoT Systems",
    slug: "iot-systems",
    website: "https://iot.systems",
    industry: "IoT & Hardware",
    companySize: "51-200",
    foundedYear: 2018,
    city: "Ho Chi Minh City",
    country: "Vietnam",
    address: "777 Vo Van Tan Street, District 3",
    description: "IoT and embedded systems company developing smart devices and IoT solutions.",
    isVerified: true,
    logoUrl: "https://dummyimage.com/200x200/6366f1/ffffff&text=IoT",
    coverUrl: "https://dummyimage.com/1200x360/6366f1/ffffff&text=IoT+Systems",
  },
  {
    name: "QA Testing Labs",
    slug: "qa-testing-labs",
    website: "https://qa.testing",
    industry: "Quality Assurance",
    companySize: "11-50",
    foundedYear: 2020,
    city: "Da Nang",
    country: "Vietnam",
    address: "888 Le Duan Street",
    description: "Quality assurance and testing company providing automated testing and QA services.",
    isVerified: false,
    logoUrl: "https://dummyimage.com/200x200/f97316/ffffff&text=QA",
    coverUrl: "https://dummyimage.com/1200x360/f97316/ffffff&text=QA+Testing",
  },
];

// Recruiters data (one per company)
const recruitersData = [
  { firstName: "Minh", lastName: "Tran", email: "recruiter@techventure.com", position: "Talent Acquisition Manager" },
  { firstName: "Linh", lastName: "Nguyen", email: "recruiter@cloudscale.io", position: "Senior Recruiter" },
  { firstName: "David", lastName: "Chen", email: "recruiter@dataflow.ai", position: "Head of Talent" },
  { firstName: "An", lastName: "Le", email: "recruiter@codecraft.dev", position: "Recruiter" },
  { firstName: "Khoa", lastName: "Pham", email: "recruiter@securenet.systems", position: "Talent Manager" },
  { firstName: "Hoa", lastName: "Vo", email: "recruiter@mobilefirst.app", position: "Senior Recruiter" },
  { firstName: "Quang", lastName: "Do", email: "recruiter@devopspro.io", position: "Recruiter" },
  { firstName: "Sarah", lastName: "Lim", email: "recruiter@blockchainlabs.tech", position: "Talent Acquisition Lead" },
  { firstName: "Tuan", lastName: "Bui", email: "recruiter@aiinnovations.com", position: "Recruiter" },
  { firstName: "Mai", lastName: "Hoang", email: "recruiter@fullstack.dynamics", position: "Talent Manager" },
  { firstName: "Nam", lastName: "Phan", email: "recruiter@webdev.agency", position: "Recruiter" },
  { firstName: "Lan", lastName: "Truong", email: "recruiter@gamestudio.pro", position: "Talent Manager" },
  { firstName: "James", lastName: "Wong", email: "recruiter@fintech.solutions", position: "Head of Talent" },
  { firstName: "Thao", lastName: "Vu", email: "recruiter@ecommerce.platform", position: "Senior Recruiter" },
  { firstName: "Duc", lastName: "Nguyen", email: "recruiter@startuphub.io", position: "Recruiter" },
  { firstName: "Huyen", lastName: "Le", email: "recruiter@digitalmarketing.tech", position: "Talent Manager" },
  { firstName: "Michael", lastName: "Tan", email: "recruiter@healthtech.innovations", position: "Senior Recruiter" },
  { firstName: "Phuong", lastName: "Hoang", email: "recruiter@edtech.solutions", position: "Recruiter" },
  { firstName: "Long", lastName: "Tran", email: "recruiter@iot.systems", position: "Talent Manager" },
  { firstName: "Nga", lastName: "Do", email: "recruiter@qa.testing", position: "Recruiter" },
];

// IT Job templates with diverse types, locations, and experience levels
const jobTemplates = [
  // FULL_TIME Jobs
  {
    title: "Senior Full Stack Developer",
    description: "We are looking for an experienced Full Stack Developer to join our engineering team. You will be responsible for designing, developing, and maintaining scalable web applications.",
    requirements: "<ul><li>5+ years of experience in full-stack development</li><li>Strong proficiency in Node.js, React, and TypeScript</li><li>Experience with PostgreSQL, MongoDB, or similar databases</li><li>Knowledge of RESTful APIs and microservices architecture</li><li>Experience with cloud platforms (AWS, GCP, or Azure)</li><li>Strong problem-solving skills and attention to detail</li></ul>",
    benefits: "<ul><li>Competitive salary and equity options</li><li>Flexible working hours and remote work options</li><li>Comprehensive health insurance</li><li>Professional development budget</li><li>Modern tech stack and tools</li></ul>",
    type: JobType.FULL_TIME,
    location: "Ho Chi Minh City",
    isRemote: true,
    salaryMin: 2000,
    salaryMax: 3500,
    currency: Currency.USD,
    experienceLevel: "Senior",
    quantity: 2,
  },
  {
    title: "Junior Frontend Developer",
    description: "Perfect opportunity for a junior developer to grow their skills. Work on modern React applications with mentorship from senior developers.",
    requirements: "<ul><li>1+ years of frontend development experience</li><li>Basic knowledge of React, JavaScript, and HTML/CSS</li><li>Willingness to learn and grow</li><li>Good communication skills</li><li>Portfolio or GitHub profile</li></ul>",
    benefits: "<ul><li>Mentorship program</li><li>Learning budget</li><li>Flexible schedule</li><li>Health insurance</li><li>Career growth opportunities</li></ul>",
    type: JobType.FULL_TIME,
    location: "Hanoi",
    isRemote: false,
    salaryMin: 800,
    salaryMax: 1500,
    currency: Currency.USD,
    experienceLevel: "Junior",
    quantity: 3,
  },
  {
    title: "Lead Software Engineer",
    description: "Lead a team of talented engineers building next-generation products. Technical leadership role with hands-on coding.",
    requirements: "<ul><li>8+ years of software development experience</li><li>3+ years in a leadership role</li><li>Expert-level knowledge in multiple programming languages</li><li>Experience with system architecture and design</li><li>Strong mentoring and communication skills</li></ul>",
    benefits: "<ul><li>Top-tier compensation</li><li>Equity package</li><li>Executive benefits</li><li>Conference and training budget</li><li>Flexible work arrangements</li></ul>",
    type: JobType.FULL_TIME,
    location: "Singapore",
    isRemote: true,
    salaryMin: 5000,
    salaryMax: 8000,
    currency: Currency.USD,
    experienceLevel: "Lead",
    quantity: 1,
  },
  {
    title: "Backend Engineer (Node.js/Python)",
    description: "Join our backend team to build robust, scalable APIs and microservices. You'll work on high-traffic systems serving millions of users.",
    requirements: "<ul><li>3+ years of backend development experience</li><li>Expertise in Node.js or Python</li><li>Experience with database design and optimization</li><li>Knowledge of message queues (RabbitMQ, Kafka)</li><li>Understanding of system design and scalability</li><li>Experience with Docker and Kubernetes</li></ul>",
    benefits: "<ul><li>Attractive compensation package</li><li>Remote-first culture</li><li>Learning and conference budget</li><li>Stock options</li><li>Top-tier equipment</li></ul>",
    type: JobType.FULL_TIME,
    location: "Hanoi",
    isRemote: true,
    salaryMin: 1800,
    salaryMax: 3000,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 3,
  },
  // PART_TIME Jobs
  {
    title: "Part-time Frontend Developer",
    description: "Flexible part-time position for a frontend developer. Perfect for freelancers or students looking for additional income.",
    requirements: "<ul><li>2+ years of frontend development experience</li><li>Proficiency in React or Vue.js</li><li>Ability to work 20-30 hours per week</li><li>Good time management skills</li></ul>",
    benefits: "<ul><li>Flexible schedule</li><li>Remote work</li><li>Competitive hourly rate</li><li>Project-based bonuses</li></ul>",
    type: JobType.PART_TIME,
    location: "Ho Chi Minh City",
    isRemote: true,
    salaryMin: 1200,
    salaryMax: 2000,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 2,
  },
  {
    title: "Part-time UI/UX Designer",
    description: "Part-time design role for creating beautiful user interfaces. Work on exciting projects with flexible hours.",
    requirements: "<ul><li>3+ years of UI/UX design experience</li><li>Proficiency in Figma or Adobe XD</li><li>Portfolio demonstrating design skills</li><li>20-25 hours per week availability</li></ul>",
    benefits: "<ul><li>Flexible hours</li><li>Remote work options</li><li>Creative freedom</li><li>Design tool subscriptions</li></ul>",
    type: JobType.PART_TIME,
    location: "Hanoi",
    isRemote: true,
    salaryMin: 1000,
    salaryMax: 1800,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 1,
  },
  // CONTRACT Jobs
  {
    title: "Contract Full Stack Developer",
    description: "6-month contract position for an experienced full stack developer. Opportunity to extend based on performance.",
    requirements: "<ul><li>5+ years of full stack development</li><li>Node.js, React, and database expertise</li><li>Available for 6-month contract</li><li>Strong communication skills</li></ul>",
    benefits: "<ul><li>Competitive contract rate</li><li>Remote work</li><li>Flexible timeline</li><li>Potential for extension</li></ul>",
    type: JobType.CONTRACT,
    location: "Singapore",
    isRemote: true,
    salaryMin: 3000,
    salaryMax: 5000,
    currency: Currency.USD,
    experienceLevel: "Senior",
    quantity: 1,
  },
  {
    title: "Contract DevOps Engineer",
    description: "3-month contract to help set up CI/CD pipelines and cloud infrastructure. Fast-paced project with immediate impact.",
    requirements: "<ul><li>4+ years of DevOps experience</li><li>AWS or GCP certification preferred</li><li>Kubernetes and Docker expertise</li><li>Available for immediate start</li></ul>",
    benefits: "<ul><li>High contract rate</li><li>Remote work</li><li>Short-term commitment</li><li>Quick payment terms</li></ul>",
    type: JobType.CONTRACT,
    location: "Ho Chi Minh City",
    isRemote: true,
    salaryMin: 2500,
    salaryMax: 4000,
    currency: Currency.USD,
    experienceLevel: "Senior",
    quantity: 1,
  },
  // FREELANCE Jobs
  {
    title: "Freelance Mobile App Developer",
    description: "Freelance opportunity to build mobile applications. Work on multiple projects with flexible deadlines.",
    requirements: "<ul><li>3+ years of mobile development</li><li>React Native or Flutter experience</li><li>Portfolio of published apps</li><li>Self-motivated and reliable</li></ul>",
    benefits: "<ul><li>Project-based payment</li><li>Complete flexibility</li><li>Work from anywhere</li><li>Choose your projects</li></ul>",
    type: JobType.FREELANCE,
    location: "Remote",
    isRemote: true,
    salaryMin: 1500,
    salaryMax: 3000,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 3,
  },
  {
    title: "Freelance Web Developer",
    description: "Freelance web developer needed for various client projects. Build modern websites and web applications.",
    requirements: "<ul><li>2+ years of web development</li><li>HTML, CSS, JavaScript expertise</li><li>Experience with modern frameworks</li><li>Good client communication</li></ul>",
    benefits: "<ul><li>Flexible projects</li><li>Remote work</li><li>Set your own rates</li><li>Diverse client base</li></ul>",
    type: JobType.FREELANCE,
    location: "Remote",
    isRemote: true,
    salaryMin: 800,
    salaryMax: 2000,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 2,
  },
  // INTERNSHIP Jobs
  {
    title: "Software Engineering Intern",
    description: "Paid internship for students or recent graduates. Learn from experienced developers and work on real projects.",
    requirements: "<ul><li>Currently pursuing or recently completed CS degree</li><li>Basic programming knowledge</li><li>Eagerness to learn</li><li>Good problem-solving skills</li></ul>",
    benefits: "<ul><li>Mentorship program</li><li>Stipend provided</li><li>Learning opportunities</li><li>Potential for full-time offer</li></ul>",
    type: JobType.INTERNSHIP,
    location: "Hanoi",
    isRemote: false,
    salaryMin: 400,
    salaryMax: 800,
    currency: Currency.USD,
    experienceLevel: "Junior",
    quantity: 5,
  },
  {
    title: "Frontend Development Intern",
    description: "Internship opportunity for frontend development. Work with React and modern web technologies.",
    requirements: "<ul><li>Basic knowledge of HTML, CSS, JavaScript</li><li>Interest in frontend development</li><li>Currently enrolled in university</li><li>Portfolio or projects to share</li></ul>",
    benefits: "<ul><li>Hands-on experience</li><li>Mentorship</li><li>Monthly stipend</li><li>Certificate of completion</li></ul>",
    type: JobType.INTERNSHIP,
    location: "Ho Chi Minh City",
    isRemote: true,
    salaryMin: 300,
    salaryMax: 600,
    currency: Currency.USD,
    experienceLevel: "Junior",
    quantity: 3,
  },
  // REMOTE Jobs (explicitly remote)
  {
    title: "Remote Senior Backend Developer",
    description: "100% remote position for a senior backend developer. Work from anywhere with flexible hours.",
    requirements: "<ul><li>6+ years of backend development</li><li>Expert-level in Node.js or Python</li><li>Experience with distributed systems</li><li>Self-disciplined and proactive</li></ul>",
    benefits: "<ul><li>100% remote work</li><li>Flexible hours</li><li>Competitive salary</li><li>Home office budget</li></ul>",
    type: JobType.REMOTE,
    location: "Remote",
    isRemote: true,
    salaryMin: 2500,
    salaryMax: 4500,
    currency: Currency.USD,
    experienceLevel: "Senior",
    quantity: 2,
  },
  {
    title: "Remote Full Stack Developer",
    description: "Fully remote full stack developer position. Join our distributed team and work from anywhere.",
    requirements: "<ul><li>4+ years of full stack experience</li><li>React and Node.js proficiency</li><li>Experience working remotely</li><li>Good communication skills</li></ul>",
    benefits: "<ul><li>Work from anywhere</li><li>Flexible schedule</li><li>Annual team meetups</li><li>Equipment provided</li></ul>",
    type: JobType.REMOTE,
    location: "Remote",
    isRemote: true,
    salaryMin: 2000,
    salaryMax: 3500,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 3,
  },
  // More FULL_TIME jobs with different locations
  {
    title: "Mid-level Backend Developer",
    description: "Join our growing backend team. Work on scalable APIs and microservices for our platform.",
    requirements: "<ul><li>3+ years of backend development</li><li>Node.js or Python expertise</li><li>Database design experience</li><li>API development skills</li></ul>",
    benefits: "<ul><li>Competitive salary</li><li>Health insurance</li><li>Learning budget</li><li>Flexible hours</li></ul>",
    type: JobType.FULL_TIME,
    location: "Da Nang",
    isRemote: true,
    salaryMin: 1400,
    salaryMax: 2400,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 2,
  },
  {
    title: "Senior Frontend Architect",
    description: "Lead frontend architecture decisions and mentor the team. Shape the future of our frontend stack.",
    requirements: "<ul><li>7+ years of frontend experience</li><li>Expert-level React/TypeScript</li><li>Architecture and design patterns</li><li>Team leadership experience</li></ul>",
    benefits: "<ul><li>Top compensation</li><li>Equity</li><li>Conference budget</li><li>Flexible work</li></ul>",
    type: JobType.FULL_TIME,
    location: "Singapore",
    isRemote: true,
    salaryMin: 4500,
    salaryMax: 7000,
    currency: Currency.USD,
    experienceLevel: "Senior",
    quantity: 1,
  },
  {
    title: "QA Automation Engineer",
    description: "Build and maintain automated testing frameworks. Ensure quality across our products.",
    requirements: "<ul><li>3+ years of QA automation</li><li>Selenium, Cypress, or Playwright</li><li>Programming skills (Python/JavaScript)</li><li>CI/CD integration experience</li></ul>",
    benefits: "<ul><li>Competitive package</li><li>Remote options</li><li>Health benefits</li><li>Training budget</li></ul>",
    type: JobType.FULL_TIME,
    location: "Ho Chi Minh City",
    isRemote: true,
    salaryMin: 1500,
    salaryMax: 2800,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 2,
  },
  {
    title: "Product Manager",
    description: "Drive product strategy and roadmap. Work with engineering and design to deliver great products.",
    requirements: "<ul><li>4+ years of product management</li><li>Technical background preferred</li><li>Data-driven decision making</li><li>Strong communication skills</li></ul>",
    benefits: "<ul><li>Competitive salary</li><li>Equity package</li><li>Health insurance</li><li>Conference attendance</li></ul>",
    type: JobType.FULL_TIME,
    location: "Hanoi",
    isRemote: true,
    salaryMin: 2200,
    salaryMax: 4000,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 1,
  },
  // More PART_TIME jobs
  {
    title: "Part-time Backend Developer",
    description: "Part-time backend development role. Perfect for those seeking work-life balance.",
    requirements: "<ul><li>3+ years of backend development</li><li>Node.js or Python skills</li><li>20-25 hours per week</li><li>Good time management</li></ul>",
    benefits: "<ul><li>Flexible schedule</li><li>Remote work</li><li>Pro-rated benefits</li><li>Work-life balance</li></ul>",
    type: JobType.PART_TIME,
    location: "Remote",
    isRemote: true,
    salaryMin: 1000,
    salaryMax: 1800,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 2,
  },
  // More CONTRACT jobs
  {
    title: "Contract Frontend Developer",
    description: "3-6 month contract for frontend development. Build modern React applications.",
    requirements: "<ul><li>3+ years of frontend development</li><li>React and TypeScript expertise</li><li>Available for contract period</li><li>Portfolio required</li></ul>",
    benefits: "<ul><li>Competitive rate</li><li>Remote work</li><li>Flexible timeline</li><li>Quick payment</li></ul>",
    type: JobType.CONTRACT,
    location: "Ho Chi Minh City",
    isRemote: true,
    salaryMin: 2000,
    salaryMax: 3500,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 1,
  },
  // More FREELANCE jobs
  {
    title: "Freelance Data Analyst",
    description: "Freelance data analysis projects. Work with various clients on data insights and visualization.",
    requirements: "<ul><li>2+ years of data analysis</li><li>Python or R proficiency</li><li>SQL and Excel skills</li><li>Portfolio of projects</li></ul>",
    benefits: "<ul><li>Project flexibility</li><li>Remote work</li><li>Set your rates</li><li>Diverse projects</li></ul>",
    type: JobType.FREELANCE,
    location: "Remote",
    isRemote: true,
    salaryMin: 1000,
    salaryMax: 2500,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 2,
  },
  // More INTERNSHIP jobs
  {
    title: "Backend Development Intern",
    description: "Internship for backend development. Learn Node.js, databases, and API design.",
    requirements: "<ul><li>Basic programming knowledge</li><li>Interest in backend development</li><li>Currently in university</li><li>Willingness to learn</li></ul>",
    benefits: "<ul><li>Mentorship</li><li>Stipend</li><li>Real project experience</li><li>Certificate</li></ul>",
    type: JobType.INTERNSHIP,
    location: "Hanoi",
    isRemote: false,
    salaryMin: 350,
    salaryMax: 700,
    currency: Currency.USD,
    experienceLevel: "Junior",
    quantity: 4,
  },
  {
    title: "DevOps Intern",
    description: "Learn DevOps practices and tools. Work with cloud infrastructure and CI/CD pipelines.",
    requirements: "<ul><li>Basic Linux knowledge</li><li>Interest in infrastructure</li><li>Currently studying</li><li>Eager to learn</li></ul>",
    benefits: "<ul><li>Hands-on experience</li><li>Mentorship</li><li>Monthly stipend</li><li>Cloud certifications</li></ul>",
    type: JobType.INTERNSHIP,
    location: "Ho Chi Minh City",
    isRemote: true,
    salaryMin: 400,
    salaryMax: 800,
    currency: Currency.USD,
    experienceLevel: "Junior",
    quantity: 2,
  },
  // More REMOTE jobs
  {
    title: "Remote DevOps Engineer",
    description: "100% remote DevOps position. Manage cloud infrastructure and automation from anywhere.",
    requirements: "<ul><li>4+ years of DevOps experience</li><li>AWS/GCP expertise</li><li>Kubernetes and Docker</li><li>Self-motivated</li></ul>",
    benefits: "<ul><li>Fully remote</li><li>Flexible hours</li><li>Competitive salary</li><li>Equipment budget</li></ul>",
    type: JobType.REMOTE,
    location: "Remote",
    isRemote: true,
    salaryMin: 2800,
    salaryMax: 4800,
    currency: Currency.USD,
    experienceLevel: "Senior",
    quantity: 2,
  },
  {
    title: "Remote Product Designer",
    description: "Remote product design role. Create beautiful user experiences from anywhere in the world.",
    requirements: "<ul><li>4+ years of product design</li><li>Figma expertise</li><li>Portfolio required</li><li>Remote work experience</li></ul>",
    benefits: "<ul><li>Work from anywhere</li><li>Flexible schedule</li><li>Design tool budget</li><li>Annual meetups</li></ul>",
    type: JobType.REMOTE,
    location: "Remote",
    isRemote: true,
    salaryMin: 1800,
    salaryMax: 3200,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 1,
  },
  {
    title: "Frontend Engineer (React/TypeScript)",
    description: "We're seeking a talented Frontend Engineer to create beautiful, performant user interfaces. You'll work closely with designers and product managers.",
    requirements: "<ul><li>3+ years of frontend development experience</li><li>Strong proficiency in React, TypeScript, and modern JavaScript</li><li>Experience with state management (Redux, Zustand)</li><li>Knowledge of CSS-in-JS or Tailwind CSS</li><li>Understanding of web performance optimization</li><li>Experience with testing frameworks (Jest, React Testing Library)</li></ul>",
    benefits: "<ul><li>Competitive salary</li><li>Flexible schedule</li><li>Health and dental insurance</li><li>Annual team retreats</li><li>Professional growth opportunities</li></ul>",
    type: JobType.FULL_TIME,
    location: "Ho Chi Minh City",
    isRemote: true,
    salaryMin: 1600,
    salaryMax: 2800,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 2,
  },
  {
    title: "DevOps Engineer",
    description: "Help us build and maintain our cloud infrastructure. You'll work on CI/CD pipelines, monitoring, and automation.",
    requirements: "<ul><li>4+ years of DevOps or SRE experience</li><li>Strong knowledge of AWS, GCP, or Azure</li><li>Experience with Docker, Kubernetes, and container orchestration</li><li>Proficiency in Infrastructure as Code (Terraform, CloudFormation)</li><li>Experience with CI/CD tools (GitHub Actions, GitLab CI, Jenkins)</li><li>Knowledge of monitoring and logging (Prometheus, Grafana, ELK)</li></ul>",
    benefits: "<ul><li>Excellent compensation</li><li>Remote work options</li><li>On-call compensation</li><li>Certification reimbursement</li><li>Latest tools and equipment</li></ul>",
    type: JobType.FULL_TIME,
    location: "Singapore",
    isRemote: false,
    salaryMin: 3000,
    salaryMax: 5000,
    currency: Currency.USD,
    experienceLevel: "Senior",
    quantity: 1,
  },
  {
    title: "Data Engineer",
    description: "Build and maintain data pipelines that process terabytes of data daily. Work with our data science team to enable analytics and ML.",
    requirements: "<ul><li>3+ years of data engineering experience</li><li>Proficiency in Python or Scala</li><li>Experience with data pipelines (Airflow, Spark, Flink)</li><li>Knowledge of data warehouses (Snowflake, BigQuery, Redshift)</li><li>Understanding of ETL/ELT processes</li><li>Experience with SQL and NoSQL databases</li></ul>",
    benefits: "<ul><li>Competitive package</li><li>Flexible hours</li><li>Health insurance</li><li>Data conference budget</li><li>Stock options</li></ul>",
    type: JobType.FULL_TIME,
    location: "Hanoi",
    isRemote: true,
    salaryMin: 2000,
    salaryMax: 3800,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 2,
  },
  {
    title: "Mobile Developer (React Native/Flutter)",
    description: "Develop cross-platform mobile applications for iOS and Android. Work on user-facing features and performance optimization.",
    requirements: "<ul><li>3+ years of mobile development experience</li><li>Proficiency in React Native or Flutter</li><li>Experience with native iOS (Swift) or Android (Kotlin)</li><li>Understanding of mobile app architecture</li><li>Experience with app store deployment</li><li>Knowledge of mobile testing frameworks</li></ul>",
    benefits: "<ul><li>Attractive salary</li><li>Remote-friendly</li><li>Device budget (iPhone, Android)</li><li>Health benefits</li><li>Learning opportunities</li></ul>",
    type: JobType.FULL_TIME,
    location: "Ho Chi Minh City",
    isRemote: true,
    salaryMin: 1500,
    salaryMax: 2600,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 3,
  },
  {
    title: "Security Engineer",
    description: "Protect our systems and data from threats. Conduct security audits, implement security best practices, and respond to incidents.",
    requirements: "<ul><li>4+ years of security engineering experience</li><li>Knowledge of security frameworks and standards</li><li>Experience with penetration testing and vulnerability assessment</li><li>Understanding of network security and cryptography</li><li>Familiarity with security tools (Burp Suite, OWASP ZAP)</li><li>Experience with secure coding practices</li></ul>",
    benefits: "<ul><li>Premium compensation</li><li>Remote options</li><li>Security certification support</li><li>Health and life insurance</li><li>On-call allowance</li></ul>",
    type: JobType.FULL_TIME,
    location: "Singapore",
    isRemote: false,
    salaryMin: 3500,
    salaryMax: 5500,
    currency: Currency.USD,
    experienceLevel: "Senior",
    quantity: 1,
  },
  {
    title: "Machine Learning Engineer",
    description: "Design and implement ML models for production systems. Work with large datasets and deploy models at scale.",
    requirements: "<ul><li>3+ years of ML engineering experience</li><li>Strong proficiency in Python and ML frameworks (TensorFlow, PyTorch)</li><li>Experience with MLOps and model deployment</li><li>Knowledge of data preprocessing and feature engineering</li><li>Understanding of deep learning and neural networks</li><li>Experience with cloud ML platforms</li></ul>",
    benefits: "<ul><li>Competitive salary</li><li>Research publication support</li><li>Conference attendance</li><li>Health benefits</li><li>Stock options</li></ul>",
    type: JobType.FULL_TIME,
    location: "Ho Chi Minh City",
    isRemote: true,
    salaryMin: 2200,
    salaryMax: 4000,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 2,
  },
  {
    title: "Blockchain Developer",
    description: "Build decentralized applications and smart contracts. Work on cutting-edge blockchain technology.",
    requirements: "<ul><li>2+ years of blockchain development experience</li><li>Proficiency in Solidity or Rust</li><li>Experience with Ethereum, Polygon, or other blockchains</li><li>Understanding of DeFi protocols</li><li>Knowledge of Web3.js or Ethers.js</li><li>Experience with smart contract testing and security</li></ul>",
    benefits: "<ul><li>Attractive package</li><li>Remote work</li><li>Crypto bonuses</li><li>Conference budget</li><li>Flexible schedule</li></ul>",
    type: JobType.FULL_TIME,
    location: "Singapore",
    isRemote: true,
    salaryMin: 2800,
    salaryMax: 4500,
    currency: Currency.USD,
    experienceLevel: "Mid",
    quantity: 2,
  },
  {
    title: "Site Reliability Engineer (SRE)",
    description: "Ensure our systems are reliable, scalable, and performant. Build automation and monitoring solutions.",
    requirements: "<ul><li>4+ years of SRE or DevOps experience</li><li>Strong programming skills (Python, Go, or similar)</li><li>Experience with Kubernetes and container orchestration</li><li>Knowledge of monitoring and observability tools</li><li>Understanding of distributed systems</li><li>Experience with incident response and on-call</li></ul>",
    benefits: "<ul><li>Excellent compensation</li><li>Remote options</li><li>On-call compensation</li><li>Health insurance</li><li>Professional development</li></ul>",
    type: JobType.FULL_TIME,
    location: "Hanoi",
    isRemote: true,
    salaryMin: 2500,
    salaryMax: 4200,
    currency: Currency.USD,
    experienceLevel: "Senior",
    quantity: 1,
  },
];

// Skills that will be associated with jobs
const commonSkills = [
  "Node.js", "React", "TypeScript", "Python", "PostgreSQL", "Docker", "Kubernetes",
  "AWS", "GCP", "MongoDB", "Redis", "GraphQL", "Terraform", "Go", "Java",
  "Flutter", "React Native", "Swift", "Kotlin", "TensorFlow", "PyTorch", "Solidity",
];

function generateSlug(title: string, companySlug: string): string {
  return `${companySlug}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

async function clearOldData() {
  console.log("🧹 Clearing old seed data...");
  
  // Get company slugs from seed data
  const companySlugs = companiesData.map(c => c.slug);
  
  // Find companies to delete
  const companiesToDelete = await prisma.company.findMany({
    where: {
      slug: { in: companySlugs }
    },
    include: {
      jobs: {
        include: {
          applications: {
            include: {
              interviews: true,
              history: true,
            }
          },
          savedBy: true,
        }
      },
      recruiters: {
        include: {
          user: true
        }
      }
    }
  });

  if (companiesToDelete.length > 0) {
    // Delete related data first
    const companyIds = companiesToDelete.map(c => c.id);
    const jobIds = companiesToDelete.flatMap(c => c.jobs.map(j => j.id));
    const recruiterIds = companiesToDelete.flatMap(c => c.recruiters.map(r => r.id));
    const userIds = companiesToDelete.flatMap(c => c.recruiters.map(r => r.userId));
    
    // Get all application IDs and interview IDs
    const applicationIds = companiesToDelete.flatMap(c => 
      c.jobs.flatMap(j => j.applications.map(a => a.id))
    );
    const interviewIds = companiesToDelete.flatMap(c => 
      c.jobs.flatMap(j => j.applications.flatMap(a => a.interviews.map(i => i.id)))
    );
    const applicationHistoryIds = companiesToDelete.flatMap(c => 
      c.jobs.flatMap(j => j.applications.flatMap(a => a.history.map(h => h.id)))
    );

    await prisma.$transaction([
      // Delete interview exchanges
      prisma.interviewExchange.deleteMany({ where: { interviewId: { in: interviewIds } } }),
      // Delete interviews
      prisma.interview.deleteMany({ where: { id: { in: interviewIds } } }),
      // Delete application history
      prisma.applicationHistory.deleteMany({ where: { id: { in: applicationHistoryIds } } }),
      // Delete applications
      prisma.application.deleteMany({ where: { id: { in: applicationIds } } }),
      // Delete job-related data
      prisma.jobSkill.deleteMany({ where: { jobId: { in: jobIds } } }),
      prisma.jobCategory.deleteMany({ where: { jobId: { in: jobIds } } }),
      prisma.savedJob.deleteMany({ where: { jobId: { in: jobIds } } }),
      // Delete jobs
      prisma.job.deleteMany({ where: { companyId: { in: companyIds } } }),
      // Delete recruiters
      prisma.recruiterProfile.deleteMany({ where: { id: { in: recruiterIds } } }),
      // Delete users (recruiters)
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
      // Delete companies
      prisma.company.deleteMany({ where: { id: { in: companyIds } } }),
    ]);

    console.log(`✅ Cleared ${companiesToDelete.length} companies, ${jobIds.length} jobs, and related data`);
  } else {
    console.log("ℹ️  No old data to clear");
  }
}

async function main() {
  console.log("🌱 Starting seed for companies, recruiters, and jobs...");

  // Clear old seed data first
  await clearOldData();

  // Get or create skills
  const skills = await Promise.all(
    commonSkills.map((name) =>
      prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
  const skillMap = Object.fromEntries(skills.map((s) => [s.name, s.id]));
  console.log(`✅ Skills ready: ${skills.length} skills`);

  // Get or create IT category
  const itCategory = await prisma.category.upsert({
    where: { name: "Engineering" },
    update: {},
    create: { name: "Engineering", iconUrl: "https://dummyimage.com/120x120/0f172a/38bdf8&text=Eng" },
  });
  console.log("✅ Category ready");

  // Create companies
  const companies = await Promise.all(
    companiesData.map((data) =>
      prisma.company.upsert({
        where: { slug: data.slug },
        update: {},
        create: data,
      })
    )
  );
  console.log(`✅ Created ${companies.length} companies`);

  // Create users and recruiters
  const usersAndRecruiters = await Promise.all(
    companies.map(async (company, index) => {
      const recruiterData = recruitersData[index];
      const passwordHash = hashPassword("password123"); // Default password

      // Create user
      const user = await prisma.user.upsert({
        where: { email: recruiterData.email },
        update: {},
        create: {
          email: recruiterData.email,
          passwordHash,
          firstName: recruiterData.firstName,
          lastName: recruiterData.lastName,
          role: UserRole.RECRUITER,
          isVerified: true,
          isActive: true,
        },
      });

      // Create recruiter profile
      const recruiter = await prisma.recruiterProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          companyId: company.id,
          position: recruiterData.position,
        },
      });

      return { user, recruiter, company };
    })
  );
  console.log(`✅ Created ${usersAndRecruiters.length} recruiters`);

  // Create jobs for each company (15-20 jobs per company for diversity)
  const allJobs = [];
  for (const { recruiter, company } of usersAndRecruiters) {
    // Select 15-20 random job templates (with some variation)
    const numJobs = 15 + Math.floor(Math.random() * 6); // 15-20 jobs
    const selectedTemplates = [...jobTemplates]
      .sort(() => Math.random() - 0.5)
      .slice(0, numJobs);

    const companyJobs = await Promise.all(
      selectedTemplates.map(async (template, idx) => {
        const slug = generateSlug(template.title, company.slug);
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 30 + Math.floor(Math.random() * 30)); // 30-60 days from now

        const job = await prisma.job.create({
          data: {
            slug,
            title: template.title,
            companyId: company.id,
            recruiterId: recruiter.id,
            description: template.description,
            requirements: template.requirements,
            benefits: template.benefits,
            type: template.type,
            status: JobStatus.PUBLISHED,
            location: company.city || template.location,
            isRemote: template.isRemote,
            salaryMin: template.salaryMin,
            salaryMax: template.salaryMax,
            currency: template.currency,
            experienceLevel: template.experienceLevel,
            quantity: template.quantity,
            publishedAt: new Date(),
            deadline,
          },
        });

        // Add job skills (3-5 skills per job, based on job title)
        const jobSkills: string[] = [];
        const titleLower = template.title.toLowerCase();
        
        if (titleLower.includes("full stack") || titleLower.includes("backend")) {
          jobSkills.push("Node.js", "PostgreSQL", "React", "TypeScript");
        } else if (titleLower.includes("frontend")) {
          jobSkills.push("React", "TypeScript", "GraphQL");
        } else if (titleLower.includes("devops") || titleLower.includes("sre")) {
          jobSkills.push("Docker", "Kubernetes", "AWS", "Terraform");
        } else if (titleLower.includes("data")) {
          jobSkills.push("Python", "PostgreSQL", "MongoDB");
        } else if (titleLower.includes("mobile")) {
          jobSkills.push("React Native", "Flutter", "Swift", "Kotlin");
        } else if (titleLower.includes("security")) {
          jobSkills.push("Go", "Python", "AWS");
        } else if (titleLower.includes("machine learning") || titleLower.includes("ml")) {
          jobSkills.push("Python", "TensorFlow", "PyTorch");
        } else if (titleLower.includes("blockchain")) {
          jobSkills.push("Solidity", "Go", "Python");
        } else {
          // Default skills
          jobSkills.push("Node.js", "React", "TypeScript");
        }

        // Add skills to job
        await prisma.jobSkill.createMany({
          data: jobSkills
            .filter((skillName) => skillMap[skillName])
            .map((skillName, skillIdx) => ({
              jobId: job.id,
              skillId: skillMap[skillName],
              isRequired: skillIdx < 2, // First 2 are required
            })),
        });

        // Add category
        await prisma.jobCategory.create({
          data: {
            jobId: job.id,
            categoryId: itCategory.id,
          },
        });

        return job;
      })
    );

    allJobs.push(...companyJobs);
    console.log(`✅ Created ${companyJobs.length} jobs for ${company.name}`);
  }

  console.log(`\n🎉 Seed completed successfully!`);
  console.log(`📊 Summary:`);
  console.log(`   - Companies: ${companies.length}`);
  console.log(`   - Recruiters: ${usersAndRecruiters.length}`);
  console.log(`   - Jobs: ${allJobs.length}`);
  console.log(`   - Skills: ${skills.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

