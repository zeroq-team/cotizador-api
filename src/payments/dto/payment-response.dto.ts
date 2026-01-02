import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../../database/schemas';

export class PaymentResponseDto {
  @ApiProperty({ example: 'payment_123456', description: 'ID único del pago' })
  id: string;

  @ApiProperty({ example: 'cart_123456', description: 'ID del carrito' })
  cartId: string;

  @ApiProperty({ example: 'payment_method_123456', description: 'ID del método de pago' })
  paymentMethodId: string;

  @ApiProperty({ example: '100000.00', description: 'Monto del pago' })
  amount: string;

  @ApiProperty({
    enum: ['pending', 'waiting_for_confirmation', 'completed', 'failed', 'cancelled'],
    example: 'pending',
    description: 'Estado del pago',
  })
  status: PaymentStatus;

  @ApiPropertyOptional({
    example: 'https://example.com/proof.jpg',
    description: 'URL del comprobante de pago',
  })
  proofUrl?: string;

  @ApiPropertyOptional({
    example: 'TXN_123456',
    description: 'ID de la transacción del gateway de pago',
  })
  transactionId?: string;

  @ApiPropertyOptional({
    example: 'REF_123456',
    description: 'Referencia externa del pago',
  })
  externalReference?: string;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Fecha en que se realizó el pago',
  })
  paymentDate?: Date;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Fecha en que se confirmó el pago',
  })
  confirmedAt?: Date;

  @ApiPropertyOptional({
    example: { 'field-1': 'value-1' },
    description: 'Metadatos adicionales del pago',
  })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'Notas adicionales sobre el pago',
    description: 'Notas del pago',
  })
  notes?: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Fecha de creación',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Fecha de actualización',
  })
  updatedAt: Date;
}

