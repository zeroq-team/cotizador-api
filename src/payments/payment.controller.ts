import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Res,
  StreamableFile,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { UploadProofDto } from './dto/upload-proof.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreateProofPaymentDto } from './dto/create-proof-payment.dto';
import { ValidateProofDto } from './dto/validate-proof.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { PaginatedPaymentsDto } from './dto/paginated-payments.dto';
import { PaymentStatus } from '../database/schemas';
import { PaymentResponseDto } from './dto/payment-response.dto';
@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.create(createPaymentDto, organizationId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get global payment statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.getGlobalStats(organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
    type: PaginatedPaymentsDto,
  })
  async findAll(
    @Query() filters: PaymentFiltersDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.findAllPaginated(filters, organizationId);
  }

  @Get('cart/:cartId/pending')
  @ApiOperation({ summary: 'Check if cart has a pending payment' })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiResponse({ status: 200, description: 'Returns pending payment or null' })
  async findPendingByCartId(
    @Param('cartId') cartId: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.findPendingByCartId(cartId, organizationId);
  }

  @Get('cart/:cartId')
  @ApiOperation({ summary: 'Get all payments by cart ID' })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully', type: [PaymentResponseDto] })
  async findByCartId(
    @Param('cartId') cartId: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    const payments = await this.paymentService.findByCartId(cartId, organizationId);
    return payments;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findOne(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.findById(id, organizationId);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Download payment receipt as PDF' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'PDF receipt generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async downloadReceipt(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
    @Res() res: Response,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    const pdfBuffer = await this.paymentService.generateReceipt(id, organizationId);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="comprobante-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.end(pdfBuffer);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment updated successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.update(id, updatePaymentDto, organizationId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: PaymentStatus,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.updateStatus(id, status, organizationId);
  }

  @Patch(':id/upload-proof')
  @ApiOperation({ summary: 'Upload payment proof' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment proof uploaded successfully',
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async uploadProof(
    @Param('id') id: string,
    @Body() uploadProofDto: UploadProofDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.uploadProof(id, uploadProofDto, organizationId);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Payment already confirmed' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async confirmPayment(
    @Param('id') id: string,
    @Body() confirmPaymentDto: ConfirmPaymentDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.confirmPayment(id, confirmPaymentDto, organizationId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel completed payment' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async cancelPayment(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
    @Body('reason') reason?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.cancelPayment(id, reason, organizationId);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Refund payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  @ApiResponse({
    status: 400,
    description: 'Can only refund completed payments',
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async refundPayment(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
    @Body('reason') reason?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.refundPayment(id, reason, organizationId);
  }

  @Post(':id/webpay-timeout')
  @ApiOperation({ summary: 'Handle WebPay transaction timeout' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'WebPay timeout handled successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid payment type or state' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async handleWebpayTimeout(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
    @Body('buyOrder') buyOrder?: string,
    @Body('taskId') taskId?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.handleWebpayTimeout(id, buyOrder, taskId, organizationId);
  }

  @Post('proof')
  @ApiOperation({ summary: 'Create a proof-based payment (check or transfer)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['cartId', 'paymentMethodId', 'amount', 'file'],
      properties: {
        cartId: { type: 'string', description: 'Cart ID' },
        paymentMethodId: { type: 'string', description: 'Payment Method ID' },
        amount: { type: 'number', description: 'Payment amount' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Payment proof file',
        },
        externalReference: {
          type: 'string',
          description: 'External reference (optional)',
        },
        notes: { type: 'string', description: 'Additional notes (optional)' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Proof payment created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @UseInterceptors(FileInterceptor('file'))
  async createProofPayment(
    @Body() createProofPaymentDto: CreateProofPaymentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.createProofPayment(
      createProofPaymentDto,
      file,
      organizationId,
    );
  }

  @Patch(':id/validate-proof')
  @ApiOperation({ summary: 'Validate payment proof (admin only)' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment proof validated successfully',
  })
  @ApiResponse({ status: 400, description: 'Payment does not have a proof' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async validateProof(
    @Param('id') id: string,
    @Body() validateProofDto: ValidateProofDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.paymentService.validateProof(id, validateProofDto, organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 204, description: 'Payment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async delete(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    await this.paymentService.delete(id, organizationId);
  }
}
