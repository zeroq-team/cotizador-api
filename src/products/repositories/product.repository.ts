import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { products, type Product, type NewProduct, productPrices, productMedia, inventoryLevels, inventoryLocations, priceLists } from '../../database/schemas';
import { eq, and, inArray, desc, asc, sql, or, like, ilike } from 'drizzle-orm';
import { ProductWithPricesAndMedia } from '../products.types';

export interface ProductFilters {
  ids?: number[];
  status?: string;
  productType?: string;
  search?: string;
  brand?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ProductRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Encuentra un producto por ID con precios y media
   */
  async findById(
    id: number,
    organizationId: number,
    defaultPrice?: boolean,
  ): Promise<ProductWithPricesAndMedia | null> {
    // Obtener el producto base
    const productResult = await this.databaseService.db
      .select()
      .from(products)
      .where(
        and(eq(products.id, id), eq(products.organizationId, organizationId)),
      )
      .limit(1);

    if (!productResult[0]) {
      return null;
    }

    const product = productResult[0];

    // Obtener todos los precios relacionados
    let pricesResult = [];
    if (defaultPrice) {
      pricesResult = await this.databaseService.db
        .select({
          id: productPrices.id,
          productId: productPrices.productId,
          priceListId: productPrices.priceListId,
          organizationId: productPrices.organizationId,
          currency: productPrices.currency,
          amount: productPrices.amount,
          taxIncluded: productPrices.taxIncluded,
          validFrom: productPrices.validFrom,
          validTo: productPrices.validTo,
          createdAt: productPrices.createdAt,
          updatedAt: productPrices.updatedAt,
        })
        .from(productPrices)
        .innerJoin(priceLists, eq(productPrices.priceListId, priceLists.id))
        .where(
          and(eq(productPrices.productId, id), eq(productPrices.organizationId, organizationId), eq(priceLists.isDefault, true)),
        )
        .orderBy(productPrices.createdAt);
    } else {
      pricesResult = await this.databaseService.db
      .select()
      .from(productPrices)
      .where(
        and(
          eq(productPrices.productId, id),
          eq(productPrices.organizationId, organizationId),
        ),
      )
      .orderBy(productPrices.createdAt);
    }

    // Obtener todos los media relacionados
    const mediaResult = await this.databaseService.db
      .select()
      .from(productMedia)
      .where(
        and(
          eq(productMedia.productId, id),
          eq(productMedia.organizationId, organizationId),
        ),
      )
      .orderBy(productMedia.position, productMedia.createdAt);

      console.log("pricesResult", pricesResult);
    // Mapear precios al formato esperado
    const prices = pricesResult.length > 0
      ? pricesResult.map((price) => ({
          id: price.id,
          price_list_id: price.priceListId,
          currency: price.currency,
          amount: price.amount,
          tax_included: price.taxIncluded,
          valid_from: price.validFrom?.toISOString() || null,
          valid_to: price.validTo?.toISOString() || null,
          created_at: price.createdAt.toISOString(),
          price_list_name: '', // TODO: obtener nombre de la lista de precios si es necesario
          price_list_is_default: false, // TODO: obtener si es default si es necesario
        }))
      : null;

    // Mapear media al formato esperado
    const media = mediaResult.length > 0
      ? mediaResult.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          position: m.position,
          alt_text: m.altText,
          title: m.title,
          description: m.description,
          file_size: m.fileSize,
          mime_type: m.mimeType,
          is_primary: m.isPrimary,
          created_at: m.createdAt.toISOString(),
          updated_at: m.updatedAt.toISOString(),
        }))
      : null;

    // Obtener inventario con información de ubicación
    const inventoryResult = await this.databaseService.db
      .select({
        id: inventoryLevels.id,
        productId: inventoryLevels.productId,
        locationId: inventoryLevels.locationId,
        onHand: inventoryLevels.onHand,
        reserved: inventoryLevels.reserved,
        updatedAt: inventoryLevels.updatedAt,
        location: inventoryLocations,
      })
      .from(inventoryLevels)
      .innerJoin(
        inventoryLocations,
        eq(inventoryLevels.locationId, inventoryLocations.id),
      )
      .where(
        and(
          eq(inventoryLevels.productId, id),
          eq(inventoryLevels.organizationId, organizationId),
        ),
      )
      .orderBy(inventoryLevels.updatedAt);

    // Mapear inventario al formato esperado
    const inventory = inventoryResult.length > 0
      ? inventoryResult.map((inv) => {
          const onHand = Number(inv.onHand);
          const reserved = Number(inv.reserved);
          const available = onHand - reserved;

          return {
            id: inv.id,
            product_id: inv.productId,
            location_id: inv.locationId,
            on_hand: inv.onHand,
            reserved: inv.reserved,
            updated_at: inv.updatedAt?.toISOString() || new Date().toISOString(),
            location_code: inv.location.code,
            location_name: inv.location.name,
            location_type: inv.location.type,
            available: available,
          };
        })
      : null;

    return {
      ...product,
      prices,
      media,
      inventory: inventory || [],
    } as ProductWithPricesAndMedia;
  }

  /**
   * Encuentra productos por IDs
   */
  async findByIds(
    ids: number[],
    organizationId: number,
  ): Promise<Product[]> {
    if (ids.length === 0) {
      return [];
    }

    return await this.databaseService.db
      .select()
      .from(products)
      .where(
        and(
          inArray(products.id, ids),
          eq(products.organizationId, organizationId),
        ),
      )
      .orderBy(desc(products.createdAt));
  }

  /**
   * Encuentra productos con filtros
   */
  async findMany(
    organizationId: number,
    filters?: ProductFilters,
  ): Promise<Product[]> {
    const conditions = [eq(products.organizationId, organizationId)];

    if (filters?.ids && filters.ids.length > 0) {
      conditions.push(inArray(products.id, filters.ids));
    }

    if (filters?.status) {
      conditions.push(eq(products.status, filters.status));
    }

    if (filters?.productType) {
      conditions.push(eq(products.productType, filters.productType));
    }

    if (filters?.brand) {
      conditions.push(eq(products.brand, filters.brand));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(products.name, searchTerm),
          ilike(products.sku, searchTerm),
          ilike(products.description, searchTerm),
        ),
      );
    }

    const query = this.databaseService.db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt));

    if (filters?.limit) {
      query.limit(filters.limit);
    }

    if (filters?.offset) {
      query.offset(filters.offset);
    }

    return await query;
  }

  /**
   * Cuenta productos con filtros
   */
  async count(
    organizationId: number,
    filters?: Omit<ProductFilters, 'limit' | 'offset'>,
  ): Promise<number> {
    const conditions = [eq(products.organizationId, organizationId)];

    if (filters?.ids && filters.ids.length > 0) {
      conditions.push(inArray(products.id, filters.ids));
    }

    if (filters?.status) {
      conditions.push(eq(products.status, filters.status));
    }

    if (filters?.productType) {
      conditions.push(eq(products.productType, filters.productType));
    }

    if (filters?.brand) {
      conditions.push(eq(products.brand, filters.brand));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(products.name, searchTerm),
          ilike(products.sku, searchTerm),
          ilike(products.description, searchTerm),
        ),
      );
    }

    const result = await this.databaseService.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions));

    return Number(result[0]?.count || 0);
  }

  /**
   * Crea un nuevo producto
   */
  async create(data: NewProduct): Promise<Product> {
    const result = await this.databaseService.db
      .insert(products)
      .values(data)
      .returning();

    return result[0];
  }

  /**
   * Actualiza un producto
   */
  async update(
    id: number,
    organizationId: number,
    data: Partial<NewProduct>,
  ): Promise<Product | null> {
    const result = await this.databaseService.db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(products.id, id), eq(products.organizationId, organizationId)),
      )
      .returning();

    return result[0] || null;
  }

  /**
   * Elimina un producto
   */
  async delete(id: number, organizationId: number): Promise<boolean> {
    const result = await this.databaseService.db
      .delete(products)
      .where(
        and(eq(products.id, id), eq(products.organizationId, organizationId)),
      )
      .returning({ id: products.id });

    return result.length > 0;
  }

  /**
   * Encuentra producto por SKU
   */
  async findBySku(
    sku: string,
    organizationId: number,
  ): Promise<Product | null> {
    const result = await this.databaseService.db
      .select()
      .from(products)
      .where(
        and(eq(products.sku, sku), eq(products.organizationId, organizationId)),
      )
      .limit(1);

    return result[0] || null;
  }
}

