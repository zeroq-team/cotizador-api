import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiHeader({
  name: 'x-organization-id',
  description: 'ID de la organización',
  required: true,
})
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({
    summary: 'Obtener inventario',
    description: 'Retorna el inventario de productos con soporte para filtrado y paginación.',
  })
  @ApiQuery({ name: 'product_id', required: false, description: 'Filtrar por ID de producto' })
  @ApiQuery({ name: 'location_id', required: false, description: 'Filtrar por ID de ubicación' })
  @ApiQuery({ name: 'sku', required: false, description: 'Filtrar por SKU del producto' })
  @ApiQuery({ name: 'minStock', required: false, type: Number, description: 'Stock mínimo' })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean, description: 'Solo productos con stock' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items por página', example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Inventario obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'inv_123456' },
              productId: { type: 'string', example: 'prod_123456' },
              productName: { type: 'string', example: 'Laptop Dell XPS 13' },
              sku: { type: 'string', example: 'DELL-XPS13-2024' },
              locationId: { type: 'string', example: 'loc_789' },
              locationName: { type: 'string', example: 'Bodega Central' },
              quantity: { type: 'number', example: 15 },
              reserved: { type: 'number', example: 3 },
              available: { type: 'number', example: 12 },
              minStock: { type: 'number', example: 5 },
              maxStock: { type: 'number', example: 50 },
              status: { type: 'string', example: 'in_stock', enum: ['in_stock', 'low_stock', 'out_of_stock'] },
              lastUpdated: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            totalItems: { type: 'number', example: 100 },
            totalPages: { type: 'number', example: 5 },
            hasNextPage: { type: 'boolean', example: true },
            hasPrevPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @Get()
  async getInventory(
    @Query() query: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return await this.inventoryService.getInventory({
      ...query,
      organizationId,
    });
  }

  @ApiOperation({
    summary: 'Actualizar inventario',
    description: 'Actualiza la cantidad de stock para uno o múltiples productos en el inventario. Puede ser usado para ajustes de inventario, recepciones o movimientos.',
  })
  @ApiBody({
    description: 'Datos de actualización del inventario',
    schema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            required: ['productId', 'locationId'],
            properties: {
              productId: { type: 'string', example: 'prod_123456' },
              locationId: { type: 'string', example: 'loc_789' },
              quantity: { type: 'number', example: 20, description: 'Nueva cantidad total' },
              adjustment: { type: 'number', example: 5, description: 'Ajuste incremental (+/-) en lugar de cantidad absoluta' },
              reason: { type: 'string', example: 'Recepción de mercancía', description: 'Motivo del ajuste' },
            },
          },
        },
        bulkUpdate: {
          type: 'boolean',
          example: false,
          description: 'Si es true, procesa todas las actualizaciones como una transacción',
        },
      },
      example: {
        updates: [
          {
            productId: 'prod_123456',
            locationId: 'loc_789',
            adjustment: 10,
            reason: 'Recepción de mercancía',
          },
          {
            productId: 'prod_789',
            locationId: 'loc_789',
            quantity: 25,
            reason: 'Conteo físico',
          },
        ],
        bulkUpdate: true,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Inventario actualizado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        updated: { type: 'number', example: 2 },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              locationId: { type: 'string' },
              previousQuantity: { type: 'number' },
              newQuantity: { type: 'number' },
              status: { type: 'string', example: 'success' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o error en la actualización',
  })
  @Put()
  @HttpCode(HttpStatus.OK)
  async updateInventory(
    @Body() data: any,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return await this.inventoryService.updateInventory({
      ...data,
      organizationId,
    });
  }
}
