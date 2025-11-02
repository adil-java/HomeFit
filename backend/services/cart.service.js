import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CartService = {

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

  async addItemToCart(userId, itemData) {
    const { productId, quantity = 1, options = null } = itemData;
    

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

    const existingItem = cart.items.find(item => item.productId === productId);

    if (existingItem) {

      return await this.updateCartItem(userId, existingItem.id, { 
        quantity: existingItem.quantity + quantity 
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('Product not found');
    }

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

  async updateCartItem(userId, itemId, updateData) {
    const { quantity } = updateData;

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true
      }
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    if (cartItem.cart.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (quantity <= 0) {
      return await this.removeItemFromCart(userId, itemId);
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity }
    });

    return await this.getCart(userId);
  },

  
  async removeItemFromCart(userId, itemId) {
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true
      }
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }


    if (cartItem.cart.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.cartItem.delete({
      where: { id: itemId }
    });

    return await this.getCart(userId);
  },
  async clearCart(userId) {
    const cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });
    return await this.getCart(userId);
  }
};
export default CartService;
