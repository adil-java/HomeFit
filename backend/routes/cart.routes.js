import express from 'express';
import {
  getCart,
  addItemToCart,
  updateCartItem,
  removeItemFromCart,
  clearCart
} from '../controllers/cart.controller.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);


router.route('/')
  .get(getCart)
  .delete(clearCart);

router.route('/items')
  .post(addItemToCart);

router.route('/items/:id')
  .put(updateCartItem)
  .delete(removeItemFromCart);

export default router;
