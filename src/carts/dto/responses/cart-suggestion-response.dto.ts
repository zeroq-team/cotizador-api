import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CartSuggestionResponseDto {
  @ApiProperty({ example: 'suggestion_123', description: 'ID único de la sugerencia' })
  id: string

  @ApiProperty({ example: 'cart_123456', description: 'ID del carrito' })
  cartId: string

  @ApiPropertyOptional({ example: 'interaction_123456', description: 'ID de la interacción del flujo que generó esta sugerencia' })
  interactionId?: string

  @ApiProperty({ example: 'prod_123456', description: 'ID del producto' })
  productId: string

  @ApiProperty({ example: 'Laptop Dell XPS 13', description: 'Nombre del producto' })
  productName: string

  @ApiPropertyOptional({ example: 'DELL-XPS13-2024', description: 'SKU del producto' })
  sku?: string

  @ApiPropertyOptional({ example: 'Laptop de alta gama con procesador Intel i7', description: 'Descripción del producto' })
  description?: string

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de creación' })
  createdAt: Date
}

