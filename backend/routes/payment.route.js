import express from 'express';
import { createPaymentIntent, getKeys } from '../controllers/stripe.controller.js';
import { protect } from '../middlewares/authMiddleware.js';
// import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.get("/keys", getKeys);
router.post("/create-payment-intent", protect, createPaymentIntent);

export default router;