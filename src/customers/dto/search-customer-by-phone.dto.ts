import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchCustomerByPhoneDto {
  @ApiProperty({
    description: 'Código de país del teléfono (ej: +56, +1)',
    example: '+56',
  })
  @IsString()
  @IsNotEmpty()
  phoneCode: string;

  @ApiProperty({
    description: 'Número telefónico sin código de país',
    example: '987654321',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
