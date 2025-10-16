import express from 'express';
import {
    adminLogin,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  allSellers
} from '../controllers/admin.controller.js';
// import {  checkAdmin } from '../middlewares/authMiddleware.js';
const router = express.Router();




router.route('/login').post(adminLogin); // Placeholder for admin login if needed
router.route('/user/:id').get(getUserById);
router.route('/users').get(getAllUsers);
router.route('/users/:id/role').put(updateUserRole);
router.route('/users/:id').delete(deleteUser);
router.route("/sellers").get( allSellers);

export default router;