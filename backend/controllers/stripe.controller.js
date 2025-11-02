import Stripe from "stripe";
import { request,response } from "express";
const stripe= new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentIntent = async (req = request, res = response) => {
  try { 

   const customer = await stripe.customers.create()
  const ephemeralKey = await stripe.ephemeralKeys.create(
    {customer: customer.id},
    {
      apiVersion: '2025-09-30.clover'
    }
  );
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1099, 
    currency: 'eur',
    customer: customer.id,
  
  });

  res.json({
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customer.id,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: "Failed to create payment intent",
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