import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomizationFieldType } from './create-customization-field.dto';

/**
 * DTO de respuesta para un campo de personalización individual
 */
export class CustomizationFieldResponseDto {
  @ApiProperty({ 
    description: 'ID único del campo',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({ 
    description: 'Nombre técnico único',
    example: 'logo_color'
  })
  name: string;

  @ApiProperty({ 
    description: 'Nombre visible para el usuario',
    example: 'Color del Logo'
  })
  displayName: string;

  @ApiPropertyOptional({ 
    description: 'Descripción del campo'
  })
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Texto de placeholder'
  })
  placeholder?: string;

  @ApiPropertyOptional({ 
    description: 'Texto de ayuda adicional'
  })
  helpText?: string;

  @ApiProperty({ 
    description: 'Tipo de campo',
    enum: CustomizationFieldType,
    example: 'select'
  })
  type: CustomizationFieldType;

  @ApiProperty({ 
    description: 'Campo requerido',
    example: false
  })
  isRequired: boolean;

  @ApiProperty({ 
    description: 'Campo activo',
    example: true
  })
  isActive: boolean;

  @ApiProperty({ 
    description: 'Orden de visualización',
    example: 0
  })
  sortOrder: number;

  @ApiPropertyOptional({ 
    description: 'Valor por defecto'
  })
  defaultValue?: string;

  @ApiPropertyOptional({ 
    description: 'Opciones para select/radio/checkboxes',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        value: { type: 'string', example: 'red' },
        label: { type: 'string', example: 'Rojo' },
        price: { type: 'number', example: 100 },
        description: { type: 'string' },
        imageUrl: { type: 'string' }
      }
    }
  })
  options?: any[];

  @ApiPropertyOptional({ 
    description: 'Valor mínimo (para campos numéricos)'
  })
  minValue?: string;

  @ApiPropertyOptional({ 
    description: 'Valor máximo (para campos numéricos)'
  })
  maxValue?: string;

  @ApiPropertyOptional({ 
    description: 'Paso (para slider/número)'
  })
  step?: string;

  @ApiPropertyOptional({ 
    description: 'Longitud mínima (para campos de texto)'
  })
  minLength?: number;

  @ApiPropertyOptional({ 
    description: 'Longitud máxima (para campos de texto)'
  })
  maxLength?: number;

  @ApiPropertyOptional({ 
    description: 'Patrón regex para validación'
  })
  pattern?: string;

  @ApiPropertyOptional({ 
    description: 'Restricciones para archivos/imágenes',
    type: 'object',
    properties: {
      maxSize: { type: 'number', example: 5242880 },
      maxFiles: { type: 'number', example: 5 },
      acceptedFormats: { type: 'array', items: { type: 'string' } },
      minWidth: { type: 'number' },
      minHeight: { type: 'number' },
      maxWidth: { type: 'number' },
      maxHeight: { type: 'number' },
      aspectRatio: { type: 'string', example: '16:9' }
    }
  })
  fileConstraints?: any;

  @ApiPropertyOptional({ 
    description: 'El campo afecta el precio'
  })
  affectsPrice?: boolean;

  @ApiPropertyOptional({ 
    description: 'Modificador de precio'
  })
  priceModifier?: string;

  @ApiPropertyOptional({ 
    description: 'Tipo de modificador',
    enum: ['fixed', 'percentage']
  })
  priceModifierType?: 'fixed' | 'percentage';

  @ApiPropertyOptional({ 
    description: 'Configuración de UI'
  })
  uiConfig?: any;

  @ApiPropertyOptional({ 
    description: 'Metadata adicional'
  })
  metadata?: any;

  @ApiProperty({ 
    description: 'Fecha de creación',
    example: '2025-01-15T10:30:00Z'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Fecha de última actualización',
    example: '2025-01-15T10:30:00Z'
  })
  updatedAt: Date;
}

/**
 * DTO de respuesta para lista de campos de personalización
 */
export class CustomizationFieldsListResponseDto {
  @ApiProperty({ 
    description: 'Lista de campos de personalización',
    type: [CustomizationFieldResponseDto]
  })
  data: CustomizationFieldResponseDto[];
}

/**
 * DTO de respuesta simple para toggle de estado
 */
export class ToggleActiveResponseDto {
  @ApiProperty({ 
    description: 'ID del campo',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({ 
    description: 'Nuevo estado activo/inactivo',
    example: false
  })
  isActive: boolean;
}

