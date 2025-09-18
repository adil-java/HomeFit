import asyncHandler from 'express-async-handler';
import WishlistService from '../services/wishlist.service.js';

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = asyncHandler(async (req, res) => {
  try {
    const wishlist = await WishlistService.getWishlist(req.user.id);
    res.json(wishlist || { items: [] });
  } catch (error) {
    res.status(500);
    throw new Error('Error fetching wishlist');
  }
});

// @desc    Add item to wishlist
// @route   POST /api/wishlist/items
// @access  Private
export const addItemToWishlist = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      res.status(400);
      throw new Error('Product ID is required');
    }

    const wishlist = await WishlistService.addItemToWishlist(
      req.user.id,
      productId
    );

    res.status(201).json(wishlist);
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Error adding item to wishlist');
  }
});

// @desc    Remove item from wishlist
// @route   DELETE /api/wishlist/items/:productId
// @access  Private
export const removeItemFromWishlist = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      res.status(400);
      throw new Error('Product ID is required');
    }

    const wishlist = await WishlistService.removeItemFromWishlist(
      req.user.id,
      productId
    );

    res.json(wishlist);
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Error removing item from wishlist');
  }
});

// @desc    Check if product is in wishlist
// @route   GET /api/wishlist/items/:productId
// @access  Private
export const checkInWishlist = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      res.status(400);
      throw new Error('Product ID is required');
    }

    const isInWishlist = await WishlistService.isInWishlist(
      req.user.id,
      productId
    );

    res.json({ isInWishlist });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Error checking wishlist status');
  }
});
