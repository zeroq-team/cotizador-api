import { IsString, IsOptional, IsBoolean, IsInt, MinLength, MaxLength, IsDecimal } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomizationFieldGroupDto {
  @ApiProperty({ description: 'Nombre del grupo', example: 'Información de Logo' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción del grupo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización', example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Grupo activo', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Monto mínimo de la cotización para que este grupo sea visible/aplicable', example: '100000' })
  @IsOptional()
  @IsDecimal()
  minimumAmount?: string;
}

