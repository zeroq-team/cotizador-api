import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto {
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
    enum: ['DNI', 'NIT', 'C.C', 'RUT'],
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
}
