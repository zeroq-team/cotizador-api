import { pgTable, uuid, varchar, timestamp, text, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { carts } from './carts'

// Cart Suggestions Table - Registra las sugerencias de productos para el carrito
// Las sugerencias están amarradas a una interacción del flujo (interactionId)
export const cartSuggestions = pgTable('cart_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').notNull(),
  interactionId: varchar('interaction_id', { length: 255 }), // ID de la interacción del flujo que generó las sugerencias
  productId: varchar('product_id', { length: 255 }).notNull(),
  productName: text('product_name').notNull(),
  sku: varchar('sku', { length: 100 }),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  cartIdIdx: index('idx_cart_suggestions_cart_id').on(table.cartId),
  interactionIdIdx: index('idx_cart_suggestions_interaction_id').on(table.interactionId),
  cartIdInteractionIdIdx: index('idx_cart_suggestions_cart_interaction').on(table.cartId, table.interactionId),
}))

// Define relations
export const cartSuggestionsRelations = relations(cartSuggestions, ({ one }) => ({
  cart: one(carts, {
    fields: [cartSuggestions.cartId],
    references: [carts.id],
  }),
}))

// Zod schemas for validation
export const insertCartSuggestionsSchema = createInsertSchema(cartSuggestions)
export const selectCartSuggestionsSchema = createSelectSchema(cartSuggestions)

// Type exports
export type CartSuggestion = typeof cartSuggestions.$inferSelect
export type NewCartSuggestion = typeof cartSuggestions.$inferInsert

