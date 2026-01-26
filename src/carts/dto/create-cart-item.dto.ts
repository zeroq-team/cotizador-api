import { IsString, IsNumber, Min, IsBoolean, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateCartItemDto {
  @ApiProperty({
    description: 'ID único del producto',
    example: 'prod_123456',
    type: String,
  })
  @IsString()
  productId: number

  @ApiProperty({
    description: 'Cantidad del producto a agregar al carrito',
    example: 1,
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number

  @ApiProperty({})
  @IsString()
  operation: 'add' | 'remove' = 'add'

  @ApiPropertyOptional({
    description: 'Indica si el producto fue agregado manualmente por un ejecutivo. Por defecto es false (agregado por el agente IA)',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  addedManually?: boolean = false
}
