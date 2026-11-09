import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from '../controllers/address.controller.js';

// Saved shipping addresses of the signed-in user (never another user's)
const router = express.Router();

router.use(protect);
router.get('/', getAddresses);
router.post('/', createAddress);
router.put('/:id', updateAddress);
router.patch('/:id/default', setDefaultAddress);
router.delete('/:id', deleteAddress);

export default router;
