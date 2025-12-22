import { Hono } from "hono";
import prisma from "../app/db/prisma";
import { getOrCreateClerkUser } from "../utils/clerkAuth";

const notificationRoutes = new Hono();

// List notifications for current user
notificationRoutes.get("/", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json(
        {
          success: false,
          message: result.error || "Authentication failed",
        },
        401
      );
    }
    const user = result.user;

    const query = c.req.query();
    const take = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const skip = (page - 1) * take;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.notification.count({ where: { userId: user.id } }),
    ]);

    return c.json({
      success: true,
      data: items,
      meta: {
        total,
        page,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch notifications",
      },
      500
    );
  }
});

// Mark all as read
notificationRoutes.post("/read-all", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json(
        {
          success: false,
          message: result.error || "Authentication failed",
        },
        401
      );
    }
    const user = result.user;

    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return c.json({
      success: true,
      data: { updated: true },
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to mark notifications as read",
      },
      500
    );
  }
});

// Mark single notification as read
notificationRoutes.post("/:id/read", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json(
        {
          success: false,
          message: result.error || "Authentication failed",
        },
        401
      );
    }
    const user = result.user;
    const { id } = c.req.param();

    const updated = await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true },
    });

    return c.json({
      success: true,
      data: { updated: updated.count > 0 },
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to mark notification as read",
      },
      500
    );
  }
});

export default notificationRoutes;


