import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InventoryLevelRepository } from './inventory-level.repository';
import { inventoryLocations } from '../database/schemas/inventory-location';
import { eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryLevelRepository: InventoryLevelRepository,
    private readonly databaseService: DatabaseService,
  ) {}
  async getInventory(params?: any): Promise<any[]> {
    const filters: any = {};

    // Parsear organizationId si está disponible (normalmente viene del contexto de la request)
    // Por ahora usamos un valor por defecto, pero debería venir del usuario autenticado
    const organizationId = params?.organizationId
      ? parseInt(params.organizationId, 10)
      : undefined;

    if (organizationId) {
      filters.organizationId = organizationId;
    }

    if (params?.product_id) {
      filters.productId = parseInt(params.product_id, 10);
    }

    if (params?.location_id) {
      filters.locationId = parseInt(params.location_id, 10);
    }

    if (params?.sku) {
      filters.sku = params.sku;
    }

    if (params?.minStock !== undefined) {
      filters.minStock = parseInt(params.minStock, 10);
    }

    if (params?.inStock === 'true' || params?.inStock === true) {
      filters.inStock = true;
    }

    const inventoryLevels = await this.inventoryLevelRepository.findManyWithProduct(
      filters,
    );

    // Obtener información de ubicaciones si es necesario
    const locationIds = [
      ...new Set(inventoryLevels.map((inv) => inv.locationId)),
    ];
    
    let locations: any[] = [];
    if (locationIds.length > 0) {
      locations = await this.databaseService.db
        .select()
        .from(inventoryLocations)
        .where(inArray(inventoryLocations.id, locationIds));
    }

    const locationMap = new Map(
      locations.map((loc) => [loc.id, loc]),
    );

    // Mapear a formato de respuesta esperado
    return inventoryLevels.map((inv) => {
      const onHand = Number(inv.onHand);
      const reserved = Number(inv.reserved);
      const available = onHand - reserved;
      const location = locationMap.get(inv.locationId);

      return {
        id: `inv_${inv.id}`,
        productId: `prod_${inv.productId}`,
        productName: inv.product?.name || 'Producto desconocido',
        sku: inv.product?.sku || '',
        locationId: `loc_${inv.locationId}`,
        locationName: location?.name || 'Ubicación desconocida',
        quantity: onHand,
        reserved: reserved,
        available: available,
        minStock: 0, // TODO: obtener de configuración del producto
        maxStock: 0, // TODO: obtener de configuración del producto
        status:
          available > 0
            ? available <= 10
              ? 'low_stock'
              : 'in_stock'
            : 'out_of_stock',
        lastUpdated: inv.updatedAt?.toISOString() || inv.createdAt.toISOString(),
      };
    });
  }

  /**
   * Actualiza inventario
   */
  async updateInventory(data?: any): Promise<any> {
    if (!data?.updates || !Array.isArray(data.updates)) {
      throw new HttpException(
        'Se requiere un array de updates',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Por ahora usamos un organizationId por defecto
    // En producción debería venir del contexto del usuario autenticado
    const organizationId = data.organizationId
      ? parseInt(data.organizationId, 10)
      : undefined;

    if (!organizationId) {
      throw new HttpException(
        'organizationId es requerido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updates = data.updates.map((update: any) => ({
      organizationId: organizationId,
      productId: parseInt(update.productId.toString().replace('prod_', ''), 10),
      locationId: parseInt(update.locationId.toString().replace('loc_', ''), 10),
      onHand: update.quantity,
      adjustment: update.adjustment,
      reserved: update.reserved,
    }));

    const results = await this.inventoryLevelRepository.updateMany(updates);

    return {
      success: true,
      updated: results.length,
      results: results.map((inv, index) => {
        const update = updates[index];
        const onHand = Number(inv.onHand);
        const reserved = Number(inv.reserved);

        return {
          productId: `prod_${inv.productId}`,
          locationId: `loc_${inv.locationId}`,
          previousQuantity: update.adjustment
            ? onHand - update.adjustment
            : onHand,
          newQuantity: onHand,
          reserved: reserved,
          available: onHand - reserved,
          status: 'success',
        };
      }),
    };
  }

  async getInventoryByProductIds(productIds: number[], organizationId: number): Promise<any[]> {
    const inventoryLevels = await this.inventoryLevelRepository.findMany({
      productIds: productIds,
      organizationId: organizationId,
    });

    return inventoryLevels;
  }

  /**
   * Obtiene inventario para múltiples productos
   * @param productIds Array de IDs de productos
   * @param organizationId ID de la organización
   * @returns Array de niveles de inventario
   */
  async getInventoryWithLocationsByProductIds(
    productIds: number[],
    organizationId: number,
  ): Promise<
    Array<{
      id: number;
      productId: number;
      locationId: number;
      onHand: string;
      reserved: string;
      updatedAt: Date | null;
    }>
  > {
    const inventoryLevels = await this.inventoryLevelRepository.findMany({
      productIds: productIds,
      organizationId: organizationId,
    });

    return inventoryLevels.map((inv) => ({
      id: inv.id,
      productId: inv.productId,
      locationId: inv.locationId,
      onHand: inv.onHand,
      reserved: inv.reserved,
      updatedAt: inv.updatedAt,
    }));
  }
}