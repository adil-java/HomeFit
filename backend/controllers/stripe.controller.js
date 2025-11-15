import Stripe from "stripe";
import { request,response } from "express";
const stripe= new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentIntent = async (req = request, res = response) => {
  try { 
    const { amount, currency = 'pkr' } = req.body;

    // Validate required fields
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: 'A valid positive amount is required',
      });
    }

    // Create customer in Stripe
    const customer = await stripe.customers.create();
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2025-09-30.clover' }
    );

    // Create payment intent with the provided amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure amount is an integer
      currency: currency.toLowerCase(),
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        // Add any additional metadata you need
        created_from: 'mobile_app',
      },
    });

    res.status(200).json({
      success: true,
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
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
        console.error("Error fetching keys:", error);
        res.status(500).json({
          success: false,
          error: "Server Error",
          message: "Failed to fetch keys",
        });
      }
}