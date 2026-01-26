import { IsArray, ValidateNested, IsOptional, IsString, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { CreateCartItemDto } from './create-cart-item.dto'

export class UpdateCartDto {
  @ApiPropertyOptional({
    description: 'Lista de items del carrito. Si se proporciona, reemplaza todos los items existentes. Solo se requiere productId y quantity, el resto de la información se obtendrá automáticamente del producto.',
    type: [CreateCartItemDto],
    example: [
      {
        productId: 'prod_123456',
        quantity: 1,
      },
      {
        productId: 'prod_789012',
        quantity: 2,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCartItemDto)
  items?: CreateCartItemDto[]

  @ApiPropertyOptional({
    description: 'Método de entrega',
    example: 'store_pickup',
    enum: ['store_pickup', 'home_delivery'],
    default: 'store_pickup',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['store_pickup', 'home_delivery'])
  deliveryType?: 'store_pickup' | 'home_delivery'

  // add suggestions to the cart
  @ApiPropertyOptional({
    description: 'Sugerencias de productos para agregar al carrito',
    example: [
      {
        productId: 'prod_123456',
        quantity: 1,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCartItemDto)
  suggestions?: CreateCartItemDto[]
}
