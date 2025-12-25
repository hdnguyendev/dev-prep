import prisma from "../src/app/db/prisma";

/**
 * Drop toàn bộ database (xóa schema và tất cả tables)
 * CẢNH BÁO: Lệnh này sẽ xóa TOÀN BỘ database, không thể hoàn tác!
 */
async function dropDatabase() {
  console.log("⚠️  CẢNH BÁO: Bạn sắp xóa TOÀN BỘ database!");
  console.log("📋 Lệnh này sẽ:");
  console.log("   - Xóa tất cả tables");
  console.log("   - Xóa tất cả schema");
  console.log("   - Xóa tất cả dữ liệu");
  console.log("");

  try {
    // Lấy database name từ DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL không được tìm thấy trong environment variables");
    }

    // Parse database name từ connection string
    const url = new URL(dbUrl);
    const dbName = url.pathname.slice(1); // Remove leading '/'

    console.log(`🗑️  Đang drop database: ${dbName}`);

    // Disconnect Prisma trước
    await prisma.$disconnect();

    // Tạo connection mới để drop database
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: dbUrl.replace(`/${dbName}`, "/postgres"), // Connect to default postgres DB
    });

    try {
      // Terminate all connections to the database
      await pool.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid();
      `, [dbName]);

      // Drop database
      await pool.query(`DROP DATABASE IF EXISTS "${dbName}";`);
      console.log(`✅ Đã drop database: ${dbName}`);

      // Tạo lại database rỗng
      await pool.query(`CREATE DATABASE "${dbName}";`);
      console.log(`✅ Đã tạo lại database rỗng: ${dbName}`);

      console.log("\n💡 Bây giờ bạn cần chạy migrations để tạo lại schema:");
      console.log("   bunx prisma migrate deploy");
      console.log("   hoặc");
      console.log("   bunx prisma migrate dev");

    } finally {
      await pool.end();
    }

  } catch (error) {
    console.error("❌ Lỗi khi drop database:", error);
    throw error;
  }
}

// Chạy script
dropDatabase()
  .then(() => {
    console.log("\n✨ Script hoàn thành thành công!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script thất bại:", error);
    process.exit(1);
  });

