import { pgTable, uuid, varchar, text, bigint, timestamp, index } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { organizations } from './organizations'

// Customers Table
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: bigint('organization_id', { mode: 'number' })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  documentType: varchar('document_type', { length: 50 }),
  documentNumber: varchar('document_number', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  
  // Delivery address information
  deliveryStreet: text('delivery_street'),
  deliveryStreetNumber: varchar('delivery_street_number', { length: 50 }),
  deliveryApartment: varchar('delivery_apartment', { length: 50 }),
  deliveryCity: varchar('delivery_city', { length: 100 }),
  deliveryRegion: varchar('delivery_region', { length: 100 }),
  deliveryPostalCode: varchar('delivery_postal_code', { length: 20 }),
  deliveryCountry: varchar('delivery_country', { length: 100 }),
  deliveryOffice: varchar('delivery_office', { length: 100 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgIdIdx: index('idx_customers_organization_id').on(table.organizationId),
  // Indexes on nullable fields - PostgreSQL handles NULLs in indexes fine
  emailIdx: index('idx_customers_email').on(table.email),
  documentNumberIdx: index('idx_customers_document_number').on(table.documentNumber),
}))

// Define relations
export const customersRelations = relations(customers, ({ one }) => ({
  organization: one(organizations, {
    fields: [customers.organizationId],
    references: [organizations.id],
  }),
}))

// Zod schemas for validation
export const insertCustomerSchema = createInsertSchema(customers)
export const selectCustomerSchema = createSelectSchema(customers)

// Type exports
export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert

