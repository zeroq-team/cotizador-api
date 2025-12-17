import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organizations } from './organizations';
import { productPrices } from './product-prices';
import { productMedia } from './product-media';
import { productRelations } from './product-relations';
import { inventoryLevels } from './inventory-level';
import { cartItems } from './carts';

export const products = pgTable(
  'products',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    organizationId: bigint('organization_id', { mode: 'number' })
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 255 }).notNull(),
    externalSku: varchar('external_sku', { length: 255 }),
    externalName: varchar('external_name', { length: 500 }),
    name: varchar('name', { length: 500 }).notNull(),
    description: text('description'),
    productType: varchar('product_type', { length: 50 }).notNull().default('simple'),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    unitOfMeasure: varchar('unit_of_measure', { length: 50 }),
    brand: varchar('brand', { length: 255 }),
    model: varchar('model', { length: 255 }),
    taxClassId: bigint('tax_class_id', { mode: 'number' }),
    weight: varchar('weight', { length: 50 }),
    height: varchar('height', { length: 50 }),
    width: varchar('width', { length: 50 }),
    length: varchar('length', { length: 50 }),
    metadata: jsonb('metadata').$type<Record<string, any>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => {
    return {
      // Unique constraint: SKU debe ser único por organización
      ukProductOrgSku: uniqueIndex('uk_product_org_sku').on(
        table.organizationId,
        table.sku,
      ),
      // Indexes
      idxProductOrgId: index('idx_product_org_id').on(table.organizationId),
      idxProductSku: index('idx_product_sku').on(table.sku),
      idxProductStatus: index('idx_product_status').on(table.status),
      idxProductType: index('idx_product_type').on(table.productType),
      idxProductBrand: index('idx_product_brand').on(table.brand),
      idxProductCreatedAt: index('idx_product_created_at').on(table.createdAt),
      idxProductUpdatedAt: index('idx_product_updated_at').on(table.updatedAt),
      idxProductOrgStatus: index('idx_product_org_status').on(
        table.organizationId,
        table.status,
      ),
    };
  },
);

// Relations
export const productRelationsSchema = relations(products, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [products.organizationId],
    references: [organizations.id],
  }),
  prices: many(productPrices),
  media: many(productMedia),
  inventory: many(inventoryLevels),
  cartItems: many(cartItems),
  // Relations where this product is the main product
  relations: many(productRelations, {
    relationName: 'product',
  }),
  // Relations where this product is the related product
  relatedInRelations: many(productRelations, {
    relationName: 'relatedProduct',
  }),
}));

// Zod schemas for validation
export const insertProductSchema = createInsertSchema(products);
export const selectProductSchema = createSelectSchema(products);

// Types
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

