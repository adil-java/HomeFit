import Stripe from "stripe";
import { request,response } from "express";
import OrderService, { toMinorUnits } from "../services/order.service.js";
import logger from '../utils/logger.js';
const stripe= new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/stripe/create-payment-intent  body: { items: [{ productId, quantity }] }
// The amount is calculated here from database prices (same calculation as the
// order), never taken from the app, so a modified client can't pay less.
export const createPaymentIntent = async (req = request, res = response) => {
  try {
    const { items, currency = 'pkr' } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid items',
        message: 'Your cart is empty',
      });
    }

    const quote = await OrderService.quoteOrder(items);
    const amount = toMinorUnits(quote.total);
    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount', message: 'Order total must be above zero' });
    }

    const customer = await stripe.customers.create({
      email: req.user?.email || undefined,
      metadata: { userId: req.user.id },
    });
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2025-09-30.clover' }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: String(currency).toLowerCase(),
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        created_from: 'mobile_app',
        // Checked when the order is created, so only this user can use this payment
        userId: req.user.id,
      },
    });

    res.status(200).json({
      success: true,
      paymentIntent: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      breakdown: {
        subtotal: quote.subtotal,
        tax: quote.tax,
        shipping: quote.shipping,
        discount: quote.discount,
        total: quote.total,
      },
    });
  } catch (error) {
    logger.error('Error creating payment intent:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.type || 'Server Error',
      message: error.message || 'Failed to create payment intent',
    });
  }
};
export const getKeys = async (req = request, res = response) => {
    try {
        res.status(200).json({ "publishableKey": process.env.STRIPE_PUBLISHABLE_KEY  });    
    }
    catch (error) {
        logger.error("Error fetching keys:", error);
        res.status(500).json({
          success: false,
          error: "Server Error",
          message: "Failed to fetch keys",
        });
      }
}