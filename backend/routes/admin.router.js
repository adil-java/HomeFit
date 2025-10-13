import express from 'express';
import {
    adminLogin,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser
} from '../controllers/admin.controller.js';
import { protect, checkAdmin } from '../middlewares/authMiddleware.js';
const router = express.Router();

router.use(protect);
router.use(checkAdmin);

router.route('/login').post(adminLogin); // Placeholder for admin login if needed
router.route('/users').get(getAllUsers);
router.route('/users/:id').get(getUserById);
router.route('/users/:id/role').put(updateUserRole);
router.route('/users/:id').delete(deleteUser);

export default router;