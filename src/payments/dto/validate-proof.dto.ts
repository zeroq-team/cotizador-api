import { IsBoolean, IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class ValidateProofDto {
  @ApiProperty({ description: 'Whether the proof is valid' })
  @IsBoolean()
  isValid: boolean;

  @ApiPropertyOptional({ description: 'Validation notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Transaction ID found in proof' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Information about who validated the proof', type: ConfirmedByDto })
  @IsOptional()
  @IsObject()
  confirmedBy?: ConfirmedByDto;
}

