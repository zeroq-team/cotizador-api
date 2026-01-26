import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, and, asc, isNull } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  carts,
  cartItems,
  customers,
  deliveryAddresses,
  type Cart,
  type NewCart,
  type CartItem,
  type CartItemRecord,
  type NewCartItem,
  type Customer,
} from '../database/schemas';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CartRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly productsService: ProductsService,
  ) {}

  async findAll(): Promise<Cart[]> {
    return await this.databaseService.db
      .select()
      .from(carts)
      .orderBy(desc(carts.updatedAt));
  }

  async findAllWithItems(): Promise<(Cart & { items: CartItemRecord[] })[]> {
    const result = await this.databaseService.db
      .select()
      .from(carts)
      .leftJoin(cartItems, eq(cartItems.cartId, carts.id))
      .orderBy(desc(carts.updatedAt));

    // Group items by cart
    const cartMap = new Map<string, Cart & { items: CartItemRecord[] }>();

    for (const row of result) {
      const cart = row.carts;
      if (!cartMap.has(cart.id)) {
        cartMap.set(cart.id, { ...cart, items: [] });
      }

      if (row.cart_items) {
        cartMap.get(cart.id)!.items.push(row.cart_items);
      }
    }

    return Array.from(cartMap.values());
  }

  async findById(id: string): Promise<Cart | null> {
    const result = await this.databaseService.db
      .select()
      .from(carts)
      .where(eq(carts.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findByIdWithItems(
    id: string,
  ): Promise<(Cart & { items: CartItemRecord[] }) | null> {
    const result = await this.databaseService.db
      .select()
      .from(carts)
      .leftJoin(cartItems, eq(cartItems.cartId, carts.id))
      .orderBy(asc(cartItems.createdAt))
      .where(eq(carts.id, id));

    if (result.length === 0) {
      return null;
    }

    const cart = result[0].carts;
    const items = result
      .filter((row) => row.cart_items)
      .map((row) => row.cart_items!);

    return { ...cart, items };
  }

  async findByConversationId(conversationId: string): Promise<Cart | null> {
    const result = await this.databaseService.db
      .select()
      .from(carts)
      .where(eq(carts.conversationId, conversationId))
      .limit(1);

    return result[0] || null;
  }

  async findByConversationIdWithItems(
    conversationId: string,
  ): Promise<(Cart & { items: CartItemRecord[] }) | null> {
    const result = await this.databaseService.db
      .select()
      .from(carts)
      .leftJoin(cartItems, eq(cartItems.cartId, carts.id))
      .where(eq(carts.conversationId, conversationId));

    if (result.length === 0) {
      return null;
    }

    const cart = result[0].carts;
    const items = result
      .filter((row) => row.cart_items)
      .map((row) => row.cart_items!);

    return { ...cart, items };
  }

  async findFirst(): Promise<Cart | null> {
    const result = await this.databaseService.db.select().from(carts).limit(1);

    return result[0] || null;
  }

  async findFirstWithItems(): Promise<
    (Cart & { items: CartItemRecord[] }) | null
  > {
    const result = await this.databaseService.db
      .select()
      .from(carts)
      .leftJoin(cartItems, eq(cartItems.cartId, carts.id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const cart = result[0].carts;
    const items = result
      .filter((row) => row.cart_items)
      .map((row) => row.cart_items!);

    return { ...cart, items };
  }

  async create(newCart: NewCart): Promise<Cart> {
    const result = await this.databaseService.db
      .insert(carts)
      .values(newCart)
      .returning();

    return result[0];
  }

  async update(id: string, updateData: Partial<Cart>): Promise<Cart | null> {
    const result = await this.databaseService.db
      .update(carts)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(carts.id, id))
      .returning();

    return result[0] || null;
  }

  async updateFirst(updateData: Partial<Cart>): Promise<Cart | null> {
    // Get the first cart
    const firstCart = await this.findFirst();
    if (!firstCart) {
      return null;
    }

    return await this.update(firstCart.id, updateData);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.databaseService.db
      .delete(carts)
      .where(eq(carts.id, id))
      .returning();

    return result.length > 0;
  }

  async deleteByConversationId(conversationId: string): Promise<Cart | null> {
    // First find the cart to return it
    const cart = await this.findByConversationId(conversationId);
    if (!cart) {
      return null;
    }

    // Delete cart items first
    await this.deleteCartItemsByCartId(cart.id);

    // Then delete the cart
    const result = await this.databaseService.db
      .delete(carts)
      .where(eq(carts.conversationId, conversationId))
      .returning();

    return result[0] || null;
  }

  async clearFirst(): Promise<Cart | null> {
    // First, delete all cart items
    await this.databaseService.db
      .delete(cartItems)
      .where(eq(cartItems.cartId, (await this.findFirst())?.id || ''));

    // Then update cart totals
    return await this.updateFirst({
      totalItems: 0,
      totalPrice: '0',
    });
  }

  // Cart Items methods
  async createCartItem(newCartItem: NewCartItem): Promise<CartItemRecord> {
    const result = await this.databaseService.db
      .insert(cartItems)
      .values(newCartItem)
      .returning();

    return result[0];
  }

  async addCartItemByProductId({
    cartId,
    productId,
    quantity,
    cartItem,
    organizationId,
  }: {
    cartId: string;
    productId: number;
    quantity: number;
    cartItem: NewCartItem;
    organizationId: string;
  }): Promise<CartItemRecord> {
    const productItem = await this.findCartItemByProductId(cartId, productId);

    if (!productItem) {
      return await this.createCartItem(cartItem);
    }

    return await this.updateCartItem(productItem.id, {
      quantity: productItem.quantity + quantity,
    });
  }

  async emptyCartItemsByCartId(cartId: string): Promise<boolean> {
    const result = await this.databaseService.db
      .delete(cartItems)
      .where(eq(cartItems.cartId, cartId))
      .returning();

    return result.length > 0;
  }

  async findCartItemById(itemId: string): Promise<CartItemRecord | null> {
    const result = await this.databaseService.db
      .select()
      .from(cartItems)
      .where(eq(cartItems.id, itemId))
      .limit(1);

    return result[0] || null;
  }

  async findCartItemByProductId(
    cartId: string,
    productId: number,
  ): Promise<CartItemRecord | null> {
    const result = await this.databaseService.db
      .select()
      .from(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)),
      )
      .limit(1);

    return result[0] || null;
  }

  async updateCartItem(
    itemId: string,
    updateData: Partial<CartItemRecord>,
  ): Promise<CartItemRecord | null> {
    const result = await this.databaseService.db
      .update(cartItems)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, itemId))
      .returning();

    return result[0] || null;
  }

  async deleteCartItem(itemId: string): Promise<boolean> {
    const result = await this.databaseService.db
      .delete(cartItems)
      .where(eq(cartItems.id, itemId))
      .returning();

    return result.length > 0;
  }

  async deleteCartItemsByCartId(cartId: string): Promise<boolean> {
    const result = await this.databaseService.db
      .delete(cartItems)
      .where(eq(cartItems.cartId, cartId))
      .returning();

    return result.length > 0;
  }

  async removeCartItemByProductId({
    cartId,
    productId,
    quantity,
  }: {
    cartId: string;
    productId: number;
    quantity: number;
  }): Promise<boolean> {
    // find product item by productId and cartId
    const productItem = await this.findCartItemByProductId(cartId, productId);
    if (!productItem) {
      throw new NotFoundException(`Product item with productId ${productId} not found in cart ${cartId}`);
    }

    // reduce quantity
    if (productItem.quantity - quantity <= 0) {
      return await this.deleteCartItem(productItem.id);
    }

    await this.updateCartItem(productItem.id, {
      quantity: productItem.quantity - quantity,
    });

    return true;
  }

  // Helper methods for cart calculations
  calculateTotals(items: CartItem[] | CartItemRecord[]): {
    totalItems: number;
    totalPrice: string;
  } {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce(
      (sum, item) => sum + parseFloat(item.price.toString()) * item.quantity,
      0,
    );

    return {
      totalItems,
      totalPrice: totalPrice.toString(),
    };
  }

  async calculateCartTotals(
    cartId: string,
  ): Promise<{ totalItems: number; totalPrice: string }> {
    const items = await this.databaseService.db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId));

    return this.calculateTotals(items);
  }
}
