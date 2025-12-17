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

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createPaymentDto: CreatePaymentDto) {
    return await this.paymentService.create(createPaymentDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get global payment statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    return await this.paymentService.getGlobalStats();
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
    type: PaginatedPaymentsDto,
  })
  async findAll(@Query() filters: PaymentFiltersDto) {
    return await this.paymentService.findAllPaginated(filters);
  }

  @Get('cart/:cartId/pending')
  @ApiOperation({ summary: 'Check if cart has a pending payment' })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiResponse({ status: 200, description: 'Returns pending payment or null' })
  async findPendingByCartId(@Param('cartId') cartId: string) {
    return await this.paymentService.findPendingByCartId(cartId);
  }

  @Get('cart/:cartId')
  @ApiOperation({ summary: 'Get payments by cart ID' })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async findByCartId(@Param('cartId') cartId: string) {
    const payments = await this.paymentService.findByCartId(cartId);
    // Return the most recent completed payment, or the first payment if none completed
    const completedPayment = payments.find(p => p.status === 'completed');
    return completedPayment || payments[0] || null;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findOne(@Param('id') id: string) {
    return await this.paymentService.findById(id);
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
  async downloadReceipt(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.paymentService.generateReceipt(id);
    
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
  ) {
    return await this.paymentService.update(id, updatePaymentDto);
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
  ) {
    return await this.paymentService.updateStatus(id, status);
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
  ) {
    return await this.paymentService.uploadProof(id, uploadProofDto);
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
  ) {
    return await this.paymentService.confirmPayment(id, confirmPaymentDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel completed payment' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async cancelPayment(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return await this.paymentService.cancelPayment(id, reason);
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
    @Body('reason') reason?: string,
  ) {
    return await this.paymentService.refundPayment(id, reason);
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
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.paymentService.createProofPayment(
      createProofPaymentDto,
      file,
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
  ) {
    return await this.paymentService.validateProof(id, validateProofDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 204, description: 'Payment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async delete(@Param('id') id: string) {
    await this.paymentService.delete(id);
  }
}
