import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsEnum, 
  IsUUID, 
  IsObject,
  IsArray,
  ValidateNested,
  IsDecimal
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Tipos de campos soportados - Simplificado a 4 tipos esenciales
export enum CustomizationFieldType {
  TEXT = 'text',       // Texto simple o multilínea
  NUMBER = 'number',   // Número (entero o decimal)
  BOOLEAN = 'boolean', // Verdadero/Falso (checkbox o switch)
  IMAGE = 'image',     // Carga de imagen
}

// DTO para opciones de select/radio/checkboxes
export class FieldOptionDto {
  @ApiProperty({ description: 'Valor técnico de la opción', example: 'red' })
  @IsString()
  value: string;

  @ApiProperty({ description: 'Etiqueta visible', example: 'Rojo' })
  @IsString()
  label: string;

  @ApiPropertyOptional({ description: 'Precio adicional', example: 100 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: 'Descripción de la opción' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URL de imagen para la opción' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

// DTO para restricciones de archivos
export class FileConstraintsDto {
  @ApiPropertyOptional({ description: 'Tamaño máximo en bytes', example: 5242880 })
  @IsOptional()
  @IsNumber()
  maxSize?: number;

  @ApiPropertyOptional({ description: 'Número máximo de archivos', example: 5 })
  @IsOptional()
  @IsNumber()
  maxFiles?: number;

  @ApiPropertyOptional({ description: 'Formatos aceptados', example: ['image/png', 'image/jpeg'] })
  @IsOptional()
  @IsArray()
  acceptedFormats?: string[];

  @ApiPropertyOptional({ description: 'Ancho mínimo de imagen', example: 800 })
  @IsOptional()
  @IsNumber()
  minWidth?: number;

  @ApiPropertyOptional({ description: 'Alto mínimo de imagen', example: 600 })
  @IsOptional()
  @IsNumber()
  minHeight?: number;

  @ApiPropertyOptional({ description: 'Ancho máximo de imagen', example: 4000 })
  @IsOptional()
  @IsNumber()
  maxWidth?: number;

  @ApiPropertyOptional({ description: 'Alto máximo de imagen', example: 3000 })
  @IsOptional()
  @IsNumber()
  maxHeight?: number;

  @ApiPropertyOptional({ description: 'Relación de aspecto', example: '16:9' })
  @IsOptional()
  @IsString()
  aspectRatio?: string;
}

// DTO para configuración UI
export class UIConfigDto {
  @ApiPropertyOptional({ description: 'Ancho en grid (1-12)', example: 6 })
  @IsOptional()
  @IsNumber()
  columns?: number;

  @ApiPropertyOptional({ description: 'Icono a mostrar', example: 'palette' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Color del campo', example: '#FF5733' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Mostrar etiqueta', example: true })
  @IsOptional()
  @IsBoolean()
  showLabel?: boolean;

  @ApiPropertyOptional({ description: 'Mostrar texto de ayuda', example: true })
  @IsOptional()
  @IsBoolean()
  showHelpText?: boolean;

  @ApiPropertyOptional({ description: 'Configuración de visualización condicional' })
  @IsOptional()
  @IsObject()
  conditionalDisplay?: {
    dependsOn: string;
    condition: 'equals' | 'not_equals' | 'contains' | 'greater' | 'less';
    value: any;
  };
}

export class CreateCustomizationFieldDto {
  @ApiProperty({ description: 'ID del grupo al que pertenece', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ description: 'Nombre técnico único', example: 'logo_color' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Nombre visible para el usuario', example: 'Color del Logo' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ description: 'Descripción del campo' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Texto de placeholder', example: 'Selecciona un color' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Texto de ayuda adicional' })
  @IsOptional()
  @IsString()
  helpText?: string;

  @ApiProperty({ description: 'Tipo de campo', enum: CustomizationFieldType })
  @IsEnum(CustomizationFieldType)
  type: CustomizationFieldType;

  @ApiPropertyOptional({ description: 'Campo requerido', example: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Campo activo', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Orden de visualización', example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Valor por defecto' })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({ description: 'Opciones para select/radio/checkboxes', type: [FieldOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  // Validaciones numéricas
  @ApiPropertyOptional({ description: 'Valor mínimo', example: 0 })
  @IsOptional()
  @IsDecimal()
  minValue?: string;

  @ApiPropertyOptional({ description: 'Valor máximo', example: 100 })
  @IsOptional()
  @IsDecimal()
  maxValue?: string;

  @ApiPropertyOptional({ description: 'Paso para slider/número', example: 1 })
  @IsOptional()
  @IsDecimal()
  step?: string;

  // Validaciones de texto
  @ApiPropertyOptional({ description: 'Longitud mínima', example: 3 })
  @IsOptional()
  @IsNumber()
  minLength?: number;

  @ApiPropertyOptional({ description: 'Longitud máxima', example: 100 })
  @IsOptional()
  @IsNumber()
  maxLength?: number;

  @ApiPropertyOptional({ description: 'Patrón regex para validación', example: '^[A-Za-z]+$' })
  @IsOptional()
  @IsString()
  pattern?: string;

  // Configuración de archivos
  @ApiPropertyOptional({ description: 'Restricciones para archivos/imágenes', type: FileConstraintsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileConstraintsDto)
  fileConstraints?: FileConstraintsDto;

  // Configuración de precio
  @ApiPropertyOptional({ description: 'El campo afecta el precio', example: false })
  @IsOptional()
  @IsBoolean()
  affectsPrice?: boolean;

  @ApiPropertyOptional({ description: 'Modificador de precio', example: 100 })
  @IsOptional()
  @IsDecimal()
  priceModifier?: string;

  @ApiPropertyOptional({ description: 'Tipo de modificador', enum: ['fixed', 'percentage'] })
  @IsOptional()
  @IsEnum(['fixed', 'percentage'])
  priceModifierType?: 'fixed' | 'percentage';

  // Configuración UI
  @ApiPropertyOptional({ description: 'Configuración de UI', type: UIConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UIConfigDto)
  uiConfig?: UIConfigDto;

  // Metadata
  @ApiPropertyOptional({ description: 'Metadata adicional' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}
