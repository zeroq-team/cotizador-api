import { pgTable, integer, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Regiones de Chile
export const regions = pgTable('regions', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  romanNumber: varchar('roman_number', { length: 10 }), // I, II, III, etc.
  code: varchar('code', { length: 10 }), // Código único de la región
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('idx_regions_name').on(table.name),
  codeIdx: index('idx_regions_code').on(table.code),
}));

// Comunas de Chile
export const communes = pgTable('communes', {
  id: integer('id').primaryKey(),
  regionId: integer('region_id')
    .notNull()
    .references(() => regions.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 10 }), // Código único de la comuna
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  regionIdIdx: index('idx_communes_region_id').on(table.regionId),
  nameIdx: index('idx_communes_name').on(table.name),
  codeIdx: index('idx_communes_code').on(table.code),
}));

// Relations
export const regionsRelations = relations(regions, ({ many }) => ({
  communes: many(communes),
}));

export const communesRelations = relations(communes, ({ one }) => ({
  region: one(regions, {
    fields: [communes.regionId],
    references: [regions.id],
  }),
}));

// Zod schemas
export const insertChileRegionSchema = createInsertSchema(regions);
export const selectRegionSchema = createSelectSchema(regions);
export const insertCommuneSchema = createInsertSchema(communes);
export const selectCommuneSchema = createSelectSchema(communes);

// Type exports
export type ChileRegion = typeof regions.$inferSelect;
export type NewChileRegion = typeof regions.$inferInsert;
export type ChileCommune = typeof communes.$inferSelect;
export type NewChileCommune = typeof communes.$inferInsert;

