import { Injectable } from '@nestjs/common'
import { eq, desc, and } from 'drizzle-orm'
import { DatabaseService } from '../database/database.service'
import { cartSuggestions, NewCartSuggestion, CartSuggestion } from '../database/schemas'

@Injectable()
export class CartSuggestionsRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Crea una nueva sugerencia
   */
  async create(data: NewCartSuggestion): Promise<CartSuggestion> {
    const [suggestion] = await this.db.db.insert(cartSuggestions).values(data).returning()
    return suggestion
  }

  /**
   * Crea múltiples sugerencias en una sola transacción
   */
  async createMany(data: NewCartSuggestion[]): Promise<CartSuggestion[]> {
    if (data.length === 0) return []
    return await this.db.db.insert(cartSuggestions).values(data).returning()
  }

  /**
   * Obtiene todas las sugerencias de un carrito específico
   */
  async findByCartId(cartId: string): Promise<CartSuggestion[]> {
    return await this.db.db
      .select()
      .from(cartSuggestions)
      .where(eq(cartSuggestions.cartId, cartId))
      .orderBy(desc(cartSuggestions.createdAt))
  }

  /**
   * Obtiene las últimas N sugerencias de un carrito
   */
  async findLatestByCartId(cartId: string, limit: number = 10): Promise<CartSuggestion[]> {
    return await this.db.db
      .select()
      .from(cartSuggestions)
      .where(eq(cartSuggestions.cartId, cartId))
      .orderBy(desc(cartSuggestions.createdAt))
      .limit(limit)
  }

  /**
   * Obtiene una sugerencia por ID
   */
  async findById(id: string): Promise<CartSuggestion | null> {
    const [suggestion] = await this.db.db
      .select()
      .from(cartSuggestions)
      .where(eq(cartSuggestions.id, id))
      .limit(1)
    return suggestion || null
  }

  /**
   * Obtiene sugerencias de un producto específico en un carrito
   */
  async findByCartIdAndProductId(
    cartId: string,
    productId: string
  ): Promise<CartSuggestion[]> {
    return await this.db.db
      .select()
      .from(cartSuggestions)
      .where(
        and(
          eq(cartSuggestions.cartId, cartId),
          eq(cartSuggestions.productId, productId)
        )
      )
      .orderBy(desc(cartSuggestions.createdAt))
  }

  /**
   * Obtiene todas las sugerencias de una interacción específica
   */
  async findByInteractionId(interactionId: string): Promise<CartSuggestion[]> {
    return await this.db.db
      .select()
      .from(cartSuggestions)
      .where(eq(cartSuggestions.interactionId, interactionId))
      .orderBy(desc(cartSuggestions.createdAt))
  }

  /**
   * Obtiene sugerencias de una interacción específica en un carrito
   */
  async findByCartIdAndInteractionId(
    cartId: string,
    interactionId: string
  ): Promise<CartSuggestion[]> {
    return await this.db.db
      .select()
      .from(cartSuggestions)
      .where(
        and(
          eq(cartSuggestions.cartId, cartId),
          eq(cartSuggestions.interactionId, interactionId)
        )
      )
      .orderBy(desc(cartSuggestions.createdAt))
  }

  /**
   * Elimina una sugerencia por ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db.db
      .delete(cartSuggestions)
      .where(eq(cartSuggestions.id, id))
      .returning()
    return result.length > 0
  }

  /**
   * Elimina todas las sugerencias de un carrito
   */
  async deleteByCartId(cartId: string): Promise<number> {
    const result = await this.db.db
      .delete(cartSuggestions)
      .where(eq(cartSuggestions.cartId, cartId))
      .returning()
    return result.length
  }

  /**
   * Elimina todas las sugerencias de una interacción específica
   */
  async deleteByInteractionId(interactionId: string): Promise<number> {
    const result = await this.db.db
      .delete(cartSuggestions)
      .where(eq(cartSuggestions.interactionId, interactionId))
      .returning()
    return result.length
  }

  /**
   * Elimina todas las sugerencias de una interacción específica en un carrito
   */
  async deleteByCartIdAndInteractionId(
    cartId: string,
    interactionId: string
  ): Promise<number> {
    const result = await this.db.db
      .delete(cartSuggestions)
      .where(
        and(
          eq(cartSuggestions.cartId, cartId),
          eq(cartSuggestions.interactionId, interactionId)
        )
      )
      .returning()
    return result.length
  }
}

