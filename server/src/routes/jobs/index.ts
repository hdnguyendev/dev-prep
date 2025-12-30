import { appJobs } from "@server/app/jobs";
import { Hono } from "hono";
import { getOrCreateClerkUser } from "@server/utils/clerkAuth";
import prisma from "@server/app/db/prisma";


const jobRoutes = new Hono();

jobRoutes.get("/", async (c) => {
  const jobs = await appJobs.getJobs();
  return c.json({ success: true, data: jobs });
});

// Get job by ID or slug
jobRoutes.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    
    // Check if it's a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let job;
    if (isUUID) {
      // Get by ID
      console.log(`[Jobs Route] Fetching job by ID: ${id}`);
      job = await appJobs.getJobById(id);
    } else {
      // Get by slug
      console.log(`[Jobs Route] Fetching job by slug: ${id}`);
      job = await appJobs.getJobBySlug(id);
    }
    
    if (!job) {
      console.log(`[Jobs Route] Job not found: ${id} (isUUID: ${isUUID})`);
      return c.json({ success: false, message: "Job not found" }, 404);
    }
    
    console.log(`[Jobs Route] Job found: ${job.id} - ${job.title}`);
    return c.json({ success: true, data: job });
  } catch (error: any) {
    console.error("[Jobs Route] Error fetching job:", error);
    return c.json(
      { success: false, message: error.message || "Failed to fetch job" },
      500
    );
  }
});

// Track job view (only for candidates)
jobRoutes.post("/:id/view", async (c) => {
  try {
    const { id } = c.req.param();
    
    // Check if it's a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let jobId: string;
    if (isUUID) {
      jobId = id;
    } else {
      // Get job by slug to get the ID
      const job = await appJobs.getJobBySlug(id);
      if (!job) {
        return c.json({ success: false, message: "Job not found" }, 404);
      }
      jobId = job.id;
    }
    
    // Check if job exists and is published
    const job = await appJobs.getJobById(jobId);
    if (!job) {
      return c.json({ success: false, message: "Job not found" }, 404);
    }
    
    if (job.status !== "PUBLISHED") {
      return c.json({ success: false, message: "Job is not published" }, 400);
    }
    
    // Verify user is a candidate (not recruiter/admin)
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return c.json({ success: true, message: "View not tracked (no auth)" });
    }
    
    // Try Clerk authentication first (for candidates)
    const clerkResult = await getOrCreateClerkUser(c);
    if (clerkResult.success && clerkResult.user) {
      // Re-fetch user with full profile data
      const user = await prisma.user.findUnique({
        where: { id: clerkResult.user.id },
        include: { candidateProfile: true, recruiterProfile: true },
      });
      
      // If user has recruiterProfile, don't track (recruiter viewing)
      if (user?.recruiterProfile) {
        return c.json({ success: true, message: "View not tracked (recruiter)" });
      }
      
      // If user has candidateProfile, track it
      if (user?.candidateProfile) {
        await appJobs.incrementViewCount(jobId);
        return c.json({ success: true, message: "View tracked" });
      }
    }
    
    // Try to find user by ID (custom auth - recruiter/admin)
    const user = await prisma.user.findUnique({
      where: { id: token },
      include: { candidateProfile: true, recruiterProfile: true },
    });
    
    // If user found and has recruiterProfile, don't track (recruiter viewing)
    if (user?.recruiterProfile) {
      return c.json({ success: true, message: "View not tracked (recruiter)" });
    }
    
    // If user found and has candidateProfile, track it
    if (user?.candidateProfile) {
      await appJobs.incrementViewCount(jobId);
      return c.json({ success: true, message: "View tracked" });
    }
    
    // If no auth or not a candidate, don't track
    return c.json({ success: true, message: "View not tracked" });
  } catch (error: any) {
    console.error("[Jobs Route] Error tracking view:", error);
    return c.json(
      { success: false, message: error.message || "Failed to track view" },
      500
    );
  }
});

// Track job click (only for candidates)
jobRoutes.post("/:id/click", async (c) => {
  try {
    const { id } = c.req.param();
    
    // Check if it's a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let jobId: string;
    if (isUUID) {
      jobId = id;
    } else {
      // Get job by slug to get the ID
      const job = await appJobs.getJobBySlug(id);
      if (!job) {
        return c.json({ success: false, message: "Job not found" }, 404);
      }
      jobId = job.id;
    }
    
    // Check if job exists and is published
    const job = await appJobs.getJobById(jobId);
    if (!job) {
      return c.json({ success: false, message: "Job not found" }, 404);
    }
    
    if (job.status !== "PUBLISHED") {
      return c.json({ success: false, message: "Job is not published" }, 400);
    }
    
    // Verify user is a candidate (not recruiter/admin)
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return c.json({ success: true, message: "Click not tracked (no auth)" });
    }
    
    // Try Clerk authentication first (for candidates)
    const clerkResult = await getOrCreateClerkUser(c);
    if (clerkResult.success && clerkResult.user) {
      // Re-fetch user with full profile data
      const user = await prisma.user.findUnique({
        where: { id: clerkResult.user.id },
        include: { candidateProfile: true, recruiterProfile: true },
      });
      
      // If user has recruiterProfile, don't track (recruiter clicking)
      if (user?.recruiterProfile) {
        return c.json({ success: true, message: "Click not tracked (recruiter)" });
      }
      
      // If user has candidateProfile, track it
      if (user?.candidateProfile) {
        await appJobs.incrementClickCount(jobId);
        return c.json({ success: true, message: "Click tracked" });
      }
    }
    
    // Try to find user by ID (custom auth - recruiter/admin)
    const user = await prisma.user.findUnique({
      where: { id: token },
      include: { candidateProfile: true, recruiterProfile: true },
    });
    
    // If user found and has recruiterProfile, don't track (recruiter clicking)
    if (user?.recruiterProfile) {
      return c.json({ success: true, message: "Click not tracked (recruiter)" });
    }
    
    // If user found and has candidateProfile, track it
    if (user?.candidateProfile) {
      await appJobs.incrementClickCount(jobId);
      return c.json({ success: true, message: "Click tracked" });
    }
    
    // If no auth or not a candidate, don't track
    return c.json({ success: true, message: "Click not tracked" });
  } catch (error: any) {
    console.error("[Jobs Route] Error tracking click:", error);
    return c.json(
      { success: false, message: error.message || "Failed to track click" },
      500
    );
  }
});

jobRoutes.post("/", async (c) => {
  try {
    // Authentication check
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Get authenticated user
    const { getOrCreateClerkUser } = await import("../utils/clerkAuth");
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: { recruiterProfile: true },
    });

    if (!user) {
      const clerkResult = await getOrCreateClerkUser(c);
      if (!clerkResult.success || !clerkResult.user) {
        return c.json({ success: false, message: "Not authenticated" }, 401);
      }
      user = clerkResult.user;
    }

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    // Check if user is a recruiter
    if (!user.recruiterProfile) {
      return c.json(
        { success: false, message: "Only recruiters can create jobs" },
        403
      );
    }

    const payload = await c.req.json();
    const recruiterId = user.recruiterProfile.id;

    // Check membership limit for job postings
    const { canRecruiterPostJob } = await import("../app/services/membership");
    const canPost = await canRecruiterPostJob(user.id, recruiterId);

    if (!canPost.allowed) {
      return c.json(
        {
          success: false,
          message: canPost.reason || "Job posting limit reached",
          requiresVIP: true,
        },
        403
      );
    }

    // Ensure recruiterId matches authenticated user
    const jobPayload = {
      ...payload,
      recruiterId,
    };

    const job = await appJobs.createJob(jobPayload);
    return c.json({ success: true, data: job });
  } catch (error: any) {
    console.error("Error creating job:", error);
    return c.json(
      {
        success: false,
        message: error.message || "Failed to create job",
      },
      500
    );
  }
});

jobRoutes.put("/:id", async (c) => {
  const { id } = c.req.param();
  const payload = await c.req.json();
  const job = await appJobs.updateJob(id, payload);
  return c.json({ success: true, data: job });
});

jobRoutes.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const job = await appJobs.deleteJob(id);
  return c.json({ success: true, data: job });
});

export default jobRoutes;