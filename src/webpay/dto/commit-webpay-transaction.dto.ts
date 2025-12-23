import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CommitWebpayTransactionDto {
  @ApiProperty({
    description: 'WebPay transaction token',
    example: '01ab123456789012345678901234567890123456789012345678901234567890',
  })
  @IsString()
  token: string;
}

