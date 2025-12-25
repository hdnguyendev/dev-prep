import prisma from "../src/app/db/prisma";
import { hashPassword } from "../src/app/utils/crypto";

/**
 * Tạo tài khoản admin mới
 * 
 * Cách sử dụng:
 * 1. Với environment variables:
 *    ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=admin123 ADMIN_FIRST_NAME=Admin ADMIN_LAST_NAME=User bun run scripts/createAdmin.ts
 * 
 * 2. Với command line arguments:
 *    bun run scripts/createAdmin.ts admin@example.com admin123 Admin User
 * 
 * 3. Hoặc chỉnh sửa giá trị mặc định trong script
 */
async function createAdmin() {
  // Lấy thông tin từ environment variables hoặc command line arguments
  const email = process.env.ADMIN_EMAIL || process.argv[2] || "admin@devprep.com";
  const password = process.env.ADMIN_PASSWORD || process.argv[3] || "admin123";
  const firstName = process.env.ADMIN_FIRST_NAME || process.argv[4] || "Admin";
  const lastName = process.env.ADMIN_LAST_NAME || process.argv[5] || "User";

  console.log("👤 Đang tạo tài khoản admin...");
  console.log(`   Email: ${email}`);
  console.log(`   Tên: ${firstName} ${lastName}`);
  console.log("");

  try {
    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("⚠️  Email đã tồn tại!");
      console.log(`   User ID: ${existingUser.id}`);
      console.log(`   Role: ${existingUser.role}`);
      
      // Nếu user đã tồn tại nhưng không phải ADMIN, hỏi có muốn update không
      if (existingUser.role !== "ADMIN") {
        console.log("\n💡 User này không phải ADMIN. Bạn có muốn update role thành ADMIN không?");
        console.log("   (Để update, hãy xóa user cũ trước hoặc sử dụng script khác)");
      }
      
      await prisma.$disconnect();
      process.exit(1);
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Tạo admin user
    const admin = await prisma.user.create({
      data: {
        email,
        notificationEmail: email,
        passwordHash,
        firstName,
        lastName,
        role: "ADMIN",
        isVerified: true,
        isActive: true,
      },
    });

    console.log("✅ Tài khoản admin đã được tạo thành công!");
    console.log("\n📋 Thông tin đăng nhập:");
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   User ID: ${admin.id}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Verified: ${admin.isVerified}`);
    console.log(`   Active: ${admin.isActive}`);
    console.log("\n💡 Bạn có thể sử dụng thông tin này để đăng nhập vào hệ thống.");

  } catch (error) {
    console.error("❌ Lỗi khi tạo tài khoản admin:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy script
createAdmin()
  .then(() => {
    console.log("\n✨ Script hoàn thành thành công!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script thất bại:", error);
    process.exit(1);
  });

