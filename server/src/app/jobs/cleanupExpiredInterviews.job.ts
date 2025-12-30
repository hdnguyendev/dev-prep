import { getPrisma } from "../db/prisma";

/**
 * Cleanup expired interviews job
 * Convert expired PENDING interviews to EXPIRED
 * Delete old unnecessary interviews (optional)
 */
export async function cleanupExpiredInterviewsJob(): Promise<{
  expired: number;
  deleted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let expiredCount = 0;
  let deletedCount = 0;

  try {
    const prisma = getPrisma();
    const now = new Date();

    // 1. Convert expired PENDING interviews to EXPIRED
    try {
      const expiredResult = await prisma.interview.updateMany({
        where: {
          status: "PENDING",
          expiresAt: {
            lt: now, // expiresAt < now
          },
        },
        data: {
          status: "EXPIRED",
        },
      });

      expiredCount = expiredResult.count;
      console.log(`[CLEANUP] Expired ${expiredCount} pending interviews`);
    } catch (err) {
      const errorMsg = `Failed to expire interviews: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(errorMsg);
      console.error(`[CLEANUP] ${errorMsg}`);
    }

    // 2. Delete EXPIRED or FAILED interviews older than 90 days (no applicationId - practice interviews only)
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

      const deletedResult = await prisma.interview.deleteMany({
        where: {
          applicationId: null, // Only delete practice interviews, not interviews linked to applications
          status: {
            in: ["EXPIRED", "FAILED"],
          },
          createdAt: {
            lt: cutoffDate, // Older than 90 days
          },
        },
      });

      deletedCount = deletedResult.count;
      console.log(`[CLEANUP] Deleted ${deletedCount} old expired/failed practice interviews`);
    } catch (err) {
      const errorMsg = `Failed to delete old interviews: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(errorMsg);
      console.error(`[CLEANUP] ${errorMsg}`);
    }

    // 3. (Optional) Convert stale IN_PROGRESS interviews (no startedAt or older than 24h) to FAILED
    try {
      const staleInProgressDate = new Date();
      staleInProgressDate.setHours(staleInProgressDate.getHours() - 24); // 24 hours ago

      const staleResult = await prisma.interview.updateMany({
        where: {
          status: "IN_PROGRESS",
          OR: [
            { startedAt: null }, // No startedAt
            { startedAt: { lt: staleInProgressDate } }, // startedAt older than 24h
          ],
        },
        data: {
          status: "FAILED",
        },
      });

      if (staleResult.count > 0) {
        console.log(`[CLEANUP] Marked ${staleResult.count} stale IN_PROGRESS interviews as FAILED`);
      }
    } catch (err) {
      const errorMsg = `Failed to mark stale interviews: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(errorMsg);
      console.error(`[CLEANUP] ${errorMsg}`);
    }

    return {
      expired: expiredCount,
      deleted: deletedCount,
      errors,
    };
  } catch (err) {
    const errorMsg = `Cleanup job failed: ${err instanceof Error ? err.message : String(err)}`;
    errors.push(errorMsg);
    console.error(`[CLEANUP] ${errorMsg}`);
    return {
      expired: expiredCount,
      deleted: deletedCount,
      errors,
    };
  }
}

