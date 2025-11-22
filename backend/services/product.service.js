import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Generate a unique SKU
const generateUniqueSKU = async (name) => {
  const prefix = name
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  
  const random = Math.floor(1000 + Math.random() * 9000);
  const sku = `${prefix}${random}`;
  
  // Check if SKU already exists
  const existingProduct = await prisma.product.findUnique({
    where: { sku },
    select: { id: true }
  });
  
  // If SKU exists, generate a new one
  return existingProduct ? generateUniqueSKU(name + 'X') : sku;
};

// Generate a unique barcode (EAN-13 format)
const generateUniqueBarcode = async () => {
  // Generate a 12-digit number
  const random12 = Math.floor(100000000000 + Math.random() * 900000000000);
  
  // Calculate check digit (EAN-13 algorithm)
  const digits = random12.toString().split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  const barcode = `${random12}${checkDigit}`;
  
  // Check if barcode already exists
  const existingProduct = await prisma.product.findFirst({
    where: { barcode },
    select: { id: true }
  });
  
  // If barcode exists, generate a new one
  return existingProduct ? generateUniqueBarcode() : barcode;
};


const generateSlug = (name) => {
  return slugify(name, { lower: true, strict: true });
};


export const getProducts = async (queryParams) => {
  const {
    page = 1,
    limit = 50,
    sort = 'createdAt',
    order = 'desc',
    category,
    minPrice,
    maxPrice,
    inStock,
    featured,
  } = queryParams;

  const skip = (page - 1) * limit;
  const orderBy = { [sort]: order };

  const where = {};
  
  if (category) {
    where.categories = {
      some: {
        id: category
      }
    };
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }

  if (inStock !== undefined) {
    where.inStock = inStock === 'true';
  }

  if (featured !== undefined) {
    where.isFeatured = featured === 'true';
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        categories: true,
        variants: true,
        reviews: true,
      },
      orderBy,
      skip,
      take: parseInt(limit),
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: products,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    },
  };
};


export const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      categories: true,
      variants: true,
      reviews: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    return {
      success: false,
      error: 'Product not found',
    };
  }

  return {
    success: true,
    data: product,
  };
};

export const getProductBySlug = async (slug) => {
  const product = await prisma.product.findFirst({
    where: { slug },
    include: {
      categories: true,
      variants: true,
      reviews: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    return {
      success: false,
      error: 'Product not found',
    };
  }

  return {
    success: true,
    data: product,
  };
};

export const getFeaturedProducts = async (limit = 4) => {
  const products = await prisma.product.findMany({
    where: { isFeatured: true },
    take: parseInt(limit),
    include: {
      categories: true,
    },
  });

  return {
    success: true,
    data: products,
  };
};

export const searchProducts = async (query, limit = 20) => {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: parseInt(limit),
    include: {
      categories: true,
    },
  });

  return {
    success: true,
    data: products,
  };
};

export const createProduct = async (productData, userId, files = []) => {
  try {
    console.log('Starting product creation...');
    console.log('Product data received:', JSON.stringify(productData, null, 2));
    console.log('User ID:', userId);
    console.log('Files received:', files?.length || 0);

    const {
      name,
      description,
      price,
      comparePrice,
      cost,
      sku,
      barcode,
      quantity,
      isActive = true,
      isFeatured = false,
      categoryIds = [],
      variants = [],
      generate3D = false,
    } = productData;

    console.log('Extracted fields:');
    console.log(' - Name:', name);
    console.log(' - Description:', description);
    console.log(' - Price:', price);
    console.log(' - Category IDs:', categoryIds);
    console.log(' - Variants:', variants?.length || 0);
    console.log(' - Generate 3D:', generate3D);

    if (!name || typeof name !== 'string') {
      throw new Error(`Product name validation failed: ${name} (type: ${typeof name})`);
    }

    const slug = generateSlug(name);
    console.log('Generated slug:', slug);

    let arModelUrl = null;
    let objModelUrl = null;
    if (generate3D && files.length > 0) {
      console.log('Starting 3D model generation (before image upload)...');
      try {
        const { generate3DModel } = await import('./3dModel.service.js');
        const modelResult = await generate3DModel(files[0].path);

        arModelUrl = modelResult.glbUrl;
        objModelUrl = modelResult.objUrl;
        console.log('3D models generated and uploaded to Cloudinary');
        console.log('GLB Model URL:', arModelUrl);
        console.log('OBJ Model URL:', objModelUrl);
      } catch (error) {
        console.error('3D model generation failed:', error);

      }
    }


    console.log('Starting image uploads...');
    const imageUploads = files.map(file =>
      uploadToCloudinary(file.path, 'ecommerce/products')
    );

    const uploadedImages = await Promise.all(imageUploads);
    console.log('Images uploaded:', uploadedImages.length);

    console.log('Looking up user in database...');
    const user = await prisma.user.findUnique({
      where: { firebaseUid: userId }
    });

    if (!user) {
      throw new Error(`User not found with Firebase UID: ${userId}`);
    }

    console.log('User found:', user.id);

    console.log('Processing categories...');
    const validCategoryIds = [];
    if (categoryIds && categoryIds.length > 0) {
      // Verify that the categories exist
      const existingCategories = await prisma.category.findMany({
        where: {
          id: { in: categoryIds }
        }
      });
      
      validCategoryIds.push(...existingCategories.map(cat => cat.id));
      console.log(`Found ${validCategoryIds.length} valid categories out of ${categoryIds.length} provided`);
    }

    console.log('Building product data object...');
    // Generate unique SKU and barcode
    const [generatedSKU, generatedBarcode] = await Promise.all([
      sku || generateUniqueSKU(name),
      barcode || generateUniqueBarcode()
    ]);

    const productDataObj = {
      name,
      slug,
      description,
      price: parseFloat(price),
      comparePrice: comparePrice ? parseFloat(comparePrice) : null,
      cost: cost ? parseFloat(cost) : null,
      sku: generatedSKU,
      barcode: generatedBarcode,
      quantity: parseInt(quantity),
      isActive,
      isFeatured,
      images: uploadedImages.map(img => img.url),
      ARModelUrl: arModelUrl,
      objModelUrl: objModelUrl,
      sellerId: user.id,
    };

    console.log('Final product data:', JSON.stringify(productDataObj, null, 2));

    if (validCategoryIds.length > 0) {
      productDataObj.categories = {
        connect: validCategoryIds.map((id) => ({ id })),
      };
      console.log('Adding categories to product');
    }

    if (variants && variants.length > 0) {
      // Group variants by name to create variant types with options
      const variantGroups = variants.reduce((acc, variant) => {
        if (!acc[variant.name]) {
          acc[variant.name] = {
            name: variant.name,
            options: new Set()
          };
        }
        // For colors, we're now storing the color name instead of hex
        acc[variant.name].options.add(variant.name === 'Color' ? variant.value : variant.value);
        return acc;
      }, {});

      productDataObj.variants = {
        create: Object.values(variantGroups).map(group => ({
          name: group.name,
          options: Array.from(group.options)
        }))
      };
      console.log('Adding variants to product:', JSON.stringify(productDataObj.variants, null, 2));
    }

    console.log('Creating product in database...');
    const product = await prisma.product.create({
      data: productDataObj,
      include: {
        ...(validCategoryIds.length > 0 && { categories: true }),
        ...(variants && variants.length > 0 && { variants: true }),
      },
    });

    console.log('Product created successfully:', product.id);
    return {
      success: true,
      data: product,
    };
  } catch (error) {
    console.error('Error creating product:', error);
    console.error('Error stack:', error.stack);
    return {
      success: false,
      error: `Failed to create product: ${error.message}`,
    };
  }
};

export const deleteProductService = async (id, sellerId) => {
  try {
    // First, verify the product exists and belongs to the seller
    // First get the product with just the ID to verify ownership
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        sellerId: true,
        images: true  // images is a JSON field, not a relation
      },
    });

    if (!product) {
      return {
        success: false,
        error: 'Product not found.',
      };
    }

    if (product.sellerId !== sellerId) {
      return {
        success: false,
        error: 'Unauthorized action.',
      };
    }

    // Delete related records in a transaction to ensure data consistency
    await prisma.$transaction([
      // Delete variants
      prisma.variant.deleteMany({
        where: { productId: id },
      }),
      
      // Remove from categories (many-to-many relation)
      prisma.product.update({
        where: { id },
        data: {
          categories: {
            set: []  // This removes all category relations
          }
        }
      }),
      
      // Remove from wishlists
      prisma.wishlistItem.deleteMany({
        where: { productId: id },
      }),
      
      // Remove from cart items
      prisma.cartItem.deleteMany({
        where: { productId: id },
      }),
      
      // Delete order items (important: must delete before product)
      prisma.orderItem.deleteMany({
        where: { productId: id },
      }),
      
      // Delete reviews
      prisma.review.deleteMany({
        where: { productId: id },
      }),
      
      // Delete the product
      prisma.product.delete({
        where: { id },
      })
    ]);

    // Delete images from cloud storage if they exist
    if (product.images) {
      try {
        const images = typeof product.images === 'string' 
          ? JSON.parse(product.images) 
          : Array.isArray(product.images) 
            ? product.images 
            : [];
            
        await Promise.all(
          images.map(img => 
            img?.public_id && deleteFromCloudinary(img.public_id).catch(e => 
              console.error('Error deleting image from cloud:', e)
            )
          )
        );
      } catch (error) {
        console.error('Error cleaning up product images:', error);
        // Don't fail the entire operation if image deletion fails
      }
    }

    return { success: true, message: 'Product and all related data deleted successfully' };
  } catch (error) {
    console.error('Error deleting product:', error);
    return {
      success: false,
      error: `Failed to delete product: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    };
  }
};

export const updateProduct = async (id, productData, files = []) => {
  const {
    name,
    description,
    price,
    comparePrice,
    cost,
    sku,
    barcode,
    quantity,
    isActive,
    isFeatured,
    images,
    categoryIds,
    variants,
  } = productData;

  const updateData = { ...productData };

  if (files && files.length > 0) {
    const imageUploads = files.map(file =>
      uploadToCloudinary(file.path, 'ecommerce/products')
    );
    const uploadedImages = await Promise.all(imageUploads);
    updateData.images = uploadedImages.map(img => img.url);
  }

  delete updateData.id;
  delete updateData.slug;
  delete updateData.createdAt;
  delete updateData.updatedAt;

  if (name) {
    updateData.slug = generateSlug(name);
  }

  if (price) updateData.price = parseFloat(price);
  if (comparePrice) updateData.comparePrice = parseFloat(comparePrice);
  if (cost) updateData.cost = parseFloat(cost);
  if (quantity) updateData.quantity = parseInt(quantity);

  try {

    const [updatedProduct] = await prisma.$transaction([

      prisma.product.update({
        where: { id },
        data: {
          ...updateData,
          ...(categoryIds && {
            categories: {
              set: categoryIds.map((id) => ({ id })),
            },
          }),
        },
        include: {
          categories: true,
          variants: true,
        },
      }),
      ...(variants
        ? [
            prisma.variant.deleteMany({
              where: { productId: id },
            }),
          ]
        : []),
    ]);

    if (variants && variants.length > 0) {
      await prisma.variant.createMany({
        data: variants.map((variant) => ({
          ...variant,
          productId: id,
        })),
      });

      const productWithVariants = await prisma.product.findUnique({
        where: { id },
        include: {
          categories: true,
          variants: true,
        },
      });

      return {
        success: true,
        data: productWithVariants,
      };
    }

    return {
      success: true,
      data: updatedProduct,
    };
  } catch (error) {
    console.error('Error updating product:', error);
    return {
      success: false,
      error: 'Failed to update product',
    };
  }
};

export const getProductsByCategory = async (categoryId, queryParams) => {
  const { page = 1, limit = 10 } = queryParams;
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        categories: {
          some: {
            id: categoryId
          }
        },
        isActive: true,
      },
      include: {
        categories: true,
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.product.count({
      where: {
        categories: {
          some: {
            id: categoryId
          }
        },
        isActive: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: products,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    },
  };
};

export const getProductsBySeller = async (sellerId, queryParams) => {
  const { page = 1, limit = 10 } = queryParams;
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { sellerId },
      include: {
        categories: true,
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.product.count({ where: { sellerId } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: products,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    },
  };
};

export const getRelatedProducts = async (productId, limit = 4) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { categories: true },
  });

  if (!product || !product.categories.length) {
    return {
      success: false,
      error: 'Product not found or has no categories',
    };
  }

  const categoryIds = product.categories.map(cat => cat.id);

  const relatedProducts = await prisma.product.findMany({
    where: {
      id: { not: productId },
      categories: {
        some: {
          id: { in: categoryIds }
        }
      },
      isActive: true,
    },
    include: {
      categories: true,
      variants: true,
    },
    take: parseInt(limit),
    orderBy: { createdAt: 'desc' },
  });

  return {
    success: true,
    data: relatedProducts,
  };
};

export const toggleProductStatus = async (id, field, value) => {
  try {
    const updateData = { [field]: value };

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        categories: true,
        variants: true,
      },
    });

    return {
      success: true,
      data: product,
    };
  } catch (error) {
    console.error('Error toggling product status:', error);
    return {
      success: false,
      error: 'Failed to update product status',
    };
  }
};

export const getProductStats = async (sellerId = null) => {
  try {
    const where = sellerId ? { sellerId } : {};

    const [
      totalProducts,
      activeProducts,
      featuredProducts,
      outOfStock,
      recentProducts,
    ] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.count({ where: { ...where, isActive: true } }),
      prisma.product.count({ where: { ...where, isFeatured: true } }),
      prisma.product.count({ where: { ...where, quantity: { lte: 0 } } }),
      prisma.product.findMany({
        where: { ...where, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { categories: true },
      }),
    ]);

    return {
      success: true,
      data: {
        totalProducts,
        activeProducts,
        featuredProducts,
        outOfStock,
        recentProducts,
        status: {
          active: activeProducts,
          inactive: totalProducts - activeProducts,
          featured: featuredProducts,
          outOfStock,
        },
      },
    };
  } catch (error) {
    console.error('Error getting product stats:', error);
    return {
      success: false,
      error: 'Failed to get product statistics',
    };
  }
};

