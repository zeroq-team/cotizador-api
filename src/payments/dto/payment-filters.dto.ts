import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../../database/schemas';

export class PaymentFiltersDto {
  @ApiPropertyOptional({
    enum: [
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'refunded',
    ],
    description: 'Filter by payment status',
  })
  @IsOptional()
  @IsEnum([
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'refunded',
  ])
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Filter by payment type',
    enum: ['webpay', 'bank_transfer', 'check'],
  })
  @IsOptional()
  @IsEnum(['webpay', 'bank_transfer', 'check'])
  paymentType?: 'webpay' | 'bank_transfer' | 'check';

  @ApiPropertyOptional({
    description: 'Filter by cart ID',
  })
  @IsOptional()
  @IsString()
  cartId?: string;

  @ApiPropertyOptional({
    description: 'Filter by organization ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  organizationId?: number;

  @ApiPropertyOptional({
    description: 'Filter by quotation/conversation ID',
  })
  @IsOptional()
  @IsString()
  quotationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date (ISO string)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO string)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Minimum payment amount',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Maximum payment amount',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({
    description: 'Search by payment ID',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number (starts at 1)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}

