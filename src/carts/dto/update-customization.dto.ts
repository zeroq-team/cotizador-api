import { IsNotEmpty, IsString, IsObject, ValidateNested, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class ItemCustomizationDto {
  @ApiProperty({
    description: 'ID del item del carrito a personalizar',
    example: 'item-123',
  })
  @IsNotEmpty()
  @IsString()
  itemId: string

  @ApiProperty({
    description: 'Valores de personalización por campo para este item',
    example: {
      'field-1': 'Logo personalizado',
      'field-2': 'Azul',
      'field-3': true,
    },
    type: 'object',
    additionalProperties: true,
  })
  @IsNotEmpty()
  @IsObject()
  customizationValues: Record<string, any>
}

export class UpdateCustomizationDto {
  @ApiProperty({
    description: 'Lista de personalizaciones por item del carrito',
    type: [ItemCustomizationDto],
    example: [
      {
        itemId: 'item-123',
        customizationValues: {
          'field-1': 'Logo personalizado',
          'field-2': 'Azul',
        },
      },
      {
        itemId: 'item-456',
        customizationValues: {
          'field-1': 'Logo diferente',
          'field-2': 'Rojo',
        },
      },
    ],
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ItemCustomizationDto)
  itemCustomizations: ItemCustomizationDto[]

  // Mantener compatibilidad con versión anterior (deprecated)
  @ApiPropertyOptional({
    description: '[DEPRECATED] Lista de IDs de productos seleccionados para personalizar',
    example: ['prod-123', 'prod-456'],
    type: [String],
    deprecated: true,
  })
  @IsOptional()
  @IsString({ each: true })
  selectedProductIds?: string[]

  @ApiPropertyOptional({
    description: '[DEPRECATED] Valores de personalización por campo (aplicados a todos los productos seleccionados)',
    example: {
      'field-1': 'Logo personalizado',
      'field-2': 'Azul',
      'field-3': true,
    },
    type: 'object',
    additionalProperties: true,
    deprecated: true,
  })
  @IsOptional()
  @IsObject()
  customizationValues?: Record<string, any>
}

