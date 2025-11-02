import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  getProducts,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  generate3DModelEndpoint,
  getProductsByCategory,
  getProductsBySeller,
  getRelatedProducts,
  toggleProductStatus,
  getProductStats,
} from '../controllers/product.controller.js';
import { protect, checkSeller } from '../middlewares/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
    }
  }
}).array('files', 5);

const uploadSingle = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
    }
  }
}).single('image');

const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.get('/slug/:slug', getProductBySlug);
router.get('/featured', getFeaturedProducts);
router.get('/search', searchProducts);


router.post('/generate-3d', uploadSingle, generate3DModelEndpoint);


router.post('/', upload, protect, checkSeller, createProduct);
router.put('/:id', upload, protect, checkSeller, updateProduct);
router.delete('/:id', protect, checkSeller, deleteProduct);

router.get('/category/:categoryId', getProductsByCategory);
router.get('/seller/:sellerId', getProductsBySeller);
router.get('/related/:productId', getRelatedProducts);
router.patch('/:id/status', protect, checkSeller, toggleProductStatus);
router.get('/admin/stats', protect, checkSeller, getProductStats);

export default router;