import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

const prisma = new PrismaClient();

// Generate a slug from product name
const generateSlug = (name) => {
  return slugify(name, { lower: true, strict: true });
};

// Get all products with pagination and filters
export const getProducts = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
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

// Get a single product by ID
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

// Get a single product by slug
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

// Get featured products
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

// Search products by name or description
export const searchProducts = async (query, limit = 10) => {
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

// Create a new product
export const createProduct = async (productData, userId, files = []) => {
  try {
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
    } = productData;

    const slug = generateSlug(name);

    // Upload images to Cloudinary
    const imageUploads = files.map(file => 
      uploadToCloudinary(file.path, 'ecommerce/products')
    );

    const uploadedImages = await Promise.all(imageUploads);

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        cost: cost ? parseFloat(cost) : null,
        sku,
        barcode,
        quantity: parseInt(quantity),
        isActive,
        isFeatured,
        images: uploadedImages.map(img => img.url),
        categories: {
          connect: categoryIds.map((id) => ({ id })),
        },
        variants: {
          create: variants.map((variant) => ({
            name: variant.name,
            options: variant.options,
          })),
        },
      },
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
    console.error('Error creating product:', error);
    return {
      success: false,
      error: 'Failed to create product',
    };
  }
};

// Update a product
export const updateProduct = async (id, productData, files=[]) => {
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
    updateData.images = [
      ...(existingProduct.images || []),
      ...uploadedImages.map(img => img.url)
    ];
  }
  
  // Remove fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.slug;
  delete updateData.createdAt;
  delete updateData.updatedAt;

  // Generate new slug if name is being updated
  if (name) {
    updateData.slug = generateSlug(name);
  }

  // Convert string numbers to appropriate types
  if (price) updateData.price = parseFloat(price);
  if (comparePrice) updateData.comparePrice = parseFloat(comparePrice);
  if (cost) updateData.cost = parseFloat(cost);
  if (quantity) updateData.quantity = parseInt(quantity);

  try {
    // Start a transaction to handle related updates
    const [updatedProduct] = await prisma.$transaction([
      // Update the product
      prisma.product.update({
        where: { id },
        data: {
          ...updateData,
          // Handle categories if provided
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
      // Delete existing variants if new ones are provided
      ...(variants
        ? [
            prisma.variant.deleteMany({
              where: { productId: id },
            }),
          ]
        : []),
    ]);

    // Create new variants if provided
    if (variants && variants.length > 0) {
      await prisma.variant.createMany({
        data: variants.map((variant) => ({
          ...variant,
          productId: id,
        })),
      });

      // Fetch the product with updated variants
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

// Delete a product
export const deleteProduct = async (id) => {
  try {
    // First, check if the product exists
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return {
        success: false,
        error: 'Product not found',
      };
    }

     // Delete images from Cloudinary
     if (product.images && product.images.length > 0) {
      const deletePromises = product.images
        .filter(img => img.public_id) // Only if we stored public_id
        .map(img => deleteFromCloudinary(img.public_id));
      
      await Promise.all(deletePromises);
    }

    // Delete the product (Prisma's cascading deletes will handle related records)
    await prisma.product.delete({
      where: { id },
    });

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Error deleting product:', error);
    return {
      success: false,
      error: 'Failed to delete product',
    };
  }
};
