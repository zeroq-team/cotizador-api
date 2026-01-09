import { ApiProperty } from '@nestjs/swagger';

export class PdfGenerateResponseDto {
  @ApiProperty({
    description: 'URL del PDF generado',
    example: 'https://example.com/pdf/abc123.pdf',
  })
  url: string;

  @ApiProperty({
    description: 'Tiempo de expiración del PDF en segundos',
    example: '3600',
  })
  expires_in: string;
}

