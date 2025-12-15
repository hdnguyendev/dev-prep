import { Hono } from "hono";
import prisma from "../app/db/prisma"; 

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
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: {
        recruiterProfile: {
          include: {
            company: true,
          },
        },
        candidateProfile: true,
      },
    });

    // If not found by ID, try Clerk authentication
    if (!user) {
      // Import here to avoid circular dependency
      const { getOrCreateClerkUser } = await import("../utils/clerkAuth");
      const result = await getOrCreateClerkUser(c);
      if (result.success && result.user) {
        user = result.user;
        // Re-fetch with all includes
        user = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            recruiterProfile: {
              include: {
                company: true,
              },
            },
            candidateProfile: true,
          },
        });
      }
    }

    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    return c.json({ 
      success: true, 
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      recruiterProfile: user.recruiterProfile,
      candidateProfile: user.candidateProfile,
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return c.json({ success: false, message: "Authentication check failed" }, 500);
  }
});

export default authRoutes;
