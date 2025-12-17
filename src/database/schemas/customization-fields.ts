import { pgTable, text, boolean, integer, timestamp, uuid, jsonb, decimal } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

/**
 * Customization Fields - Sistema genérico de personalización
 * 
 * Este esquema permite crear campos de personalización totalmente configurables
 * que pueden ser usados en productos, servicios, o cualquier entidad del sistema.
 */
export const customizationFields = pgTable('customization_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Relación con organización
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  
  // Relación con grupo (REQUERIDO)
  groupId: uuid('group_id').notNull(), // Referencia al grupo (todos los campos deben estar en un grupo)
  
  // Identificación y visualización
  name: text('name').notNull().unique(), // Nombre técnico único (ej: "logo_color")
  displayName: text('display_name').notNull(), // Nombre visible para el usuario
  description: text('description'), // Descripción o ayuda
  placeholder: text('placeholder'), // Texto de placeholder
  helpText: text('help_text'), // Texto de ayuda adicional
  
  // Tipo de campo - Simplificado a 4 tipos esenciales
  type: text('type', { 
    enum: [
      'text',           // Texto simple o multilínea
      'number',         // Número (entero o decimal)
      'boolean',        // Verdadero/Falso (checkbox o switch)
      'image',          // Carga de imagen
    ] 
  }).notNull(),
  
  // Configuración general
  isRequired: boolean('is_required').default(false),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  defaultValue: text('default_value'), // Valor por defecto
  
  // Campo options ya no es necesario con los tipos simplificados
  // Se mantiene por compatibilidad con datos existentes
  options: jsonb('options').$type<Array<{
    value: string;
    label: string;
    price?: number;
    description?: string;
    imageUrl?: string;
  }>>(),
  
  // Validaciones numéricas
  minValue: decimal('min_value', { precision: 10, scale: 2 }),
  maxValue: decimal('max_value', { precision: 10, scale: 2 }),
  step: decimal('step', { precision: 10, scale: 2 }), // Para sliders y números
  
  // Validaciones de texto
  minLength: integer('min_length'),
  maxLength: integer('max_length'),
  pattern: text('pattern'), // Regex para validación
  
  // Configuración de imagen/archivo
  fileConstraints: jsonb('file_constraints').$type<{
    maxSize?: number; // En bytes
    maxFiles?: number; // Número máximo de archivos
    acceptedFormats?: string[]; // ['image/png', 'image/jpeg']
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    aspectRatio?: string; // '16:9', '4:3', etc.
  }>(),
  
  // Configuración de precio (si el campo afecta el precio)
  affectsPrice: boolean('affects_price').default(false),
  priceModifier: decimal('price_modifier', { precision: 10, scale: 2 }), // Monto fijo o porcentaje
  priceModifierType: text('price_modifier_type', { enum: ['fixed', 'percentage'] }),
  
  // Configuración UI
  uiConfig: jsonb('ui_config').$type<{
    columns?: number; // Ancho en grid (1-12)
    icon?: string; // Icono a mostrar
    color?: string; // Color del campo
    showLabel?: boolean;
    showHelpText?: boolean;
    conditionalDisplay?: {
      dependsOn: string; // ID del campo del que depende
      condition: 'equals' | 'not_equals' | 'contains' | 'greater' | 'less';
      value: any;
    };
  }>(),
  
  // Metadata adicional
  metadata: jsonb('metadata'), // Cualquier dato adicional personalizado
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relaciones - se importa el grupo desde su archivo para evitar dependencias circulares
export const customizationFieldsRelations = relations(customizationFields, ({ one }) => ({
  group: one(customizationFieldGroups, {
    fields: [customizationFields.groupId],
    references: [customizationFieldGroups.id],
  }),
  organization: one(organizations, {
    fields: [customizationFields.organizationId],
    references: [organizations.id],
  }),
}));

// Zod schemas para validación
export const insertCustomizationFieldSchema = createInsertSchema(customizationFields);
export const selectCustomizationFieldSchema = createSelectSchema(customizationFields);

// Type exports
export type CustomizationField = typeof customizationFields.$inferSelect;
export type NewCustomizationField = typeof customizationFields.$inferInsert;

// Import del grupo para relaciones
import { customizationFieldGroups } from './customization-field-groups';
