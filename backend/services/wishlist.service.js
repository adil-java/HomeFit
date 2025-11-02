import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WishlistService = {

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

 
  async addItemToWishlist(userId, productId) {
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

    const existingItem = wishlist.items.find(item => item.productId === productId);

    if (existingItem) {
      return wishlist; 
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('Product not found');
    }

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

 
  async removeItemFromWishlist(userId, productId) {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!wishlist) {
      throw new Error('Wishlist not found');
    }

    const wishlistItem = wishlist.items.find(item => item.productId === productId);

    if (!wishlistItem) {
      throw new Error('Item not found in wishlist');
    }

    await prisma.wishlistItem.delete({
      where: { id: wishlistItem.id }
    });

    return await this.getWishlist(userId);
  },


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
