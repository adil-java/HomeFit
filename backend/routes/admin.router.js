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
  adminUpdateOrderStatus,
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminGetOrder,
  adminRefundOrder,
  adminListPayouts,
  adminListProducts,
  adminGetProduct,
  revokeSeller,
} from '../controllers/admin.controller.js';
import { toggleProductStatus } from '../controllers/product.controller.js';
import { adminJwtVerify } from '../middlewares/authMiddleware.js';
// import {  checkAdmin } from '../middlewares/authMiddleware.js';
const router = express.Router();




router.route('/login').post(adminLogin);

// Every admin route below this line requires a valid admin JWT.
// (Note: router.route(path, middleware) ignores the middleware argument,
// so protection must be applied with router.use.)
router.use(adminJwtVerify);
router.route('/user/:id').get(getUserById);
router.route('/users').get(getAllUsers);
router.route('/users/:id/role').put(updateUserRole);
router.route('/users/:id').delete(deleteUser);
router.route("/sellers").get(allSellers);
router.route('/sellers/:id/revoke').post(revokeSeller);

router.route('/seller-requests').get(listSellerRequests);
router.route('/seller-requests/:id/approve').post(approveSellerRequest);
router.route('/seller-requests/:id/reject').post(rejectSellerRequest);


router.route('/analytics/summary').get(analyticsSummary);
router.route('/analytics/revenue-monthly').get(revenueMonthly);
router.route('/analytics/top-products').get(topProducts);
router.route('/analytics/sales-by-seller').get(salesBySeller);

// Admin order management
router.route('/orders').get(adminListAllOrders);
router.route('/orders/:id').get(adminGetOrder);
router.route('/orders/:id/status').put(adminUpdateOrderStatus);
router.route('/orders/:id/refund').post(adminRefundOrder);
router.route('/payouts').get(adminListPayouts);

// Admin-only product status toggle (allows admin to change isActive / isFeatured)
router.route('/products/:id/status').patch(toggleProductStatus);

router.route('/products').get(adminListProducts);

// Admin-only product delete (can delete any product)
router.route('/products/:id').get(adminGetProduct).delete(adminDeleteProduct);

// Admin category management
router.route('/categories').get(adminGetCategories);
router.route('/categories').post(adminCreateCategory);
router.route('/categories/:id').put(adminUpdateCategory);
router.route('/categories/:id').delete(adminDeleteCategory);

export default router;
