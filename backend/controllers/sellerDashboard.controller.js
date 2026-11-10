import { PrismaClient, OrderStatus, Prisma } from '@prisma/client';
import logger from '../utils/logger.js';
import { getSellerEarnings } from '../services/payout.service.js';
const prisma = new PrismaClient();

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Get the start and end dates for the current month
const getCurrentMonthDates = () => {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { firstDay, lastDay };
};

/**
 * All of this seller's sold items: their own products, in orders that were
 * paid and not cancelled. (Orders can contain several sellers' products, so
 * sales are counted per item, never from the whole order total.)
 */
const getSellerSoldItems = (sellerId, since) =>
  prisma.orderItem.findMany({
    where: {
      product: { sellerId },
      order: {
        paymentStatus: 'PAID',
        status: { not: OrderStatus.CANCELLED },
        ...(since && { createdAt: { gte: since } }),
      },
    },
    select: {
      productId: true,
      price: true,
      quantity: true,
      orderId: true,
      order: { select: { userId: true, createdAt: true } },
    },
  });

const itemValue = (item) => Number(item.price) * Number(item.quantity);
const round2 = (n) => Math.round(n * 100) / 100;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// @desc    Get seller dashboard statistics
// @route   GET /api/seller/dashboard/stats
// @access  Private/Seller
export const getDashboardStats = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const items = await getSellerSoldItems(sellerId);

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalRevenue = round2(items.reduce((sum, i) => sum + itemValue(i), 0));
    const totalOrders = new Set(items.map((i) => i.orderId)).size;
    const totalUsers = new Set(items.map((i) => i.order.userId)).size;
    const activeUsers = new Set(items.filter((i) => i.order.createdAt >= thirtyDaysAgo).map((i) => i.order.userId)).size;

    const monthSales = (from, to) =>
      items.filter((i) => i.order.createdAt >= from && (!to || i.order.createdAt < to)).reduce((s, i) => s + itemValue(i), 0);
    const currentMonthTotal = monthSales(thisMonth);
    const lastMonthTotal = monthSales(lastMonth, thisMonth);
    const monthlyGrowth = lastMonthTotal > 0 ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    // What the seller has been paid / has waiting (see payout.service)
    const earnings = await getSellerEarnings(sellerId).catch(() => null);
    const pendingOrders = await prisma.order.count({
      where: {
        paymentStatus: 'PAID',
        status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
        items: { some: { product: { sellerId } } },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalRevenue, // value of the seller's items sold (before the platform fee)
        totalOrders,
        monthlyGrowth: parseFloat(monthlyGrowth.toFixed(2)),
        thisMonthRevenue: round2(currentMonthTotal),
        pendingOrders, // paid orders still to be shipped
        earnings: earnings
          ? { paid: earnings.paid, onHold: earnings.onHold, feePercent: earnings.feePercent }
          : { paid: 0, onHold: 0, feePercent: 8 },
      },
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard statistics' });
  }
};

// @desc    Get revenue by category
// @route   GET /api/seller/dashboard/revenue-by-category
// @access  Private/Seller
export const getRevenueByCategory = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const items = await getSellerSoldItems(sellerId);

    const products = await prisma.product.findMany({
      where: { id: { in: [...new Set(items.map((i) => i.productId))] } },
      select: { id: true, categories: { select: { name: true } } },
    });
    const categoryOf = Object.fromEntries(products.map((p) => [p.id, p.categories[0]?.name || 'Other']));

    const totals = {};
    for (const item of items) {
      const name = categoryOf[item.productId] || 'Other';
      totals[name] = (totals[name] || 0) + itemValue(item);
    }
    const sorted = Object.entries(totals)
      .map(([name, revenue]) => ({ name, revenue: round2(revenue) }))
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    // Top 4 + "Other"
    const top = sorted.slice(0, 4);
    const rest = round2(sorted.slice(4).reduce((s, c) => s + c.revenue, 0));
    if (rest > 0) {
      const other = top.find((c) => c.name === 'Other');
      if (other) other.revenue = round2(other.revenue + rest);
      else top.push({ name: 'Other', revenue: rest });
    }

    const total = top.reduce((s, c) => s + c.revenue, 0);
    const result = top.map((c) => ({
      ...c,
      color: '#CCCCCC', // the app picks its own colours
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
      population: total > 0 ? Math.round((c.revenue / total) * 100) : 0,
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Error fetching revenue by category:', error);
    res.status(500).json({ success: false, message: 'Error fetching revenue by category' });
  }
};

// @desc    Get monthly revenue data (last 6 months)
// @route   GET /api/seller/dashboard/monthly-revenue
// @access  Private/Seller
export const getMonthlyRevenue = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const items = await getSellerSoldItems(sellerId, first);

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, name: MONTH_NAMES[d.getMonth()], revenue: 0 });
    }
    const byKey = Object.fromEntries(months.map((m) => [m.key, m]));
    for (const item of items) {
      const d = item.order.createdAt;
      const m = byKey[`${d.getFullYear()}-${d.getMonth()}`];
      if (m) m.revenue += itemValue(item);
    }

    res.status(200).json({
      success: true,
      data: {
        labels: months.map((m) => m.name),
        datasets: [{ data: months.map((m) => round2(m.revenue)), strokeWidth: 2 }],
      },
    });
  } catch (error) {
    logger.error('Error fetching monthly revenue:', error);
    res.status(500).json({ success: false, message: 'Error fetching monthly revenue data' });
  }
};

// @desc    Get top products (by items sold in paid orders)
// @route   GET /api/seller/dashboard/top-products
// @access  Private/Seller
export const getTopProducts = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const [products, items] = await Promise.all([
      prisma.product.findMany({
        where: { sellerId },
        select: { id: true, name: true, images: true, quantity: true },
      }),
      getSellerSoldItems(sellerId),
    ]);

    const sales = {};
    for (const item of items) {
      const s = (sales[item.productId] ||= { revenue: 0, orders: new Set(), units: 0 });
      s.revenue += itemValue(item);
      s.orders.add(item.orderId);
      s.units += Number(item.quantity);
    }

    const formatted = products
      .map((p) => ({
        id: p.id,
        name: p.name,
        image: Array.isArray(p.images) ? p.images[0] : undefined,
        revenue: round2(sales[p.id]?.revenue || 0),
        orders: sales[p.id]?.orders.size || 0,
        unitsSold: sales[p.id]?.units || 0,
        stock: p.quantity,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
      .slice(0, 5);

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    logger.error('Error fetching top products:', error);
    res.status(500).json({ success: false, message: 'Error fetching top products' });
  }
};
