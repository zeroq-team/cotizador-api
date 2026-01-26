import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CustomizationValueDto {
  @ApiProperty({ example: 'bordado_estandar', description: 'Valor del campo de personalización' })
  value: any

  @ApiPropertyOptional({ example: 550, description: 'Precio unitario del campo (neto, sin IVA)' })
  price?: number

  @ApiPropertyOptional({ example: 655, description: 'Precio unitario del campo con IVA incluido (para trazabilidad)' })
  priceWithTax?: number

  @ApiPropertyOptional({ example: true, description: 'Indica si el precio incluye IVA' })
  includesTax?: boolean
}

export class CartItemResponseDto {
  @ApiProperty({ example: 'item_789', description: 'ID único del item' })
  id: string

  @ApiProperty({ example: 'cart_123456', description: 'ID del carrito' })
  cartId: string

  @ApiProperty({ example: 'prod_123456', description: 'ID del producto' })
  productId: string

  @ApiProperty({ example: 'Laptop Dell XPS 13', description: 'Nombre del producto' })
  name: string

  @ApiPropertyOptional({ example: 'DELL-XPS13-2024', description: 'SKU del producto' })
  sku?: string

  @ApiPropertyOptional({ example: '13 pulgadas', description: 'Talla del producto' })
  size?: string

  @ApiPropertyOptional({ example: 'Plata', description: 'Color del producto' })
  color?: string

  @ApiProperty({ example: 1299990, description: 'Precio unitario del producto' })
  price: number

  @ApiProperty({ example: 1, description: 'Cantidad del producto' })
  quantity: number

  @ApiPropertyOptional({ example: 'https://example.com/images/laptop.jpg', description: 'URL de la imagen' })
  imageUrl?: string

  @ApiPropertyOptional({ example: 10, description: 'Stock máximo disponible' })
  maxStock?: number

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de creación' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de actualización' })
  updatedAt: Date

  @ApiPropertyOptional({ 
    example: { 
      'logo': { value: 'https://...', price: 0 },
      'bordados': { value: 'bordado_estandar', price: 550, includesTax: true }
    }, 
    description: 'Valores de personalización con precio e información de impuestos' 
  })
  customizationValues?: Record<string, CustomizationValueDto>
}

