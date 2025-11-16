import express from 'express';
import { 
  createOrder,
  initiatePayment,
  getOrder,
  listUserOrders,
  updateOrderStatus,
  listAllOrders,
  handleStripeWebhook,
  addOrderNote,
  getOrderNotes,
  listSellersOrders
} from '../controllers/order.controller.js';
import { protect, adminJwtVerify as admin } from '../middlewares/authMiddleware.js';
import { body, param, query, validationResult } from 'express-validator';

const router = express.Router();

// Input validation
const validateOrderCreate = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.productId')
    .isUUID()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('shippingAddress')
    .isObject()
    .withMessage('Shipping address is required'),
  body('shippingAddress.name')
    .isString()
    .notEmpty()
    .withMessage('Name is required'),
  body('shippingAddress.email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('shippingAddress.phone')
    .isString()
    .notEmpty()
    .withMessage('Phone is required'),
  body('shippingAddress.street')
    .isString()
    .notEmpty()
    .withMessage('Street address is required'),
  body('shippingAddress.city')
    .isString()
    .notEmpty()
    .withMessage('City is required'),
  body('shippingAddress.postalCode')
    .isString()
    .notEmpty()
    .withMessage('Postal code is required'),
  body('shippingAddress.country')
    .isString()
    .notEmpty()
    .withMessage('Country is required'),
  body('billingAddress')
    .optional()
    .isObject(),
  body('paymentMethod')
    .isString()
    .notEmpty()
    .withMessage('Payment method is required'),
  body('couponCode')
    .optional()
    .isString(),
  body('notes')
    .optional()
    .isString()
];

const validatePayment = [
  body('paymentMethod')
    .isString()
    .notEmpty()
    .withMessage('Payment method is required'),
  body('paymentMethodId')
    .optional()
    .isString()
];

const validateStatusUpdate = [
  body('status')
    .isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
    .withMessage('Invalid status'),
  body('notes')
    .optional()
    .isString()
];

const validateNote = [
  body('content')
    .isString()
    .notEmpty()
    .withMessage('Note content is required'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

// Customer routes
router.post(
  '/',
  protect,
  validateOrderCreate,
  createOrder
);

router.post(
  '/:id/payment',
  protect,
  [param('id').isUUID().withMessage('Invalid order ID')],
  validatePayment,
  initiatePayment
);

router.get(
  '/:id',
  protect,
  [param('id').isUUID().withMessage('Invalid order ID')],
  getOrder
);

router.get(
  '/',
  protect,
  [
    query('status')
      .optional()
      .isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .toInt(),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .toInt()
  ],
  listUserOrders
);

const cleanQueryParams = (req, res, next) => {
  Object.keys(req.query).forEach(key => {
    if (req.query[key] === '') {
      delete req.query[key];
    }
  });
  next();
};

router.get(
  '/seller/orders',
  protect,
  cleanQueryParams,
  [
    query('status')
      .if((value) => value !== '')
      .isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
      .withMessage('Invalid status value')
      .optional({ nullable: true }),
    query('limit')
      .if((value) => value !== '')
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt()
      .optional({ nullable: true }),
    query('page')
      .if((value) => value !== '')
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt()
      .optional({ nullable: true })
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    next();
  },
  listSellersOrders
);

// Order Notes
router.post(
  '/:id/notes',
  protect,
  [
    param('id').isUUID().withMessage('Invalid order ID'),
    ...validateNote
  ],
  addOrderNote
);

router.get(
  '/:id/notes',
  protect,
  [param('id').isUUID().withMessage('Invalid order ID')],
  getOrderNotes
);

// Webhook (no auth required)
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

export default router;