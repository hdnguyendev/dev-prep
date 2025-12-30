/**
 * Seed Membership Plans
 * 
 * This script creates default membership plans for Candidates and Recruiters.
 * 
 * Run with: bun run scripts/seedMembershipPlans.ts
 * 
 * Plans created:
 * - FREE Candidate Plan
 * - VIP Candidate Plan (30 days)
 * - FREE Recruiter Plan
 * - VIP Recruiter Plan (30 days)
 */

import prisma from "../src/app/db/prisma";

async function seedMembershipPlans() {
  console.log("🌱 Seeding membership plans...");

  try {
    // FREE Candidate Plan
    const freeCandidatePlan = await prisma.membershipPlan.upsert({
      where: { name: "FREE Candidate" },
      update: {},
      create: {
        name: "FREE Candidate",
        planType: "FREE",
        role: "CANDIDATE",
        price: 0,
        currency: "VND",
        duration: 36500, // 100 years (effectively never expires)
        maxInterviews: 3, // Limited to 3 practice interviews per week
        maxMatchingViews: 10, // Limited to 10 matching views
        unlimitedInterviews: false,
        fullMatchingInsights: false,
        rankedCandidateList: false,
        directCandidateContact: false,
        description: "Free plan for candidates with limited features",
        features: [
          "3 practice interview sessions per week",
          "Scheduled interviews (via access code) are unlimited",
          "Basic job matching",
          "Limited matching insights",
        ],
        isActive: true,
      },
    });

    console.log("✅ Created FREE Candidate plan:", freeCandidatePlan.id);

    // VIP Candidate Plan
    const vipCandidatePlan = await prisma.membershipPlan.upsert({
      where: { name: "VIP Candidate" },
      update: {
        price: 2026, // Update to 2,026 VND
      },
      create: {
        name: "VIP Candidate",
        planType: "VIP",
        role: "CANDIDATE",
        price: 2026, // 2,026 VND
        currency: "VND",
        duration: 30, // 30 days
        maxInterviews: null, // Unlimited
        maxMatchingViews: null, // Unlimited
        unlimitedInterviews: true,
        fullMatchingInsights: true,
        rankedCandidateList: false,
        directCandidateContact: false,
        description: "Premium plan for candidates with unlimited features",
        features: [
          "Unlimited interview sessions",
          "Full CV-Job matching insights",
          "Detailed feedback & improvement suggestions",
          "Priority support",
        ],
        isActive: true,
      },
    });

    console.log("✅ Created VIP Candidate plan:", vipCandidatePlan.id);

    // FREE Recruiter Plan
    const freeRecruiterPlan = await prisma.membershipPlan.upsert({
      where: { name: "FREE Recruiter" },
      update: {
        maxJobPostings: 10, // Update to 10 jobs max
        features: [
          "Up to 10 job postings",
          "View applications",
          "Manage job listings",
        ],
      },
      create: {
        name: "FREE Recruiter",
        planType: "FREE",
        role: "RECRUITER",
        price: 0,
        currency: "VND",
        duration: 36500, // 100 years
        maxJobPostings: 10, // Maximum 10 job postings
        unlimitedInterviews: false,
        fullMatchingInsights: false,
        rankedCandidateList: false,
        directCandidateContact: false,
        description: "Free plan for recruiters with basic features",
        features: [
          "Up to 10 job postings",
          "View applications",
          "Manage job listings",
        ],
        isActive: true,
      },
    });

    console.log("✅ Created FREE Recruiter plan:", freeRecruiterPlan.id);

    // VIP Recruiter Plan
    const vipRecruiterPlan = await prisma.membershipPlan.upsert({
      where: { name: "VIP Recruiter" },
      update: {
        price: 2026, // Update to 2,026 VND
      },
      create: {
        name: "VIP Recruiter",
        planType: "VIP",
        role: "RECRUITER",
        price: 2026, // 2,026 VND
        currency: "VND",
        duration: 30, // 30 days
        maxJobPostings: null, // Unlimited
        unlimitedInterviews: false,
        fullMatchingInsights: false,
        rankedCandidateList: true,
        directCandidateContact: true,
        description: "Premium plan for recruiters with advanced matching features",
        features: [
          "Unlimited job postings",
          "Ranked candidate list per job",
          "Match scores & skill gaps",
          "Direct candidate contact",
          "Priority support",
        ],
        isActive: true,
      },
    });

    console.log("✅ Created VIP Recruiter plan:", vipRecruiterPlan.id);

    console.log("\n✨ Membership plans seeded successfully!");
    console.log("\nPlans created:");
    console.log(`  - ${freeCandidatePlan.name} (${freeCandidatePlan.planType})`);
    console.log(`  - ${vipCandidatePlan.name} (${vipCandidatePlan.planType}) - ${vipCandidatePlan.price.toLocaleString()} ${vipCandidatePlan.currency}`);
    console.log(`  - ${freeRecruiterPlan.name} (${freeRecruiterPlan.planType})`);
    console.log(`  - ${vipRecruiterPlan.name} (${vipRecruiterPlan.planType}) - ${vipRecruiterPlan.price.toLocaleString()} ${vipRecruiterPlan.currency}`);
  } catch (error) {
    console.error("❌ Error seeding membership plans:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (import.meta.main) {
  seedMembershipPlans()
    .then(() => {
      console.log("\n✅ Seed completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Seed failed:", error);
      process.exit(1);
    });
}

export default seedMembershipPlans;
