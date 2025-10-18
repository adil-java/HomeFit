import express from 'express';
import {
    adminLogin,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  allSellers
} from '../controllers/admin.controller.js';
import { adminVerify } from '../middlewares/authMiddleware.js';
// import {  checkAdmin } from '../middlewares/authMiddleware.js';
const router = express.Router();




router.route('/login').post(adminLogin); // Placeholder for admin login if needed
router.route('/user/:id',adminVerify).get(getUserById);
router.route('/users',adminVerify).get(getAllUsers);
router.route('/users/:id/role',adminVerify).put(updateUserRole);
router.route('/users/:id',adminVerify).delete(deleteUser);
router.route("/sellers",adminVerify).get( allSellers);

export default router;