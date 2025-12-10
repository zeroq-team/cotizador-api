import { IsNumber, IsString, IsOptional, Min, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class AddPaymentProofDto {
  @ApiProperty({
    description: 'Tipo de pago',
    enum: ['bank_transfer', 'check'],
    example: 'bank_transfer',
    type: String,
  })
  @IsNotEmpty({ message: 'El tipo de pago es requerido' })
  @IsEnum(['bank_transfer', 'check'], { message: 'El tipo de pago debe ser bank_transfer o check' })
  @Transform(({ value }) => value?.trim())
  paymentType: 'bank_transfer' | 'check';

  @ApiProperty({
    description: 'Monto del pago',
    example: 100000,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: 'Referencia externa (número de cheque, referencia de transferencia, etc.)',
    example: '123456',
    type: String,
  })
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiPropertyOptional({
    description: 'Notas adicionales sobre el pago',
    example: 'Cheque número 123456',
    type: String,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

