import express from "express";
import {
  onboardSeller,
  createPayment,
  getConnectStatus,
  getBalance,
  stripeWebhook,
} from "../controllers/StripeConnect.controller.js";
import { checkSeller, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Seller Onboarding
router.post("/connect/onboard", protect, onboardSeller);

// Create Payment Intent
router.post("/payment-intent", protect, createPayment);

// Seller Account Status
router.get("/connect/status/:sellerId", protect, getConnectStatus);

// Seller Balance
router.get("/balance", protect, getBalance);

// Stripe Webhook
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

export default router;
