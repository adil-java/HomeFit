import { PrismaClient } from "@prisma/client";
import {
  createConnectAccount,
  createPaymentIntent,
  getSellerAccountStatus,
  getSellerBalance,
  verifyWebhookSignature,
} from "../services/stripe.service.js";
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

// Public base URL of this API, used for Stripe's return/refresh links.
// Set API_PUBLIC_URL in production (must be https for live Stripe).
const publicBaseUrl = (req) => {
  if (process.env.API_PUBLIC_URL) return process.env.API_PUBLIC_URL.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http").split(",")[0].trim();
  return `${proto}://${req.get("host")}`;
};

// Only app deep links may be used as the "back to app" target (no open redirect).
const isAppUrl = (url) =>
  typeof url === "string" && /^(exps?|myapp|homefit):\/\//i.test(url);

const escapeHtml = (str) =>
  String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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

    // If the Stripe account is already fully active, nothing to do
    const current = await getSellerAccountStatus(userId);
    if (current.chargesEnabled) {
      return res.json({
        success: true,
        data: {
          ...current,
          isOnboarded: true,
          message: 'Already onboarded'
        }
      });
    }

    // Start or continue onboarding (also used to finish missing requirements).
    // Stripe sends the seller to these pages when they finish or the link expires;
    // the pages hand control back to the app.
    const base = publicBaseUrl(req);
    const appQuery = isAppUrl(req.body.appReturnUrl)
      ? `?app=${encodeURIComponent(req.body.appReturnUrl)}`
      : "";
    const result = await createConnectAccount(userId, email, businessName, {
      returnUrl: `${base}/api/Stripe/connect/return${appQuery}`,
      refreshUrl: `${base}/api/Stripe/connect/refresh${appQuery}`,
    });

    res.json({
      success: true,
      data: {
        ...result,
        isMobile,
        requiresOnboarding: true,
        status: current,
      }
    });
  } catch (error) {
    logger.error("Onboarding error:", error);
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
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: orderId",
      });
    }

    // Amount and seller come from the order in the database, never the request
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, total: true, sellerId: true, paymentStatus: true },
    });
    if (!order || order.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    if (order.paymentStatus === "PAID") {
      return res.status(409).json({ success: false, error: "Order is already paid" });
    }
    const totalAmount = order.total;
    const sellerId = order.sellerId;

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
    if (sellerId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Not allowed" });
    }
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
 * GET /api/Stripe/connect/return and /connect/refresh
 * Stripe opens these in the browser when onboarding finishes or the link
 * expires. They send the seller back into the app, which then re-checks status.
 */
const connectLandingPage = (title, message) => (req, res) => {
  const appUrl = isAppUrl(req.query.app) ? req.query.app : null;
  const target = appUrl ? `${appUrl}${appUrl.includes("?") ? "&" : "?"}onboarding=done` : null;
  res
    .set("Content-Type", "text/html; charset=utf-8")
    .send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
${target ? `<meta http-equiv="refresh" content="0;url=${escapeHtml(target)}">` : ""}
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#0f172a;color:#f8fafc;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center;padding:24px}
a{display:inline-block;margin-top:20px;background:#f8fafc;color:#0f172a;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:600}</style></head>
<body><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p>
${target ? `<a href="${escapeHtml(target)}">Return to HomeFit</a>` : "<p>You can close this window and return to the app.</p>"}</div></body></html>`);
};

export const connectReturn = connectLandingPage(
  "Setup saved",
  "Your payment details were submitted. Return to the app to see your status."
);
export const connectRefresh = connectLandingPage(
  "Link expired",
  "This setup link has expired. Return to the app and tap Continue Setup to get a new one."
);

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
    logger.error("Callback error:", error);
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
        // Orders are linked to their payment by stripePaymentIntent
        const paymentIntent = event.data.object;
        await prisma.order.updateMany({
          where: { stripePaymentIntent: paymentIntent.id, paymentStatus: { not: "PAID" } },
          data: { paymentStatus: "PAID", paymentConfirmedAt: new Date() },
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        await prisma.order.updateMany({
          where: { stripePaymentIntent: paymentIntent.id, paymentStatus: "PENDING" },
          data: { paymentStatus: "FAILED" },
        });
        break;
      }

      case "account.updated": {
        const account = event.data.object;
        await prisma.user.updateMany({
          where: { stripeConnectId: account.id },
          data: {
            stripeOnboarded: !!account.charges_enabled,
            stripeDetailsSubmitted: !!account.details_submitted,
          },
        });
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error("Webhook error:", error);
    res.status(400).json({
      error: error.message || "Webhook failed",
    });
  }
};
