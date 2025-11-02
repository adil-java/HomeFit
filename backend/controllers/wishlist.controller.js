import asyncHandler from 'express-async-handler';
import WishlistService from '../services/wishlist.service.js';

export const getWishlist = asyncHandler(async (req, res) => {
  try {
    const wishlist = await WishlistService.getWishlist(req.user.id);
    res.json(wishlist || { items: [] });
  } catch (error) {
    res.status(500);
    throw new Error('Error fetching wishlist');
  }
});

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
