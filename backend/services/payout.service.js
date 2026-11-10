import Stripe from "stripe";
import prisma from "../config/db.js";
import logger from "../utils/logger.js";

/**
 * SELLER PAYOUTS ("separate charges and transfers")
 *
 * The buyer pays the platform for the whole cart (checkout is unchanged).
 * Once the payment has succeeded, each seller in the order is sent their share
 * (92% of their items) with a Stripe transfer; the platform keeps 8%.
 *
 * Every seller share is recorded as a Transaction (type TRANSFER):
 *   PENDING   → on hold: the seller hasn't finished payment setup yet
 *   COMPLETED → sent to the seller's Stripe account
 *   CANCELLED → order cancelled before the money was sent
 * Held shares are sent automatically once the seller's account can receive
 * transfers (status check, balance screen, or Stripe's account.updated event).
 *
 * Safe to call repeatedly: a share is only recorded once per order + seller,
 * and the Stripe transfer uses an idempotency key.
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const SELLER_SHARE = 0.92; // platform keeps 8%

const round2 = (n) => Math.round(n * 100) / 100;

/** Find this seller's share for an order (stored in Transaction.metadata.sellerId). */
const findShare = (orderId, sellerId) =>
  prisma.transaction.findFirst({
    where: { orderId, type: "TRANSFER", metadata: { path: "$.sellerId", equals: sellerId } },
  });

/** Can money be sent to this seller's Stripe account right now? */
async function transferableAccount(sellerId) {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: { stripeConnectId: true },
  });
  if (!seller?.stripeConnectId) return null;
  try {
    const account = await stripe.accounts.retrieve(seller.stripeConnectId);
    return account?.capabilities?.transfers === "active" ? account.id : null;
  } catch (error) {
    logger.warn("[Payouts] Could not check seller account:", error);
    return null;
  }
}

/**
 * The money the platform actually received for the order's payment, in the
 * platform's settlement currency (e.g. AUD for a PKR charge). Transfers must be
 * made in that currency, so each seller gets the same proportion of it.
 */
async function settledCharge(paymentIntentId) {
  // Stripe records the charge's balance entry a moment after the payment
  // succeeds, so wait briefly for it.
  for (let attempt = 0; attempt < 5; attempt++) {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    });
    if (pi.status !== "succeeded") return null;
    const charge = pi.latest_charge;
    const bt = charge?.balance_transaction;
    if (charge?.id && bt?.amount) {
      return { chargeId: charge.id, amount: bt.amount, currency: bt.currency, chargedAmount: pi.amount };
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return null; // retried later (webhook, status check or earnings screen)
}

/** Send one recorded (PENDING) share to the seller, if their account is ready. */
async function sendShare(share) {
  const sellerId = share.metadata?.sellerId;
  const order = await prisma.order.findUnique({
    where: { id: share.orderId },
    select: { id: true, orderNumber: true, status: true, paymentStatus: true, stripePaymentIntent: true, total: true },
  });
  if (!order || !sellerId) return share;

  if (order.status === "CANCELLED" || order.paymentStatus !== "PAID") {
    if (order.status === "CANCELLED") {
      return prisma.transaction.update({
        where: { id: share.id },
        data: { status: "CANCELLED", description: "Order cancelled before payout" },
      });
    }
    return share;
  }

  const destination = await transferableAccount(sellerId);
  if (!destination) return share; // stays on hold

  const settled = await settledCharge(order.stripePaymentIntent);
  if (!settled) return share;

  // Seller's share of what the platform received, in settlement currency
  const proportion = order.total > 0 ? share.amount / order.total : 0;
  const amount = Math.floor(settled.amount * proportion);
  if (amount <= 0) return share;

  try {
    const transfer = await stripe.transfers.create(
      {
        amount,
        currency: settled.currency,
        destination,
        // Lets the transfer use this payment's funds even before they're available
        source_transaction: settled.chargeId,
        transfer_group: order.id,
        description: `HomeFit order ${order.orderNumber}`,
        metadata: { orderId: order.id, sellerId, transactionId: share.id },
      },
      // One transfer per order + seller, even if this runs twice
      { idempotencyKey: `seller-payout-${order.id}-${sellerId}-${destination}` }
    );

    return await prisma.transaction.update({
      where: { id: share.id },
      data: {
        status: "COMPLETED",
        stripeTransferId: transfer.id,
        description: `Paid for order ${order.orderNumber}`,
        metadata: { ...share.metadata, transferAmount: amount, transferCurrency: settled.currency, paidAt: new Date().toISOString() },
      },
    });
  } catch (error) {
    // Leave it on hold; the next attempt reuses the same idempotency key, so
    // Stripe returns the same transfer instead of sending the money twice
    logger.error(`[Payouts] Transfer failed for order ${order.orderNumber}:`, error);
    return share;
  }
}

/**
 * Record each seller's share of a paid card order and send it where possible.
 * Call after an order is marked PAID. Never throws.
 */
const settling = new Map(); // orderId → running promise (one at a time per order)

export function settleOrder(orderId) {
  if (settling.has(orderId)) return settling.get(orderId);
  const run = doSettleOrder(orderId).finally(() => settling.delete(orderId));
  settling.set(orderId, run);
  return run;
}

async function doSettleOrder(orderId) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: { select: { sellerId: true } } } } },
    });
    if (!order || order.paymentStatus !== "PAID" || !order.stripePaymentIntent) return;

    // Items value per seller
    const bySeller = {};
    for (const item of order.items) {
      const sellerId = item.product?.sellerId;
      if (!sellerId) continue;
      bySeller[sellerId] = (bySeller[sellerId] || 0) + item.price * item.quantity;
    }

    // Discounts are shared in proportion to each seller's items
    const discountFactor = order.subtotal > 0 ? Math.max(0, order.subtotal - (order.discount || 0)) / order.subtotal : 1;

    for (const [sellerId, itemsValue] of Object.entries(bySeller)) {
      let share = await findShare(order.id, sellerId);
      if (!share) {
        const gross = round2(itemsValue * discountFactor);
        share = await prisma.transaction.create({
          data: {
            orderId: order.id,
            type: "TRANSFER",
            amount: round2(gross * SELLER_SHARE),
            currency: "pkr",
            status: "PENDING",
            description: `Order ${order.orderNumber} — waiting for payment setup`,
            metadata: { sellerId, itemsValue: gross, platformFee: round2(gross * (1 - SELLER_SHARE)) },
          },
        });
      }
      if (share.status === "PENDING") await sendShare(share);
    }
  } catch (error) {
    logger.error("[Payouts] Could not settle order:", error);
  }
}

/** Find a paid order by its Stripe payment and settle it (webhook helper). */
export async function settleOrderByPaymentIntent(paymentIntentId) {
  const order = await prisma.order
    .findFirst({ where: { stripePaymentIntent: paymentIntentId }, select: { id: true } })
    .catch(() => null);
  if (order) await settleOrder(order.id);
}

/** Send every share this seller has on hold (after they finish payment setup). Never throws. */
export async function releaseHeldPayouts(sellerId) {
  try {
    const held = await prisma.transaction.findMany({
      where: { type: "TRANSFER", status: "PENDING", metadata: { path: "$.sellerId", equals: sellerId } },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    for (const share of held) await sendShare(share);
  } catch (error) {
    logger.error("[Payouts] Could not release held payouts:", error);
  }
}

/** Earnings summary for the seller's balance screen (amounts in Rs.). */
export async function getSellerEarnings(sellerId) {
  const shares = await prisma.transaction.findMany({
    where: { type: "TRANSFER", metadata: { path: "$.sellerId", equals: sellerId } },
    include: { order: { select: { orderNumber: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  const sum = (status) => round2(shares.filter((s) => s.status === status).reduce((t, s) => t + s.amount, 0));

  return {
    currency: "pkr",
    feePercent: Math.round((1 - SELLER_SHARE) * 100),
    paid: sum("COMPLETED"),
    onHold: sum("PENDING"),
    recent: shares.slice(0, 20).map((s) => ({
      id: s.id,
      orderNumber: s.order?.orderNumber,
      date: s.createdAt,
      amount: s.amount,
      itemsValue: s.metadata?.itemsValue ?? null,
      status: s.status === "COMPLETED" ? "paid" : s.status === "PENDING" ? "on_hold" : "cancelled",
    })),
  };
}
