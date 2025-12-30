import app from "./server";
import prisma from "./app/db/prisma";
import { getOrCreateClerkUser } from "./utils/clerkAuth";

const port = Number(Bun.env.PORT || 3000);
console.log(`[BOOT] Starting HTTP server on :${port}`);
console.log(`[BOOT] Environment:`, {
  APP_BASE_URL: Bun.env.APP_BASE_URL,
  VITE_API_URL: Bun.env.VITE_API_URL,
  VITE_APP_URL: Bun.env.VITE_APP_URL,
});

export default {
  port,
  fetch: async (req: Request) => {
    return app.fetch(req);
  },
};
