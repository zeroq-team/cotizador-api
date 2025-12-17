import { pgTable, uuid, integer, decimal, timestamp, text, varchar, jsonb, boolean, bigint } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { products } from './products'
import { organizations } from './organizations'

// Carts Table
export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: varchar('conversation_id', { length: 255 }).notNull(),
  organizationId: bigint('organization_id', { mode: 'number' })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  totalItems: integer('total_items').notNull().default(0),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  
  // Quote validity and status management
  validUntil: timestamp('valid_until'),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, active, expired, paid, cancelled
  
  // Price change tracking
  priceValidatedAt: timestamp('price_validated_at'),
  priceChangeApproved: boolean('price_change_approved').notNull().default(false),
  priceChangeApprovedAt: timestamp('price_change_approved_at'),
  originalTotalPrice: decimal('original_total_price', { precision: 10, scale: 2 }),
  
  // Customer information
  fullName: text('full_name'),
  documentType: varchar('document_type', { length: 50 }),
  documentNumber: varchar('document_number', { length: 100 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Cart Items Table (separate table for relational integrity)
export const cartItems = pgTable('cart_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id')
    .notNull()
    .references(() => carts.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number' })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sku: varchar('sku', { length: 100 }).notNull(),
  size: varchar('size', { length: 50 }),
  color: varchar('color', { length: 50 }),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  imageUrl: text('image_url'),
  customizationValues: jsonb('customization_values'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Define relations
export const cartsRelations = relations(carts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [carts.organizationId],
    references: [organizations.id],
  }),
  items: many(cartItems),
}))

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}))

// Cart Item interface (for backward compatibility and type safety)
export interface CartItem {
  id: string
  cartId: string
  productId: number
  name: string
  sku: string
  size?: string
  color?: string
  price: number
  quantity: number
  imageUrl?: string
  maxStock: number
  customizationValues?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  // metadata?: Record<string, any>
}

// Zod schemas for validation
export const insertCartSchema = createInsertSchema(carts)
export const selectCartSchema = createSelectSchema(carts)
export const insertCartItemSchema = createInsertSchema(cartItems)
export const selectCartItemSchema = createSelectSchema(cartItems)

// Type exports
export type Cart = typeof carts.$inferSelect
export type NewCart = typeof carts.$inferInsert
export type CartItemRecord = typeof cartItems.$inferSelect
export type NewCartItem = typeof cartItems.$inferInsert
