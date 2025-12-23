import { IsUUID, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentType } from '../../database/schemas';

export class CreateProofPaymentDto {
  @ApiProperty({ description: 'Cart ID' })
  @IsUUID()
  cartId: string;

  @ApiProperty({
    description: 'Payment type',
    enum: ['bank_transfer', 'check', 'purchase_order'],
  })
  @IsEnum(['bank_transfer', 'check', 'purchase_order'])
  paymentType: PaymentType;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Proof URL (screenshot/document) - optional if file is uploaded' })
  @IsOptional()
  @IsString()
  proofUrl?: string;

  @ApiPropertyOptional({ description: 'Payment notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Transaction reference from bank' })
  @IsOptional()
  @IsString()
  externalReference?: string;
}

