import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WishlistService = {
  /**
   * Get user's wishlist with items
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User's wishlist with items
   */
  async getWishlist(userId) {
    return await prisma.wishlist.findUnique({
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
   * Add item to wishlist
   * @param {string} userId - User ID
   * @param {string} productId - Product ID to add
   * @returns {Promise<Object>} Updated wishlist
   */
  async addItemToWishlist(userId, productId) {
    // Get or create wishlist for user
    let wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: {
          userId,
          items: {
            create: []
          }
        },
        include: { items: true }
      });
    }

    // Check if product already in wishlist
    const existingItem = wishlist.items.find(item => item.productId === productId);

    if (existingItem) {
      return wishlist; // Item already in wishlist
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Add product to wishlist
    return await prisma.wishlist.update({
      where: { id: wishlist.id },
      data: {
        items: {
          create: {
            productId
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
   * Remove item from wishlist
   * @param {string} userId - User ID
   * @param {string} productId - Product ID to remove
   * @returns {Promise<Object>} Updated wishlist
   */
  async removeItemFromWishlist(userId, productId) {
    // Find wishlist
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!wishlist) {
      throw new Error('Wishlist not found');
    }

    // Find wishlist item
    const wishlistItem = wishlist.items.find(item => item.productId === productId);

    if (!wishlistItem) {
      throw new Error('Item not found in wishlist');
    }

    // Remove item from wishlist
    await prisma.wishlistItem.delete({
      where: { id: wishlistItem.id }
    });

    // Return updated wishlist
    return await this.getWishlist(userId);
  },

  /**
   * Check if product is in user's wishlist
   * @param {string} userId - User ID
   * @param {string} productId - Product ID to check
   * @returns {Promise<boolean>} True if product is in wishlist
   */
  async isInWishlist(userId, productId) {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          where: { productId }
        }
      }
    });

    return wishlist && wishlist.items.length > 0;
  }
};

export default WishlistService;
