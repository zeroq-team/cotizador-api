import { pgTable, uuid, varchar, integer, timestamp, text, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { carts } from './carts'

// Cart Changelog Table - Registra todas las operaciones de items en el carrito
export const cartChangelog = pgTable('cart_changelog', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').notNull(),
  productId: varchar('product_id', { length: 255 }).notNull(),
  productName: text('product_name').notNull(),
  sku: varchar('sku', { length: 100 }),
  description: text('description'),
  operation: varchar('operation', { length: 10 }).notNull(), // 'add' or 'remove'
  quantity: integer('quantity').notNull(),
  price: varchar('price', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Define relations
export const cartChangelogRelations = relations(cartChangelog, ({ one }) => ({
  cart: one(carts, {
    fields: [cartChangelog.cartId],
    references: [carts.id],
  }),
}))

// Zod schemas for validation
export const insertCartChangelogSchema = createInsertSchema(cartChangelog)
export const selectCartChangelogSchema = createSelectSchema(cartChangelog)

// Type exports
export type CartChangelog = typeof cartChangelog.$inferSelect
export type NewCartChangelog = typeof cartChangelog.$inferInsert