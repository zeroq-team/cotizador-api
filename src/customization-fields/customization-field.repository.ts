import { Injectable } from '@nestjs/common'
import { eq, asc, and, isNull } from 'drizzle-orm'
import { DatabaseService } from '../database/database.service'
import { customizationFields, customizationFieldGroups, type CustomizationField, type NewCustomizationField } from '../database/schemas'

@Injectable()
export class CustomizationFieldRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(organizationId: number): Promise<CustomizationField[]> {
    return await this.databaseService.db
      .select()
      .from(customizationFields)
      .where(eq(customizationFields.organizationId, organizationId))
      .orderBy(asc(customizationFields.sortOrder), asc(customizationFields.createdAt))
  }

  async findAllGrouped(organizationId: number): Promise<any[]> {
    // Obtener todos los grupos activos de la organización
    const groups = await this.databaseService.db
      .select()
      .from(customizationFieldGroups)
      .where(
        and(
          eq(customizationFieldGroups.isActive, true),
          eq(customizationFieldGroups.organizationId, organizationId)
        )
      )
      .orderBy(asc(customizationFieldGroups.sortOrder));

    // Obtener todos los campos activos de la organización
    const fields = await this.databaseService.db
      .select()
      .from(customizationFields)
      .where(
        and(
          eq(customizationFields.isActive, true),
          eq(customizationFields.organizationId, organizationId)
        )
      )
      .orderBy(asc(customizationFields.sortOrder));

    // Agrupar campos por grupo
    const groupedFields = groups.map(group => ({
      ...group,
      fields: fields.filter(field => field.groupId === group.id)
    }));

    return groupedFields;
  }

  async findById(id: string, organizationId: number): Promise<CustomizationField | null> {
    const result = await this.databaseService.db
      .select()
      .from(customizationFields)
      .where(
        and(
          eq(customizationFields.id, id),
          eq(customizationFields.organizationId, organizationId)
        )
      )
      .limit(1)

    return result[0] || null
  }

  async create(data: NewCustomizationField): Promise<CustomizationField> {
    const result = await this.databaseService.db
      .insert(customizationFields)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return result[0]
  }

  async update(id: string, organizationId: number, data: Partial<NewCustomizationField>): Promise<CustomizationField> {
    const result = await this.databaseService.db
      .update(customizationFields)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customizationFields.id, id),
          eq(customizationFields.organizationId, organizationId)
        )
      )
      .returning()

    return result[0]
  }

  async delete(id: string, organizationId: number): Promise<void> {
    await this.databaseService.db
      .delete(customizationFields)
      .where(
        and(
          eq(customizationFields.id, id),
          eq(customizationFields.organizationId, organizationId)
        )
      )
  }

  async toggleActive(id: string, organizationId: number): Promise<CustomizationField> {
    const field = await this.findById(id, organizationId)
    if (!field) {
      throw new Error('Customization field not found')
    }

    return await this.update(id, organizationId, { isActive: !field.isActive })
  }

  async reorder(fieldOrders: { id: string; sortOrder: number }[], organizationId: number): Promise<void> {
    for (const { id, sortOrder } of fieldOrders) {
      await this.databaseService.db
        .update(customizationFields)
        .set({
          sortOrder,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(customizationFields.id, id),
            eq(customizationFields.organizationId, organizationId)
          )
        )
    }
  }
}
