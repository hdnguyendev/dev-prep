import prisma from "../src/app/db/prisma";

/**
 * Xóa toàn bộ dữ liệu trong database theo thứ tự để tránh lỗi foreign key constraints
 * Script này sẽ xóa TẤT CẢ dữ liệu trong database, không thể hoàn tác!
 */
async function cleanDatabase() {
  console.log("🧹 Bắt đầu xóa toàn bộ dữ liệu trong database...");
  console.log("⚠️  CẢNH BÁO: Tất cả dữ liệu sẽ bị xóa vĩnh viễn!\n");

  try {
    const results: Record<string, number> = {};

    // ============================================
    // 1. INTERVIEW RELATED (Child tables first)
    // ============================================
    console.log("📝 [1/10] Đang xóa InterviewExchanges...");
    results.interviewExchanges = (await prisma.interviewExchange.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.interviewExchanges} InterviewExchanges`);

    console.log("📝 [1/10] Đang xóa Interviews...");
    results.interviews = (await prisma.interview.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.interviews} Interviews`);

    // ============================================
    // 2. APPLICATION RELATED
    // ============================================
    console.log("\n📝 [2/10] Đang xóa Offers...");
    results.offers = (await prisma.offer.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.offers} Offers`);

    console.log("📝 [2/10] Đang xóa ApplicationNotes...");
    results.applicationNotes = (await prisma.applicationNote.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.applicationNotes} ApplicationNotes`);

    console.log("📝 [2/10] Đang xóa ApplicationHistory...");
    results.applicationHistory = (await prisma.applicationHistory.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.applicationHistory} ApplicationHistory`);

    console.log("📝 [2/10] Đang xóa Applications...");
    results.applications = (await prisma.application.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.applications} Applications`);

    // ============================================
    // 3. JOB RELATED
    // ============================================
    console.log("\n📝 [3/10] Đang xóa SavedJobs...");
    results.savedJobs = (await prisma.savedJob.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.savedJobs} SavedJobs`);

    console.log("📝 [3/10] Đang xóa JobSkills...");
    results.jobSkills = (await prisma.jobSkill.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.jobSkills} JobSkills`);

    console.log("📝 [3/10] Đang xóa JobCategories...");
    results.jobCategories = (await prisma.jobCategory.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.jobCategories} JobCategories`);

    console.log("📝 [3/10] Đang xóa Jobs...");
    results.jobs = (await prisma.job.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.jobs} Jobs`);

    // ============================================
    // 4. COMPANY RELATED
    // ============================================
    console.log("\n📝 [4/10] Đang xóa CompanyReviews...");
    results.companyReviews = (await prisma.companyReview.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.companyReviews} CompanyReviews`);

    console.log("📝 [4/10] Đang xóa CompanyFollows...");
    results.companyFollows = (await prisma.companyFollow.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.companyFollows} CompanyFollows`);

    // Xóa RecruiterProfiles TRƯỚC Companies vì có foreign key constraint
    console.log("📝 [4/10] Đang xóa RecruiterProfiles...");
    results.recruiterProfiles = (await prisma.recruiterProfile.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.recruiterProfiles} RecruiterProfiles`);

    console.log("📝 [4/10] Đang xóa Companies...");
    results.companies = (await prisma.company.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.companies} Companies`);

    // ============================================
    // 5. CANDIDATE PROFILE RELATED
    // ============================================
    console.log("\n📝 [5/10] Đang xóa CandidateSkills...");
    results.candidateSkills = (await prisma.candidateSkill.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.candidateSkills} CandidateSkills`);

    console.log("📝 [5/10] Đang xóa Projects...");
    results.projects = (await prisma.project.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.projects} Projects`);

    console.log("📝 [5/10] Đang xóa Experiences...");
    results.experiences = (await prisma.experience.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.experiences} Experiences`);

    console.log("📝 [5/10] Đang xóa Education...");
    results.education = (await prisma.education.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.education} Education`);

    console.log("📝 [5/10] Đang xóa CandidateProfiles...");
    results.candidateProfiles = (await prisma.candidateProfile.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.candidateProfiles} CandidateProfiles`);

    // ============================================
    // 6. MEMBERSHIP & PAYMENT RELATED
    // ============================================
    console.log("\n📝 [6/10] Đang xóa PaymentTransactions...");
    results.paymentTransactions = (await prisma.paymentTransaction.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.paymentTransactions} PaymentTransactions`);

    console.log("📝 [6/10] Đang xóa UserMemberships...");
    results.userMemberships = (await prisma.userMembership.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.userMemberships} UserMemberships`);

    console.log("📝 [6/10] Đang xóa MembershipPlans...");
    results.membershipPlans = (await prisma.membershipPlan.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.membershipPlans} MembershipPlans`);

    // ============================================
    // 7. SKILLS & CATEGORIES (Independent)
    // ============================================
    console.log("\n📝 [7/10] Đang xóa Skills...");
    results.skills = (await prisma.skill.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.skills} Skills`);

    console.log("📝 [7/10] Đang xóa Categories...");
    results.categories = (await prisma.category.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.categories} Categories`);

    // ============================================
    // 8. MESSAGES & NOTIFICATIONS
    // ============================================
    console.log("\n📝 [8/10] Đang xóa Messages...");
    results.messages = (await prisma.message.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.messages} Messages`);

    console.log("📝 [8/10] Đang xóa Notifications...");
    results.notifications = (await prisma.notification.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.notifications} Notifications`);

    // ============================================
    // 9. QUESTION BANK
    // ============================================
    console.log("\n📝 [9/10] Đang xóa QuestionBank...");
    results.questionBank = (await prisma.questionBank.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.questionBank} QuestionBank entries`);

    // ============================================
    // 10. USERS (Cuối cùng vì nhiều bảng phụ thuộc)
    // ============================================
    console.log("\n📝 [10/10] Đang xóa Users...");
    results.users = (await prisma.user.deleteMany({})).count;
    console.log(`   ✅ Đã xóa ${results.users} Users`);

    // ============================================
    // TỔNG KẾT
    // ============================================
    const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);

    console.log("\n" + "=".repeat(60));
    console.log("✅ HOÀN THÀNH! Đã xóa toàn bộ dữ liệu trong database.");
    console.log("=".repeat(60));
    console.log("\n📊 Chi tiết số bản ghi đã xóa:");
    console.log("   - InterviewExchanges:     ", results.interviewExchanges);
    console.log("   - Interviews:              ", results.interviews);
    console.log("   - Offers:                  ", results.offers);
    console.log("   - ApplicationNotes:        ", results.applicationNotes);
    console.log("   - ApplicationHistory:      ", results.applicationHistory);
    console.log("   - Applications:            ", results.applications);
    console.log("   - SavedJobs:               ", results.savedJobs);
    console.log("   - JobSkills:               ", results.jobSkills);
    console.log("   - JobCategories:            ", results.jobCategories);
    console.log("   - Jobs:                    ", results.jobs);
    console.log("   - CompanyReviews:         ", results.companyReviews);
    console.log("   - CompanyFollows:          ", results.companyFollows);
    console.log("   - RecruiterProfiles:        ", results.recruiterProfiles);
    console.log("   - Companies:               ", results.companies);
    console.log("   - CandidateSkills:         ", results.candidateSkills);
    console.log("   - Projects:                ", results.projects);
    console.log("   - Experiences:             ", results.experiences);
    console.log("   - Education:               ", results.education);
    console.log("   - CandidateProfiles:       ", results.candidateProfiles);
    console.log("   - PaymentTransactions:     ", results.paymentTransactions);
    console.log("   - UserMemberships:         ", results.userMemberships);
    console.log("   - MembershipPlans:         ", results.membershipPlans);
    console.log("   - Skills:                  ", results.skills);
    console.log("   - Categories:              ", results.categories);
    console.log("   - Messages:                 ", results.messages);
    console.log("   - Notifications:           ", results.notifications);
    console.log("   - QuestionBank:            ", results.questionBank);
    console.log("   - Users:                    ", results.users);
    console.log("\n📈 Tổng số bản ghi đã xóa: ", totalDeleted);
    console.log("\n💡 Database hiện tại đã trống và sẵn sàng để seed dữ liệu mới.");
    console.log("💡 Bạn có thể chạy seed scripts để tạo dữ liệu mẫu.");

  } catch (error) {
    console.error("\n❌ Lỗi khi xóa dữ liệu:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
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
