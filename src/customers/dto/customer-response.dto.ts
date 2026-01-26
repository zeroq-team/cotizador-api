import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryAddressResponseDto {
  @ApiProperty({ example: 'address_123456', description: 'ID único de la dirección' })
  id: string;

  @ApiProperty({ example: 'customer_123456', description: 'ID del cliente' })
  customerId: string;

  @ApiPropertyOptional({ example: 'Av. Providencia', description: 'Calle' })
  street?: string;

  @ApiPropertyOptional({ example: '1234', description: 'Número de calle' })
  streetNumber?: string;

  @ApiPropertyOptional({ example: '501', description: 'Departamento/Oficina' })
  apartment?: string;

  @ApiPropertyOptional({ example: 'Santiago', description: 'Comuna' })
  commune?: string;

  @ApiPropertyOptional({ example: 'Región Metropolitana', description: 'Región' })
  region?: string;

  @ApiPropertyOptional({ example: '7500000', description: 'Código postal' })
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Chile', description: 'País' })
  country?: string;

  @ApiPropertyOptional({ example: 'Torre A', description: 'Oficina/Edificio' })
  office?: string;

  @ApiProperty({ example: true, description: 'Es dirección por defecto' })
  isDefault: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de actualización' })
  updatedAt: Date;
}

export class CustomerResponseDto {
  @ApiProperty({ example: 'customer_123456', description: 'ID único del cliente' })
  id: string;

  @ApiProperty({ example: 2, description: 'ID de la organización' })
  organizationId: number;

  @ApiPropertyOptional({ example: 'Juan Pérez García', description: 'Nombre completo del cliente' })
  fullName?: string;

  @ApiPropertyOptional({ example: 'RUT', description: 'Tipo de documento', enum: ['RUT', 'NIF', 'DNI', 'C.C', 'Pasaporte'] })
  documentType?: string;

  @ApiPropertyOptional({ example: '11.111.111-1', description: 'Número de documento' })
  documentNumber?: string;

  @ApiPropertyOptional({ example: 'cliente@empresa.cl', description: 'Correo electrónico' })
  email?: string;

  @ApiPropertyOptional({ example: '+56', description: 'Código de país del teléfono' })
  phoneCode?: string;

  @ApiPropertyOptional({ example: '912345678', description: 'Número telefónico sin código de país' })
  phoneNumber?: string;

  @ApiPropertyOptional({
    type: [DeliveryAddressResponseDto],
    description: 'Direcciones de entrega del cliente',
  })
  deliveryAddresses?: DeliveryAddressResponseDto[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de actualización' })
  updatedAt: Date;
}
