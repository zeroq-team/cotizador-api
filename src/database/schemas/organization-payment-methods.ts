import { pgTable, bigserial, bigint, boolean, timestamp, index, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organizations } from './organizations';

export const organizationPaymentMethods = pgTable(
  'organization_payment_methods',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    organizationId: bigint('organization_id', { mode: 'number' }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    isCheckActive: boolean('is_check_active').notNull().default(false),
    isWebPayActive: boolean('is_web_pay_active').notNull().default(false),
    isBankTransferActive: boolean('is_bank_transfer_active').notNull().default(false),
    isPurchaseOrderActive: boolean('is_purchase_order_active').notNull().default(false),
    webPayPrefix: varchar('web_pay_prefix', { length: 9 }).default('workit'),
    webPayChildCommerceCode: varchar('web_pay_child_commerce_code', { length: 50 }).unique(),
    // Bank account information
    bankName: varchar('bank_name', { length: 100 }),
    accountType: varchar('account_type', { length: 20 }), // 'corriente' | 'ahorro'
    accountNumber: varchar('account_number', { length: 50 }),
    accountHolderName: varchar('account_holder_name', { length: 200 }),
    documentType: varchar('document_type', { length: 20 }), // 'rut' | 'pasaporte' | 'cedula' | 'nit'
    documentNumber: varchar('document_number', { length: 50 }), // Número de documento (RUT, pasaporte, etc.)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index('idx_organization_payment_methods_org_id').on(table.organizationId),
  })
);

// Define relations
export const organizationPaymentMethodsRelations = relations(
  organizationPaymentMethods,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationPaymentMethods.organizationId],
      references: [organizations.id],
    }),
  })
);

export const organizationsRelations = relations(organizations, ({ one }) => ({
  paymentMethods: one(organizationPaymentMethods, {
    fields: [organizations.id],
    references: [organizationPaymentMethods.organizationId],
  }),
}));

// Zod schemas for validation
export const insertOrganizationPaymentMethodSchema = createInsertSchema(organizationPaymentMethods, {
  organizationId: (schema) => schema.positive('Organization ID must be positive'),
  isCheckActive: (schema) => schema.default(false),
  isWebPayActive: (schema) => schema.default(false),
  isBankTransferActive: (schema) => schema.default(false),
  isPurchaseOrderActive: (schema) => schema.default(false),
  webPayPrefix: (schema) => schema
    .max(9, 'WebPay prefix must be 9 characters or less')
    .regex(/^[a-zA-Z0-9]*$/, 'WebPay prefix must contain only letters and numbers')
    .optional(),
  webPayChildCommerceCode: (schema) => schema
    .max(50, 'WebPay child commerce code must be 50 characters or less')
    .optional(),
  bankName: (schema) => schema
    .max(100, 'Bank name must be 100 characters or less')
    .optional(),
  accountType: (schema) => schema
    .max(20, 'Account type must be 20 characters or less')
    .optional(),
  accountNumber: (schema) => schema
    .max(50, 'Account number must be 50 characters or less')
    .optional(),
  accountHolderName: (schema) => schema
    .max(200, 'Account holder name must be 200 characters or less')
    .optional(),
  documentType: (schema) => schema
    .max(20, 'Document type must be 20 characters or less')
    .optional(),
  documentNumber: (schema) => schema
    .max(50, 'Document number must be 50 characters or less')
    .optional(),
});

export const selectOrganizationPaymentMethodSchema = createSelectSchema(organizationPaymentMethods);

export const updateOrganizationPaymentMethodSchema = insertOrganizationPaymentMethodSchema.partial().omit({ organizationId: true });

// Type exports
export type OrganizationPaymentMethod = typeof organizationPaymentMethods.$inferSelect;
export type NewOrganizationPaymentMethod = typeof organizationPaymentMethods.$inferInsert;

