import express from 'express';
import {
  getWishlist,
  addItemToWishlist,
  removeItemFromWishlist,
  checkInWishlist
} from '../controllers/wishlist.controller.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();


router.use(protect);


router.route('/')
  .get(getWishlist);

router.route('/items')
  .post(addItemToWishlist);

router.route('/items/:productId')
  .get(checkInWishlist)
  .delete(removeItemFromWishlist);

export default router;
