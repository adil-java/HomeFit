import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CategoryService = {

  async getAllCategories() {
    return await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
  },


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


  async createCategory(categoryData) {
    const { name, description, image, slug } = categoryData;

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


  async updateCategory(id, updateData) {
    return await prisma.category.update({
      where: { id },
      data: updateData
    });
  },

  async deleteCategory(id) {
    return await prisma.category.delete({
      where: { id }
    });
  }
};

export default CategoryService;
