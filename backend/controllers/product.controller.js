import {
  getProducts as getProductsService,
  getProductById as getProductByIdService,
  getProductBySlug as getProductBySlugService,
  getFeaturedProducts as getFeaturedProductsService,
  searchProducts as searchProductsService,
  createProduct as createProductService,
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
} from '../services/product.service.js';
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
}).array('images', 5); // 'images' is the field name, max 5 files

// Wrapper for async/await with multer
const uploadFiles = (req, res) => {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Error handler utility
const handleError = (res, error, statusCode = 500) => {
  console.error(error);
  res.status(statusCode).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    const result = await getProductsService(req.query);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getProductByIdService(id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get single product by slug
// @route   GET /api/products/slug/:slug
// @access  Public
export const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await getProductBySlugService(slug);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = async (req, res) => {
  try {
    const { limit } = req.query;
    const result = await getFeaturedProductsService(limit);
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
export const searchProducts = async (req, res) => {
  try {
    const { q, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }
    
    const result = await searchProductsService(q, limit);
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res) => {
  try {
    await uploadFiles(req, res)
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to perform this action',
      });
    }
    
    const result = await createProductService(req.body, userId, req.files);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res) => {
  try {
    await uploadFiles(req,res);
    const { id } = req.params;
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to perform this action',
      });
    }
    
    const result = await updateProductService(id, req.body, req.files);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to perform this action',
      });
    }
    
    const result = await deleteProductService(id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};