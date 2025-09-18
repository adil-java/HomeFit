import asyncHandler from 'express-async-handler';
import CartService from '../services/cart.service.js';

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
export const getCart = asyncHandler(async (req, res) => {
  try {
    const cart = await CartService.getCart(req.user.id);
    res.json(cart || { items: [] });
  } catch (error) {
    res.status(500);
    throw new Error('Error fetching cart');
  }
});

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
export const addItemToCart = asyncHandler(async (req, res) => {
  try {
    const { productId, quantity = 1, options = null } = req.body;
    
    if (!productId) {
      res.status(400);
      throw new Error('Product ID is required');
    }

    const cart = await CartService.addItemToCart(req.user.id, {
      productId,
      quantity: parseInt(quantity, 10),
      options
    });

    res.status(201).json(cart);
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Error adding item to cart');
  }
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:id
// @access  Private
export const updateCartItem = asyncHandler(async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (quantity === undefined || quantity === null) {
      res.status(400);
      throw new Error('Quantity is required');
    }

    const cart = await CartService.updateCartItem(
      req.user.id,
      req.params.id,
      { quantity: parseInt(quantity, 10) }
    );

    res.json(cart);
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Error updating cart item');
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:id
// @access  Private
export const removeItemFromCart = asyncHandler(async (req, res) => {
  try {
    const cart = await CartService.removeItemFromCart(
      req.user.id,
      req.params.id
    );
    res.json(cart);
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Error removing item from cart');
  }
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = asyncHandler(async (req, res) => {
  try {
    const cart = await CartService.clearCart(req.user.id);
    res.json(cart);
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Error clearing cart');
  }
});
