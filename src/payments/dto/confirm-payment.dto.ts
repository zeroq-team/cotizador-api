import { IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmedByDto {
  @ApiPropertyOptional({ description: 'User ID who confirmed the payment' })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: 'User name who confirmed the payment' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'User email who confirmed the payment' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class ConfirmPaymentDto {
  @ApiPropertyOptional({ description: 'Transaction ID' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ description: 'External reference' })
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiPropertyOptional({ description: 'Confirmation notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Information about who confirmed the payment', type: ConfirmedByDto })
  @IsOptional()
  @IsObject()
  confirmedBy?: ConfirmedByDto;
}

