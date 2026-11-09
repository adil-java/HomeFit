import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import Stripe from "stripe";
import logger from '../utils/logger.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to generate unique order number
function generateOrderNumber() {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Tax applied to every order. The checkout screen shows the same rate
// (frontend/constants/pricing.ts) — keep the two in sync.
export const TAX_RATE = 0.1;

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

/** Order total in the smallest currency unit (paisa / cents), as Stripe charges it. */
export const toMinorUnits = (amount) => Math.round(amount * 100);

class OrderService {
  /**
   * Price a list of {productId, quantity} from the database (never from the
   * client) and check stock. Used both to create the Stripe payment and the
   * order, so the amount charged always equals the order total.
   */
  async quoteOrder(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw httpError(400, 'At least one order item is required');
    }

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

    let subtotal = 0;
    const orderItems = [];
    const inventoryUpdates = [];
    let sellerId = null;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw httpError(400, `Product not found: ${item.productId}`);
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw httpError(400, `Invalid quantity for product: ${product.name}`);
      }

      if (!sellerId && product.sellerId) {
        sellerId = product.sellerId;
      }

      if (product.quantity < quantity) {
        throw httpError(409, `Insufficient stock for product: ${product.name}`);
      }

      subtotal += product.price * quantity;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity,
        options: {
          ...(item.options || {}),
          // Store the first image URL if available
          imageUrl: product.images && product.images.length > 0
            ? product.images[0]
            : null
        }
      });

      inventoryUpdates.push({ productId: product.id, quantity });
    }

    const tax = subtotal * TAX_RATE;
    const shipping = 0; // Free shipping for now
    const discount = 0; // Coupons are not implemented on the server yet
    const total = subtotal + tax + shipping - discount;

    return { orderItems, inventoryUpdates, sellerId, subtotal, tax, shipping, discount, total };
  }

  /**
   * Check that a Stripe PaymentIntent really paid for this order: it belongs to
   * this user, it succeeded, it hasn't been used for another order, and the
   * amount matches the server-side total.
   */
  async verifyCardPayment(userId, paymentIntentId, total) {
    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      throw httpError(400, 'Card payment is required for this order');
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      throw httpError(400, 'Payment not found');
    }

    if (paymentIntent.metadata?.userId !== userId) {
      throw httpError(403, 'This payment does not belong to your account');
    }

    if (!['succeeded', 'processing'].includes(paymentIntent.status)) {
      throw httpError(402, 'Payment was not completed');
    }

    const alreadyUsed = await prisma.order.findUnique({
      where: { stripePaymentIntent: paymentIntent.id },
      select: { id: true },
    });
    if (alreadyUsed) {
      throw httpError(409, 'This payment has already been used for an order');
    }

    if (paymentIntent.amount !== toMinorUnits(total)) {
      // Prices changed between paying and placing the order: give the money back.
      await this.refundSafely(paymentIntent.id);
      throw Object.assign(
        httpError(409, 'Prices changed while you were paying. Your payment has been refunded — please try again.'),
        { refunded: true }
      );
    }

    return paymentIntent;
  }

  async refundSafely(paymentIntentId) {
    try {
      await stripe.refunds.create({ payment_intent: paymentIntentId });
      return true;
    } catch (refundError) {
      logger.error(`[Payments] Refund failed for ${paymentIntentId} — refund it manually in Stripe:`, refundError);
      return false;
    }
  }

  /**
   * Refund a payment only if it is this user's, actually went through, is not
   * attached to any order and hasn't been refunded already.
   */
  async refundIfUnused(userId, paymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.metadata?.userId !== userId) return false;
      if (!['succeeded', 'processing'].includes(pi.status)) return false;
      const attached = await prisma.order.findUnique({
        where: { stripePaymentIntent: pi.id },
        select: { id: true },
      });
      if (attached) return false;
      const existing = await stripe.refunds.list({ payment_intent: pi.id, limit: 1 });
      if (existing.data.length > 0) return false;
      return await this.refundSafely(pi.id);
    } catch {
      return false;
    }
  }

  async createOrder(userId, orderData) {
    if (!orderData || typeof orderData !== 'object') {
      throw httpError(400, 'Invalid order data');
    }

    const {
      items,
      addressId,
      paymentMethod = 'card',
      paymentIntentId,
    } = orderData;
    let { shippingAddress, billingAddress } = orderData;
    let quote;
    let paymentIntent = null;
    try {

      // A saved address was chosen: ship to exactly that address (looked up
      // here, and only if it belongs to this user).
      if (addressId) {
        const saved = await prisma.address.findFirst({
          where: { id: addressId, userId },
          include: { user: { select: { name: true, email: true, phoneNumber: true } } },
        });
        if (!saved) {
          throw httpError(400, 'Please choose a delivery address');
        }
        shippingAddress = {
          name: saved.user?.name || shippingAddress?.name || 'Customer',
          email: saved.user?.email || shippingAddress?.email,
          phone: saved.phone || saved.user?.phoneNumber || shippingAddress?.phone,
          street: saved.street,
          city: saved.city,
          state: saved.state || '',
          postalCode: saved.postalCode,
          country: saved.country,
          type: saved.type,
        };
      }
      billingAddress = billingAddress || shippingAddress; // Default to shipping address

      if (!shippingAddress) {
        throw httpError(400, 'Shipping address is required');
      }

      // 1-3. Price the items from the database and check stock
      quote = await this.quoteOrder(items);

      // Card orders must come with a payment that Stripe confirms.
      if (paymentMethod === 'card') {
        paymentIntent = await this.verifyCardPayment(userId, paymentIntentId, quote.total);
      }
    } catch (error) {
      // The app only calls this after the customer has paid. If the order is
      // rejected before the payment is attached (address, stock, …), give the
      // money back instead of keeping it with no order.
      if (paymentIntentId && !error.refunded) {
        const refunded = await this.refundIfUnused(userId, paymentIntentId);
        if (refunded) {
          throw httpError(error.statusCode || 400, `${error.message || 'Could not place the order'}. Your payment has been refunded.`);
        }
      }
      throw error;
    }
    const { orderItems, inventoryUpdates, sellerId, subtotal, tax, shipping, discount, total } = quote;
    const isPaid = paymentIntent?.status === 'succeeded';

    try {
      return await this.createOrderRecord({
        userId, sellerId, subtotal, tax, shipping, discount, total,
        paymentMethod, shippingAddress, billingAddress, orderItems, inventoryUpdates,
        paymentIntent, isPaid,
      });
    } catch (error) {
      // The customer has paid but the order couldn't be saved (e.g. stock ran
      // out a moment ago). Refund — unless the payment is already attached to
      // an order (duplicate submit), which must keep its money.
      if (paymentIntent && error?.code !== 'P2002') {
        const refunded = await this.refundSafely(paymentIntent.id);
        throw httpError(
          error.statusCode || 500,
          refunded
            ? `${error.message || 'Could not place the order'}. Your payment has been refunded.`
            : `${error.message || 'Could not place the order'}. Please contact support about your payment.`
        );
      }
      throw error;
    }
  }

  async createOrderRecord({
    userId, sellerId, subtotal, tax, shipping, discount, total,
    paymentMethod, shippingAddress, billingAddress, orderItems, inventoryUpdates,
    paymentIntent, isPaid,
  }) {
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
          paymentStatus: isPaid ? 'PAID' : 'PENDING',
          paymentMethod,
          ...(paymentIntent && {
            stripePaymentIntent: paymentIntent.id,
            paymentId: paymentIntent.id,
            ...(isPaid && { paymentConfirmedAt: new Date() }),
          }),
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
      // Only decrement while enough stock is left, so two buyers can't both
      // take the last item (the whole order rolls back if one runs out).
      for (const update of inventoryUpdates) {
        const { count } = await tx.product.updateMany({
          where: { id: update.productId, quantity: { gte: update.quantity } },
          data: {
            quantity: {
              decrement: update.quantity
            }
          }
        });
        if (count === 0) {
          throw httpError(409, 'An item in your order just went out of stock');
        }
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
      // Update only the status field
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status }
      });

      // Add to status history with only valid fields
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status
        }
      });

      // Add a note to the order if notes were provided
      if (notes) {
        await tx.orderNote.create({
          data: {
            orderId,
            author: userId,
            content: notes
          }
        });
      }

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
                slug: true,
                sellerId: true
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

  async listAllOrders(filters = {}) {
    // Admin endpoint to list ALL orders (not filtered by userId)
    const limit = Math.min(parseInt(filters.limit) || 10, 100);
    const page = Math.max(1, parseInt(filters.page) || 1);
    const skip = (page - 1) * limit;

    const where = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: isNaN(skip) ? 0 : skip,
        take: isNaN(limit) ? 10 : limit,
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
      const sellerId = firstItem?.product?.sellerId;
      
      return {
        ...order,
        seller: seller || null,
        sellerId: sellerId || null,
      };
    });

    return {
      data: ordersWithSeller,
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