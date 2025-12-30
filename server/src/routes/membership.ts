/**
 * Membership Management API Routes
 * 
 * This module provides REST API endpoints for membership management:
 * - Purchase membership plans
 * - Check membership status
 * - Handle payment callbacks
 * - View available plans
 * 
 * Design Decisions:
 * 1. RESTful API design for clarity
 * 2. Separation of payment and membership logic
 * 3. Idempotent payment processing
 * 4. Clear error messages for frontend
 * 
 * @module membershipRoutes
 */

import { Hono } from "hono";
import prisma from "../app/db/prisma";
import {
  activateVIPMembership,
  getActiveMembership,
  getMembershipUsage
} from "../app/services/membership";
import { generateOrderCode, payosClient } from "../app/services/payos";
import { UserRole } from "../generated/prisma";
import { getOrCreateClerkUser } from "../utils/clerkAuth";

const membershipRoutes = new Hono();

/**
 * Get available membership plans for a role
 *
 * GET /membership/plans?role=CANDIDATE|RECRUITER
 */
membershipRoutes.get("/membership/plans", async (c) => {
  try {
    const role = c.req.query("role") as UserRole | undefined;

    if (!role || !["CANDIDATE", "RECRUITER"].includes(role)) {
      return c.json(
        { success: false, message: "Invalid role. Must be CANDIDATE or RECRUITER" },
        400
      );
    }

    const plans = await prisma.membershipPlan.findMany({
      where: {
        role,
        isActive: true,
      },
      orderBy: [
        { planType: "asc" }, // FREE first, then VIP
        { price: "asc" },
      ],
    });

    return c.json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    console.error("[Membership] Error fetching plans:", error);
    return c.json(
      { success: false, message: error.message || "Failed to fetch plans" },
      500
    );
  }
});

/**
 * Get current user's membership status
 * 
 * GET /membership/status
 * Requires authentication
 */
membershipRoutes.get("/membership/status", async (c) => {
  try {
    // Get authenticated user
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Try custom auth first (recruiter/admin)
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: { candidateProfile: true, recruiterProfile: true },
    });

    // Try Clerk auth (candidate)
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

    // Determine role
    const role: UserRole = user.recruiterProfile ? "RECRUITER" : "CANDIDATE";

    // Get active membership
    const membership = await getActiveMembership(user.id, role);

    // Get usage statistics
    const usage = await getMembershipUsage(user.id, role);

    return c.json({
      success: true,
      data: {
        membership: membership
          ? {
              id: membership.id,
              plan: membership.plan,
              startDate: membership.startDate,
              endDate: membership.endDate,
              status: membership.status,
            }
          : null,
        usage,
      },
    });
  } catch (error: any) {
    console.error("[Membership] Error fetching status:", error);
    return c.json(
      { success: false, message: error.message || "Failed to fetch membership status" },
      500
    );
  }
});

/**
 * Purchase a membership plan
 * Creates a PayOS payment link
 * 
 * POST /membership/purchase
 * Body: { planId: string }
 */
membershipRoutes.post("/membership/purchase", async (c) => {
  try {
    // Get authenticated user
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    // Try custom auth first (recruiter/admin)
    let user = await prisma.user.findUnique({
      where: { id: token },
      include: { candidateProfile: true, recruiterProfile: true },
    });

    // Try Clerk auth (candidate)
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

    const body = await c.req.json();
    const { planId, returnUrl: clientReturnUrl, cancelUrl: clientCancelUrl } = body;

    if (!planId) {
      return c.json({ success: false, message: "planId is required" }, 400);
    }

    // Get plan
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return c.json({ success: false, message: "Plan not found" }, 404);
    }

    if (!plan.isActive) {
      return c.json({ success: false, message: "Plan is not available" }, 400);
    }

    // Verify role matches
    const userRole: UserRole = user.recruiterProfile ? "RECRUITER" : "CANDIDATE";
    if (plan.role !== userRole) {
      return c.json(
        { success: false, message: "Plan does not match user role" },
        400
      );
    }

    // FREE plans cannot be purchased
    if (plan.planType === "FREE") {
      return c.json(
        { success: false, message: "FREE plan cannot be purchased" },
        400
      );
    }

    // Generate unique order code
    const orderCode = generateOrderCode();

    // Create payment transaction record
    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId: user.id,
        planId: plan.id,
        orderCode: orderCode.toString(),
        amount: plan.price,
        currency: plan.currency,
        status: "PENDING",
      },
    });

    // Create PayOS payment link
    // Use APP_BASE_URL for return/cancel URLs
    const appBaseUrl = process.env.APP_BASE_URL || process.env.VITE_APP_URL || process.env.VITE_API_URL || "http://localhost:5173";

    console.log(`[Membership] Debug environment and URLs:`, {
      env: {
        APP_BASE_URL: process.env.APP_BASE_URL,
        VITE_APP_URL: process.env.VITE_APP_URL,
        VITE_API_URL: process.env.VITE_API_URL,
      },
      appBaseUrl,
      clientReturnUrl,
      clientCancelUrl,
    });

    // Always construct URLs with orderCode (ignore client-provided URLs to ensure consistency)
    const returnUrl = `${appBaseUrl}/candidate/membership?orderCode=${orderCode}&status=success`;
    const cancelUrl = `${appBaseUrl}/candidate/membership?status=canceled`;

    console.log(`[Membership] Payment URLs - returnUrl: ${returnUrl}, cancelUrl: ${cancelUrl}`);
    console.log(`[Membership] Client provided URLs - returnUrl: ${clientReturnUrl || "none"}, cancelUrl: ${clientCancelUrl || "none"}`);

    let paymentLink;
    try {
      const payload = {
        orderCode,
        amount: plan.price,
        description: `Membership: ${plan.name}`,
        returnUrl,
        cancelUrl,
        items: [
          {
            name: plan.name,
            quantity: 1,
            price: plan.price,
          },
        ],
      };
      console.log(`[Membership] PayOS payload:`, payload);
      paymentLink = await payosClient.createPaymentLink(payload);
    } catch (payosError: any) {
      console.error("[Membership] PayOS payment creation failed:", {
        error: payosError.message,
        planId,
        orderCode,
        amount: plan.price,
      });

      // Update transaction status to failed
      await prisma.paymentTransaction.update({
        where: { orderCode: orderCode.toString() },
        data: {
          status: "FAILED",
          updatedAt: new Date(),
        },
      });

      // Return user-friendly error message
      return c.json({
        success: false,
        message: payosError.message.includes("423") || payosError.message.includes("locked")
          ? "Payment service temporarily unavailable. Please try again in a few minutes."
          : payosError.message.includes("401") || payosError.message.includes("authentication")
          ? "Payment service is currently unavailable. Please contact support."
          : "Unable to process payment at this time. Please try again later or contact support.",
        error: payosError.message,
      }, 500);
    }

    // Update transaction with payment link info
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        paymentLinkId: paymentLink.data.paymentLinkId,
        paymentLinkUrl: paymentLink.data.checkoutUrl,
        expiredAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        rawRequest: paymentLink as any,
      },
    });

    return c.json({
      success: true,
      data: {
        transactionId: transaction.id,
        paymentLinkUrl: paymentLink.data.checkoutUrl,
        paymentUrl: paymentLink.data.checkoutUrl, // Alias for backward compatibility
        orderCode: orderCode.toString(),
      },
    });
  } catch (error: any) {
    console.error("[Membership] Error creating purchase:", error);
    console.error("[Membership] Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    });
    
    // If it's a PayOS error, include more details
    if (error.message?.includes("PayOS") || error.message?.includes("payment")) {
      console.error("[Membership] PayOS error details:", {
        webhookUrl: process.env.PAYOS_WEBHOOK_URL,
        apiBaseUrl: process.env.APP_BASE_URL || process.env.VITE_API_URL,
      });
    }
    
    return c.json(
      { 
        success: false, 
        message: error.message || "Failed to create purchase",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
  }
});




/**
 * Check payment status
 * Also syncs with PayOS API if transaction is still PENDING
 * 
 * GET /membership/payment/:orderCode/status
 */
membershipRoutes.get("/membership/payment/:orderCode/status", async (c) => {
  try {
    const orderCode = c.req.param("orderCode");

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { orderCode },
      include: {
        plan: true,
        membership: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!transaction) {
      return c.json({ success: false, message: "Transaction not found" }, 404);
    }

    // If transaction is still PENDING and we have paymentLinkId, sync with PayOS
    if (transaction.status === "PENDING" && transaction.paymentLinkId) {
      try {
        console.log(`[Membership] Syncing payment status from PayOS for orderCode: ${orderCode}, paymentLinkId: ${transaction.paymentLinkId}`);
        const payosInfo = await payosClient.getPaymentLinkInfo(transaction.paymentLinkId);
        
        console.log(`[Membership] PayOS response for orderCode ${orderCode}:`, {
          status: payosInfo.data.status,
          amount: payosInfo.data.amount,
          amountPaid: payosInfo.data.amountPaid,
          amountRemaining: payosInfo.data.amountRemaining,
          orderCode: payosInfo.data.orderCode,
          transactions: payosInfo.data.transactions,
        });
        
        // Log detailed payment info for debugging
        if (payosInfo.data.transactions && payosInfo.data.transactions.length > 0) {
          console.log(`[Membership] Payment transactions:`, JSON.stringify(payosInfo.data.transactions, null, 2));
        } else {
          console.log(`[Membership] No payment transactions found. Payment may still be pending.`);
        }
        
        // Update transaction status based on PayOS response
        if (payosInfo.data.status === "PAID") {
          // Payment completed - update transaction and activate membership
          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              status: "COMPLETED",
              paidAt: new Date(),
            },
          });

          // Activate membership if not already activated
          if (!transaction.membershipId) {
            try {
              const membership = await activateVIPMembership(
                transaction.userId,
                transaction.planId
              );

              await prisma.paymentTransaction.update({
                where: { id: transaction.id },
                data: { membershipId: membership.id },
              });

              console.log(`[Membership] Membership activated for user ${transaction.userId} via status sync`);
            } catch (error: any) {
              console.error("[Membership] Error activating membership during sync:", error);
            }
          }

          // Reload transaction with updated data
          const updatedTransaction = await prisma.paymentTransaction.findUnique({
            where: { orderCode },
            include: {
              plan: true,
              membership: {
                include: {
                  plan: true,
                },
              },
            },
          });

          if (updatedTransaction) {
            return c.json({
              success: true,
              data: {
                transaction: {
                  id: updatedTransaction.id,
                  orderCode: updatedTransaction.orderCode,
                  amount: updatedTransaction.amount,
                  currency: updatedTransaction.currency,
                  status: updatedTransaction.status,
                  paidAt: updatedTransaction.paidAt,
                },
                plan: updatedTransaction.plan,
                membership: updatedTransaction.membership,
              },
            });
          }
        } else if (payosInfo.data.status === "CANCELLED" || payosInfo.data.status === "EXPIRED") {
          // Payment cancelled or expired
          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              status: "CANCELED",
            },
          });
        }
      } catch (error: any) {
        console.error(`[Membership] Error syncing payment status from PayOS:`, error);
        // Continue to return current transaction status even if sync fails
      }
    }

    return c.json({
      success: true,
      data: {
        transaction: {
          id: transaction.id,
          orderCode: transaction.orderCode,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          paidAt: transaction.paidAt,
        },
        plan: transaction.plan,
        membership: transaction.membership,
      },
    });
  } catch (error: any) {
    console.error("[Membership] Error checking payment status:", error);
    return c.json(
      { success: false, message: error.message || "Failed to check payment status" },
      500
    );
  }
});

export default membershipRoutes;

