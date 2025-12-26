import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CustomerResponseDto {
  @ApiProperty({ example: 'customer_123456', description: 'ID único del cliente' })
  id: string

  @ApiProperty({ example: 2, description: 'ID de la organización' })
  organizationId: number

  @ApiPropertyOptional({ example: 'Juan Pérez García', description: 'Nombre completo del cliente' })
  fullName?: string

  @ApiPropertyOptional({ example: 'RUT', description: 'Tipo de documento', enum: ['RUT', 'NIF', 'DNI', 'C.C', 'Pasaporte'] })
  documentType?: string

  @ApiPropertyOptional({ example: '11.111.111-1', description: 'Número de documento' })
  documentNumber?: string

  @ApiPropertyOptional({ example: 'cliente@empresa.cl', description: 'Correo electrónico' })
  email?: string

  @ApiPropertyOptional({ example: '+56 9 1234 5678', description: 'Teléfono de contacto' })
  phone?: string

  @ApiPropertyOptional({ example: 'Av. Providencia', description: 'Calle de entrega' })
  deliveryStreet?: string

  @ApiPropertyOptional({ example: '1234', description: 'Número de calle de entrega' })
  deliveryStreetNumber?: string

  @ApiPropertyOptional({ example: '501', description: 'Departamento/Oficina de entrega' })
  deliveryApartment?: string

  @ApiPropertyOptional({ example: 'Santiago', description: 'Ciudad de entrega' })
  deliveryCity?: string

  @ApiPropertyOptional({ example: 'Región Metropolitana', description: 'Región de entrega' })
  deliveryRegion?: string

  @ApiPropertyOptional({ example: '7500000', description: 'Código postal de entrega' })
  deliveryPostalCode?: string

  @ApiPropertyOptional({ example: 'Chile', description: 'País de entrega' })
  deliveryCountry?: string

  @ApiPropertyOptional({ example: 'Torre A', description: 'Oficina/Edificio de entrega' })
  deliveryOffice?: string

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de creación' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de actualización' })
  updatedAt: Date
}

