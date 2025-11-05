import asyncHandler from 'express-async-handler';
import WishlistService from '../services/wishlist.service.js';

export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await WishlistService.getWishlist(req.user.id);
  res.json(wishlist);
});

export const addItemToWishlist = asyncHandler(async (req, res) => {
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
});

export const removeItemFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  
  if (!productId) {
    return res.status(400).json({
      success: false,
      message: 'Product ID is required',
      code: 'MISSING_PRODUCT_ID'
    });
  }

  try {
    const wishlist = await WishlistService.removeItemFromWishlist(
      req.user.id,
      productId
    );
    
    res.json({
      success: true,
      data: wishlist,
      message: 'Item removed from wishlist'
    });
  } catch (error) {
    console.error('Error removing item from wishlist:', error);
    
    if (error.message === 'Item not found in wishlist') {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: 'ITEM_NOT_FOUND'
      });
    }
    
    if (error.message === 'Wishlist not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: 'WISHLIST_NOT_FOUND'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from wishlist',
      code: 'SERVER_ERROR'
    });
  }
});

export const checkInWishlist = asyncHandler(async (req, res) => {
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
});

