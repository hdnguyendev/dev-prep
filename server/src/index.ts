import app from "./server";

const port = Number(Bun.env.PORT || 3000);
console.log(`[BOOT] Starting server on :${port}`);

export default {
  port,
  fetch: app.fetch,
};
