import { IsOptional, IsString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryAddressDto } from '../dto/delivery-address.dto';

export class UpdateCustomerFromCartDto {
  @ApiPropertyOptional({
    description: 'Nombre completo del cliente',
    example: 'Juan Pérez García',
    type: String,
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento del cliente',
    example: 'DNI',
    enum: ['DNI', 'NIT', 'C.C'],
  })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({
    description: 'Número de documento del cliente',
    example: '12345678',
    type: String,
  })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico del cliente',
    example: 'cliente@empresa.cl',
    type: String,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Código de país del teléfono',
    example: '+56',
    type: String,
  })
  @IsOptional()
  @IsString()
  phoneCode?: string;

  @ApiPropertyOptional({
    description: 'Número telefónico sin código de país',
    example: '912345678',
    type: String,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Dirección de entrega',
    type: DeliveryAddressDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;
}
