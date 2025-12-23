import {
  pgTable,
  uuid,
  decimal,
  timestamp,
  text,
  varchar,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { carts } from './carts';

// Payment Status Enum
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'refunded',
]);

// Payment Type Enum
export const paymentTypeEnum = pgEnum('payment_type', [
  'purchase_order',
  'webpay',
  'bank_transfer',
  'check',
]);

// Payments Table
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id')
    .notNull()
    .references(() => carts.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paymentType: paymentTypeEnum('payment_type').notNull(),
  
  // Campos para pagos con comprobante (transferencia/cheque)
  proofUrl: text('proof_url'),
  externalReference: varchar('external_reference', { length: 255 }),
  
  // Campos para WebPay/Transbank
  transactionId: varchar('transaction_id', { length: 255 }), // buyOrder de WebPay
  authorizationCode: varchar('authorization_code', { length: 50 }), // Código de autorización
  cardLastFourDigits: varchar('card_last_four_digits', { length: 4 }), // Últimos 4 dígitos de tarjeta
  
  // Fechas
  paymentDate: timestamp('payment_date'),
  confirmedAt: timestamp('confirmed_at'),
  
  // Información adicional
  metadata: jsonb('metadata'), // Para guardar toda la respuesta de WebPay u otros datos
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Define relations
export const paymentsRelations = relations(payments, ({ one }) => ({
  cart: one(carts, {
    fields: [payments.cartId],
    references: [carts.id],
  }),
}));

export const cartsPaymentsRelations = relations(carts, ({ many }) => ({
  payments: many(payments),
}));

// Zod schemas for validation
export const insertPaymentSchema = createInsertSchema(payments);
export const selectPaymentSchema = createSelectSchema(payments);

// Type exports
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type PaymentType = (typeof paymentTypeEnum.enumValues)[number];
