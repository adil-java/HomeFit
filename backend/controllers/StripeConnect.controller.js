import { PrismaClient } from "@prisma/client";
import {
  createConnectAccount,
  createPaymentIntent,
  getSellerAccountStatus,
  getSellerBalance,
  verifyWebhookSignature,
} from "../services/stripe.service.js";

const prisma = new PrismaClient();

/**
 * POST /api/stripe/connect/onboard
 */
export const onboardSeller = async (req, res) => {
  try {
    const userId = req.user.id;
    const { businessName, email, isMobile = false } = req.body;
    
    if (!email || !businessName) {
      return res.status(400).json({
        success: false,
        error: "Email and business name are required",
      });
    }

    // Get user to check current status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        stripeConnectId: true,
        stripeDetailsSubmitted: true,
        role: true 
      }
    });

    // If already onboarded, return current status
    if (user?.stripeDetailsSubmitted) {
      const status = await getSellerAccountStatus(userId);
      return res.json({ 
        success: true, 
        data: { 
          ...status,
          isOnboarded: true,
          message: 'Already onboarded' 
        } 
      });
    }

    // Start or continue onboarding
    const result = await createConnectAccount(userId, email, businessName);
    
    res.json({ 
      success: true, 
      data: {
        ...result,
        isMobile,
        requiresOnboarding: !user?.stripeDetailsSubmitted
      } 
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Onboarding failed. Please try again.",
    });
  }
};


/**
 * POST /api/stripe/payment-intent
 */
export const createPayment = async (req, res) => {
  try {
    const { orderId, totalAmount, sellerId } = req.body;

    if (!orderId || !totalAmount || !sellerId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: orderId, totalAmount, sellerId",
      });
    }

    const result = await createPaymentIntent(orderId, totalAmount, sellerId);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Payment intent creation failed",
    });
  }
};

/**
 * GET /api/stripe/connect/status/:sellerId
 */
export const getConnectStatus = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const status = await getSellerAccountStatus(sellerId);

    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch status",
    });
  }
};

/**
 * GET /api/stripe/balance
 */
export const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const balance = await getSellerBalance(userId);

    res.json({ success: true, data: balance });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch balance",
    });
  }
};

/**
 * GET /api/stripe/connect/callback
 */
export const onboardCallback = async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    // Update user as onboarded
    await prisma.user.update({
      where: { id: userId },
      data: {
        role: "SELLER",
        stripeDetailsSubmitted: true,
      },
    });

    // Redirect based on platform
    const redirectUrl = req.headers.referer?.includes('mobile')
      ? `${process.env.MOBILE_APP_URL}/seller/dashboard?onboarding=success`
      : `${process.env.APP_URL}/seller/dashboard?onboarding=success`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Callback error:", error);
    const redirectUrl = req.headers.referer?.includes('mobile')
      ? `${process.env.MOBILE_APP_URL}/seller/onboarding?error=callback_failed`
      : `${process.env.APP_URL}/seller/onboarding?error=callback_failed`;
    res.redirect(redirectUrl);
  }
};

/**
 * POST /api/stripe/webhook
 */
export const stripeWebhook = async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];
    const event = verifyWebhookSignature(req.body, signature);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        await prisma.order.update({
          where: { id: paymentIntent.metadata.orderId },
          data: {
            paymentStatus: "PAID",  // Update payment status instead of order status
            status: "PROCESSING",   // Update order status to processing when payment succeeds
            stripePaymentIntent: paymentIntent.id,
            paymentConfirmedAt: new Date(), // Record when payment was confirmed
          },
        });
        console.log(`✓ Order ${paymentIntent.metadata.orderId} payment marked as PAID`);
        break;
      }

      case "account.updated": {
        const account = event.data.object;
        await prisma.user.update({
          where: { stripeConnectId: account.id },
          data: {
            stripeOnboarded: account.charges_enabled,
            stripeDetailsSubmitted: account.details_submitted,
          },
        });
        console.log(`✓ Seller ${account.id} account updated`);
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(400).json({
      error: error.message || "Webhook failed",
    });
  }
};
