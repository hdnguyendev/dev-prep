import { Hono } from "hono";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const uploadRoutes = new Hono();

// Ensure upload directories exist
const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const RESUME_DIR = join(UPLOAD_DIR, "resumes");
const IMAGE_DIR = join(UPLOAD_DIR, "images");

async function ensureUploadDirs() {
  try {
    await mkdir(RESUME_DIR, { recursive: true });
    await mkdir(IMAGE_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create upload directories:", error);
  }
}

ensureUploadDirs();

// Upload resume/CV
uploadRoutes.post("/resume", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, message: "No file uploaded" }, 400);
    }

    // Validate file type (PDF, DOC, DOCX)
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        success: false, 
        message: "Invalid file type. Only PDF, DOC, and DOCX are allowed" 
      }, 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return c.json({ 
        success: false, 
        message: "File too large. Maximum size is 5MB" 
      }, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const ext = file.name.split(".").pop();
    const filename = `resume_${timestamp}_${randomStr}.${ext}`;
    const filepath = join(RESUME_DIR, filename);

    // Save file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await Bun.write(filepath, buffer);

    // Return public URL
    const baseUrl = process.env.VITE_API_URL || "http://localhost:9999";
    const fileUrl = `${baseUrl}/uploads/resumes/${filename}`;

    return c.json({
      success: true,
      data: {
        url: fileUrl,
        filename,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({
      success: false,
      message: "Failed to upload file",
    }, 500);
  }
});

// Upload image for rich text editor
uploadRoutes.post("/image", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, message: "No file uploaded" }, 400);
    }

    // Validate file type (images only)
    if (!file.type.startsWith("image/")) {
      return c.json({ 
        success: false, 
        message: "Invalid file type. Only image files are allowed" 
      }, 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return c.json({ 
        success: false, 
        message: "File too large. Maximum size is 5MB" 
      }, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `image_${timestamp}_${randomStr}.${ext}`;
    const filepath = join(IMAGE_DIR, filename);

    // Save file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await Bun.write(filepath, buffer);

    // Return public URL
    const baseUrl = process.env.VITE_API_URL || "http://localhost:9999";
    const fileUrl = `${baseUrl}/uploads/images/${filename}`;

    return c.json({
      success: true,
      data: {
        url: fileUrl,
        filename,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({
      success: false,
      message: "Failed to upload image",
    }, 500);
  }
});

export default uploadRoutes;
