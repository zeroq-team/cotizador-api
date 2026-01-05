import { pgTable, uuid, varchar, text, bigint, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { organizations } from './organizations'
import { deliveryAddresses } from './delivery-addresses'

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
  phoneCode: varchar('phone_code', { length: 10 }), // Código de país (ej: +56, +1)
  phoneNumber: varchar('phone_number', { length: 20 }), // Número telefónico sin código
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Unique constraint: phoneCode + phoneNumber debe ser único por organización
  ukCustomerPhone: uniqueIndex('uk_customers_org_phone').on(
    table.organizationId,
    table.phoneCode,
    table.phoneNumber,
  ),
  orgIdIdx: index('idx_customers_organization_id').on(table.organizationId),
  // Indexes on nullable fields - PostgreSQL handles NULLs in indexes fine
  emailIdx: index('idx_customers_email').on(table.email),
  documentNumberIdx: index('idx_customers_document_number').on(table.documentNumber),
  phoneCodeIdx: index('idx_customers_phone_code').on(table.phoneCode),
  phoneNumberIdx: index('idx_customers_phone_number').on(table.phoneNumber),
}))

// Define relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.organizationId],
    references: [organizations.id],
  }),
  deliveryAddresses: many(deliveryAddresses),
}))

// Zod schemas for validation
export const insertCustomerSchema = createInsertSchema(customers)
export const selectCustomerSchema = createSelectSchema(customers)

// Type exports
export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert

