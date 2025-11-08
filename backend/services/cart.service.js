import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CartService = {
  async getCart(userId) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      return { items: [], total: 0 };
    }

    const total = cart.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    return { ...cart, total };
  },

  async addItemToCart(userId, itemData) {
    const { productId, quantity = 1 } = itemData;
    const rawOptions = itemData.options || null;
    const normalizedOptions = rawOptions && typeof rawOptions === 'object'
      ? Object.fromEntries(
          Object.entries(rawOptions).map(([k, v]) => [String(k).toLowerCase(), v])
        )
      : null;

    const productexist = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!productexist) {
      throw new Error("Product not found");
    }

    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: productId,
        // Only merge when options match exactly (including null)
        options: normalizedOptions === null ? { equals: null } : { equals: normalizedOptions },
      },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          price: productexist.price,
          options: normalizedOptions,
        },
      });
    }

    return await this.getCart(userId);
  },

  async updateCartItem(userId, itemId, updateData) {
    const { quantity } = updateData;

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId: userId,
        },
      },
    });

    if (!cartItem) {
      throw new Error("Cart item not found or unauthorized");
    }

    if (quantity <= 0) {
      return await this.removeItemFromCart(userId, itemId);
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return await this.getCart(userId);
  },

  async removeItemFromCart(userId, itemId) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    const deleted = await prisma.cartItem.deleteMany({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (deleted.count === 0) {
      throw new Error("Cart item not found");
    }

    return await this.getCart(userId);
  },

  async clearCart(userId) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return await this.getCart(userId);
  },
};
export default CartService;
