import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDate,
  Min,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertProductPriceDto {
  @ApiProperty({
    description: 'ID de la lista de precios',
    example: 1,
  })
  @IsNumber()
  priceListId: number;

  @ApiProperty({
    description: 'Monto del precio',
    example: '19990.50',
  })
  @IsString()
  amount: string;

  @ApiProperty({
    description: 'Código de moneda (ISO 4217)',
    example: 'CLP',
  })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiProperty({
    description: 'Indica si el precio incluye impuestos',
    example: true,
  })
  @IsBoolean()
  taxIncluded: boolean;

  @ApiPropertyOptional({
    description: 'Fecha desde la cual el precio es válido',
    example: '2024-01-01T00:00:00Z',
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validFrom?: Date;

  @ApiPropertyOptional({
    description: 'Fecha hasta la cual el precio es válido',
    example: '2024-12-31T23:59:59Z',
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validTo?: Date;
}

