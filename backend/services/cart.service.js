import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CartService = {
  /**
   * Get user's cart with items
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User's cart with items
   */
  async getCart(userId) {
    return await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
  },

  /**
   * Add item to cart
   * @param {string} userId - User ID
   * @param {Object} itemData - Cart item data
   * @returns {Promise<Object>} Updated cart
   */
  async addItemToCart(userId, itemData) {
    const { productId, quantity = 1, options = null } = itemData;
    
    // Get or create cart for user
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
          items: {
            create: []
          }
        },
        include: { items: true }
      });
    }

    // Check if product already in cart
    const existingItem = cart.items.find(item => item.productId === productId);

    if (existingItem) {
      // Update quantity if item already in cart
      return await this.updateCartItem(userId, existingItem.id, { 
        quantity: existingItem.quantity + quantity 
      });
    }

    // Get product price
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Add new item to cart
    return await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: {
          create: {
            productId,
            quantity,
            price: product.price,
            options
          }
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
  },

  /**
   * Update cart item quantity
   * @param {string} userId - User ID
   * @param {string} itemId - Cart item ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated cart
   */
  async updateCartItem(userId, itemId, updateData) {
    const { quantity } = updateData;
    
    // Find cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true
      }
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    // Verify cart belongs to user
    if (cartItem.cart.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // If quantity is 0 or less, remove the item
    if (quantity <= 0) {
      return await this.removeItemFromCart(userId, itemId);
    }

    // Update item quantity
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity }
    });

    // Return updated cart
    return await this.getCart(userId);
  },

  /**
   * Remove item from cart
   * @param {string} userId - User ID
   * @param {string} itemId - Cart item ID
   * @returns {Promise<Object>} Updated cart
   */
  async removeItemFromCart(userId, itemId) {
    // Find cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true
      }
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    // Verify cart belongs to user
    if (cartItem.cart.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Delete cart item
    await prisma.cartItem.delete({
      where: { id: itemId }
    });

    // Return updated cart
    return await this.getCart(userId);
  },

  /**
   * Clear user's cart
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Empty cart
   */
  async clearCart(userId) {
    const cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    // Delete all cart items
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    return await this.getCart(userId);
  }
};

export default CartService;
