import { IsBoolean, IsOptional, IsNotEmpty, IsNumber, IsPositive, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationPaymentMethodDto {
  @ApiProperty({
    description: 'Organization ID',
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  organizationId: number;

  @ApiPropertyOptional({
    description: 'Check payment method active status',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isCheckActive?: boolean;

  @ApiPropertyOptional({
    description: 'WebPay payment method active status',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isWebPayActive?: boolean;

  @ApiPropertyOptional({
    description: 'Bank transfer payment method active status',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isBankTransferActive?: boolean;

  @ApiPropertyOptional({
    description: 'Purchase order payment method active status',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPurchaseOrderActive?: boolean;

  @ApiPropertyOptional({
    description: 'Prefix for WebPay buy order (max 9 alphanumeric characters). Format: prefix-cartId',
    example: 'workit',
    default: 'workit',
    maxLength: 9,
  })
  @IsString()
  @IsOptional()
  @MaxLength(9, { message: 'WebPay prefix must be 9 characters or less' })
  @Matches(/^[a-zA-Z0-9]*$/, { message: 'WebPay prefix must contain only letters and numbers' })
  webPayPrefix?: string;

  @ApiPropertyOptional({
    description: 'Child commerce code for WebPay (max 50 characters). Used for multi-commerce configurations in Transbank',
    example: '597055555532',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'WebPay child commerce code must be 50 characters or less' })
  webPayChildCommerceCode?: string;

  @ApiPropertyOptional({
    description: 'Bank name for bank transfer payments',
    example: 'Banco de Chile',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Bank name must be 100 characters or less' })
  bankName?: string;

  @ApiPropertyOptional({
    description: 'Account type: "corriente" (checking) or "ahorro" (savings)',
    example: 'corriente',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Account type must be 20 characters or less' })
  accountType?: string;

  @ApiPropertyOptional({
    description: 'Bank account number',
    example: '12345678-9',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Account number must be 50 characters or less' })
  accountNumber?: string;

  @ApiPropertyOptional({
    description: 'Account holder name',
    example: 'Juan Pérez',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Account holder name must be 200 characters or less' })
  accountHolderName?: string;

  @ApiPropertyOptional({
    description: 'Type of document: "rut", "pasaporte", "cedula", "nit"',
    example: 'rut',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Document type must be 20 characters or less' })
  documentType?: string;

  @ApiPropertyOptional({
    description: 'Document number (RUT, passport, etc.)',
    example: '12345678-9',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Document number must be 50 characters or less' })
  documentNumber?: string;
}

