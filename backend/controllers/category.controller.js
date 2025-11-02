import asyncHandler from 'express-async-handler';
import CategoryService from '../services/category.service.js';


export const getCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await CategoryService.getAllCategories();
    res.json(categories);
  } catch (error) {
    res.status(500);
    throw new Error('Error fetching categories');
  }
});

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
