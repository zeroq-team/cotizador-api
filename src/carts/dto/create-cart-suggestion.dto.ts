import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator'

export class CreateCartSuggestionDto {
  @ApiProperty({ example: 'prod_123456', description: 'ID del producto' })
  @IsString()
  @IsNotEmpty()
  productId: string

  @ApiProperty({ example: 'Laptop Dell XPS 13', description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  productName: string

  @ApiPropertyOptional({ example: 'DELL-XPS13-2024', description: 'SKU del producto' })
  @IsString()
  @IsOptional()
  sku?: string

  @ApiPropertyOptional({ example: 'Laptop de alta gama con procesador Intel i7', description: 'Descripción del producto' })
  @IsString()
  @IsOptional()
  description?: string
}

export class CreateCartSuggestionsDto {
  @ApiProperty({
    type: [CreateCartSuggestionDto],
    description: 'Lista de sugerencias a crear (el cartId se toma del parámetro de la URL, el interactionId se genera automáticamente)',
    example: [
      {
        productId: 'prod_123456',
        productName: 'Laptop Dell XPS 13',
        sku: 'DELL-XPS13-2024',
        description: 'Laptop de alta gama',
      },
    ],
  })
  @IsNotEmpty()
  suggestions: CreateCartSuggestionDto[]
}

