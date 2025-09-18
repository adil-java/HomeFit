import asyncHandler from 'express-async-handler';
import CategoryService from '../services/category.service.js';

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await CategoryService.getAllCategories();
    res.json(categories);
  } catch (error) {
    res.status(500);
    throw new Error('Error fetching categories');
  }
});

// @desc    Get single category with products
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = asyncHandler(async (req, res) => {
  try {
    const category = await CategoryService.getCategoryById(req.params.id);
    
    if (!category) {
      res.status(404);
      throw new Error('Category not found');
    }
    
    res.json(category);
  } catch (error) {
    res.status(404);
    throw new Error('Category not found');
  }
});

// @desc    Get category by slug with products
// @route   GET /api/categories/slug/:slug
// @access  Public
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  try {
    const category = await CategoryService.getCategoryBySlug(req.params.slug);
    
    if (!category) {
      res.status(404);
      throw new Error('Category not found');
    }
    
    res.json(category);
  } catch (error) {
    res.status(404);
    throw new Error('Category not found');
  }
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = asyncHandler(async (req, res) => {
  try {
    const { name, description, image, slug } = req.body;
    
    if (!name || !slug) {
      res.status(400);
      throw new Error('Please provide name and slug for the category');
    }
    
    const category = await CategoryService.createCategory({
      name,
      description,
      image,
      slug
    });
    
    res.status(201).json(category);
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Error creating category');
  }
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = asyncHandler(async (req, res) => {
  try {
    const { name, description, image, slug } = req.body;
    
    const category = await CategoryService.getCategoryById(req.params.id);
    
    if (!category) {
      res.status(404);
      throw new Error('Category not found');
    }
    
    const updatedCategory = await CategoryService.updateCategory(req.params.id, {
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      image: image || category.image,
      slug: slug || category.slug
    });
    
    res.json(updatedCategory);
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Error updating category');
  }
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = asyncHandler(async (req, res) => {
  try {
    const category = await CategoryService.getCategoryById(req.params.id);
    
    if (!category) {
      res.status(404);
      throw new Error('Category not found');
    }
    
    await CategoryService.deleteCategory(req.params.id);
    
    res.json({ message: 'Category removed successfully' });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Error deleting category');
  }
});
