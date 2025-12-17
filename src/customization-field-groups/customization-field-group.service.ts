import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, asc, and } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { customizationFieldGroups, type CustomizationFieldGroup } from '../database/schemas';
import { CreateCustomizationFieldGroupDto } from './dto/create-customization-field-group.dto';
import { UpdateCustomizationFieldGroupDto } from './dto/update-customization-field-group.dto';

@Injectable()
export class CustomizationFieldGroupService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createDto: CreateCustomizationFieldGroupDto, organizationId: number): Promise<CustomizationFieldGroup> {
    const result = await this.databaseService.db
      .insert(customizationFieldGroups)
      .values({
        ...createDto,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  async findAll(organizationId: number): Promise<CustomizationFieldGroup[]> {
    return await this.databaseService.db
      .select()
      .from(customizationFieldGroups)
      .where(eq(customizationFieldGroups.organizationId, organizationId))
      .orderBy(asc(customizationFieldGroups.sortOrder), asc(customizationFieldGroups.createdAt));
  }

  async findAllActive(organizationId: number): Promise<CustomizationFieldGroup[]> {
    return await this.databaseService.db
      .select()
      .from(customizationFieldGroups)
      .where(
        and(
          eq(customizationFieldGroups.organizationId, organizationId),
          eq(customizationFieldGroups.isActive, true)
        )
      )
      .orderBy(asc(customizationFieldGroups.sortOrder));
  }

  async findOne(id: string, organizationId: number): Promise<CustomizationFieldGroup> {
    const result = await this.databaseService.db
      .select()
      .from(customizationFieldGroups)
      .where(
        and(
          eq(customizationFieldGroups.id, id),
          eq(customizationFieldGroups.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!result[0]) {
      throw new NotFoundException(`Customization field group with ID ${id} not found`);
    }

    return result[0];
  }

  async update(id: string, updateDto: UpdateCustomizationFieldGroupDto, organizationId: number): Promise<CustomizationFieldGroup> {
    await this.findOne(id, organizationId); // Verifica que existe y pertenece a la organización

    const result = await this.databaseService.db
      .update(customizationFieldGroups)
      .set({
        ...updateDto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customizationFieldGroups.id, id),
          eq(customizationFieldGroups.organizationId, organizationId)
        )
      )
      .returning();

    return result[0];
  }

  async remove(id: string, organizationId: number): Promise<void> {
    await this.findOne(id, organizationId); // Verifica que existe y pertenece a la organización

    await this.databaseService.db
      .delete(customizationFieldGroups)
      .where(
        and(
          eq(customizationFieldGroups.id, id),
          eq(customizationFieldGroups.organizationId, organizationId)
        )
      );
  }

  async toggleActive(id: string, organizationId: number): Promise<CustomizationFieldGroup> {
    const group = await this.findOne(id, organizationId);

    const result = await this.databaseService.db
      .update(customizationFieldGroups)
      .set({
        isActive: !group.isActive,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customizationFieldGroups.id, id),
          eq(customizationFieldGroups.organizationId, organizationId)
        )
      )
      .returning();

    return result[0];
  }
}
