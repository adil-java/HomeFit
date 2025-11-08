import express from 'express';
import {
    adminLogin,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  allSellers,
  listSellerRequests,
  approveSellerRequest,
  rejectSellerRequest,
  analyticsSummary,
  revenueMonthly,
  topProducts
} from '../controllers/admin.controller.js';
import { toggleProductStatus } from '../controllers/product.controller.js';
import { adminJwtVerify } from '../middlewares/authMiddleware.js';
// import {  checkAdmin } from '../middlewares/authMiddleware.js';
const router = express.Router();




router.route('/login').post(adminLogin); 
router.route('/user/:id',adminJwtVerify).get(getUserById);
router.route('/users',adminJwtVerify).get(getAllUsers);
router.route('/users/:id/role',adminJwtVerify).put(updateUserRole);
router.route('/users/:id',adminJwtVerify).delete(deleteUser);
router.route("/sellers",adminJwtVerify).get( allSellers);

router.route('/seller-requests', adminJwtVerify).get(listSellerRequests);
router.route('/seller-requests/:id/approve', adminJwtVerify).post(approveSellerRequest);
router.route('/seller-requests/:id/reject', adminJwtVerify).post(rejectSellerRequest);


router.route('/analytics/summary', adminJwtVerify).get(analyticsSummary);
router.route('/analytics/revenue-monthly', adminJwtVerify).get(revenueMonthly);
router.route('/analytics/top-products', adminJwtVerify).get(topProducts);

// Admin-only product status toggle (allows admin to change isActive / isFeatured)
router.route('/products/:id/status', adminJwtVerify).patch(toggleProductStatus);

export default router;