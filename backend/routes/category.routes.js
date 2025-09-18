import express from 'express';
import {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/category.controller.js';
import { protect, checkAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.get('/slug/:slug', getCategoryBySlug);

// Protected admin routes
router.use(protect, checkAdmin);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
