import { IsArray, ValidateNested, IsOptional, IsString } from 'class-validator'
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
    description: 'Nombre completo del cliente',
    example: 'Juan Pérez García',
    type: String,
  })
  @IsOptional()
  @IsString()
  fullName?: string

  @ApiPropertyOptional({
    description: 'Tipo de documento del cliente',
    example: 'DNI',
    enum: ['DNI', 'NIT', 'C.C'],
  })
  @IsOptional()
  @IsString()
  documentType?: string

  @ApiPropertyOptional({
    description: 'Número de documento del cliente',
    example: '12345678',
    type: String,
  })
  @IsOptional()
  @IsString()
  documentNumber?: string

  @ApiPropertyOptional({
    description: 'Correo electrónico del cliente',
    example: 'cliente@empresa.cl',
    type: String,
  })
  @IsOptional()
  @IsString()
  email?: string

  @ApiPropertyOptional({
    description: 'Teléfono de contacto del cliente',
    example: '+56 9 1234 5678',
    type: String,
  })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({
    description: 'DEPRECATED: Use /cart/:id/customer-data endpoint instead. Calle de entrega',
    example: 'Av. Providencia',
    type: String,
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  deliveryStreet?: string

  @ApiPropertyOptional({
    description: 'Número de calle de entrega',
    example: '1234',
    type: String,
  })
  @IsOptional()
  @IsString()
  deliveryStreetNumber?: string

  @ApiPropertyOptional({
    description: 'Departamento/Oficina de entrega',
    example: '501',
    type: String,
  })
  @IsOptional()
  @IsString()
  deliveryApartment?: string

  @ApiPropertyOptional({
    description: 'Ciudad de entrega',
    example: 'Santiago',
    type: String,
  })
  @IsOptional()
  @IsString()
  deliveryCity?: string

  @ApiPropertyOptional({
    description: 'Región de entrega',
    example: 'Región Metropolitana',
    type: String,
  })
  @IsOptional()
  @IsString()
  deliveryRegion?: string

  @ApiPropertyOptional({
    description: 'Código postal de entrega',
    example: '7500000',
    type: String,
  })
  @IsOptional()
  @IsString()
  deliveryPostalCode?: string

  @ApiPropertyOptional({
    description: 'País de entrega',
    example: 'Chile',
    type: String,
  })
  @IsOptional()
  @IsString()
  deliveryCountry?: string

  @ApiPropertyOptional({
    description: 'Oficina/Edificio de entrega',
    example: 'Torre A',
    type: String,
  })
  @IsOptional()
  @IsString()
  deliveryOffice?: string

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
