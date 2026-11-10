/**
 * Pay sellers for card orders that were paid BEFORE automatic payouts existed.
 *
 *   node scripts/backfill-payouts.js          → preview only (changes nothing)
 *   node scripts/backfill-payouts.js --apply  → record the shares and send them
 *
 * Only paid, non-cancelled orders that have no seller shares yet are included.
 * Sellers who haven't finished payment setup get their share "on hold".
 * Safe to run more than once.
 */
import "dotenv/config";
import prisma from "../config/db.js";
import { settleOrder, SELLER_SHARE } from "../services/payout.service.js";

const apply = process.argv.includes("--apply");

const orders = await prisma.order.findMany({
  where: {
    paymentStatus: "PAID",
    status: { not: "CANCELLED" },
    stripePaymentIntent: { not: null },
    transactions: { none: { type: "TRANSFER" } },
  },
  include: { items: { include: { product: { select: { sellerId: true } } } } },
  orderBy: { createdAt: "asc" },
});

let total = 0;
for (const order of orders) {
  const bySeller = {};
  for (const item of order.items) {
    const sellerId = item.product?.sellerId;
    if (sellerId) bySeller[sellerId] = (bySeller[sellerId] || 0) + item.price * item.quantity;
  }
  const shares = Object.entries(bySeller).map(([sellerId, value]) => {
    const share = Math.round(value * SELLER_SHARE * 100) / 100;
    total += share;
    return `seller ${sellerId.slice(0, 8)}… Rs. ${share}`;
  });
  console.log(`${order.orderNumber} (${order.createdAt.toISOString().slice(0, 10)}): ${shares.join(", ") || "no seller"}`);
  if (apply) await settleOrder(order.id);
}

console.log(`\n${orders.length} order(s), sellers' share Rs. ${Math.round(total * 100) / 100}`);
console.log(apply ? "Done. Check each seller's Earnings screen." : "Preview only. Run with --apply to pay these.");
await prisma.$disconnect();
process.exit(0);
