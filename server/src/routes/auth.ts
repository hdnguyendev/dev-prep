import { Hono } from "hono";
import prisma from "../app/db/prisma"; 
import { getOrCreateClerkUser } from "../utils/clerkAuth";

const authRoutes = new Hono();

/**
 * Register a new recruiter
 * Creates User + RecruiterProfile
 */
authRoutes.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, firstName, lastName, companyId, position, newCompany } = body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return c.json({ 
        success: false, 
        message: "Email, password, firstName, and lastName are required" 
      }, 400);
    }

    // Must have either companyId OR newCompany data
    if (!companyId && !newCompany) {
      return c.json({ 
        success: false, 
        message: "Must select existing company or create new one" 
      }, 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return c.json({ 
        success: false, 
        message: "Email already registered" 
      }, 409);
    }

    // In production, you should hash the password with bcrypt or similar
    // For now, we'll store it as-is (NOT SECURE - for demo only)
    const passwordHash = password; // TODO: Use bcrypt.hash(password, 10)

    // Create user and recruiter profile
    // Note: Using sequential operations instead of transaction for Cloudflare Workers compatibility
    // Transactions can timeout or lose connection in serverless environments
    let finalCompanyId = companyId;

    // If creating new company
    if (newCompany && !companyId) {
      const { name, website, industry, city, country } = newCompany;
      
      if (!name) {
        return c.json({ 
          success: false, 
          message: "Company name is required" 
        }, 400);
      }

      // Generate slug from company name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const company = await prisma.company.create({
        data: {
          name,
          slug: `${slug}-${Date.now()}`, // Add timestamp to ensure uniqueness
          website: website || null,
          industry: industry || null,
          city: city || null,
          country: country || null,
          isVerified: false, // New companies need verification
        },
      });

      finalCompanyId = company.id;
    } else if (companyId) {
      // Check if company exists
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return c.json({ 
          success: false, 
          message: "Selected company not found" 
        }, 404);
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        notificationEmail: email,
        passwordHash,
        firstName,
        lastName,
        role: "RECRUITER",
        isVerified: true, // Auto-verify for demo
        isActive: true,
      },
    });

    // Create recruiter profile
    const recruiterProfile = await prisma.recruiterProfile.create({
      data: {
        userId: user.id,
        companyId: finalCompanyId!,
        position: position || null,
      },
    });

    const result = { user, recruiterProfile, companyId: finalCompanyId };

    return c.json({
      success: true,
      message: "Recruiter registered successfully",
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
    }, 201);
  } catch (error) {
    console.error("Registration error:", error);
    return c.json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Registration failed" 
    }, 500);
  }
});

/**
 * Update avatar URL for authenticated candidate (Clerk)
 */
authRoutes.put("/avatar", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json(
        { success: false, message: result.error || "Authentication failed" },
        401
      );
    }
    const user = result.user;

    const body = await c.req.json();
    const avatarUrl = (body?.avatarUrl as string | undefined)?.trim() || null;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update avatar error:", error);
    return c.json(
      { success: false, message: "Failed to update avatar" },
      500
    );
  }
});

// Login endpoint - check email and return user with role
authRoutes.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ success: false, message: "Email and password required" }, 400);
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return c.json({ success: false, message: "Invalid credentials" }, 401);
    }

    // In production, you should verify password hash
    // For demo, we'll allow any password
    
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ success: false, message: "Login failed" }, 500);
  }
});

// Check session endpoint
authRoutes.get("/me", async (c) => {
  try {
    // For Clerk users, use getOrCreateClerkUser
    // For custom auth (recruiters/admins), check Authorization header
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Try to find user by ID (for custom auth - recruiters/admins)
    let user;
    try {
      user = await prisma.user.findUnique({
      where: { id: token },
      include: {
        recruiterProfile: {
          include: {
            company: true,
          },
        },
        candidateProfile: {
          include: {
            skills: { include: { skill: true } },
            experiences: true,
            educations: true,
              projects: true,
            },
          },
        },
      });
    } catch (dbError: any) {
      console.error("❌ Database query error:", dbError);
      // If projects relation doesn't exist, try without it
      if (dbError?.message?.includes('projects') || dbError?.code === 'P2021') {
        console.log("⚠️ Projects relation might not exist, trying without it...");
        user = await prisma.user.findUnique({
          where: { id: token },
          include: {
            recruiterProfile: {
              include: {
                company: true,
              },
            },
            candidateProfile: {
              include: {
                skills: { include: { skill: true } },
                experiences: true,
                educations: true,
                // projects: true, // Skip projects if table doesn't exist
          },
        },
      },
    });
      } else {
        throw dbError;
      }
    }

    // If not found by ID, try Clerk authentication
    if (!user) {
      // Import here to avoid circular dependency
      const { getOrCreateClerkUser } = await import("../utils/clerkAuth");
      const result = await getOrCreateClerkUser(c);
      if (result.success && result.user) {
        // Always re-fetch with all includes to ensure type consistency
        try {
          const fetchedUser = await prisma.user.findUnique({
            where: { id: result.user.id },
            include: {
              recruiterProfile: {
                include: {
                  company: true,
                },
              },
              candidateProfile: {
                include: {
                  skills: { include: { skill: true } },
                  experiences: true,
                  educations: true,
                  projects: true,
                },
              },
            },
          });
          if (fetchedUser) {
            user = fetchedUser;
          }
        } catch (dbError: any) {
          console.error("❌ Error fetching user with projects:", dbError);
          // Fallback: fetch without projects
          if (dbError?.message?.includes('projects') || dbError?.code === 'P2021') {
            const fetchedUser = await prisma.user.findUnique({
              where: { id: result.user.id },
              include: {
                recruiterProfile: {
                  include: {
                    company: true,
                  },
                },
                candidateProfile: {
                  include: {
                    skills: { include: { skill: true } },
                    experiences: true,
                    educations: true,
                    // projects: true, // Skip if table doesn't exist
                  },
                },
              },
            });
            if (fetchedUser) {
              user = fetchedUser;
            }
          }
        }
      }
    }

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    // Ensure candidate profile exists for CANDIDATE users
    if (user.role === "CANDIDATE" && !user.candidateProfile) {
      console.log("🔧 Creating missing candidateProfile for user:", user.id);
      try {
        const newProfile = await prisma.candidateProfile.create({
          data: { userId: user.id },
        });
        console.log("✅ Created candidateProfile:", newProfile.id);
        
        // Re-fetch user with candidate profile
        const refreshedUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            recruiterProfile: {
              include: {
                company: true,
              },
            },
            candidateProfile: {
              include: {
                skills: { include: { skill: true } },
                experiences: true,
                educations: true,
                projects: true,
              },
            },
          },
        });
        if (refreshedUser) {
          user = refreshedUser;
          console.log("✅ Re-fetched user with candidateProfile:", refreshedUser.candidateProfile?.id);
        } else {
          console.error("❌ Failed to re-fetch user after creating candidateProfile");
        }
      } catch (error: any) {
        console.error("❌ Failed to create candidate profile:", error);
        // If profile already exists (race condition), try to fetch it
        if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
          console.log("🔄 Profile might already exist, re-fetching...");
          const refreshedUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              recruiterProfile: {
                include: {
                  company: true,
                },
              },
              candidateProfile: {
                include: {
                  skills: { include: { skill: true } },
                  experiences: true,
                  educations: true,
                  projects: true,
                },
              },
            },
          });
          if (refreshedUser) {
            user = refreshedUser;
          }
        }
      }
    }

    // Final check - user should exist at this point
    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    // Final check for CANDIDATE users - ensure candidateProfile exists
    if (user.role === "CANDIDATE" && !user.candidateProfile) {
      console.error("⚠️ CANDIDATE user without candidateProfile after all attempts:", user.id);
      // Last attempt: try to create it directly
      try {
        const lastAttemptProfile = await prisma.candidateProfile.create({
          data: { userId: user.id },
        });
        console.log("✅ Created candidateProfile in final attempt:", lastAttemptProfile.id);
        
        // Re-fetch one more time
        const finalUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            recruiterProfile: {
              include: {
                company: true,
              },
            },
            candidateProfile: {
              include: {
                skills: { include: { skill: true } },
                experiences: true,
                educations: true,
                projects: true,
              },
            },
          },
        });
        
        if (finalUser?.candidateProfile) {
          user = finalUser;
        } else {
          return c.json({ 
            success: false, 
            message: "Candidate profile not found. Please contact support." 
          }, 500);
        }
      } catch (finalError: any) {
        console.error("❌ Final attempt to create candidateProfile failed:", finalError);
        return c.json({ 
          success: false, 
          message: "Candidate profile not found. Please contact support." 
        }, 500);
      }
    }

    return c.json({ 
      success: true, 
      id: user.id,
      email: user.email,
      notificationEmail: user.notificationEmail,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      recruiterProfile: user.recruiterProfile,
      candidateProfile: user.candidateProfile,
    });
  } catch (error: any) {
    console.error("❌ Auth check error:", error);
    console.error("Error stack:", error?.stack);
    console.error("Error message:", error?.message);
    console.error("Error name:", error?.name);
    return c.json({ 
      success: false, 
      message: "Authentication check failed",
      error: process.env.NODE_ENV === "development" ? error?.message : undefined
    }, 500);
  }
});

/**
 * Candidate Experience CRUD (Clerk-authenticated)
 * - Candidate can only manage their own experiences
 */
authRoutes.post("/experience", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
    }
    const user = result.user;
    if (!user.candidateProfile) {
      return c.json({ success: false, message: "Candidate profile not found" }, 404);
    }

    const body = await c.req.json();
    const companyName = (body?.companyName as string | undefined)?.trim();
    const position = (body?.position as string | undefined)?.trim();
    const location = (body?.location as string | undefined)?.trim();
    const startDateRaw = body?.startDate as string | undefined;
    const endDateRaw = body?.endDate as string | undefined;
    const isCurrent = Boolean(body?.isCurrent);
    const description = (body?.description as string | undefined)?.trim();

    if (!companyName || !position || !startDateRaw) {
      return c.json({ success: false, message: "companyName, position, startDate are required" }, 400);
    }

    const startDate = new Date(startDateRaw);
    if (Number.isNaN(startDate.getTime())) {
      return c.json({ success: false, message: "Invalid startDate" }, 400);
    }

    const endDate =
      !endDateRaw || isCurrent ? null : new Date(endDateRaw);
    if (endDateRaw && !isCurrent && endDate && Number.isNaN(endDate.getTime())) {
      return c.json({ success: false, message: "Invalid endDate" }, 400);
    }

    const created = await prisma.experience.create({
      data: {
        candidateId: user.candidateProfile.id,
        companyName,
        position,
        location: location || null,
        startDate,
        endDate: endDate ?? null,
        isCurrent,
        description: description || null,
      },
    });

    return c.json({ success: true, data: created }, 201);
  } catch (error) {
    console.error("Create experience error:", error);
    return c.json({ success: false, message: "Failed to create experience" }, 500);
  }
});

authRoutes.put("/experience/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
    }
    const user = result.user;
    if (!user.candidateProfile) {
      return c.json({ success: false, message: "Candidate profile not found" }, 404);
    }

    const existing = await prisma.experience.findUnique({ where: { id } });
    if (!existing || existing.candidateId !== user.candidateProfile.id) {
      return c.json({ success: false, message: "Experience not found" }, 404);
    }

    const body = await c.req.json();
    const companyName = (body?.companyName as string | undefined)?.trim();
    const position = (body?.position as string | undefined)?.trim();
    const location = (body?.location as string | undefined)?.trim();
    const startDateRaw = body?.startDate as string | undefined;
    const endDateRaw = body?.endDate as string | undefined;
    const isCurrent = Boolean(body?.isCurrent);
    const description = (body?.description as string | undefined)?.trim();

    const data: any = {};
    if (typeof companyName !== "undefined") data.companyName = companyName || "";
    if (typeof position !== "undefined") data.position = position || "";
    if (typeof location !== "undefined") data.location = location || null;
    if (typeof description !== "undefined") data.description = description || null;
    if (typeof isCurrent !== "undefined") data.isCurrent = isCurrent;

    if (typeof startDateRaw !== "undefined") {
      const startDate = new Date(startDateRaw);
      if (Number.isNaN(startDate.getTime())) return c.json({ success: false, message: "Invalid startDate" }, 400);
      data.startDate = startDate;
    }

    if (isCurrent) {
      data.endDate = null;
    } else if (typeof endDateRaw !== "undefined") {
      if (!endDateRaw) {
        data.endDate = null;
      } else {
        const endDate = new Date(endDateRaw);
        if (Number.isNaN(endDate.getTime())) return c.json({ success: false, message: "Invalid endDate" }, 400);
        data.endDate = endDate;
      }
    }

    // Basic validation if they attempted to blank required fields
    if ("companyName" in data && !data.companyName) {
      return c.json({ success: false, message: "companyName is required" }, 400);
    }
    if ("position" in data && !data.position) {
      return c.json({ success: false, message: "position is required" }, 400);
    }

    const updated = await prisma.experience.update({
      where: { id },
      data,
    });

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update experience error:", error);
    return c.json({ success: false, message: "Failed to update experience" }, 500);
  }
});

authRoutes.delete("/experience/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
    }
    const user = result.user;
    if (!user.candidateProfile) {
      return c.json({ success: false, message: "Candidate profile not found" }, 404);
    }

    const existing = await prisma.experience.findUnique({ where: { id } });
    if (!existing || existing.candidateId !== user.candidateProfile.id) {
      return c.json({ success: false, message: "Experience not found" }, 404);
    }

    const deleted = await prisma.experience.delete({ where: { id } });
    return c.json({ success: true, data: deleted });
  } catch (error) {
    console.error("Delete experience error:", error);
    return c.json({ success: false, message: "Failed to delete experience" }, 500);
  }
});

/**
 * Candidate Education CRUD (Clerk-authenticated)
 * - Candidate can only manage their own educations
 */
authRoutes.post("/education", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
    }
    const user = result.user;
    if (!user.candidateProfile) {
      return c.json({ success: false, message: "Candidate profile not found" }, 404);
    }

    const body = await c.req.json();
    const institution = (body?.institution as string | undefined)?.trim();
    const degree = (body?.degree as string | undefined)?.trim();
    const fieldOfStudy = (body?.fieldOfStudy as string | undefined)?.trim();
    const startDateRaw = body?.startDate as string | undefined;
    const endDateRaw = body?.endDate as string | undefined;
    const grade = (body?.grade as string | undefined)?.trim();

    if (!institution || !startDateRaw) {
      return c.json({ success: false, message: "institution and startDate are required" }, 400);
    }

    const startDate = new Date(startDateRaw);
    if (Number.isNaN(startDate.getTime())) {
      return c.json({ success: false, message: "Invalid startDate" }, 400);
    }

    const endDate = endDateRaw ? new Date(endDateRaw) : null;
    if (endDateRaw && endDate && Number.isNaN(endDate.getTime())) {
      return c.json({ success: false, message: "Invalid endDate" }, 400);
    }

    const created = await prisma.education.create({
      data: {
        candidateId: user.candidateProfile.id,
        institution,
        degree: degree || null,
        fieldOfStudy: fieldOfStudy || null,
        startDate,
        endDate,
        grade: grade || null,
      },
    });

    return c.json({ success: true, data: created }, 201);
  } catch (error) {
    console.error("Create education error:", error);
    return c.json({ success: false, message: "Failed to create education" }, 500);
  }
});

authRoutes.put("/education/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
    }
    const user = result.user;
    if (!user.candidateProfile) {
      return c.json({ success: false, message: "Candidate profile not found" }, 404);
    }

    const existing = await prisma.education.findUnique({ where: { id } });
    if (!existing || existing.candidateId !== user.candidateProfile.id) {
      return c.json({ success: false, message: "Education not found" }, 404);
    }

    const body = await c.req.json();
    const institution = (body?.institution as string | undefined)?.trim();
    const degree = (body?.degree as string | undefined)?.trim();
    const fieldOfStudy = (body?.fieldOfStudy as string | undefined)?.trim();
    const startDateRaw = body?.startDate as string | undefined;
    const endDateRaw = body?.endDate as string | undefined;
    const grade = (body?.grade as string | undefined)?.trim();

    const data: any = {};
    if (typeof institution !== "undefined") data.institution = institution || "";
    if (typeof degree !== "undefined") data.degree = degree || null;
    if (typeof fieldOfStudy !== "undefined") data.fieldOfStudy = fieldOfStudy || null;
    if (typeof grade !== "undefined") data.grade = grade || null;

    if (typeof startDateRaw !== "undefined") {
      const startDate = new Date(startDateRaw);
      if (Number.isNaN(startDate.getTime())) return c.json({ success: false, message: "Invalid startDate" }, 400);
      data.startDate = startDate;
    }

    if (typeof endDateRaw !== "undefined") {
      if (!endDateRaw) {
        data.endDate = null;
      } else {
        const endDate = new Date(endDateRaw);
        if (Number.isNaN(endDate.getTime())) return c.json({ success: false, message: "Invalid endDate" }, 400);
        data.endDate = endDate;
      }
    }

    if ("institution" in data && !data.institution) {
      return c.json({ success: false, message: "institution is required" }, 400);
    }

    const updated = await prisma.education.update({
      where: { id },
      data,
    });

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update education error:", error);
    return c.json({ success: false, message: "Failed to update education" }, 500);
  }
});

authRoutes.delete("/education/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
    }
    const user = result.user;
    if (!user.candidateProfile) {
      return c.json({ success: false, message: "Candidate profile not found" }, 404);
    }

    const existing = await prisma.education.findUnique({ where: { id } });
    if (!existing || existing.candidateId !== user.candidateProfile.id) {
      return c.json({ success: false, message: "Education not found" }, 404);
    }

    const deleted = await prisma.education.delete({ where: { id } });
    return c.json({ success: true, data: deleted });
  } catch (error) {
    console.error("Delete education error:", error);
    return c.json({ success: false, message: "Failed to delete education" }, 500);
  }
});

/**
 * Candidate Project CRUD (Clerk-authenticated)
 * - Candidate can only manage their own projects
 */
authRoutes.post("/project", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
    }
    const user = result.user;
    if (!user.candidateProfile) {
      return c.json({ success: false, message: "Candidate profile not found" }, 404);
    }

    const body = await c.req.json();
    const name = (body?.name as string | undefined)?.trim();
    const description = (body?.description as string | undefined)?.trim();
    const url = (body?.url as string | undefined)?.trim();
    const startDateRaw = body?.startDate as string | undefined;
    const endDateRaw = body?.endDate as string | undefined;
    const isCurrent = Boolean(body?.isCurrent);
    const technologies = Array.isArray(body?.technologies) ? body.technologies.filter((t: any) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean) : [];

    if (!name) {
      return c.json({ success: false, message: "name is required" }, 400);
    }

    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    if (startDateRaw && startDate && Number.isNaN(startDate.getTime())) {
      return c.json({ success: false, message: "Invalid startDate" }, 400);
    }

    const endDate = endDateRaw ? new Date(endDateRaw) : null;
    if (endDateRaw && endDate && Number.isNaN(endDate.getTime())) {
      return c.json({ success: false, message: "Invalid endDate" }, 400);
    }

    const created = await prisma.project.create({
      data: {
        candidateId: user.candidateProfile.id,
        name,
        description: description || null,
        url: url || null,
        startDate,
        endDate: isCurrent ? null : endDate,
        isCurrent,
        technologies,
      },
    });

    return c.json({ success: true, data: created }, 201);
  } catch (error) {
    console.error("Create project error:", error);
    return c.json({ success: false, message: "Failed to create project" }, 500);
  }
});

authRoutes.put("/project/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
    }
    const user = result.user;
    if (!user.candidateProfile) {
      return c.json({ success: false, message: "Candidate profile not found" }, 404);
    }

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing || existing.candidateId !== user.candidateProfile.id) {
      return c.json({ success: false, message: "Project not found" }, 404);
    }

    const body = await c.req.json();
    const name = (body?.name as string | undefined)?.trim();
    const description = (body?.description as string | undefined)?.trim();
    const url = (body?.url as string | undefined)?.trim();
    const startDateRaw = body?.startDate as string | undefined;
    const endDateRaw = body?.endDate as string | undefined;
    const isCurrent = typeof body?.isCurrent === "boolean" ? body.isCurrent : undefined;
    const technologies = Array.isArray(body?.technologies) ? body.technologies.filter((t: any) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean) : undefined;

    const data: any = {};
    if (typeof name !== "undefined") data.name = name || "";
    if (typeof description !== "undefined") data.description = description || null;
    if (typeof url !== "undefined") data.url = url || null;
    if (typeof isCurrent !== "undefined") data.isCurrent = isCurrent;
    if (typeof technologies !== "undefined") data.technologies = technologies;

    if (typeof startDateRaw !== "undefined") {
      if (!startDateRaw) {
        data.startDate = null;
      } else {
        const startDate = new Date(startDateRaw);
        if (Number.isNaN(startDate.getTime())) return c.json({ success: false, message: "Invalid startDate" }, 400);
        data.startDate = startDate;
      }
    }

    if (isCurrent) {
      data.endDate = null;
    } else if (typeof endDateRaw !== "undefined") {
      if (!endDateRaw) {
        data.endDate = null;
      } else {
        const endDate = new Date(endDateRaw);
        if (Number.isNaN(endDate.getTime())) return c.json({ success: false, message: "Invalid endDate" }, 400);
        data.endDate = endDate;
      }
    }

    if ("name" in data && !data.name) {
      return c.json({ success: false, message: "name is required" }, 400);
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
    });

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update project error:", error);
    return c.json({ success: false, message: "Failed to update project" }, 500);
  }
});

authRoutes.delete("/project/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
    }
    const user = result.user;
    if (!user.candidateProfile) {
      return c.json({ success: false, message: "Candidate profile not found" }, 404);
    }

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing || existing.candidateId !== user.candidateProfile.id) {
      return c.json({ success: false, message: "Project not found" }, 404);
    }

    const deleted = await prisma.project.delete({ where: { id } });
    return c.json({ success: true, data: deleted });
  } catch (error) {
    console.error("Delete project error:", error);
    return c.json({ success: false, message: "Failed to delete project" }, 500);
  }
});

/**
 * Sync candidate info from Clerk token (frontend passes Authorization: Bearer <clerk_token>)
 * - Creates user + candidateProfile if missing
 * - Returns basic user/candidate info
 */
authRoutes.post("/sync-candidate", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: result.user.id },
      include: { candidateProfile: true },
    });

    if (!user) {
      return c.json({ success: false, message: "User not found after sync" }, 404);
    }

    // Ensure candidate profile exists
    if (!user.candidateProfile) {
      await prisma.candidateProfile.create({ data: { userId: user.id } });
    }

    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      include: { candidateProfile: true },
    });

    return c.json({
      success: true,
      user: {
        id: refreshed?.id,
        email: refreshed?.email,
        firstName: refreshed?.firstName,
        lastName: refreshed?.lastName,
        role: refreshed?.role,
        candidateProfile: refreshed?.candidateProfile,
      },
    });
  } catch (error) {
    console.error("sync-candidate error:", error);
    return c.json({ success: false, message: "Failed to sync candidate" }, 500);
  }
});

/**
 * Update candidate name (Clerk-authenticated)
 * - Used on first login when Clerk doesn't provide real first/last name
 */
authRoutes.put("/name", async (c) => {
  try {
    const result = await getOrCreateClerkUser(c);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.error || "Authentication failed" }, 401);
    }

    const body = await c.req.json();
    const firstName = (body?.firstName as string | undefined)?.trim();
    const lastName = (body?.lastName as string | undefined)?.trim();

    if (!firstName || !lastName) {
      return c.json({ success: false, message: "firstName and lastName are required" }, 400);
    }

    const updated = await prisma.user.update({
      where: { id: result.user.id },
      data: { firstName, lastName },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    return c.json({ success: true, user: updated });
  } catch (error) {
    console.error("Update name error:", error);
    return c.json({ success: false, message: "Failed to update name" }, 500);
  }
});

export default authRoutes;
