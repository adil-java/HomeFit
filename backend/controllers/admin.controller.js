import prisma from '../config/db.js';
import { Role } from '@prisma/client';
import { generateToken} from '../utils/jwtHelper.js';
import { deleteProductService } from '../services/product.service.js';

export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          not: Role.ADMIN
        }
      },
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const adminDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Admin can delete any product, so we pass null as sellerId to bypass ownership check
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, sellerId: true, images: true }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Use the product's actual sellerId for the service call
    const result = await deleteProductService(id, product.sellerId);

    if (!result.success) {
      return res.status(403).json(result);
    }

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Admin delete product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
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


export const getUserById = async (req, res) => {
  const { id } = req.params;
 console.log("Received ID:", id);
  try {
    const user = await prisma.user.findUnique({
      where: { id:id },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        role: true,
        phoneNumber: true,
        photoURL: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log("Retrieved User:", user);
    res.status(200).json({ success: true, data: user });

  } catch (error) {
    console.error('Get user by ID error:', error);
    console.log("Received ID:", id);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

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
      where: { role: Role.SELLER }, 
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Get product counts and order counts for each seller
    const sellersWithCounts = await Promise.all(
      sellers.map(async (seller) => {
        const [productCount, orderCount, totalRevenue] = await Promise.all([
          // Count products by this seller
          prisma.product.count({
            where: { sellerId: seller.id }
          }),
          // Count orders that contain products from this seller
          prisma.order.count({
            where: {
              items: {
                some: {
                  product: {
                    sellerId: seller.id
                  }
                }
              }
            }
          }),
          // Calculate total revenue from orders containing this seller's products
          prisma.order.aggregate({
            where: {
              items: {
                some: {
                  product: {
                    sellerId: seller.id
                  }
                }
              },
              paymentStatus: 'PAID'
            },
            _sum: {
              total: true
            }
          })
        ]);

        return {
          ...seller,
          productCount,
          orderCount,
          totalRevenue: Number(totalRevenue._sum.total || 0)
        };
      })
    );

    res.status(200).json({ success: true, data: sellersWithCounts });
    console.log(" /Sellers");
  } catch (error) {
    console.error('Get all sellers error:', error);
    res.status(500).json({ success: false, message: 'Cannot get all sellers. Server Error.' });
  }
};
export const listSellerRequests = async (req, res) => {
  try {
    const status = req.query.status; 
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


export const approveSellerRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const reviewerId = req.user?.id || req.user?.uid || null;

    const application = await prisma.sellerApplication.update({
      where: { id },
      data: { status: 'APPROVED', reviewedBy: reviewerId, reviewedAt: new Date() },
      include: { user: true },
    });

    if (application?.userId) {
      await prisma.user.update({
        where: { id: application.userId },
        data: { role: Role.SELLER },
      });
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    console.error('Approve seller request error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


export const rejectSellerRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const reviewerId = req.user?.id || req.user?.uid || null;

    const application = await prisma.sellerApplication.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: reviewerId, reviewedAt: new Date() },
    });

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    console.error('Reject seller request error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


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

export const salesBySeller = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { paymentMethod: 'card' };
    if (startDate) where.createdAt = { gte: new Date(startDate) };
    if (endDate) {
      where.createdAt = where.createdAt || {};
      where.createdAt.lte = new Date(endDate);
    }

    const orders = await prisma.order.groupBy({
      by: ['sellerId'],
      where,
      _sum: { total: true },
      _count: { id: true },
    });

    // Filter out null sellerIds in JS
    const filtered = orders.filter(o => o.sellerId != null);

    // Fetch seller info
    const sellerIds = filtered.map(o => o.sellerId);
    const sellers = await prisma.user.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, name: true, email: true },
    });
    const sellerMap = new Map(sellers.map(s => [s.id, s]));

    const result = filtered.map(o => ({
      sellerId: o.sellerId,
      name: sellerMap.get(o.sellerId)?.name || null,
      email: sellerMap.get(o.sellerId)?.email || null,
      totalSales: Number(o._sum.total || 0),
      orderCount: o._count.id,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Sales by seller error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const adminListAllOrders = async (req, res) => {
  try {
    const { status, userId, sellerId, startDate, endDate, limit = 20, page = 1 } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (sellerId) where.sellerId = sellerId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const pageNum = Math.max(1, parseInt(page) || 1);
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: isNaN(skip) ? 0 : skip,
        take: isNaN(limitNum) ? 20 : limitNum,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  sellerId: true,
                  seller: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    // Extract seller info from items
    const ordersWithSeller = orders.map(order => {
      const firstItem = order.items?.[0];
      const seller = firstItem?.product?.seller;
      const orderSellerId = firstItem?.product?.sellerId;
      
      return {
        ...order,
        seller: seller || null,
        sellerId: orderSellerId || null,
      };
    });

    res.json({
      success: true,
      data: ordersWithSeller,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Admin list orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const adminUpdateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
    });

    // Optionally log status change
    if (notes) {
      await prisma.statusHistory.create({
        data: {
          orderId: id,
          status,
          notes,
        },
      });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Admin update order status error:', error);
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
    console.error('Admin get categories error:', error);
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
    console.error('Admin create category error:', error);
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
    console.error('Admin update category error:', error);
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
    console.error('Admin delete category error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update order payment status (for testing/admin purposes)
export const adminUpdatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, status } = req.body;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus,
        ...(status && { status }),
        ...(paymentStatus === 'PAID' && { paymentConfirmedAt: new Date() }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: order,
      message: `Order payment status updated to ${paymentStatus}`,
    });
  } catch (error) {
    console.error('Admin update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Simulate payment statuses for existing orders (for testing)
export const adminSimulatePaymentStatuses = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const updates = [];
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      let paymentStatus = 'PENDING';
      let status = order.status;
      
      // Simulate different payment statuses
      if (i % 4 === 0) {
        paymentStatus = 'PAID';
        status = 'PROCESSING';
      } else if (i % 4 === 1) {
        paymentStatus = 'FAILED';
        status = 'CANCELLED';
      } else if (i % 4 === 2) {
        paymentStatus = 'PENDING';
      } else if (i % 4 === 3) {
        paymentStatus = 'PAID';
        status = 'COMPLETED';
      }

      const updateData = {
        paymentStatus,
        status,
        ...(paymentStatus === 'PAID' && { paymentConfirmedAt: new Date() }),
      };

      updates.push(
        prisma.order.update({
          where: { id: order.id },
          data: updateData,
        })
      );
    }

    await Promise.all(updates);

    res.json({
      success: true,
      message: `Updated payment statuses for ${orders.length} orders`,
      data: {
        updatedCount: orders.length,
      },
    });
  } catch (error) {
    console.error('Admin simulate payment statuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
