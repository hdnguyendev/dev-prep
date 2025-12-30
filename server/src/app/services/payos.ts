/**
 * PayOS Payment Integration Service
 * 
 * This service handles integration with PayOS payment gateway for membership purchases.
 * Uses PayOS official SDK (@payos/node) for better maintainability and type safety.
 * 
 * Design Decisions:
 * 1. Separation of Concerns: Payment logic is isolated from business logic
 * 2. Idempotency: Prevent duplicate payment processing using orderCode
 * 3. Error Handling: Comprehensive error handling with retry logic
 * 4. Audit Trail: Store complete payment data for debugging and compliance
 * 
 * PayOS SDK Documentation: https://payos.vn/docs/sdks/back-end/node
 */

import { PayOS } from "@payos/node";

// PayOS API Configuration
const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;

/**
 * PayOS API Client Wrapper
 * Wraps PayOS SDK to maintain backward compatibility with existing code
 */
class PayOSClient {
  private payos: PayOS;

  constructor() {
    if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY) {
      throw new Error("PayOS credentials are not configured. Please set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY environment variables.");
    }

    // Initialize PayOS SDK
    this.payos = new PayOS({
      clientId: PAYOS_CLIENT_ID,
      apiKey: PAYOS_API_KEY,
      checksumKey: PAYOS_CHECKSUM_KEY,
    });
  }

  /**
   * Verify PayOS webhook
   * Ensures the webhook request is authentic and not tampered with
   *
   * PayOS SDK automatically verifies signature from x-payos-signature header
   *
   * @param webhookBody - The full webhook request body from PayOS
   * @returns verified webhook data if valid, throws error if invalid
   */
  async verifyWebhook(webhookBody: any): Promise<any> {
    try {
      // PayOS SDK automatically verifies signature from x-payos-signature header
      // As shown in docs: payOS.webhooks.verify(req.body)
      const verifiedWebhook = await this.payos.webhooks.verify(webhookBody);
      console.log("[PayOS] Webhook verified successfully:", verifiedWebhook);
      return verifiedWebhook;
    } catch (error: any) {
      console.error("[PayOS] Webhook verification failed:", {
        message: error.message,
        name: error.name,
      });
      throw error;
    }
  }

  /**
   * Create a payment link for membership purchase
   * 
   * @param orderCode - Unique order identifier (must be unique across all orders)
   * @param amount - Payment amount in VND
   * @param description - Order description
   * @param returnUrl - URL to redirect user after payment
   * @param cancelUrl - URL to redirect user if payment is canceled
   * @param webhookUrl - URL for PayOS to send payment status updates (optional, configured in dashboard)
   * @param items - Optional items array
   * @returns Payment link information from PayOS
   */
  async createPaymentLink(params: {
    orderCode: number;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    webhookUrl?: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
  }): Promise<{
    code: string;
    desc: string;
    data: {
      bin: string;
      accountNumber: string;
      accountName: string;
      amount: number;
      description: string;
      orderCode: number;
      qrCode: string;
      paymentLinkId: string;
      checkoutUrl: string;
    };
  }> {
    try {
      console.log("[PayOS] Creating payment link:", {
        orderCode: params.orderCode,
        amount: params.amount,
        description: params.description,
      });

      // Validate required fields
      if (!params.orderCode || params.orderCode <= 0) {
        throw new Error("Invalid orderCode: must be a positive integer");
      }
      if (!params.amount || params.amount <= 0) {
        throw new Error("Invalid amount: must be a positive integer");
      }
      if (!params.description || params.description.trim() === "") {
        throw new Error("Description is required");
      }
      if (!params.returnUrl || !params.cancelUrl) {
        throw new Error("returnUrl and cancelUrl are required");
      }

      // Check PayOS credentials
      if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY) {
        console.error("[PayOS] Missing credentials:", {
          hasClientId: !!PAYOS_CLIENT_ID,
          hasApiKey: !!PAYOS_API_KEY,
          hasChecksumKey: !!PAYOS_CHECKSUM_KEY,
        });
        throw new Error("PayOS credentials are not properly configured");
      }

      // Use PayOS SDK to create payment link with retry logic
      let paymentLinkData;
      let lastError: any;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[PayOS] Attempt ${attempt}/3 to create payment link`);

          paymentLinkData = await this.payos.paymentRequests.create({
            orderCode: params.orderCode,
            amount: params.amount,
            description: params.description,
            returnUrl: params.returnUrl,
            cancelUrl: params.cancelUrl,
            items: params.items || [
              {
                name: params.description,
                quantity: 1,
                price: params.amount,
              },
            ],
            expiredAt: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes from now
          });

          console.log("[PayOS] Payment link created successfully:", {
            orderCode: paymentLinkData.orderCode,
            amount: paymentLinkData.amount,
            paymentLinkId: paymentLinkData.paymentLinkId,
          });

          break; // Success, exit retry loop

        } catch (error: any) {
          lastError = error;
          console.error(`[PayOS] Attempt ${attempt}/3 failed:`, {
            code: error.code,
            status: error.status,
            message: error.message,
            response: error.response?.data,
          });

          // Check for specific error codes
          if (error.response?.status === 423) {
            console.error("[PayOS] Account locked or rate limited (423). Check PayOS dashboard.");
            throw new Error("Payment service temporarily unavailable (423). Please try again later or contact support.");
          }

          if (error.response?.status === 401) {
            console.error("[PayOS] Authentication failed. Check PayOS credentials.");
            throw new Error("Payment service authentication failed. Please contact support.");
          }

          if (error.response?.status === 429) {
            console.error("[PayOS] Rate limited (429). Waiting before retry...");
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
              continue;
            }
          }

          // For other errors, retry once more if not the last attempt
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }

          // If all retries failed, throw the last error
          break;
        }
      }

      if (!paymentLinkData) {
        throw lastError || new Error("Failed to create payment link after retries");
      }

      // Transform SDK response to match existing interface
      return {
        code: "00",
        desc: "Success",
        data: {
          bin: paymentLinkData.bin || "",
          accountNumber: paymentLinkData.accountNumber || "",
          accountName: paymentLinkData.accountName || "",
          amount: paymentLinkData.amount,
          description: paymentLinkData.description,
          orderCode: paymentLinkData.orderCode,
          qrCode: paymentLinkData.qrCode || "",
          paymentLinkId: paymentLinkData.paymentLinkId, // SDK uses paymentLinkId, not id
          checkoutUrl: paymentLinkData.checkoutUrl,
        },
      };
    } catch (error: any) {
      console.error("[PayOS] Final error creating payment link:", {
        message: error.message,
        name: error.name,
        code: error.code,
        status: error.response?.status,
        response: error.response?.data,
        stack: error.stack,
      });

      // Provide more helpful error messages based on error type
      if (error.message?.includes("423") || error.response?.status === 423) {
        throw new Error("Payment service temporarily unavailable (account locked or rate limited). Please try again later.");
      }

      if (error.message?.includes("401") || error.response?.status === 401) {
        throw new Error("Payment service authentication failed. Please contact support.");
      }

      if (error.message?.includes("429") || error.response?.status === 429) {
        throw new Error("Payment service rate limited. Please try again in a few minutes.");
      }

      if (error.message?.includes("connect") || error.message?.includes("network")) {
        throw new Error("Cannot connect to payment service. Please check your network connection.");
      }

      throw new Error(`Failed to create payment link: HTTP ${error.response?.status || 'unknown'}, ${error.message || "Unknown error"}`);
    }
  }

  /**
   * Get payment link information
   * Useful for checking payment status before webhook is received
   * 
   * @param paymentLinkId - PayOS payment link ID
   */
  async getPaymentLinkInfo(paymentLinkId: string): Promise<{
    code: string;
    desc: string;
    data: {
      orderCode: number;
      amount: number;
      amountPaid: number;
      amountRemaining: number;
      status: string;
      createdAt: string;
      transactions: any[];
    };
  }> {
    try {
      console.log(`[PayOS] Getting payment link info for: ${paymentLinkId}`);

      // Use PayOS SDK to get payment link info
      const paymentLinkInfo = await this.payos.paymentRequests.get(paymentLinkId);

      console.log(`[PayOS] Payment link info response:`, {
        status: paymentLinkInfo.status,
        amount: paymentLinkInfo.amount,
        amountPaid: paymentLinkInfo.amountPaid,
        amountRemaining: paymentLinkInfo.amountRemaining,
      });

      // Transform SDK response to match existing interface
      return {
        code: "00",
        desc: "Success",
        data: {
          orderCode: paymentLinkInfo.orderCode,
          amount: paymentLinkInfo.amount,
          amountPaid: paymentLinkInfo.amountPaid || 0,
          amountRemaining: paymentLinkInfo.amountRemaining || 0,
          status: paymentLinkInfo.status,
          createdAt: paymentLinkInfo.createdAt || new Date().toISOString(),
          transactions: paymentLinkInfo.transactions || [],
        },
      };
    } catch (error: any) {
      console.error("[PayOS] Error getting payment link info:", error);
      throw new Error(`Failed to get payment link info: ${error.message || "Unknown error"}`);
    }
  }

  /**
   * Cancel a payment link
   * Useful if user wants to cancel before paying
   *
   * @param paymentLinkId - PayOS payment link ID
   */
  async cancelPaymentLink(paymentLinkId: string): Promise<{
    code: string;
    desc: string;
  }> {
    try {
      console.log(`[PayOS] Canceling payment link: ${paymentLinkId}`);

      // Use PayOS SDK to cancel payment link
      await this.payos.paymentRequests.cancel(paymentLinkId);

      return {
        code: "00",
        desc: "Success",
      };
    } catch (error: any) {
      console.error("[PayOS] Error canceling payment link:", error);
      throw new Error(`Failed to cancel payment link: ${error.message || "Unknown error"}`);
    }
  }

  /**
   * Get payment link by payment link ID
   * Alternative method to get payment info using payment link ID
   *
   * @param paymentLinkId - PayOS payment link ID
   */
  async getPaymentLink(paymentLinkId: string): Promise<any> {
    try {
      console.log(`[PayOS] Getting payment link: ${paymentLinkId}`);

      // Use PayOS SDK to get payment link
      const paymentLink = await this.payos.paymentRequests.get(paymentLinkId);

      return paymentLink;
    } catch (error: any) {
      console.error("[PayOS] Error getting payment link:", error);
      throw new Error(`Failed to get payment link: ${error.message || "Unknown error"}`);
    }
  }
}

// Export singleton instance
export const payosClient = new PayOSClient();

/**
 * Generate unique order code for PayOS
 * PayOS requires orderCode to be:
 * - A positive integer
 * - Unique across all orders
 * - Typically 6-19 digits
 * 
 * We use timestamp + random to ensure uniqueness
 */
export function generateOrderCode(): number {
  // Use current timestamp (milliseconds) + random 4-digit number
  // This ensures uniqueness while staying within PayOS limits
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000); // 4-digit random (0-9999)
  // Combine and take appropriate length (PayOS typically accepts 6-19 digits)
  // Use last 12 digits to ensure it fits in JavaScript safe integer range
  const combined = `${timestamp}${random}`;
  // Take last 12 digits (safe for PayOS and JavaScript)
  return parseInt(combined.slice(-12));
}
