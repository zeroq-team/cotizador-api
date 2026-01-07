import { pgTable, text, boolean, integer, timestamp, uuid, decimal } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { customizationFields } from './customization-fields';
import { organizations } from './organizations';

/**
 * Customization Field Groups - Agrupación de campos de personalización
 * 
 * Permite organizar los campos de personalización en grupos lógicos
 * que pueden ser activados/desactivados desde el panel de administración.
 */
export const customizationFieldGroups = pgTable('customization_field_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Organización
  organizationId: integer('organization_id').notNull().references(() => organizations.id),
  
  // Información del grupo
  name: text('name').notNull(), // Nombre del grupo (ej: "Información de Logo")
  description: text('description'), // Descripción del grupo
  
  // Configuración
  sortOrder: integer('sort_order').default(0), // Orden de visualización
  isActive: boolean('is_active').default(true), // Si el grupo está activo
  
  // Monto mínimo para que el grupo sea aplicable
  minimumAmount: decimal('minimum_amount', { precision: 10, scale: 2 }), // Monto mínimo de la cotización para que este grupo sea visible/aplicable
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relaciones
export const customizationFieldGroupsRelations = relations(customizationFieldGroups, ({ many, one }) => ({
  fields: many(customizationFields),
  organization: one(organizations, {
    fields: [customizationFieldGroups.organizationId],
    references: [organizations.id],
  }),
}));

// Zod schemas para validación
export const insertCustomizationFieldGroupSchema = createInsertSchema(customizationFieldGroups);
export const selectCustomizationFieldGroupSchema = createSelectSchema(customizationFieldGroups);

// Type exports
export type CustomizationFieldGroup = typeof customizationFieldGroups.$inferSelect;
export type NewCustomizationFieldGroup = typeof customizationFieldGroups.$inferInsert;

