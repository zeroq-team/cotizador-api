import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentRepository, PaginatedResult } from './payment.repository';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { UploadProofDto } from './dto/upload-proof.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreateProofPaymentDto } from './dto/create-proof-payment.dto';
import { ValidateProofDto } from './dto/validate-proof.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { Payment, PaymentStatus } from '../database/schemas';
import { S3Service } from '../s3/s3.service';
import { PdfGeneratorService } from './services/pdf-generator.service';

@Injectable()
export class PaymentService {
  constructor(
    private paymentRepository: PaymentRepository,
    private s3Service: S3Service,
    private pdfGeneratorService: PdfGeneratorService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    // Convertir fechas de string a Date si están presentes
    const paymentData: any = {
      ...createPaymentDto,
      amount: createPaymentDto.amount.toString(),
      status: createPaymentDto.status || 'pending',
    };

    // Convertir paymentDate si existe
    if (createPaymentDto.paymentDate) {
      paymentData.paymentDate = new Date(createPaymentDto.paymentDate);
    }

    // Convertir confirmedAt si existe
    if (createPaymentDto.confirmedAt) {
      paymentData.confirmedAt = new Date(createPaymentDto.confirmedAt);
    }

    const payment = await this.paymentRepository.create(paymentData);

    return payment;
  }

  async findAll(): Promise<Payment[]> {
    return await this.paymentRepository.findAll();
  }

  async findAllPaginated(
    filters: PaymentFiltersDto,
  ): Promise<PaginatedResult<Payment>> {
    return await this.paymentRepository.findAllPaginated(filters);
  }

  async getGlobalStats() {
    return await this.paymentRepository.getGlobalStats();
  }

  async findById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async findByCartId(cartId: string): Promise<Payment[]> {
    return await this.paymentRepository.findByCartId(cartId);
  }

  /**
   * Busca un pago pendiente para un carrito específico
   * Retorna el pago si existe uno en estado 'pending', null si no existe
   */
  async findPendingPaymentByCartId(cartId: string): Promise<Payment | null> {
    const payments = await this.paymentRepository.findByCartId(cartId);

    // Buscar el primer pago en estado 'pending'
    const pendingPayment = payments.find(
      (payment) => payment.status === 'pending',
    );

    return pendingPayment || null;
  }

  /**
   * Alias para findPendingPaymentByCartId (para compatibilidad con el controller)
   */
  async findPendingByCartId(cartId: string): Promise<Payment | null> {
    return this.findPendingPaymentByCartId(cartId);
  }

  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    const payment =
      await this.paymentRepository.findByTransactionId(transactionId);
    return payment || null;
  }

  async findByStatus(status: PaymentStatus): Promise<Payment[]> {
    return await this.paymentRepository.findByStatus(status);
  }

  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<Payment> {
    const existingPayment = await this.findById(id);

    // Preparar datos con conversión de fechas
    const updateData: any = {
      ...updatePaymentDto,
      amount: updatePaymentDto.amount
        ? updatePaymentDto.amount.toString()
        : undefined,
    };

    // Convertir fechas de string a Date si están presentes
    if (updatePaymentDto.paymentDate) {
      updateData.paymentDate = new Date(updatePaymentDto.paymentDate);
    }

    if (updatePaymentDto.confirmedAt) {
      updateData.confirmedAt = new Date(updatePaymentDto.confirmedAt);
    }

    const updatedPayment = await this.paymentRepository.update(id, updateData);

    if (!updatedPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return updatedPayment;
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
    const existingPayment = await this.findById(id);

    // Validate status transition
    this.validateStatusTransition(existingPayment.status, status);

    const updatedPayment = await this.paymentRepository.updateStatus(
      id,
      status,
    );

    if (!updatedPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return updatedPayment;
  }

  async uploadProof(
    id: string,
    uploadProofDto: UploadProofDto,
  ): Promise<Payment> {
    const existingPayment = await this.findById(id);

    const updatedPayment = await this.paymentRepository.uploadProof(
      id,
      uploadProofDto.proofUrl,
      uploadProofDto.notes,
    );

    if (!updatedPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // Update status to processing if it was pending
    if (existingPayment.status === 'pending') {
      return await this.updateStatus(id, 'processing');
    }

    return updatedPayment;
  }

  async confirmPayment(
    id: string,
    confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<Payment> {
    const existingPayment = await this.findById(id);

    if (existingPayment.status === 'completed') {
      throw new BadRequestException('Payment is already confirmed');
    }

    const updatedPayment = await this.paymentRepository.update(id, {
      status: 'completed',
      transactionId: confirmPaymentDto.transactionId,
      externalReference: confirmPaymentDto.externalReference,
      notes: confirmPaymentDto.notes || existingPayment.notes,
      confirmedAt: new Date(),
      paymentDate: new Date(),
    });

    if (!updatedPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return updatedPayment;
  }

  async cancelPayment(id: string, reason?: string): Promise<Payment> {
    const existingPayment = await this.findById(id);

    if (existingPayment.status === 'completed') {
      throw new BadRequestException('Cannot cancel a completed payment');
    }

    const updatedPayment = await this.paymentRepository.update(id, {
      status: 'cancelled',
      notes: reason || existingPayment.notes,
    });

    if (!updatedPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return updatedPayment;
  }

  async refundPayment(id: string, reason?: string): Promise<Payment> {
    const existingPayment = await this.findById(id);

    if (existingPayment.status !== 'completed') {
      throw new BadRequestException('Can only refund completed payments');
    }

    const updatedPayment = await this.paymentRepository.update(id, {
      status: 'refunded',
      notes: reason || existingPayment.notes,
    });

    if (!updatedPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return updatedPayment;
  }

  async delete(id: string): Promise<void> {
    const existingPayment = await this.findById(id);

    // Delete proof from S3 if exists
    if (existingPayment.proofUrl) {
      await this.s3Service.deleteFileByUrl(existingPayment.proofUrl);
    }

    const deleted = await this.paymentRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
  }

  async getPaymentStats(cartId: string) {
    return await this.paymentRepository.getPaymentStats(cartId);
  }

  /**
   * Create a proof-based payment (check or transfer)
   */
  async createProofPayment(
    createProofPaymentDto: CreateProofPaymentDto,
    file?: Express.Multer.File,
  ): Promise<Payment> {
    let proofUrl = createProofPaymentDto.proofUrl;
    // If file is provided, upload to S3
    if (file) {
      // Validate file type
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('Only image files are allowed');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException('File size must not exceed 5MB');
      }

      const timestamp = Date.now();
      const filename = `${timestamp}-${file.originalname}`;
      const folder = `payment-proofs/${createProofPaymentDto.cartId}`;
      const key = `${folder}/${filename}`;

      const uploadResult = await this.s3Service.uploadFile(
        file.buffer,
        key,
        file.mimetype,
        {
          'uploaded-at': new Date().toISOString(),
          'original-name': file.originalname,
          'cart-id': createProofPaymentDto.cartId,
        },
      );

      if (!uploadResult.success) {
        throw new BadRequestException(
          uploadResult.error || 'Failed to upload proof file',
        );
      }

      proofUrl = uploadResult.url;
    }

    // Validate that we have a proof URL (either from file upload or provided)
    if (!proofUrl) {
      throw new BadRequestException('Proof URL or file is required');
    }

    const payment = await this.paymentRepository.create({
      cartId: createProofPaymentDto.cartId,
      paymentType: createProofPaymentDto.paymentType,
      amount: createProofPaymentDto.amount.toString(),
      status: 'processing', // Proof-based payments start in processing status
      proofUrl: proofUrl,
      externalReference: createProofPaymentDto.externalReference,
      notes: createProofPaymentDto.notes,
    });

    return payment;
  }

  /**
   * Validate payment proof (for check or transfer)
   */
  async validateProof(
    id: string,
    validateProofDto: ValidateProofDto,
  ): Promise<Payment> {
    const existingPayment = await this.findById(id);

    if (!existingPayment.proofUrl) {
      throw new BadRequestException(
        'Payment does not have a proof to validate',
      );
    }

    if (validateProofDto.isValid) {
      // If valid, confirm the payment
      const updatedPayment = await this.paymentRepository.update(id, {
        status: 'completed',
        transactionId: validateProofDto.transactionId,
        notes: validateProofDto.notes || existingPayment.notes,
        confirmedAt: new Date(),
        paymentDate: new Date(),
      });

      if (!updatedPayment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      return updatedPayment;
    } else {
      // If invalid, mark as failed
      const updatedPayment = await this.paymentRepository.update(id, {
        status: 'failed',
        notes: validateProofDto.notes || existingPayment.notes,
      });

      if (!updatedPayment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      return updatedPayment;
    }
  }

  private validateStatusTransition(
    currentStatus: PaymentStatus,
    newStatus: PaymentStatus,
  ): void {
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      pending: ['processing', 'cancelled', 'failed'],
      processing: ['completed', 'failed', 'cancelled'],
      completed: ['refunded'],
      failed: ['pending', 'cancelled'],
      cancelled: ['pending'],
      refunded: [],
    };

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Genera un comprobante de pago en formato PDF
   */
  async generateReceipt(id: string): Promise<Buffer> {
    const payment = await this.findById(id);

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return await this.pdfGeneratorService.generatePaymentReceipt(payment);
  }
}
