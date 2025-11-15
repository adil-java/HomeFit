import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to generate unique order number
function generateOrderNumber() {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

class OrderService {
  async createOrder(userId, orderData) {
    if (!orderData || typeof orderData !== 'object') {
      throw new Error('Invalid order data');
    }

    const {
      items,
      shippingAddress,
      billingAddress = shippingAddress, // Default to shipping address if not provided
      paymentMethod = 'card',
      notes,
      couponCode,
    } = orderData;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one order item is required');
    }

    if (!shippingAddress) {
      throw new Error('Shipping address is required');
    }

    // 1. First, validate all products and check stock outside transaction
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        price: true,
        quantity: true,
        name: true,
        sellerId: true,
        images: true,
      },
    });

    // 2. Validate products and calculate totals
    let subtotal = 0;
    const orderItems = [];
    const inventoryUpdates = [];
    let sellerId = null;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (!sellerId && product.sellerId) {
        sellerId = product.sellerId;
      }

      // Check stock availability
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}`);
      }

      // Calculate item total
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      // Prepare order item with image URL in options
      orderItems.push({
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
        options: {
          ...(item.options || {}),
          // Store the first image URL if available
          imageUrl: product.images && product.images.length > 0 
            ? product.images[0] 
            : null
        }
      });

      // Track inventory updates
      inventoryUpdates.push({
        productId: product.id,
        quantity: item.quantity,
      });
    }

    // 3. Calculate order totals
    const taxRate = 0.1; // 10% tax
    const tax = subtotal * taxRate;
    const shipping = 0; // Free shipping for now
    const discount = 0; // Calculate discount based on coupon if needed
    const total = subtotal + tax + shipping - discount;

    // 4. Start a transaction with increased timeout (30 seconds)
    return await prisma.$transaction(async (tx) => {
      // 5. Create the order
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          sellerId,
          subtotal,
          tax,
          shipping,
          discount,
          total,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod,
          shippingAddress,
          billingAddress,
          items: {
            create: orderItems
          }
        },
        include: {
          items: true
        }
      });

      // 6. Update inventory
      for (const update of inventoryUpdates) {
        await tx.product.update({
          where: { id: update.productId },
          data: {
            quantity: {
              decrement: update.quantity
            }
          }
        });
      }

      // 7. Get user's cart ID for later cleanup (outside transaction)
      const userCart = await prisma.cart.findUnique({
        where: { userId },
        select: { id: true }
      });

      // 8. Return the order with cart info for cleanup
      return {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: order.total,
          items: order.items,
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        },
        cartId: userCart?.id
      };
    }, {
      timeout: 30000 // 30 seconds
    });
  }

  async processPayment(orderId, paymentMethod) {
    // 1. Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.paymentStatus === 'PAID') {
      throw new Error('Order already paid');
    }

    // 2. Create payment intent with Stripe
    const paymentIntent = await stripe.createPaymentIntent.create({
      amount: Math.round(order.total * 100), // Convert to cents
      currency: 'usd',
      metadata: { orderId: order.id, userId: order.userId },
      payment_method_types: ['card'],
    });

    // 3. Update order with payment intent ID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentIntentId: paymentIntent.client_secret.split('_secret_')[0], // Extract pi_xxx ID
        paymentMethod: paymentMethod,
      },
    });

    // 4. Return client secret for frontend confirmation
    return {
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      amount: order.total,
      currency: 'usd',
    };
  }

  async confirmPayment(paymentIntentId) {
    // 1. Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const orderId = paymentIntent.metadata.orderId;

    // 2. Update order status to PAID
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'PROCESSING',
        paidAt: new Date(),
        statusHistory: {
          create: {
            status: 'PROCESSING',
            notes: 'Payment confirmed, order is being processed',
          },
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        items: true,
      },
    });

    // 3. Trigger order confirmation email
    try {
      await sendOrderConfirmationEmail(order);
    } catch (error) {
      logger.error('Failed to send order confirmation email:', error);
      // Don't fail the whole process if email fails
    }

    return order;
  }

  async updateOrderStatus(orderId, status, notes = '', userId = 'system') {
    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    return await prisma.$transaction(async (tx) => {
      // Update order status
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(status === 'CANCELLED' && { cancelledAt: new Date() }),
          ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
        },
      });

      // Add to status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status,
          notes,
          createdBy: userId,
        },
      });

      return order;
    });
  }

  async getOrderDetails(orderId, userId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                slug: true
              }
            }
          }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  async listUserOrders(userId, filters = {}) {
    // Ensure we have valid numbers for pagination
    const limit = Math.min(parseInt(filters.limit) || 10, 100); // Cap at 100 items per page
    const page = Math.max(1, parseInt(filters.page) || 1); // Ensure page is at least 1
    const skip = (page - 1) * limit;

    const where = { userId };
    if (filters.status) {
      where.status = filters.status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: isNaN(skip) ? 0 : skip,
        take: isNaN(limit) ? 10 : limit,
        include: {
          items: {
            take: 1, // Only include first item for preview
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
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listSellersOrders(sellerId, filters = {}) {
    // Ensure we have valid numbers for pagination
    const limit = Math.min(parseInt(filters.limit) || 10, 100); // Cap at 100 items per page
    const page = Math.max(1, parseInt(filters.page) || 1); // Ensure page is at least 1
    const skip = (page - 1) * limit;

    const where = {
      items: {
        some: {
          product: {
            sellerId: sellerId
          }
        }
      }
    };

    if (filters.status) {
      where.status = filters.status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: isNaN(skip) ? 0 : skip,
        take: isNaN(limit) ? 10 : limit,
        include: {
          items: {
            where: {
              product: {
                sellerId: sellerId
              }
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
        },
      }),
      prisma.order.count({
        where: {
          items: {
            some: {
              product: {
                sellerId: sellerId
              }
            }
          },
          ...(filters.status && { status: filters.status })
        },
      })
    ]);

    return {
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Helper method for coupon validation
  async validateCoupon(code, subtotal, userId) {
    // Implement your coupon validation logic here
    // This is a simplified example
    const validCoupons = {
      'WELCOME10': { discount: 10, minPurchase: 0 },
      'SAVE20': { discount: 20, minPurchase: 100 },
    };

    const coupon = validCoupons[code.toUpperCase()];
    
    if (!coupon) {
      throw new Error('Invalid coupon code');
    }

    if (subtotal < coupon.minPurchase) {
      throw new Error(`Minimum purchase of $${coupon.minPurchase} required for this coupon`);
    }

    return coupon.discount;
  }
}

const orderService = new OrderService();
export default orderService;