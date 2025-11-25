import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();

/**
 * SELLER ONBOARDING SERVICE
 * Creates Stripe Express account and returns onboarding link
 */
export async function createConnectAccount(userId, email, businessName) {
  try {
    // Check if user already has a Stripe account
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectId: true }
    });

    let account;
    
    if (existingUser?.stripeConnectId) {
      // Use existing Stripe account
      account = await stripe.accounts.retrieve(existingUser.stripeConnectId);
    } else {
      // Create new Stripe account
      account = await stripe.accounts.create({
        type: "express",
        country: "US",
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

    // Use mobile return URL if in mobile app, otherwise use web URL
    const baseReturnUrl = process.env.MOBILE_APP_URL || process.env.APP_URL;
    const refreshUrl = `${baseReturnUrl}/seller/onboarding/refresh`;
    const returnUrl = `${baseReturnUrl}/seller/onboarding/callback?userId=${userId}`;

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
    console.error("Stripe account creation error:", error);
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

  return {
    status: account.charges_enabled ? "ACTIVE" : "PENDING",
    onboarded: account.charges_enabled,
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    requirements: account.requirements?.pending_verification || [],
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
