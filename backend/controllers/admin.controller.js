import prisma from '../config/db.js';
import { Role } from '@prisma/client';
import { generateToken} from '../utils/jwtHelper.js';
import firebaseServices from '../services/firebase.service.js';
import { SELLER_SHARE, refundOrder } from '../services/payout.service.js';
import logger from '../utils/logger.js';
import { deleteProductService } from '../services/product.service.js';

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;
const PLATFORM_RATE = 1 - SELLER_SHARE; // 8%

/** Sum of item values per seller for a list of order items (with product.sellerId). */
const itemsBySeller = (items) => {
  const map = {};
  for (const it of items) {
    const sellerId = it.product?.sellerId;
    if (!sellerId) continue;
    map[sellerId] = (map[sellerId] || 0) + Number(it.price || 0) * Number(it.quantity || 0);
  }
  return map;
};

// ───────────────────────── Users ─────────────────────────

export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: Role.ADMIN } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phoneNumber: true,
        photoURL: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true, products: true } },
      },
    });
    const spent = await prisma.order.groupBy({
      by: ['userId'],
      where: { paymentStatus: 'PAID' },
      _sum: { total: true },
    });
    const spentMap = new Map(spent.map((s) => [s.userId, Number(s._sum.total || 0)]));
    const data = users.map(({ _count, ...u }) => ({
      ...u,
      orderCount: _count.orders,
      productCount: _count.products,
      totalSpent: round2(spentMap.get(u.id) || 0),
    }));
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  // Admin accounts are managed outside the panel
  if (![Role.CUSTOMER, Role.SELLER].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  try {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    if (target.role === Role.ADMIN) {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot be changed here' });
    }
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    logger.error('Update user role error:', error);
    res.status(500).json({ success: false, message: 'Could not update role' });
  }
};

/**
 * Permanently delete a customer account (database + Firebase sign-in).
 * Accounts with orders or products are kept, because deleting them would
 * erase order history and other people's records.
 */
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, role: true, firebaseUid: true,
        _count: { select: { orders: true, products: true, sellerOrders: true } },
      },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === Role.ADMIN) {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot be deleted' });
    }
    if (user._count.orders > 0 || user._count.sellerOrders > 0) {
      return res.status(409).json({
        success: false,
        message: 'This account has orders, so it can\'t be deleted without losing order history.',
      });
    }
    if (user._count.products > 0) {
      return res.status(409).json({
        success: false,
        message: 'This seller still has products. Remove seller access or delete their products first.',
      });
    }

    const [cart, wishlist] = await Promise.all([
      prisma.cart.findUnique({ where: { userId: id }, select: { id: true } }),
      prisma.wishlist.findUnique({ where: { userId: id }, select: { id: true } }),
    ]);

    await prisma.$transaction([
      ...(cart ? [prisma.cartItem.deleteMany({ where: { cartId: cart.id } }), prisma.cart.delete({ where: { id: cart.id } })] : []),
      ...(wishlist ? [prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } }), prisma.wishlist.delete({ where: { id: wishlist.id } })] : []),
      prisma.address.deleteMany({ where: { userId: id } }),
      prisma.review.deleteMany({ where: { userId: id } }),
      prisma.sellerApplication.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    // Also remove the sign-in account, otherwise signing in again would
    // quietly create a fresh profile.
    try {
      await firebaseServices.auth.deleteUser(user.firebaseUid);
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') {
        logger.warn('Deleted user from database but not from Firebase:', error?.message);
      }
    }

    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Could not delete user' });
  }
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phoneNumber: true,
        photoURL: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Checks the email + password against Firebase Authentication (the same
// account the admin uses in the app). Returns the Firebase UID or null.
async function verifyFirebasePassword(email, password) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw Object.assign(new Error('FIREBASE_WEB_API_KEY is not set'), { config: true });

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (response.ok && data.localId) return data.localId;

  const code = data?.error?.message || '';
  if (code.startsWith('TOO_MANY_ATTEMPTS')) {
    throw Object.assign(new Error('Too many attempts'), { tooMany: true });
  }
  return null;
}

export const adminLogin = async (req, res) => {
  const { email, password } = req.body || {};
  // Same answer for unknown email, wrong password and non-admins, so the
  // login form can't be used to discover accounts.
  const invalid = () => res.status(401).json({ success: false, message: 'Invalid email or password' });

  try {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');
    if (!cleanEmail || !cleanPassword) return invalid();

    const firebaseUid = await verifyFirebasePassword(cleanEmail, cleanPassword);
    if (!firebaseUid) return invalid();

    const user = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!user || user.role !== Role.ADMIN) return invalid();

    const token = generateToken({ id: user.id, role: user.role });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.tooMany) {
      return res.status(429).json({ success: false, message: 'Too many attempts. Please wait a few minutes and try again.' });
    }
    if (error.config) {
      logger.error('Admin login is not configured: set FIREBASE_WEB_API_KEY in backend/.env');
      return res.status(503).json({ success: false, message: 'Admin login is not available right now.' });
    }
    logger.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ───────────────────────── Sellers ─────────────────────────

export const allSellers = async (req, res) => {
  try {
    const sellers = await prisma.user.findMany({
      where: { role: Role.SELLER },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        photoURL: true,
        createdAt: true,
        stripeConnectId: true,
        stripeOnboarded: true,
        stripeDetailsSubmitted: true,
        sellerApplication: { select: { businessName: true, businessType: true } },
        _count: { select: { products: true } },
      },
    });
    const ids = sellers.map((s) => s.id);

    const [activeProducts, paidItems, allItems, shares] = await Promise.all([
      prisma.product.groupBy({ by: ['sellerId'], where: { sellerId: { in: ids }, isActive: true }, _count: { id: true } }),
      prisma.orderItem.findMany({
        where: { product: { sellerId: { in: ids } }, order: { paymentStatus: 'PAID' } },
        select: { price: true, quantity: true, orderId: true, product: { select: { sellerId: true } } },
      }),
      prisma.orderItem.findMany({
        where: { product: { sellerId: { in: ids } } },
        select: { orderId: true, product: { select: { sellerId: true } } },
      }),
      prisma.transaction.findMany({ where: { type: 'TRANSFER' }, select: { amount: true, status: true, metadata: true } }),
    ]);

    const activeMap = new Map(activeProducts.map((p) => [p.sellerId, p._count.id]));
    const salesMap = itemsBySeller(paidItems);
    const ordersMap = {};
    for (const it of allItems) {
      const sid = it.product?.sellerId;
      if (!sid) continue;
      (ordersMap[sid] ||= new Set()).add(it.orderId);
    }
    const payoutMap = {};
    for (const t of shares) {
      const sid = t.metadata?.sellerId;
      if (!sid) continue;
      const p = (payoutMap[sid] ||= { paid: 0, onHold: 0 });
      if (t.status === 'COMPLETED') p.paid += t.amount;
      if (t.status === 'PENDING') p.onHold += t.amount;
    }

    const data = sellers.map(({ _count, sellerApplication, ...s }) => ({
      ...s,
      businessName: sellerApplication?.businessName || null,
      businessType: sellerApplication?.businessType || null,
      productCount: _count.products,
      activeProductCount: activeMap.get(s.id) || 0,
      orderCount: ordersMap[s.id]?.size || 0,
      totalSales: round2(salesMap[s.id] || 0),
      payoutsPaid: round2(payoutMap[s.id]?.paid || 0),
      payoutsOnHold: round2(payoutMap[s.id]?.onHold || 0),
      paymentSetup: s.stripeOnboarded ? 'ready' : s.stripeConnectId ? 'incomplete' : 'not_started',
    }));

    res.status(200).json({ success: true, data, sellerSharePercent: Math.round(SELLER_SHARE * 100) });
  } catch (error) {
    logger.error('Get all sellers error:', error);
    res.status(500).json({ success: false, message: 'Cannot get all sellers. Server Error.' });
  }
};

/**
 * Remove seller access: the account becomes a customer again and all of
 * its products are hidden from the shop. Orders, payouts and history stay.
 */
export const revokeSeller = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!user) return res.status(404).json({ success: false, message: 'Seller not found' });
    if (user.role !== Role.SELLER) {
      return res.status(400).json({ success: false, message: 'This account is not a seller' });
    }
    const [, hidden] = await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { role: Role.CUSTOMER } }),
      prisma.product.updateMany({ where: { sellerId: id, isActive: true }, data: { isActive: false } }),
      prisma.sellerApplication.updateMany({
        where: { userId: id },
        data: { status: 'REJECTED', adminNotes: 'Seller access removed by admin', reviewedAt: new Date(), reviewedBy: req.user?.id || null },
      }),
    ]);
    res.status(200).json({ success: true, message: 'Seller access removed', data: { productsHidden: hidden.count } });
  } catch (error) {
    logger.error('Revoke seller error:', error);
    res.status(500).json({ success: false, message: 'Could not remove seller access' });
  }
};

export const listSellerRequests = async (req, res) => {
  try {
    const status = req.query.status;
    const where = ['PENDING', 'APPROVED', 'REJECTED'].includes(status) ? { status } : {};
    const requests = await prisma.sellerApplication.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: { user: { select: { id: true, email: true, name: true, phoneNumber: true, role: true } } },
    });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    logger.error('List seller requests error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const approveSellerRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const reviewerId = req.user?.id || null;
    const existing = await prisma.sellerApplication.findUnique({ where: { id }, select: { userId: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Request not found' });

    const [application] = await prisma.$transaction([
      prisma.sellerApplication.update({
        where: { id },
        data: { status: 'APPROVED', reviewedBy: reviewerId, reviewedAt: new Date() },
      }),
      prisma.user.update({ where: { id: existing.userId }, data: { role: Role.SELLER } }),
    ]);

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    logger.error('Approve seller request error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const rejectSellerRequest = async (req, res) => {
  const { id } = req.params;
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 500) : undefined;
  try {
    const reviewerId = req.user?.id || null;
    const application = await prisma.sellerApplication.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: reviewerId, reviewedAt: new Date(), ...(notes ? { adminNotes: notes } : {}) },
    });
    res.status(200).json({ success: true, data: application });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Request not found' });
    logger.error('Reject seller request error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ───────────────────────── Analytics ─────────────────────────

export const analyticsSummary = async (req, res) => {
  try {
    const [customers, sellers, pendingRequests, totalProducts, activeProducts, totalOrders, ordersToShip, paidAgg, refundedAgg, shares] = await Promise.all([
      prisma.user.count({ where: { role: Role.CUSTOMER } }),
      prisma.user.count({ where: { role: Role.SELLER } }),
      prisma.sellerApplication.count({ where: { status: 'PENDING' } }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { paymentStatus: 'PAID', status: { in: ['PENDING', 'PROCESSING'] } } }),
      prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { total: true, subtotal: true, discount: true }, _count: { id: true } }),
      prisma.order.aggregate({ where: { paymentStatus: 'REFUNDED' }, _sum: { total: true }, _count: { id: true } }),
      prisma.transaction.groupBy({ by: ['status'], where: { type: 'TRANSFER' }, _sum: { amount: true } }),
    ]);

    const shareSum = (status) => round2(shares.find((s) => s.status === status)?._sum.amount || 0);
    const grossSales = round2(paidAgg._sum.total || 0);
    const itemsValue = Math.max(0, Number(paidAgg._sum.subtotal || 0) - Number(paidAgg._sum.discount || 0));

    res.status(200).json({
      success: true,
      data: {
        customers,
        sellers,
        // kept for older clients
        totalUsersExcludingAdmin: customers + sellers,
        activeSellers: sellers,
        pendingRequests,
        totalProducts,
        activeProducts,
        totalOrders,
        paidOrders: paidAgg._count.id,
        ordersToShip,
        revenue: grossSales,
        grossSales,
        platformEarnings: round2(itemsValue * PLATFORM_RATE),
        payoutsPaid: shareSum('COMPLETED'),
        payoutsOnHold: shareSum('PENDING'),
        refundedAmount: round2(refundedAgg._sum.total || 0),
        refundedOrders: refundedAgg._count.id,
        platformFeePercent: Math.round(PLATFORM_RATE * 100),
      },
    });
  } catch (error) {
    logger.error('Analytics summary error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const revenueMonthly = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: start }, paymentStatus: 'PAID' },
      select: { createdAt: true, total: true },
    });

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleString('en', { month: 'short' }), revenue: 0, orders: 0 });
    }
    const map = new Map(months.map((m) => [m.key, m]));
    for (const o of orders) {
      const bucket = map.get(`${o.createdAt.getFullYear()}-${o.createdAt.getMonth() + 1}`);
      if (bucket) {
        bucket.revenue += Number(o.total || 0);
        bucket.orders += 1;
      }
    }

    res.status(200).json({
      success: true,
      data: months.map((m) => ({ month: m.label, revenue: round2(m.revenue), orders: m.orders })),
    });
  } catch (error) {
    logger.error('Revenue monthly error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const topProducts = async (req, res) => {
  try {
    const items = await prisma.orderItem.findMany({
      where: { order: { paymentStatus: 'PAID' } },
      select: { productId: true, productName: true, quantity: true, price: true },
    });
    const agg = new Map();
    for (const it of items) {
      const row = agg.get(it.productId) || { productId: it.productId, name: it.productName || 'Unknown', sales: 0, revenue: 0 };
      row.sales += Number(it.quantity || 0);
      row.revenue += Number(it.price || 0) * Number(it.quantity || 0);
      agg.set(it.productId, row);
    }
    const top = [...agg.values()]
      .map((r) => ({ ...r, revenue: round2(r.revenue) }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
    res.status(200).json({ success: true, data: top });
  } catch (error) {
    logger.error('Top products error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const salesBySeller = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const orderWhere = { paymentStatus: 'PAID' };
    if (startDate || endDate) {
      orderWhere.createdAt = {};
      if (startDate) orderWhere.createdAt.gte = new Date(startDate);
      if (endDate) orderWhere.createdAt.lte = new Date(endDate);
    }

    const items = await prisma.orderItem.findMany({
      where: { order: orderWhere },
      select: { price: true, quantity: true, orderId: true, product: { select: { sellerId: true } } },
    });
    const sales = itemsBySeller(items);
    const orderSets = {};
    for (const it of items) {
      const sid = it.product?.sellerId;
      if (sid) (orderSets[sid] ||= new Set()).add(it.orderId);
    }

    const sellers = await prisma.user.findMany({
      where: { id: { in: Object.keys(sales) } },
      select: { id: true, name: true, email: true },
    });
    const result = sellers
      .map((s) => ({
        sellerId: s.id,
        name: s.name || s.email,
        email: s.email,
        totalSales: round2(sales[s.id] || 0),
        orderCount: orderSets[s.id]?.size || 0,
      }))
      .sort((a, b) => b.totalSales - a.totalSales);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Sales by seller error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ───────────────────────── Orders & payments ─────────────────────────

const ORDER_INCLUDE = {
  user: { select: { id: true, name: true, email: true, phoneNumber: true } },
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      quantity: true,
      price: true,
      options: true,
      product: {
        select: {
          id: true,
          name: true,
          images: true,
          sellerId: true,
          seller: { select: { id: true, name: true, email: true } },
        },
      },
    },
  },
  transactions: {
    select: { id: true, type: true, amount: true, status: true, stripeTransferId: true, description: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  },
  refunds: { select: { id: true, amount: true, reason: true, status: true, notes: true, processedAt: true } },
  statusHistory: { select: { status: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
};

/** Adds sellers[], platform fee and payout summary to an order. */
const decorateOrder = (order) => {
  const sellersMap = new Map();
  for (const it of order.items || []) {
    const seller = it.product?.seller;
    if (seller && !sellersMap.has(seller.id)) sellersMap.set(seller.id, seller);
  }
  const sellers = [...sellersMap.values()];
  const shares = (order.transactions || []).filter((t) => t.type === 'TRANSFER');
  const sellerShareTotal = round2(shares.reduce((t, s) => t + s.amount, 0));
  const itemsValue = Math.max(0, Number(order.subtotal || 0) - Number(order.discount || 0));

  let payoutStatus = 'none';
  if (shares.length) {
    if (shares.every((s) => s.status === 'COMPLETED')) payoutStatus = 'paid';
    else if (shares.some((s) => s.status === 'PENDING')) payoutStatus = 'on_hold';
    else if (shares.every((s) => s.status === 'CANCELLED')) payoutStatus = 'cancelled';
    else payoutStatus = 'partial';
  }

  return {
    ...order,
    sellers,
    // first seller kept for older clients
    seller: sellers[0] || null,
    sellerId: sellers[0]?.id || null,
    platformFee: order.paymentStatus === 'PAID' || order.paymentStatus === 'REFUNDED' ? round2(itemsValue * PLATFORM_RATE) : 0,
    sellerAmount: sellerShareTotal,
    payoutStatus,
  };
};

export const adminListAllOrders = async (req, res) => {
  try {
    const { status, paymentStatus, userId, sellerId, startDate, endDate, limit = 20, page = 1 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (userId) where.userId = userId;
    if (sellerId) where.items = { some: { product: { sellerId } } };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        // include the whole end day
        const end = new Date(endDate);
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 500);
    const pageNum = Math.max(1, parseInt(page) || 1);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: ORDER_INCLUDE,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders.map(decorateOrder),
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    logger.error('Admin list orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const adminGetOrder = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: ORDER_INCLUDE });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: decorateOrder(order) });
  } catch (error) {
    logger.error('Admin get order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const adminUpdateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // REFUNDED is set by the refund action, which also returns the money
    if (!['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const current = await prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!current) return res.status(404).json({ success: false, message: 'Order not found' });
    if (current.status === 'REFUNDED') {
      return res.status(409).json({ success: false, message: 'This order was refunded and can no longer change status' });
    }
    if (current.status === status) {
      return res.json({ success: true, data: { id, status } });
    }

    const [order] = await prisma.$transaction([
      prisma.order.update({ where: { id }, data: { status } }),
      prisma.orderStatusHistory.create({ data: { orderId: id, status } }),
    ]);

    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Admin update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const REFUND_REASONS = ['CUSTOMER_REQUEST', 'PRODUCT_DEFECTIVE', 'NOT_AS_DESCRIBED', 'DUPLICATE', 'FRAUD', 'OTHER'];

export const adminRefundOrder = async (req, res) => {
  const reason = REFUND_REASONS.includes(req.body?.reason) ? req.body.reason : 'CUSTOMER_REQUEST';
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 500) || null : null;
  try {
    const result = await refundOrder(req.params.id, { reason, notes });
    res.json({ success: true, message: 'Payment refunded', data: result });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    logger.error('Admin refund error:', error);
    res.status(500).json({ success: false, message: 'Could not refund this order' });
  }
};

/** All seller payouts (one row per order + seller). */
export const adminListPayouts = async (req, res) => {
  try {
    const shares = await prisma.transaction.findMany({
      where: { type: 'TRANSFER' },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { order: { select: { id: true, orderNumber: true, createdAt: true, status: true } } },
    });
    const sellerIds = [...new Set(shares.map((s) => s.metadata?.sellerId).filter(Boolean))];
    const sellers = await prisma.user.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, name: true, email: true, stripeOnboarded: true },
    });
    const sellerMap = new Map(sellers.map((s) => [s.id, s]));

    const data = shares.map((s) => {
      const seller = sellerMap.get(s.metadata?.sellerId) || null;
      return {
        id: s.id,
        orderId: s.orderId,
        orderNumber: s.order?.orderNumber,
        orderStatus: s.order?.status,
        date: s.createdAt,
        updatedAt: s.updatedAt,
        seller,
        itemsValue: s.metadata?.itemsValue ?? null,
        platformFee: s.metadata?.platformFee ?? null,
        amount: s.amount,
        status: s.status === 'COMPLETED' ? 'paid' : s.status === 'PENDING' ? 'on_hold' : s.metadata?.reversedAt ? 'reversed' : 'cancelled',
        stripeTransferId: s.stripeTransferId,
        description: s.description,
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Admin list payouts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ───────────────────────── Products ─────────────────────────

/** Every product, including hidden ones, for the admin panel. */
export const adminListProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        comparePrice: true,
        quantity: true,
        sku: true,
        isActive: true,
        isFeatured: true,
        images: true,
        ARModelUrl: true,
        averageRating: true,
        createdAt: true,
        seller: { select: { id: true, name: true, email: true } },
        categories: { select: { id: true, name: true } },
        _count: { select: { orderItems: true, reviews: true } },
      },
    });
    const sold = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { paymentStatus: 'PAID' } },
      _sum: { quantity: true },
    });
    const soldMap = new Map(sold.map((s) => [s.productId, s._sum.quantity || 0]));
    const data = products.map(({ _count, ...p }) => ({
      ...p,
      orderCount: _count.orderItems,
      reviewCount: _count.reviews,
      unitsSold: soldMap.get(p.id) || 0,
      hasARModel: !!p.ARModelUrl,
    }));
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Admin list products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const adminGetProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        seller: { select: { id: true, name: true, email: true, phoneNumber: true } },
        categories: { select: { id: true, name: true } },
        variants: true,
        _count: { select: { orderItems: true, reviews: true, wishlistItems: true, cartItems: true } },
      },
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const paidItems = await prisma.orderItem.findMany({
      where: { productId: product.id, order: { paymentStatus: 'PAID' } },
      select: { price: true, quantity: true },
    });
    const { _count, ...rest } = product;
    res.json({
      success: true,
      data: {
        ...rest,
        orderCount: _count.orderItems,
        reviewCount: _count.reviews,
        wishlistCount: _count.wishlistItems,
        inCarts: _count.cartItems,
        unitsSold: paidItems.reduce((t, i) => t + i.quantity, 0),
        salesValue: round2(paidItems.reduce((t, i) => t + i.price * i.quantity, 0)),
        hasARModel: !!product.ARModelUrl,
      },
    });
  } catch (error) {
    logger.error('Admin get product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Delete a product. Products that were ever ordered are hidden instead, so
 * past orders, receipts and seller payouts keep their item details.
 */
export const adminDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, sellerId: true, _count: { select: { orderItems: true } } },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product._count.orderItems > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false, isFeatured: false } });
      return res.status(200).json({
        success: true,
        archived: true,
        message: 'This product has orders, so it was hidden from the shop instead of deleted.',
      });
    }

    const result = await deleteProductService(id, product.sellerId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error || 'Could not delete product' });
    }
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    logger.error('Admin delete product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin Category Management
export const adminGetCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('Admin get categories error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const adminCreateCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    // Check if category already exists (case-insensitive for MySQL)
    const existingCategory = await prisma.category.findFirst({
      where: { 
        name: {
          equals: name
        }
      }
    });

    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: description || '',
        image: image || '',
        slug: name.toLowerCase().replace(/\s+/g, '-'),
      },
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    logger.error('Admin create category error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const adminUpdateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    // Check if another category with same name exists
    const existingCategory = await prisma.category.findFirst({
      where: { 
        name: {
          equals: name
        },
        id: { not: id }
      }
    });

    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }

    const category = await prisma.category.update({
      where: { id: id },
      data: {
        name,
        description: description || '',
        image: image || '',
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        updatedAt: new Date(),
      },
    });

    res.json({ success: true, data: category });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    logger.error('Admin update category error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const adminDeleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category is used by any products
    const categoryWithProducts = await prisma.category.findUnique({
      where: { id: id },
      include: { products: true }
    });

    if (!categoryWithProducts) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (categoryWithProducts.products.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete category that is assigned to products' 
      });
    }

    await prisma.category.delete({
      where: { id: id },
    });

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    logger.error('Admin delete category error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
