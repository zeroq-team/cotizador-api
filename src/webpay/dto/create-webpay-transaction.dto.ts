import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWebpayTransactionDto {
  @ApiProperty({
    description: 'Cart ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  cartId: string;

  @ApiProperty({
    description: 'Transaction amount in CLP',
    example: 1000,
    minimum: 50,
  })
  @IsNumber()
  @Min(50, { message: 'El monto mínimo es 50 CLP' })
  amount: number;

  @ApiProperty({
    description: 'Organization ID',
    example: 3,
  })
  @IsNumber()
  organizationId: number;
}

