import { IsOptional, IsString, IsBoolean, IsUUID } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateDeliveryAddressDto {
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
    description: 'Comuna de entrega',
    example: 'Santiago',
    type: String,
  })
  @IsOptional()
  @IsString()
  commune?: string

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
  @IsBoolean()
  isDefault?: boolean
}

