import { Hono } from "hono";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const uploadDir = join(process.cwd(), "public", "uploads");

const ensureDir = async () => {
  await mkdir(uploadDir, { recursive: true });
};

const uploadRoutes = new Hono();

uploadRoutes.post("/upload", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return c.json({ success: false, message: "file is required" }, 400);
  }

  await ensureDir();
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const filename = `${crypto.randomUUID()}${ext}`;
  const filepath = join(uploadDir, filename);
  await Bun.write(filepath, file);

  const origin = new URL(c.req.url).origin;
  const url = `${origin}/uploads/${filename}`;
  return c.json({ success: true, url });
});

uploadRoutes.get("/uploads/:file", async (c) => {
  const fileParam = c.req.param("file");
  const filepath = join(uploadDir, fileParam);
  const file = Bun.file(filepath);
  if (!(await file.exists())) {
    return c.notFound();
  }
  return new Response(file, {
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

export default uploadRoutes;
