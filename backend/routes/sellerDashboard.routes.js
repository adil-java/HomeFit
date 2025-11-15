import express from 'express';
import {
  getDashboardStats,
  getRevenueByCategory,
  getMonthlyRevenue,
  getTopProducts
} from '../controllers/sellerDashboard.controller.js';
import { protect, checkSeller } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected and only accessible to sellers
router.use(protect);
router.use(checkSeller);

// Dashboard stats
router.get('/stats', getDashboardStats);

// Revenue by category
router.get('/revenue-by-category', getRevenueByCategory);

// Monthly revenue data
router.get('/monthly-revenue', getMonthlyRevenue);

// Top products
router.get('/top-products', getTopProducts);

export default router;
