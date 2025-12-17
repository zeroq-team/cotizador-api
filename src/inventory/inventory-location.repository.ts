import { Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  inventoryLocations,
  type InventoryLocation,
  type NewInventoryLocation,
} from '../database/schemas/inventory-location';

export interface LocationFilters {
  organizationId?: number;
  type?: 'warehouse' | 'store' | 'virtual';
}

@Injectable()
export class InventoryLocationRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Encuentra todas las ubicaciones con filtros opcionales
   */
  async findAll(filters?: LocationFilters): Promise<InventoryLocation[]> {
    const conditions = [];

    if (filters?.organizationId) {
      conditions.push(eq(inventoryLocations.organizationId, filters.organizationId));
    }

    if (filters?.type) {
      conditions.push(eq(inventoryLocations.type, filters.type));
    }

    let query = this.databaseService.db
      .select()
      .from(inventoryLocations);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query.orderBy(desc(inventoryLocations.createdAt));
  }

  /**
   * Encuentra una ubicación por ID
   */
  async findById(
    id: number,
    organizationId: number,
  ): Promise<InventoryLocation | null> {
    const result = await this.databaseService.db
      .select()
      .from(inventoryLocations)
      .where(
        and(
          eq(inventoryLocations.id, id),
          eq(inventoryLocations.organizationId, organizationId),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Encuentra una ubicación por código
   */
  async findByCode(
    code: string,
    organizationId: number,
  ): Promise<InventoryLocation | null> {
    const result = await this.databaseService.db
      .select()
      .from(inventoryLocations)
      .where(
        and(
          eq(inventoryLocations.code, code),
          eq(inventoryLocations.organizationId, organizationId),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Crea una nueva ubicación
   */
  async create(data: NewInventoryLocation): Promise<InventoryLocation> {
    const [location] = await this.databaseService.db
      .insert(inventoryLocations)
      .values(data)
      .returning();

    return location;
  }

  /**
   * Actualiza una ubicación existente
   */
  async update(
    id: number,
    organizationId: number,
    data: Partial<NewInventoryLocation>,
  ): Promise<InventoryLocation | null> {
    const [updated] = await this.databaseService.db
      .update(inventoryLocations)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(inventoryLocations.id, id),
          eq(inventoryLocations.organizationId, organizationId),
        ),
      )
      .returning();

    return updated || null;
  }

  /**
   * Elimina una ubicación
   */
  async delete(id: number, organizationId: number): Promise<boolean> {
    const result = await this.databaseService.db
      .delete(inventoryLocations)
      .where(
        and(
          eq(inventoryLocations.id, id),
          eq(inventoryLocations.organizationId, organizationId),
        ),
      )
      .returning({ id: inventoryLocations.id });

    return result.length > 0;
  }

  /**
   * Cuenta ubicaciones por tipo
   */
  async countByType(organizationId: number): Promise<Record<string, number>> {
    const result = await this.databaseService.db
      .select({
        type: inventoryLocations.type,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(inventoryLocations)
      .where(eq(inventoryLocations.organizationId, organizationId))
      .groupBy(inventoryLocations.type);

    return result.reduce((acc, row) => {
      acc[row.type] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }
}
