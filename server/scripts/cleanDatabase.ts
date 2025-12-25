import prisma from "../src/app/db/prisma";

/**
 * Xóa toàn bộ dữ liệu trong database theo thứ tự để tránh lỗi foreign key constraints
 */
async function cleanDatabase() {
  console.log("🧹 Bắt đầu xóa toàn bộ dữ liệu trong database...");

  try {
    // Xóa theo thứ tự từ child tables đến parent tables
    // 1. Interview related
    console.log("📝 Đang xóa InterviewExchanges...");
    const deletedExchanges = await prisma.interviewExchange.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedExchanges.count} InterviewExchanges`);

    console.log("📝 Đang xóa Interviews...");
    const deletedInterviews = await prisma.interview.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedInterviews.count} Interviews`);

    // 2. Application related
    console.log("📝 Đang xóa ApplicationNotes...");
    const deletedNotes = await prisma.applicationNote.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedNotes.count} ApplicationNotes`);

    console.log("📝 Đang xóa ApplicationHistory...");
    const deletedHistory = await prisma.applicationHistory.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedHistory.count} ApplicationHistory`);

    console.log("📝 Đang xóa Applications...");
    const deletedApplications = await prisma.application.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedApplications.count} Applications`);

    // 3. Job related
    console.log("📝 Đang xóa SavedJobs...");
    const deletedSavedJobs = await prisma.savedJob.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedSavedJobs.count} SavedJobs`);

    console.log("📝 Đang xóa JobSkills...");
    const deletedJobSkills = await prisma.jobSkill.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedJobSkills.count} JobSkills`);

    console.log("📝 Đang xóa JobCategories...");
    const deletedJobCategories = await prisma.jobCategory.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedJobCategories.count} JobCategories`);

    console.log("📝 Đang xóa Jobs...");
    const deletedJobs = await prisma.job.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedJobs.count} Jobs`);

    // 4. Company related
    console.log("📝 Đang xóa CompanyReviews...");
    const deletedReviews = await prisma.companyReview.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedReviews.count} CompanyReviews`);

    console.log("📝 Đang xóa CompanyFollows...");
    const deletedFollows = await prisma.companyFollow.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedFollows.count} CompanyFollows`);

    // 5. Candidate Profile related
    console.log("📝 Đang xóa CandidateSkills...");
    const deletedCandidateSkills = await prisma.candidateSkill.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedCandidateSkills.count} CandidateSkills`);

    console.log("📝 Đang xóa Projects...");
    const deletedProjects = await prisma.project.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedProjects.count} Projects`);

    console.log("📝 Đang xóa Experiences...");
    const deletedExperiences = await prisma.experience.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedExperiences.count} Experiences`);

    console.log("📝 Đang xóa Education...");
    const deletedEducation = await prisma.education.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedEducation.count} Education`);

    console.log("📝 Đang xóa CandidateProfiles...");
    const deletedCandidateProfiles = await prisma.candidateProfile.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedCandidateProfiles.count} CandidateProfiles`);

    // 6. Recruiter Profile related
    console.log("📝 Đang xóa RecruiterProfiles...");
    const deletedRecruiterProfiles = await prisma.recruiterProfile.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedRecruiterProfiles.count} RecruiterProfiles`);

    // 7. Company
    console.log("📝 Đang xóa Companies...");
    const deletedCompanies = await prisma.company.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedCompanies.count} Companies`);

    // 8. Skills & Categories (independent)
    console.log("📝 Đang xóa Skills...");
    const deletedSkills = await prisma.skill.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedSkills.count} Skills`);

    console.log("📝 Đang xóa Categories...");
    const deletedCategories = await prisma.category.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedCategories.count} Categories`);

    // 9. Messages & Notifications
    console.log("📝 Đang xóa Messages...");
    const deletedMessages = await prisma.message.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedMessages.count} Messages`);

    console.log("📝 Đang xóa Notifications...");
    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedNotifications.count} Notifications`);

    // 10. QuestionBank
    console.log("📝 Đang xóa QuestionBank...");
    const deletedQuestionBank = await prisma.questionBank.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedQuestionBank.count} QuestionBank entries`);

    // 11. Users (cuối cùng vì nhiều bảng phụ thuộc)
    console.log("📝 Đang xóa Users...");
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`   ✅ Đã xóa ${deletedUsers.count} Users`);

    // Tổng kết
    const totalDeleted =
      deletedExchanges.count +
      deletedInterviews.count +
      deletedNotes.count +
      deletedHistory.count +
      deletedApplications.count +
      deletedSavedJobs.count +
      deletedJobSkills.count +
      deletedJobCategories.count +
      deletedJobs.count +
      deletedReviews.count +
      deletedFollows.count +
      deletedCandidateSkills.count +
      deletedProjects.count +
      deletedExperiences.count +
      deletedEducation.count +
      deletedCandidateProfiles.count +
      deletedRecruiterProfiles.count +
      deletedCompanies.count +
      deletedSkills.count +
      deletedCategories.count +
      deletedMessages.count +
      deletedNotifications.count +
      deletedQuestionBank.count +
      deletedUsers.count;

    console.log("\n✅ Hoàn thành! Đã xóa toàn bộ dữ liệu trong database.");
    console.log(`📊 Tổng số bản ghi đã xóa: ${totalDeleted}`);
    console.log("\n💡 Database hiện tại đã trống và sẵn sàng để seed dữ liệu mới.");

  } catch (error) {
    console.error("❌ Lỗi khi xóa dữ liệu:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy script
cleanDatabase()
  .then(() => {
    console.log("\n✨ Script hoàn thành thành công!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script thất bại:", error);
    process.exit(1);
  });
