import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import logger from '../utils/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();

/**
 * Country for new seller (Express) accounts. Stripe only allows sellers that can
 * take card payments in the platform's own region, so by default use the
 * platform account's country. STRIPE_CONNECT_COUNTRY overrides it.
 */
let platformCountry = null;
async function getConnectCountry() {
  if (process.env.STRIPE_CONNECT_COUNTRY) return process.env.STRIPE_CONNECT_COUNTRY.toUpperCase();
  if (!platformCountry) {
    const platform = await stripe.accounts.retrieve();
    platformCountry = platform.country;
  }
  return platformCountry;
}

/**
 * SELLER ONBOARDING SERVICE
 * Creates Stripe Express account and returns onboarding link
 */
export async function createConnectAccount(userId, email, businessName, { returnUrl, refreshUrl } = {}) {
  try {
    // Check if user already has a Stripe account
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectId: true }
    });

    const country = await getConnectCountry();
    let account = null;

    if (existingUser?.stripeConnectId) {
      // Reuse the seller's account, unless Stripe rejected it or it was made
      // for another country and never finished (those can never be activated)
      const existing = await stripe.accounts.retrieve(existingUser.stripeConnectId).catch(() => null);
      const rejected = existing?.requirements?.disabled_reason?.startsWith("rejected");
      const wrongCountry = existing && existing.country !== country && !existing.charges_enabled;
      if (existing && !rejected && !wrongCountry) {
        account = existing;
      } else {
        logger.debug(`Replacing unusable Stripe account ${existingUser.stripeConnectId} for user ${userId}`);
      }
    }

    if (!account) {
      // Create new Stripe account
      account = await stripe.accounts.create({
        type: "express",
        // Must be a country the platform can onboard sellers in (see getConnectCountry)
        country,
        email,
        business_type: "individual",
        business_profile: {
          name: businessName,
          url: process.env.APP_URL,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      // Only store the Stripe Connect ID, don't update role yet
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeConnectId: account.id,
          stripeDetailsSubmitted: false,
        },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return {
      onboardingUrl: accountLink.url,
      stripeConnectId: account.id,
    };
  } catch (error) {
    logger.error("Stripe account creation error:", error);
    throw error;
  }
}

/**
 * PAYMENT INTENT SERVICE
 * Creates payment intent with automatic split to seller (92%) and platform (8%)
 */
export async function createPaymentIntent(orderId, totalAmount, sellerId) {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
  });

  if (!seller || !seller.stripeConnectId) {
    throw new Error("Seller does not have Stripe account connected");
  }

  const platformFeeAmount = Math.round(totalAmount * 0.08 * 100); // 8% fee
  const totalInCents = Math.round(totalAmount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalInCents,
    currency: "pkr",
    application_fee_amount: platformFeeAmount,
    transfer_data: { destination: seller.stripeConnectId },
    metadata: { orderId, sellerId },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      stripePaymentIntent: paymentIntent.id,
      platformFee: totalAmount * 0.08,
      sellerAmount: totalAmount * 0.92,
      status: "PENDING",
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * SELLER ACCOUNT STATUS
 * Fetches current onboarding/verification status
 */
export async function getSellerAccountStatus(sellerId) {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
  });

  if (!seller || !seller.stripeConnectId) {
    return {
      status: "NOT_CONNECTED",
      onboarded: false,
      detailsSubmitted: false,
    };
  }

  const account = await stripe.accounts.retrieve(seller.stripeConnectId);

  // A rejected / wrong-country account can't be finished; show "not set up" so
  // the seller can start again (onboarding then creates a fresh account).
  const rejected = account.requirements?.disabled_reason?.startsWith("rejected");
  const wrongCountry = !account.charges_enabled && account.country !== (await getConnectCountry());
  if (rejected || wrongCountry) {
    return {
      status: "NOT_CONNECTED",
      onboarded: false,
      detailsSubmitted: false,
    };
  }

  // Keep our copy in sync (the webhook may not be configured). Used for the
  // "Verified seller" badge and the onboarding check.
  if (
    seller.stripeOnboarded !== !!account.charges_enabled ||
    seller.stripeDetailsSubmitted !== !!account.details_submitted
  ) {
    await prisma.user.update({
      where: { id: sellerId },
      data: {
        stripeOnboarded: !!account.charges_enabled,
        stripeDetailsSubmitted: !!account.details_submitted,
      },
    }).catch((e) => logger.error("Failed to sync Stripe status:", e));
  }

  return {
    status: account.charges_enabled ? "ACTIVE" : "PENDING",
    onboarded: account.charges_enabled,
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    // Human-readable list of what Stripe still needs from the seller
    requirements: [
      ...(account.requirements?.currently_due || []),
      ...(account.requirements?.pending_verification || []),
    ].map((r) => r.replace(/[._]/g, " ")),
    currentDeadline: account.requirements?.current_deadline || undefined,
  };
}

/**
 * SELLER PAYOUTS
 * Retrieve balance and recent transfers for seller
 */
export async function getSellerBalance(sellerId) {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
  });

  if (!seller || !seller.stripeConnectId) {
    throw new Error("Seller not connected to Stripe");
  }

  const balance = await stripe.balance.retrieve({
    stripeAccount: seller.stripeConnectId,
  });

  return {
    available: balance.available[0]?.amount || 0,
    pending: balance.pending[0]?.amount || 0,
    currency: balance.available[0]?.currency || "usd",
  };
}

/**
 * WEBHOOK VERIFICATION
 * Verify webhook signature from Stripe
 */
export function verifyWebhookSignature(body, signature) {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}
