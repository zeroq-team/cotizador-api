import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject, MaxLength } from 'class-validator';

export enum LocationType {
  WAREHOUSE = 'warehouse',
  STORE = 'store',
  VIRTUAL = 'virtual',
}

export class CreateLocationDto {
  @ApiProperty({ description: 'Código único de la ubicación', example: 'BOD-001' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Nombre de la ubicación', example: 'Bodega Central' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ 
    description: 'Tipo de ubicación',
    enum: LocationType,
    example: LocationType.WAREHOUSE
  })
  @IsEnum(LocationType)
  type: LocationType;

  @ApiPropertyOptional({ 
    description: 'Dirección de la ubicación',
    example: {
      street: 'Calle Principal 123',
      city: 'Santiago',
      state: 'RM',
      zipCode: '12345',
      country: 'Chile'
    }
  })
  @IsOptional()
  @IsObject()
  address?: Record<string, any>;
}
