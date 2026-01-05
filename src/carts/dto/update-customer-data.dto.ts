import { IsOptional, IsString, IsObject, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class DeliveryAddressDto {
  @ApiPropertyOptional({
    description: 'Calle de entrega',
    example: 'Av. Providencia',
    type: String,
  })
  @IsOptional()
  @IsString()
  street?: string

  @ApiPropertyOptional({
    description: 'Número de calle de entrega',
    example: '123',
    type: String,
  })
  @IsOptional()
  @IsString()
  streetNumber?: string

  @ApiPropertyOptional({
    description: 'Departamento o unidad',
    example: '501',
    type: String,
  })
  @IsOptional()
  @IsString()
  apartment?: string

  @ApiPropertyOptional({
    description: 'Ciudad de entrega',
    example: 'Santiago',
    type: String,
  })
  @IsOptional()
  @IsString()
  city?: string

  @ApiPropertyOptional({
    description: 'Región de entrega',
    example: 'Región Metropolitana',
    type: String,
  })
  @IsOptional()
  @IsString()
  region?: string

  @ApiPropertyOptional({
    description: 'Código postal',
    example: '7500000',
    type: String,
  })
  @IsOptional()
  @IsString()
  postalCode?: string

  @ApiPropertyOptional({
    description: 'País de entrega',
    example: 'Chile',
    type: String,
  })
  @IsOptional()
  @IsString()
  country?: string

  @ApiPropertyOptional({
    description: 'Oficina de correos',
    example: 'Oficina Central',
    type: String,
  })
  @IsOptional()
  @IsString()
  office?: string

  @ApiPropertyOptional({
    description: 'Marcar como dirección por defecto',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  isDefault?: boolean
}

export class UpdateCustomerDataDto {
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
    description: 'Teléfono de contacto del cliente (deprecated: usar phoneCode y phoneNumber)',
    example: '+56 9 1234 5678',
    type: String,
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({
    description: 'Código de país del teléfono',
    example: '+56',
    type: String,
  })
  @IsOptional()
  @IsString()
  phoneCode?: string

  @ApiPropertyOptional({
    description: 'Número telefónico sin código de país',
    example: '912345678',
    type: String,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string

  @ApiPropertyOptional({
    description: 'Dirección de entrega',
    type: DeliveryAddressDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto
}

