import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CartItemResponseDto } from './cart-item-response.dto'
import { CustomerResponseDto } from './customer-response.dto'

export class AppliedPriceListDto {
  @ApiProperty({ example: 1, description: 'ID de la lista de precios aplicada' })
  id: number

  @ApiProperty({ example: 'Lista Mayorista', description: 'Nombre de la lista de precios aplicada' })
  name: string

  @ApiProperty({ example: false, description: 'Indica si es la lista de precios por defecto' })
  isDefault: boolean
}

export class CartResponseDto {
  @ApiProperty({ example: 'cart_123456', description: 'ID único del carrito' })
  id: string

  @ApiPropertyOptional({ example: 'conv_abc123xyz', description: 'ID de la conversación' })
  conversationId?: string

  @ApiProperty({ example: 2, description: 'ID de la organización' })
  organizationId: number

  @ApiProperty({ type: [CartItemResponseDto], description: 'Items del carrito' })
  items: CartItemResponseDto[]

  @ApiProperty({ example: 3, description: 'Total de items en el carrito' })
  totalItems: number

  @ApiProperty({ example: 1349990, description: 'Precio total del carrito' })
  totalPrice: number

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de creación' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de actualización' })
  updatedAt: Date

  @ApiPropertyOptional({ 
    type: AppliedPriceListDto, 
    description: 'Lista de precios aplicada al carrito (si es diferente a la por defecto)' 
  })
  appliedPriceList?: AppliedPriceListDto

  @ApiPropertyOptional({ 
    example: 50000, 
    description: 'Ahorro obtenido al aplicar una lista de precios diferente a la por defecto' 
  })
  savings?: number

  @ApiPropertyOptional({ 
    example: 1399990, 
    description: 'Precio total que tendría el carrito con la lista de precios por defecto' 
  })
  defaultPriceListTotal?: number

  @ApiPropertyOptional({ 
    type: CustomerResponseDto, 
    description: 'Datos del cliente asociado al carrito' 
  })
  customer?: CustomerResponseDto

  @ApiPropertyOptional({ 
    example: 1650, 
    description: 'Precio total de personalización del carrito (suma de todos los precios de personalización de los items, neto sin IVA)' 
  })
  totalCustomizationPrice?: number
}

