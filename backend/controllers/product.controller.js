import {
  getProducts as getProductsService,
  getProductById as getProductByIdService,
  getProductBySlug as getProductBySlugService,
  getFeaturedProducts as getFeaturedProductsService,
  searchProducts as searchProductsService,
  createProduct as createProductService,
  updateProduct as updateProductService,
  deleteProductService,
  getProductsByCategory as getProductsByCategoryService,
  getProductsBySeller as getProductsBySellerService,
  getRelatedProducts as getRelatedProductsService,
  toggleProductStatus as toggleProductStatusService,
  getProductStats as getProductStatsService,
} from '../services/product.service.js';
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { generate3DModel } from '../services/3dModel.service.js';

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
}).array('files', 5); // Changed from 'images' to 'files' to match frontend

// Multer for 3D model generation (single image)
const uploadSingle = multer({
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
}).single('image'); // 'image' is the field name for 3D generation

// Wrapper for async/await with multer (for 3D generation)
const uploadSingleFile = (req, res) => {
  return new Promise((resolve, reject) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

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

// @desc    Generate 3D model from image
// @route   POST /api/products/generate-3d
// @access  Private
export const generate3DModelEndpoint = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
    }

    const { generate3DModel } = await import('../services/3dModel.service.js');
    const result = await generate3DModel(req.file.path);

    res.json({
      success: true,
      message: '3D model generated and uploaded to Cloudinary successfully!',
      model: result,
    });
  } catch (error) {
    console.error('3D model generation error:', error);
    handleError(res, error);
  }
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
    // Handle the nested data structure from frontend
    let productData = req.body;

    // If data is nested in productData field (from frontend), parse it
    if (req.body.productData && typeof req.body.productData === 'string') {
      try {
        productData = JSON.parse(req.body.productData);
        console.log('Parsed product data:', productData);
      } catch (error) {
        console.error('Error parsing productData JSON:', error);
        return res.status(400).json({
          success: false,
          error: 'Invalid product data format',
        });
      }
    }

    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to perform this action',
      });
    }

    const result = await createProductService(productData, userId, req.files);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create product',
    });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res) => {
  try {
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

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
export const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await getProductsByCategoryService(categoryId, { page, limit });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get products by seller
// @route   GET /api/products/seller/:sellerId
// @access  Public
export const getProductsBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await getProductsBySellerService(sellerId, { page, limit });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get related products
// @route   GET /api/products/related/:productId
// @access  Public
export const getRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 4 } = req.query;

    const result = await getRelatedProductsService(productId, limit);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Toggle product status (active/featured)
// @route   PATCH /api/products/:id/status
// @access  Private/Seller
export const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { field, value } = req.body; // field: 'isActive' or 'isFeatured', value: boolean

    if (!['isActive', 'isFeatured'].includes(field)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid field. Must be "isActive" or "isFeatured"',
      });
    }

    const result = await toggleProductStatusService(id, field, value);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get product statistics for admin dashboard
// @route   GET /api/products/admin/stats
// @access  Private/Seller
export const getProductStats = async (req, res) => {
  try {
    const sellerId = req.user?.role === 'ADMIN' ? null : req.user?.id; // Admin sees all, sellers see their own

    const result = await getProductStatsService(sellerId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteProductService(id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};
  