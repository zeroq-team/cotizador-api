import { pgTable, uuid, varchar, text, timestamp, index, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { customers } from './customers'

// Delivery Addresses Table
export const deliveryAddresses = pgTable('delivery_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  street: text('street'),
  streetNumber: varchar('street_number', { length: 50 }),
  apartment: varchar('apartment', { length: 50 }),
  city: varchar('city', { length: 100 }),
  region: varchar('region', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }),
  office: varchar('office', { length: 100 }),
  isDefault: boolean('is_default').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  customerIdIdx: index('idx_delivery_addresses_customer_id').on(table.customerId),
}))

// Define relations
export const deliveryAddressesRelations = relations(deliveryAddresses, ({ one }) => ({
  customer: one(customers, {
    fields: [deliveryAddresses.customerId],
    references: [customers.id],
  }),
}))

// Zod schemas for validation
export const insertDeliveryAddressSchema = createInsertSchema(deliveryAddresses)
export const selectDeliveryAddressSchema = createSelectSchema(deliveryAddresses)

// Type exports
export type DeliveryAddress = typeof deliveryAddresses.$inferSelect
export type NewDeliveryAddress = typeof deliveryAddresses.$inferInsert

