import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

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

// Sample review data templates
const reviewTemplates = {
  positive: [
    {
      title: "Great company culture and work-life balance",
      review: "I've been working here for over 2 years and I really enjoy the collaborative environment. The management is supportive and there are plenty of opportunities for growth.",
      pros: "Flexible working hours, great team, learning opportunities, competitive salary",
      cons: "Sometimes meetings can be too frequent, but overall manageable",
      isCurrentEmployee: true,
      wouldRecommend: true,
    },
    {
      title: "Excellent learning environment",
      review: "As a junior developer, I learned so much here. The senior developers are always willing to help and the codebase is well-maintained.",
      pros: "Mentorship program, code reviews, modern tech stack, friendly colleagues",
      cons: "Initial onboarding could be improved",
      isCurrentEmployee: false,
      wouldRecommend: true,
    },
    {
      title: "Innovative projects and cutting-edge technology",
      review: "Working on exciting projects with modern technologies. The company invests in new tools and frameworks, which keeps the work interesting.",
      pros: "Latest technologies, challenging projects, good compensation, remote work option",
      cons: "Fast-paced environment might not suit everyone",
      isCurrentEmployee: true,
      wouldRecommend: true,
    },
  ],
  neutral: [
    {
      title: "Decent place to work",
      review: "The company is okay overall. Benefits are standard and the work is reasonable. Nothing exceptional but nothing terrible either.",
      pros: "Stable job, decent benefits, reasonable workload",
      cons: "Limited growth opportunities, average salary, some bureaucracy",
      isCurrentEmployee: true,
      wouldRecommend: true,
    },
    {
      title: "Mixed experience",
      review: "Had both good and bad experiences here. The team is nice but management decisions can be frustrating at times.",
      pros: "Good colleagues, interesting projects",
      cons: "Management communication, unclear career path, work-life balance issues",
      isCurrentEmployee: false,
      wouldRecommend: false,
    },
  ],
  negative: [
    {
      title: "High turnover and management issues",
      review: "The company has a high turnover rate. Management doesn't seem to value employee feedback and there's a lack of clear direction.",
      pros: "Some good colleagues, location is convenient",
      cons: "Poor management, high stress, limited growth, below market salary",
      isCurrentEmployee: false,
      wouldRecommend: false,
    },
    {
      title: "Not what I expected",
      review: "The job description didn't match reality. I was promised certain responsibilities but ended up doing different work. Left after 6 months.",
      pros: "Quick to hire, flexible schedule",
      cons: "Misleading job description, lack of support, disorganized processes",
      isCurrentEmployee: false,
      wouldRecommend: false,
    },
  ],
};

// Generate random review based on rating
function generateReview(rating: number) {
  let templateCategory: keyof typeof reviewTemplates;
  
  if (rating >= 4) {
    templateCategory = "positive";
  } else if (rating === 3) {
    templateCategory = "neutral";
  } else {
    templateCategory = "negative";
  }

  const templates = reviewTemplates[templateCategory];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // Add some variation
  const variations = [
    "Overall, a solid experience.",
    "Would consider working here again.",
    "Learned valuable skills during my time here.",
    "The team was supportive and collaborative.",
  ];

  return {
    ...template,
    review: template.review + " " + variations[Math.floor(Math.random() * variations.length)],
  };
}

async function seedCompanyReviews() {
  try {
    console.log("🌱 Bắt đầu seed Company Reviews...");

    // Get all companies
    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
    });

    if (companies.length === 0) {
      console.log("⚠️  Không tìm thấy companies. Vui lòng chạy seedCompaniesRecruitersJobs trước.");
      return;
    }

    // Get all candidates with profiles
    const candidates = await prisma.candidateProfile.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (candidates.length === 0) {
      console.log("⚠️  Không tìm thấy candidates. Vui lòng tạo candidates trước.");
      return;
    }

    console.log(`📊 Tìm thấy ${companies.length} companies và ${candidates.length} candidates`);

    // Create reviews
    const reviewsToCreate: Array<{
      companyId: string;
      candidateId: string;
      rating: number;
      title: string | null;
      review: string | null;
      pros: string | null;
      cons: string | null;
      isCurrentEmployee: boolean;
      wouldRecommend: boolean;
    }> = [];

    // For each company, create 3-8 reviews from different candidates
    for (const company of companies) {
      const numReviews = Math.floor(Math.random() * 6) + 3; // 3-8 reviews per company
      const shuffledCandidates = [...candidates].sort(() => Math.random() - 0.5);
      const selectedCandidates = shuffledCandidates.slice(0, Math.min(numReviews, candidates.length));

      for (const candidate of selectedCandidates) {
        // Rating distribution: more positive reviews (4-5 stars) than negative
        const ratingRoll = Math.random();
        let rating: number;
        if (ratingRoll < 0.5) {
          rating = 5; // 50% chance of 5 stars
        } else if (ratingRoll < 0.75) {
          rating = 4; // 25% chance of 4 stars
        } else if (ratingRoll < 0.9) {
          rating = 3; // 15% chance of 3 stars
        } else if (ratingRoll < 0.95) {
          rating = 2; // 5% chance of 2 stars
        } else {
          rating = 1; // 5% chance of 1 star
        }

        const reviewData = generateReview(rating);

        reviewsToCreate.push({
          companyId: company.id,
          candidateId: candidate.id,
          rating,
          title: reviewData.title,
          review: reviewData.review,
          pros: reviewData.pros,
          cons: reviewData.cons,
          isCurrentEmployee: reviewData.isCurrentEmployee,
          wouldRecommend: reviewData.wouldRecommend,
        });
      }
    }

    console.log(`📝 Đang tạo ${reviewsToCreate.length} reviews...`);

    // Use createMany with skipDuplicates to handle unique constraint
    let created = 0;
    let skipped = 0;

    for (const review of reviewsToCreate) {
      try {
        await prisma.companyReview.create({
          data: review,
        });
        created++;
      } catch (error: any) {
        // Skip if duplicate (unique constraint on companyId + candidateId)
        if (error.code === "P2002") {
          skipped++;
        } else {
          throw error;
        }
      }
    }

    console.log(`✅ Đã tạo ${created} reviews`);
    if (skipped > 0) {
      console.log(`⚠️  Đã bỏ qua ${skipped} reviews (duplicate)`);
    }

    // Show statistics
    const stats = await prisma.companyReview.groupBy({
      by: ["rating"],
      _count: {
        rating: true,
      },
    });

    console.log("\n📊 Thống kê reviews theo rating:");
    stats.forEach((stat) => {
      const stars = "⭐".repeat(stat.rating);
      console.log(`   ${stars} (${stat.rating}): ${stat._count.rating} reviews`);
    });

    const totalReviews = await prisma.companyReview.count();
    const avgRating = await prisma.companyReview.aggregate({
      _avg: {
        rating: true,
      },
    });

    console.log(`\n📈 Tổng số reviews: ${totalReviews}`);
    console.log(`⭐ Điểm trung bình: ${avgRating._avg.rating?.toFixed(2) || "N/A"}`);

    console.log("\n✅ Seed Company Reviews hoàn tất!");
  } catch (error) {
    console.error("❌ Lỗi khi seed Company Reviews:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedCompanyReviews()
    .then(() => {
      console.log("✨ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Error:", error);
      process.exit(1);
    });
}

export default seedCompanyReviews;

