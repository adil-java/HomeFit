import { PrismaClient, OrderStatus, Prisma } from '@prisma/client';
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

// @desc    Get seller dashboard statistics
// @route   GET /api/seller/dashboard/stats
// @access  Private/Seller
export const getDashboardStats = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { firstDay, lastDay } = getCurrentMonthDates();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Get total users who have ordered from this seller
    const uniqueUsers = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        sellerId,
        status: { not: OrderStatus.CANCELLED }
      }
    });
    const totalUsers = uniqueUsers.length;

    // Get active users (users who ordered in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUniqueUsers = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        sellerId,
        status: { not: OrderStatus.CANCELLED },
        createdAt: { gte: thirtyDaysAgo }
      }
    });
    const activeUsers = recentUniqueUsers.length;

    // Get total revenue (sum of sellerAmount for all completed orders)
    const totalRevenueResult = await prisma.order.aggregate({
      where: {
        sellerId,
        paymentMethod:'card',
      },
      _sum: {
        total: true
      }
    });

    const totalRevenue = totalRevenueResult._sum.total || 0;

    // Get total orders
    const totalOrders = await prisma.order.count({
      where: { sellerId }
    });

    // Calculate monthly growth
    const currentMonthRevenue = await prisma.order.aggregate({
      where: {
        sellerId,
        paymentMethod:'card',
        createdAt: {
          gte: firstDay,
          lte: lastDay
        }
      },
      _sum: {
        total: true
      }
    });

    const lastMonthRevenue = await prisma.order.aggregate({
      where: {
        sellerId,
        paymentMethod:'card',
        createdAt: {
          gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
          lt: firstDay
        }
      },
      _sum: {
        total: true
      }
    });

    const currentMonthTotal = currentMonthRevenue._sum.total || 0;
    const lastMonthTotal = lastMonthRevenue._sum.total || 0;
    
    const monthlyGrowth = lastMonthTotal > 0 
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalRevenue,
        totalOrders,
        monthlyGrowth: parseFloat(monthlyGrowth.toFixed(2))
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message,
    });
  }
};

// @desc    Get revenue by category
// @route   GET /api/seller/dashboard/revenue-by-category
// @access  Private/Seller
export const getRevenueByCategory = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // First, get all categories with their products and order items
    const categories = await prisma.category.findMany({
      include: {
        products: {
          where: { 
            sellerId,
            // Only include products that have order items
            orderItems: {
              some: {
                order: {
                  paymentMethod: 'card',
                }
              }
            }
          },
          include: {
            orderItems: {
              where: {
                order: {
                  paymentMethod: 'card',

                }
              },
              include: {
                order: {
                  select: {
                    id: true,
                    paymentMethod: true,
                    status: true,
                    paymentStatus: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Calculate revenue by category
    const revenueByCategory = categories
      .map(category => {
        const totalRevenue = category.products.reduce((sum, product) => {
          const productRevenue = product.orderItems.reduce((productSum, item) => {
            // Only include valid, completed card payments
            if (item.order && 
                item.order.paymentMethod === 'card') {
              return productSum + (Number(item.price) * Number(item.quantity));
            }
            return productSum;
          }, 0);
          return sum + productRevenue;
        }, 0);

        return {
          name: category.name,
          revenue: parseFloat(totalRevenue.toFixed(2)), // Ensure we have 2 decimal places
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          legendFontColor: '#7F7F7F',
          legendFontSize: 12
        };
      })
      .filter(cat => cat.revenue > 0) // Only include categories with revenue
      .sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending

    // Group into top 4 + "Other" category
    const topCategories = revenueByCategory.slice(0, 4);
    const otherCategories = revenueByCategory.slice(4);
    const otherRevenue = parseFloat(otherCategories.reduce((sum, cat) => sum + cat.revenue, 0).toFixed(2));

    if (otherRevenue > 0) {
      topCategories.push({
        name: 'Other',
        revenue: otherRevenue,
        color: '#CCCCCC',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      });
    }

    // Calculate percentages
    const totalRevenue = parseFloat(topCategories.reduce((sum, cat) => sum + cat.revenue, 0).toFixed(2));
    const result = topCategories.map(cat => ({
      ...cat,
      population: totalRevenue > 0 ? Math.round((cat.revenue / totalRevenue) * 100) : 0
    }));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching revenue by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue by category',
      error: error.message,
    });
  }
};

// @desc    Get monthly revenue data
// @route   GET /api/seller/dashboard/monthly-revenue
// @access  Private/Seller
export const getMonthlyRevenue = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        name: monthNames[date.getMonth()],
        year: date.getFullYear(),
        month: date.getMonth() + 1
      });
    }

    // Get revenue for each month
    const monthlyData = await Promise.all(months.map(async ({ year, month, name }) => {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const result = await prisma.order.aggregate({
        where: {
          sellerId,
          paymentMethod:'card',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          total: true
        }
      });

      return {
        month: name,
        revenue: result._sum.total || 0
      };
    }));

    const monthlyRevenue = {
      labels: monthlyData.map(data => data.month),
      datasets: [
        {
          data: monthlyData.map(data => data.revenue),
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };

    res.status(200).json({
      success: true,
      data: monthlyRevenue,
    });
  } catch (error) {
    console.error('Error fetching monthly revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly revenue data',
      error: error.message,
    });
  }
};

// @desc    Get top products
// @route   GET /api/seller/dashboard/top-products
// @access  Private/Seller
export const getTopProducts = async (req, res) => {
  try {
    const sellerId = req.user.id;
    
    // First get all products for the seller with their order items
    const products = await prisma.product.findMany({
      where: { sellerId },
      include: {
        orderItems: {
          include: {
            order: true
          }
        }
      }
    });

    // Process and filter products
    const processedProducts = products.map(product => {
      // Filter order items to only include those with card payments
      const validOrderItems = product.orderItems.filter(item => 
        item.order && item.order.paymentMethod === 'card'
      );

      // Calculate total revenue and order count for valid orders
      const totalRevenue = validOrderItems.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );

      return {
        ...product,
        orderItems: validOrderItems,
        totalRevenue,
        orderCount: validOrderItems.length
      };
    });

    // Sort by order count and take top 5
    const topProducts = processedProducts
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    // Format the response
    const formattedProducts = topProducts.map(product => ({
      id: product.id,
      name: product.name,
      image: product?.images[0],  // Adding product image to the response
      revenue: parseFloat(product.totalRevenue.toFixed(2)),
      orders: product.orderCount,
      stock: product.quantity
    }));

    res.status(200).json({
      success: true,
      data: formattedProducts,
    });
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top products',
      error: error.message,
    });
  }
};
