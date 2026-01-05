import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PatchCartDto {
  @ApiPropertyOptional({
    description: 'Método de entrega',
    example: 'store_pickup',
    enum: ['store_pickup', 'home_delivery'],
    default: 'store_pickup',
  })
  @IsOptional()
  @IsEnum(['store_pickup', 'home_delivery'])
  deliveryType?: 'store_pickup' | 'home_delivery';

  @ApiPropertyOptional({
    description: 'ID de la dirección de entrega (requerido si deliveryType es home_delivery)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  deliveryAddressId?: string;
}

