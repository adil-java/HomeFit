import express from "express";
import {
  onboardSeller,
  createPayment,
  getConnectStatus,
  getBalance,
  stripeWebhook,
  connectReturn,
  connectRefresh,
} from "../controllers/StripeConnect.controller.js";
import { checkSeller, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Seller Onboarding
router.post("/connect/onboard", protect, onboardSeller);

// Pages Stripe opens after onboarding (browser, no auth) — they send the seller back to the app
router.get("/connect/return", connectReturn);
router.get("/connect/refresh", connectRefresh);

// Create Payment Intent
router.post("/payment-intent", protect, createPayment);

// Seller Account Status
router.get("/connect/status/:sellerId", protect, getConnectStatus);

// Seller Balance
router.get("/balance", protect, getBalance);

// Stripe Webhook
// (raw body is kept for signature checks in server.js, before express.json)
router.post("/webhook", stripeWebhook);

export default router;
