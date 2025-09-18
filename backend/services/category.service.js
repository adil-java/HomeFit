import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CategoryService = {
  /**
   * Get all categories
   * @returns {Promise<Array>} List of categories
   */
  async getAllCategories() {
    return await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
  },

  /**
   * Get category by ID with products
   * @param {string} id - Category ID
   * @returns {Promise<Object>} Category with products
   */
  async getCategoryById(id) {
    return await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            images: true
          }
        }
      }
    });
  },

  /**
   * Get category by slug with products
   * @param {string} slug - Category slug
   * @returns {Promise<Object>} Category with products
   */
  async getCategoryBySlug(slug) {
    return await prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          include: {
            images: true
          }
        }
      }
    });
  },

  /**
   * Create a new category
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} Created category
   */
  async createCategory(categoryData) {
    const { name, description, image, slug } = categoryData;
    
    // Check if category with same name or slug already exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { name },
          { slug }
        ]
      }
    });

    if (existingCategory) {
      throw new Error('Category with this name or slug already exists');
    }

    return await prisma.category.create({
      data: {
        name,
        description,
        image,
        slug
      }
    });
  },

  /**
   * Update a category
   * @param {string} id - Category ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated category
   */
  async updateCategory(id, updateData) {
    return await prisma.category.update({
      where: { id },
      data: updateData
    });
  },

  /**
   * Delete a category
   * @param {string} id - Category ID
   * @returns {Promise<Object>} Deleted category
   */
  async deleteCategory(id) {
    return await prisma.category.delete({
      where: { id }
    });
  }
};

export default CategoryService;
