import app from "./server";

// Bun HTTP entrypoint (no WebSocket). WebSockets have been fully removed.

const port = Number(Bun.env.PORT || 3000);
console.log(`[BOOT] Starting HTTP server on :${port}`);

export default {
  port,
  fetch: app.fetch,
};
