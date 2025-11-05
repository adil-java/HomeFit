import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WishlistService = {

    async getWishlist(userId) {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!wishlist) {
      return { items: [] };
    }

    return wishlist;
  },

  async addItemToWishlist(userId, productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const wishlist = await prisma.wishlist.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true }
    });

    const existingItem = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId: productId
      }
    });

    if (existingItem) {
      return await this.getWishlist(userId);
    }

    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId: productId
      }
    });

    return await this.getWishlist(userId);
  },

  async removeItemFromWishlist(userId, productId) {
    try {
      console.log(`[Wishlist] Removing item ${productId} from user ${userId}'s wishlist`);
      
      const wishlist = await prisma.wishlist.findUnique({
        where: { userId },
        select: { id: true, items: { where: { productId } } }
      });

      if (!wishlist) {
        console.log(`[Wishlist] Wishlist not found for user ${userId}`);
        throw new Error('Wishlist not found');
      }

      if (wishlist.items.length === 0) {
        console.log(`[Wishlist] Item ${productId} not found in user ${userId}'s wishlist`);
        throw new Error('Item not found in wishlist');
      }

      await prisma.wishlistItem.deleteMany({
        where: {
          wishlistId: wishlist.id,
          productId: productId
        }
      });

      console.log(`[Wishlist] Successfully removed item ${productId} from user ${userId}'s wishlist`);
      return await this.getWishlist(userId);
      
    } catch (error) {
      console.error(`[Wishlist] Error removing item ${productId} from wishlist:`, error);
      throw error; 
    }
  },

  async isInWishlist(userId, productId) {
    const item = await prisma.wishlistItem.findFirst({
      where: {
        wishlist: {
          userId: userId
        },
        productId: productId
      }
    });

    return !!item;
  },

  async clearWishlist(userId) {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!wishlist) {
      throw new Error('Wishlist not found');
    }

    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id }
    });

    return { success: true, message: 'Wishlist cleared' };
  }

};

export default WishlistService;
