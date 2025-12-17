import { Injectable } from '@nestjs/common';
import { eq, and, inArray, sql, gte, desc } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  inventoryLevels,
  type InventoryLevel,
  type NewInventoryLevel,
} from '../database/schemas/inventory-level';
import { products } from '../database/schemas/products';

export interface InventoryLevelFilters {
  organizationId?: number;
  productId?: number;
  productIds?: number[];
  locationId?: number;
  sku?: string;
  minStock?: number;
  inStock?: boolean;
  limit?: number;
  offset?: number;
}

export interface InventoryLevelWithProduct extends InventoryLevel {
  product?: {
    id: number;
    sku: string;
    name: string;
  };
}

@Injectable()
export class InventoryLevelRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Encuentra niveles de inventario con filtros opcionales
   */
  async findMany(filters?: InventoryLevelFilters): Promise<InventoryLevel[]> {
    const conditions = [];

    if (filters?.organizationId) {
      conditions.push(eq(inventoryLevels.organizationId, filters.organizationId));
    }

    if (filters?.productId) {
      conditions.push(eq(inventoryLevels.productId, filters.productId));
    }

    if (filters?.productIds && filters.productIds.length > 0) {
      conditions.push(inArray(inventoryLevels.productId, filters.productIds));
    }

    if (filters?.locationId) {
      conditions.push(eq(inventoryLevels.locationId, filters.locationId));
    }

    if (filters?.minStock !== undefined) {
      conditions.push(gte(inventoryLevels.onHand, filters.minStock.toString()));
    }

    if (filters?.inStock === true) {
      conditions.push(
        sql`${inventoryLevels.onHand} - ${inventoryLevels.reserved} > 0`
      );
    }

    const query = this.databaseService.db
      .select()
      .from(inventoryLevels);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query.orderBy(desc(inventoryLevels.updatedAt));
  }

  /**
   * Encuentra niveles de inventario con información del producto
   */
  async findManyWithProduct(
    filters?: InventoryLevelFilters,
  ): Promise<InventoryLevelWithProduct[]> {
    const conditions = [];

    if (filters?.organizationId) {
      conditions.push(eq(inventoryLevels.organizationId, filters.organizationId));
    }

    if (filters?.productId) {
      conditions.push(eq(inventoryLevels.productId, filters.productId));
    }

    if (filters?.productIds && filters.productIds.length > 0) {
      conditions.push(inArray(inventoryLevels.productId, filters.productIds));
    }

    if (filters?.locationId) {
      conditions.push(eq(inventoryLevels.locationId, filters.locationId));
    }

    if (filters?.sku) {
      conditions.push(eq(products.sku, filters.sku));
    }

    if (filters?.minStock !== undefined) {
      conditions.push(gte(inventoryLevels.onHand, filters.minStock.toString()));
    }

    if (filters?.inStock === true) {
      conditions.push(
        sql`${inventoryLevels.onHand} - ${inventoryLevels.reserved} > 0`
      );
    }

    let query = this.databaseService.db
      .select({
        id: inventoryLevels.id,
        organizationId: inventoryLevels.organizationId,
        productId: inventoryLevels.productId,
        locationId: inventoryLevels.locationId,
        onHand: inventoryLevels.onHand,
        reserved: inventoryLevels.reserved,
        createdAt: inventoryLevels.createdAt,
        updatedAt: inventoryLevels.updatedAt
      })
      .from(inventoryLevels)
      .leftJoin(products, eq(inventoryLevels.productId, products.id));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    query.orderBy(desc(inventoryLevels.updatedAt));

    // Aplicar paginación si se especifica
    if (filters?.limit !== undefined) {
      query.limit(filters.limit);
    }

    if (filters?.offset !== undefined) {
      query.offset(filters.offset);
    }

    return await query;
  }

  /**
   * Cuenta el total de registros con los filtros aplicados
   */
  async countWithProduct(filters?: InventoryLevelFilters): Promise<number> {
    const conditions = [];

    if (filters?.organizationId) {
      conditions.push(eq(inventoryLevels.organizationId, filters.organizationId));
    }

    if (filters?.productId) {
      conditions.push(eq(inventoryLevels.productId, filters.productId));
    }

    if (filters?.productIds && filters.productIds.length > 0) {
      conditions.push(inArray(inventoryLevels.productId, filters.productIds));
    }

    if (filters?.locationId) {
      conditions.push(eq(inventoryLevels.locationId, filters.locationId));
    }

    if (filters?.sku) {
      conditions.push(eq(products.sku, filters.sku));
    }

    if (filters?.minStock !== undefined) {
      conditions.push(gte(inventoryLevels.onHand, filters.minStock.toString()));
    }

    if (filters?.inStock === true) {
      conditions.push(
        sql`${inventoryLevels.onHand} - ${inventoryLevels.reserved} > 0`
      );
    }

    let query = this.databaseService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryLevels)
      .leftJoin(products, eq(inventoryLevels.productId, products.id));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const result = await query;
    return result[0]?.count || 0;
  }

  /**
   * Obtiene inventario agregado por producto (suma todas las ubicaciones)
   */
  async findAggregatedByProduct(
    organizationId: number,
    filters?: {
      productId?: number;
      productIds?: number[];
      lowStock?: boolean;
    },
  ): Promise<
    Array<{
      productId: number;
      productSku: string | null;
      productName: string | null;
      totalOnHand: number;
      totalReserved: number;
      totalAvailable: number;
      locationCount: number;
    }>
  > {
    const conditions = [eq(inventoryLevels.organizationId, organizationId)];

    if (filters?.productId) {
      conditions.push(eq(inventoryLevels.productId, filters.productId));
    }

    if (filters?.productIds && filters.productIds.length > 0) {
      conditions.push(inArray(inventoryLevels.productId, filters.productIds));
    }

    if (filters?.lowStock === true) {
      conditions.push(
        sql`(${inventoryLevels.onHand} - ${inventoryLevels.reserved}) > 0 AND (${inventoryLevels.onHand} - ${inventoryLevels.reserved}) <= 10`
      );
    }

    const result = await this.databaseService.db
      .select({
        productId: inventoryLevels.productId,
        productSku: products.sku,
        productName: products.name,
        totalOnHand: sql<number>`SUM(${inventoryLevels.onHand})::numeric`,
        totalReserved: sql<number>`SUM(${inventoryLevels.reserved})::numeric`,
        totalAvailable: sql<number>`SUM(${inventoryLevels.onHand} - ${inventoryLevels.reserved})::numeric`,
        locationCount: sql<number>`COUNT(DISTINCT ${inventoryLevels.locationId})::int`,
      })
      .from(inventoryLevels)
      .leftJoin(products, eq(inventoryLevels.productId, products.id))
      .where(and(...conditions))
      .groupBy(inventoryLevels.productId, products.sku, products.name)
      .orderBy(desc(sql`SUM(${inventoryLevels.onHand} - ${inventoryLevels.reserved})`));

    return result.map((row) => ({
      productId: row.productId,
      productSku: row.productSku,
      productName: row.productName,
      totalOnHand: Number(row.totalOnHand),
      totalReserved: Number(row.totalReserved),
      totalAvailable: Number(row.totalAvailable),
      locationCount: Number(row.locationCount),
    }));
  }

  /**
   * Encuentra un nivel de inventario específico
   */
  async findOne(
    organizationId: number,
    productId: number,
    locationId: number,
  ): Promise<InventoryLevel | null> {
    const result = await this.databaseService.db
      .select()
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.organizationId, organizationId),
          eq(inventoryLevels.productId, productId),
          eq(inventoryLevels.locationId, locationId),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Crea o actualiza un nivel de inventario (upsert)
   */
  async upsert(
    organizationId: number,
    productId: number,
    locationId: number,
    data: {
      onHand?: string | number;
      reserved?: string | number;
    },
  ): Promise<InventoryLevel> {
    const existing = await this.findOne(organizationId, productId, locationId);

    if (existing) {
      // Update
      const updateData: Partial<NewInventoryLevel> = {};
      if (data.onHand !== undefined) {
        updateData.onHand = data.onHand.toString();
      }
      if (data.reserved !== undefined) {
        updateData.reserved = data.reserved.toString();
      }

      const [updated] = await this.databaseService.db
        .update(inventoryLevels)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(inventoryLevels.id, existing.id))
        .returning();

      return updated;
    } else {
      // Insert
      const [created] = await this.databaseService.db
        .insert(inventoryLevels)
        .values({
          organizationId,
          productId,
          locationId,
          onHand: data.onHand?.toString() || '0',
          reserved: data.reserved?.toString() || '0',
        })
        .returning();

      return created;
    }
  }

  /**
   * Actualiza múltiples niveles de inventario en una transacción
   */
  async updateMany(
    updates: Array<{
      organizationId: number;
      productId: number;
      locationId: number;
      onHand?: string | number;
      reserved?: string | number;
      adjustment?: number; // Ajuste incremental
    }>,
  ): Promise<InventoryLevel[]> {
    const results: InventoryLevel[] = [];

    // Usar transacción para asegurar atomicidad
    await this.databaseService.db.transaction(async (tx) => {
      for (const update of updates) {
        const existing = await tx
          .select()
          .from(inventoryLevels)
          .where(
            and(
              eq(inventoryLevels.organizationId, update.organizationId),
              eq(inventoryLevels.productId, update.productId),
              eq(inventoryLevels.locationId, update.locationId),
            ),
          )
          .limit(1);

        if (existing[0]) {
          // Update existing
          const currentOnHand = Number(existing[0].onHand);
          const newOnHand =
            update.adjustment !== undefined
              ? currentOnHand + update.adjustment
              : update.onHand !== undefined
                ? Number(update.onHand)
                : currentOnHand;

          const [updated] = await tx
            .update(inventoryLevels)
            .set({
              onHand: newOnHand.toString(),
              reserved:
                update.reserved !== undefined
                  ? update.reserved.toString()
                  : existing[0].reserved,
              updatedAt: new Date(),
            })
            .where(eq(inventoryLevels.id, existing[0].id))
            .returning();

          results.push(updated);
        } else {
          // Insert new
          const onHand =
            update.adjustment !== undefined
              ? update.adjustment
              : update.onHand !== undefined
                ? Number(update.onHand)
                : 0;

          const [created] = await tx
            .insert(inventoryLevels)
            .values({
              organizationId: update.organizationId,
              productId: update.productId,
              locationId: update.locationId,
              onHand: onHand.toString(),
              reserved: update.reserved?.toString() || '0',
            })
            .returning();

          results.push(created);
        }
      }
    });

    return results;
  }
}

