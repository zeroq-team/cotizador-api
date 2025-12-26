import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuoteListItemDto {
  @ApiProperty({ example: 'cart_123456', description: 'ID único del carrito' })
  id: string;

  @ApiPropertyOptional({
    example: 'conv_abc123xyz',
    description: 'ID de la conversación',
  })
  conversationId?: string;

  @ApiProperty({ example: 2, description: 'ID de la organización' })
  organizationId: number;

  @ApiProperty({ example: 3, description: 'Total de items en el carrito' })
  totalItems: number;

  @ApiProperty({ example: 1349990, description: 'Precio total del carrito' })
  totalPrice: number;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Fecha de creación',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Fecha de actualización',
  })
  updatedAt: Date;

  @ApiProperty({
    example: 'Cotización #123456',
    description: 'Nombre para mostrar',
  })
  displayName: string;

  @ApiProperty({
    example: '15 dic 2024, 14:30',
    description: 'Última actualización formateada',
  })
  lastUpdated: string;
}
