import prisma from "../src/app/db/prisma";

async function cleanDatabase() {
  console.log("🧹 Starting database cleanup...");

  try {
    // Delete in order (respecting foreign key constraints)
    console.log("Deleting InterviewExchanges...");
    await prisma.interviewExchange.deleteMany({});

    console.log("Deleting Interviews...");
    await prisma.interview.deleteMany({});

    console.log("Deleting ApplicationNotes...");
    await prisma.applicationNote.deleteMany({});

    console.log("Deleting ApplicationHistory...");
    await prisma.applicationHistory.deleteMany({});

    console.log("Deleting Applications...");
    await prisma.application.deleteMany({});

    console.log("Deleting SavedJobs...");
    await prisma.savedJob.deleteMany({});

    console.log("Deleting CompanyReviews...");
    await prisma.companyReview.deleteMany({});

    console.log("Deleting JobSkills...");
    await prisma.jobSkill.deleteMany({});

    console.log("Deleting JobCategories...");
    await prisma.jobCategory.deleteMany({});

    console.log("Deleting Jobs...");
    await prisma.job.deleteMany({});

    console.log("Deleting CandidateSkills...");
    await prisma.candidateSkill.deleteMany({});

    console.log("Deleting Skills...");
    await prisma.skill.deleteMany({});

    console.log("Deleting Categories...");
    await prisma.category.deleteMany({});

    console.log("Deleting Experiences...");
    await prisma.experience.deleteMany({});

    console.log("Deleting Education...");
    await prisma.education.deleteMany({});

    console.log("Deleting CandidateProfiles...");
    await prisma.candidateProfile.deleteMany({});

    console.log("Deleting RecruiterProfiles...");
    await prisma.recruiterProfile.deleteMany({});

    console.log("Deleting Companies...");
    await prisma.company.deleteMany({});

    console.log("Deleting Messages...");
    await prisma.message.deleteMany({});

    console.log("Deleting Notifications...");
    await prisma.notification.deleteMany({});

    console.log("Deleting QuestionBank...");
    await prisma.questionBank.deleteMany({});

    console.log("Deleting all Users...");
    await prisma.user.deleteMany({});

    // Create 1 admin account
    console.log("\n✨ Creating admin account...");
    const admin = await prisma.user.create({
      data: {
        email: "admin@devprep.com",
        passwordHash: "$2a$10$YourHashedPasswordHere", // You should hash "admin123" properly
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        isVerified: true,
        isActive: true,
      },
    });

    // Create 1 sample company and recruiter
    console.log("\n🏢 Creating sample company...");
    const company = await prisma.company.create({
      data: {
        name: "DevPrep Corp",
        slug: "devprep-corp",
        industry: "Technology",
        companySize: "50-100",
        city: "Remote",
        country: "Global",
        isVerified: true,
      },
    });

    console.log("\n👤 Creating recruiter account...");
    const recruiterUser = await prisma.user.create({
      data: {
        email: "recruiter@devprep.com",
        passwordHash: "$2a$10$YourHashedPasswordHere", // Hash for recruiter (e.g., recruiter123)
        firstName: "Recruiter",
        lastName: "User",
        role: "RECRUITER",
        isVerified: true,
        isActive: true,
        recruiterProfile: {
          create: {
            companyId: company.id,
            position: "Talent Lead",
          },
        },
      },
    });

    console.log("\n✅ Database cleaned successfully!");
    console.log("\n🔐 Admin Account Created:");
    console.log("   Email: admin@devprep.com");
    console.log("   Password: admin123");
    console.log("   ID:", admin.id);
    console.log("\n👤 Recruiter Account Created:");
    console.log("   Email: recruiter@devprep.com");
    console.log("   Password: recruiter123");
    console.log("   ID:", recruiterUser.id);
    console.log("\n📊 Database is now clean and ready for setup!");

  } catch (error) {
    console.error("❌ Error cleaning database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
