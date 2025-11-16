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
  topProducts,
  adminDeleteProduct,
  salesBySeller,
  adminListAllOrders,
  adminUpdateOrderStatus
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
router.route('/analytics/sales-by-seller', adminJwtVerify).get(salesBySeller);

// Admin order management
router.route('/orders', adminJwtVerify).get(adminListAllOrders);
router.route('/orders/:id/status', adminJwtVerify).put(adminUpdateOrderStatus);

// Admin-only product status toggle (allows admin to change isActive / isFeatured)
router.route('/products/:id/status', adminJwtVerify).patch(toggleProductStatus);

// Admin-only product delete (can delete any product)
router.route('/products/:id', adminJwtVerify).delete(adminDeleteProduct);

export default router;