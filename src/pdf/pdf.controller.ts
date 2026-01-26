import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PdfService } from './pdf.service';
import { PdfGenerateResponseDto } from './dto/pdf-response.dto';

@ApiTags('pdf')
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @ApiOperation({
    summary: 'Generar PDF de cotización',
    description:
      'Genera un PDF de recibo/cotización para un quotationId dado. Retorna la URL del PDF generado por el servicio externo.',
  })
  @ApiParam({
    name: 'quotationId',
    description: 'ID del carrito/cotización',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generado exitosamente',
    type: PdfGenerateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Cotización no encontrada',
  })
  @ApiResponse({
    status: 500,
    description: 'Error al generar el PDF',
  })
  @Get('generate/:quotationId')
  async generatePdf(
    @Param('quotationId') quotationId: string,
  ): Promise<PdfGenerateResponseDto> {
    try {
      const result = await this.pdfService.generateQuotePdf(quotationId);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error instanceof Error ? error.message : 'Error al generar PDF',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

