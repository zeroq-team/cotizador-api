import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, PaymentType } from '../../database/schemas';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Cart ID' })
  @IsUUID()
  cartId: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Payment type',
    enum: ['webpay', 'bank_transfer', 'check'],
  })
  @IsEnum(['webpay', 'bank_transfer', 'check'])
  paymentType: PaymentType;

  @ApiPropertyOptional({
    description: 'Payment status',
    enum: [
      'pending',
      'waiting_for_confirmation',
      'completed',
      'failed',
      'cancelled',
    ],
  })
  @IsOptional()
  @IsEnum([
    'pending',
    'waiting_for_confirmation',
    'completed',
    'failed',
    'cancelled',
  ])
  status?: PaymentStatus;

  // Campos para pagos con comprobante (transferencia/cheque)
  @ApiPropertyOptional({ description: 'Proof of payment URL' })
  @IsOptional()
  @IsString()
  proofUrl?: string;

  @ApiPropertyOptional({ description: 'External reference (e.g., check number)' })
  @IsOptional()
  @IsString()
  externalReference?: string;

  // Campos para WebPay
  @ApiPropertyOptional({ description: 'Transaction ID (e.g., WebPay buyOrder)' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Authorization code from payment gateway' })
  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @ApiPropertyOptional({ description: 'Last 4 digits of card' })
  @IsOptional()
  @IsString()
  cardLastFourDigits?: string;

  // Fechas
  @ApiPropertyOptional({ description: 'Payment date (ISO string)' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ description: 'Confirmation date (ISO string)' })
  @IsOptional()
  @IsDateString()
  confirmedAt?: string;

  // Información adicional
  @ApiPropertyOptional({ description: 'Additional metadata (e.g., full WebPay response)' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Payment notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
