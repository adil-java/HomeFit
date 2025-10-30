import prisma from '../config/db.js';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateToken,verifyToken } from '../utils/jwtHelper.js';


// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Revenue over last 6 months grouped by month
export const revenueMonthly = async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, total: true },
    });

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleString('en', { month: 'short' }), revenue: 0 });
    }

    const map = new Map(months.map(m => [m.key, m]));
    for (const o of orders) {
      const d = o.createdAt;
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const bucket = map.get(key);
      if (bucket) bucket.revenue += Number(o.total || 0);
    }

    res.status(200).json({ success: true, data: months.map(m => ({ month: m.label, revenue: m.revenue })) });
  } catch (error) {
    console.error('Revenue monthly error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Top 5 products by quantity sold
export const topProducts = async (req, res) => {
  try {
    const items = await prisma.orderItem.findMany({ select: { productName: true, quantity: true } });
    const agg = new Map();
    for (const it of items) {
      const key = it.productName || 'Unknown';
      agg.set(key, (agg.get(key) || 0) + Number(it.quantity || 0));
    }
    const top = Array.from(agg.entries())
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
    res.status(200).json({ success: true, data: top });
  } catch (error) {
    console.error('Top products error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update user role (admin only)
export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!Object.values(Role).includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: id},
      data: { role }
    });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: 'cant update role Server Error' });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({
      where: { id: id}
    });
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get user by ID (admin only)
export const getUserById = async (req, res) => {
  const { id } = req.params;
 console.log("📥 Received ID:", id);
  try {
    const user = await prisma.user.findUnique({
      where: { id:id },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        phoneNumber: true,
        photoURL: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log("👤 Retrieved User:", user);
    res.status(200).json({ success: true, data: user });

  } catch (error) {
    console.error('Get user by ID error:', error);
    console.log("Received ID:", id);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Admin login (if needed)
export const adminLogin = async (req, res) => {
  const { email, password } = req.body;
try {
    const cleanEmail = (email || '').trim();
    const cleanPassword = (password || '').trim();

    const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
    });

    if (!user) {
        return res.status(401).json({ success: false, message: 'no user found' });
    }

    // Check password
    // const isMatch = await bcrypt.compare(password, user.firebaseUid);
    const isMatch = cleanPassword === user.firebaseUid; // Since firebaseUid is being used as password placeholder
    if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials password' });
    }

    // Check if user is admin
    if (user.role !== Role.ADMIN) {
        return res.status(403).json({ success: false, message: 'Access denied: Not an admin' });
    }

  
    // Generate token
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
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
}

};
export const allSellers = async (req, res) => {
  try {
    const sellers = await prisma.user.findMany({
      where: { role: Role.SELLER }, // ✅ Correct role
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(200).json({ success: true, data: sellers });
    console.log(" /Sellers");
  } catch (error) {
    console.error('Get all sellers error:', error);
    res.status(500).json({ success: false, message: 'Cannot get all sellers. Server Error.' });
  }
};

// List seller requests (all or only pending)
export const listSellerRequests = async (req, res) => {
  try {
    const status = req.query.status; // optional: PENDING/APPROVED/REJECTED
    const where = status ? { status } : {};
    const requests = await prisma.sellerApplication.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: { user: { select: { id: true, email: true, name: true, phoneNumber: true } } },
    });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error('List seller requests error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Approve seller request: set application APPROVED and update user role to SELLER
export const approveSellerRequest = async (req, res) => {
  const { id } = req.params; // sellerApplication id
  try {
    const application = await prisma.sellerApplication.update({
      where: { id },
      data: { status: 'APPROVED', reviewedBy: req.user.id, reviewedAt: new Date() },
      include: { user: true },
    });

    await prisma.user.update({
      where: { id: application.userId },
      data: { role: Role.SELLER },
    });

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    console.error('Approve seller request error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Reject seller request
export const rejectSellerRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const application = await prisma.sellerApplication.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: req.user.id, reviewedAt: new Date() },
    });

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    console.error('Reject seller request error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Analytics summary for dashboard
export const analyticsSummary = async (req, res) => {
  try {
    const [totalUsers, adminCount, activeSellers, pendingRequests, totalProducts, totalOrders, revenueAgg] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.user.count({ where: { role: Role.SELLER } }),
      prisma.sellerApplication.count({ where: { status: 'PENDING' } }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        adminCount,
        totalUsersExcludingAdmin: Math.max(totalUsers - adminCount, 0),
        activeSellers,
        pendingRequests,
        totalProducts,
        totalOrders,
        revenue: revenueAgg._sum.total || 0,
      },
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
