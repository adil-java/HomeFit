import OrderService from '../services/order.service.js';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  return null;
};

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    console.log('Request body:', req.body); // Debug log
    
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    if (!req.body) {
      return res.status(400).json({
        success: false,
        error: 'Request body is required'
      });
    }

    const { order, cartId } = await OrderService.createOrder(req.user.id, {
      items: req.body.items,
      shippingAddress: req.body.shippingAddress,
      billingAddress: req.body.billingAddress,
      paymentMethod: req.body.paymentMethod,
      couponCode: req.body.couponCode,
      notes: req.body.notes
    });

    // Clear the cart after successful order creation (outside of transaction)
    if (cartId) {
      try {
        await prisma.cartItem.deleteMany({
          where: { cartId }
        });
      } catch (cartError) {
        console.error('Error clearing cart:', cartError);
        // Don't fail the request if cart clearing fails
      }
    }

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Create Order Error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to create order',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// @desc    Initiate payment for an order
// @route   POST /api/orders/:id/payment
// @access  Private
export const initiatePayment = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    const { id: orderId } = req.params;
    const { paymentMethod, paymentMethodId } = req.body;

    const paymentIntent = await OrderService.initiatePayment({
      orderId,
      userId: req.user.id,
      paymentMethod,
      paymentMethodId
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error) {
    console.error('Payment Initiation Error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Payment initiation failed',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;    
    const order = await OrderService.getOrderDetails(id, req.user.id);
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get Order Error:', error);
    const statusCode = error.statusCode || 404;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Order not found'
    });
  }
};

// @desc    Get all orders for current user
// @route   GET /api/orders
// @access  Private
export const listUserOrders = async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    
    const result = await OrderService.listUserOrders(req.user.id, {
      status,
      limit: limitNum,
      page: pageNum
    });
    
    res.json({
      success: true,
      count: result.data.length,
      ...result.pagination,
      data: result.data
    });
  } catch (error) {
    console.error('List User Orders Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders'
    });
  }
};

export const listSellersOrders = async (req, res) => {
  try {
    const { status, limit = '10', page = '1' } = req.query;
    
    const result = await OrderService.listSellersOrders(req.user.id, {
      status,
      limit,
      page
    });
    
    res.json({
      success: true,
      count: result.data.length,
      pagination: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      },
      data: result.data.map(order => ({
        ...order,
        items: order.items || []
      }))
    });
  } catch (error) {
    console.error('List seller Orders Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch seller orders',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
export const updateOrderStatus = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    const { id: orderId } = req.params;
    const { status, notes } = req.body;

    const order = await OrderService.updateOrderStatus({
      orderId,
      status,
      notes,
      userId: req.user.id,
      isAdmin: req.user.role === 'ADMIN'
    });

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to update order status'
    });
  }
};

// @desc    Get all orders (Admin only)

export const listAllOrders = async (req, res) => {
  try {
    const { status, userId, limit = 20, page = 1 } = req.query;
    
    const { orders, total } = await OrderService.listUserOrders({
      status,
      userId,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({
      success: true,
      count: orders.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: orders
    });
  } catch (error) {
    console.error('List All Orders Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders'
    });
  }
};

// @desc    Add note to order
// @route   POST /api/orders/:id/notes
// @access  Private
export const addOrderNote = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    const { id: orderId } = req.params;
    const { content, isPublic = true } = req.body;

    const note = await OrderService.addOrderNote({
      orderId,
      content,
      isPublic,
      author: req.user.id,
      isAdmin: req.user.role === 'ADMIN'
    });

    res.status(201).json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error('Add Note Error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to add note'
    });
  }
};

// @desc    Get order notes
// @route   GET /api/orders/:id/notes
// @access  Private
export const getOrderNotes = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const isAdmin = req.user.role === 'ADMIN';
    
    const notes = await OrderService.getOrderNotes(orderId, req.user.id, isAdmin);
    
    res.json({
      success: true,
      count: notes.length,
      data: notes
    });
  } catch (error) {
    console.error('Get Notes Error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch notes'
    });
  }
};

// @desc    Handle Stripe webhook
// @route   POST /api/orders/webhook/stripe
// @access  Public
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    await OrderService.handleWebhookEvent(event);
    
    // Handle specific event types if needed
    switch (event.type) {
      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object;
        await OrderService.updateOrderStatus({
          orderId: failedPayment.metadata.orderId,
          status: 'FAILED',
          notes: 'Payment failed',
          userId: 'system',
          isAdmin: true
        });
        break;
      }
      // Add more event types as needed
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(400).json({
      success: false,
      error: `Webhook Error: ${error.message}`,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// Export all controller functions
const orderController = {
  createOrder,
  initiatePayment,
  getOrder,
  listUserOrders,
  updateOrderStatus,
  listAllOrders,
  addOrderNote,
  getOrderNotes,
  handleStripeWebhook
};

export default orderController;