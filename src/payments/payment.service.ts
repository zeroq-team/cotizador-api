import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PaymentRepository, PaginatedResult } from './payment.repository';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { UploadProofDto } from './dto/upload-proof.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreateProofPaymentDto } from './dto/create-proof-payment.dto';
import { ValidateProofDto } from './dto/validate-proof.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { Payment, PaymentStatus, carts, paymentStatusEnum } from '../database/schemas';
import { S3Service } from '../s3/s3.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { WebpayService } from '../webpay/webpay.service';
import { DatabaseService } from '../database/database.service';
import { ConversationsService } from '../conversations/conversations.service';
import { CONVERSATION_CUSTOM_STATUS_SALE_COMPLETED } from '../config/configuration';
import { eq } from 'drizzle-orm';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private paymentRepository: PaymentRepository,
    private s3Service: S3Service,
    private pdfGeneratorService: PdfGeneratorService,
    @Inject(forwardRef(() => WebpayService))
    private webpayService: WebpayService,
    private databaseService: DatabaseService,
    private conversationsService: ConversationsService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, organizationId: string): Promise<Payment> {
    const orgId = parseInt(organizationId, 10);
    // Obtener el organizationId del cart
    const [cart] = await this.databaseService.db
      .select({ organizationId: carts.organizationId })
      .from(carts)
      .where(eq(carts.id, createPaymentDto.cartId))
      .limit(1);

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${createPaymentDto.cartId} not found`);
    }

    // Validate that cart belongs to organization
    if (cart.organizationId !== orgId) {
      throw new BadRequestException(`Cart with ID ${createPaymentDto.cartId} does not belong to the specified organization`);
    }

    // Convertir fechas de string a Date si están presentes
    const paymentData: any = {
      ...createPaymentDto,
      organizationId: orgId,
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
    organizationId: string,
  ): Promise<PaginatedResult<Payment>> {
    const orgId = parseInt(organizationId, 10);
    // Always filter by organizationId from header
    filters.organizationId = orgId;
    return await this.paymentRepository.findAllPaginated(filters);
  }

  async getGlobalStats(organizationId: string) {
    const orgId = parseInt(organizationId, 10);
    // Filter stats by organization
    const payments = await this.paymentRepository.findByOrganizationId(orgId);
    
    // Group by status
    const statsMap = new Map<string, { quantity: number; amount: number }>();
    
    // Initialize all possible statuses from enum
    paymentStatusEnum.enumValues.forEach(status => {
      statsMap.set(status, { quantity: 0, amount: 0 });
    });

    // Aggregate data
    payments.forEach(payment => {
      const amount = parseFloat(payment.amount);
      const current = statsMap.get(payment.status) || { quantity: 0, amount: 0 };
      
      statsMap.set(payment.status, {
        quantity: current.quantity + 1,
        amount: current.amount + amount,
      });
    });

    // Convert map to array
    return Array.from(statsMap.entries()).map(([status, data]) => ({
      status,
      quantity: data.quantity,
      amount: data.amount,
    }));
  }

  async findById(id: string, organizationId: string): Promise<Payment> {
    const orgId = parseInt(organizationId, 10);
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    // Validate that payment belongs to organization
    if (payment.organizationId !== orgId) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async findByCartId(cartId: string, organizationId: string): Promise<Payment[]> {
    const orgId = parseInt(organizationId, 10);
    // Verify cart belongs to organization
    const [cart] = await this.databaseService.db
      .select({ organizationId: carts.organizationId })
      .from(carts)
      .where(eq(carts.id, cartId))
      .limit(1);

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    if (cart.organizationId !== orgId) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    const payments = await this.paymentRepository.findByCartId(cartId);
    // Filter by organizationId as additional security
    return payments.filter(p => p.organizationId === orgId);
  }

  /**
   * Busca un pago pendiente para un carrito específico
   * Retorna el pago si existe uno en estado 'pending', null si no existe
   */
  async findPendingPaymentByCartId(cartId: string, organizationId: string): Promise<Payment | null> {
    const orgId = parseInt(organizationId, 10);
    // Verify cart belongs to organization
    const [cart] = await this.databaseService.db
      .select({ organizationId: carts.organizationId })
      .from(carts)
      .where(eq(carts.id, cartId))
      .limit(1);

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    if (cart.organizationId !== orgId) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    const payments = await this.paymentRepository.findByCartId(cartId);
    // Filter by organizationId as additional security
    const orgPayments = payments.filter(p => p.organizationId === orgId);

    // Buscar el primer pago en estado 'pending'
    const pendingPayment = orgPayments.find(
      (payment) => payment.status === 'pending',
    );

    return pendingPayment || null;
  }

  /**
   * Alias para findPendingPaymentByCartId (para compatibilidad con el controller)
   */
  async findPendingByCartId(cartId: string, organizationId: string): Promise<Payment | null> {
    return this.findPendingPaymentByCartId(cartId, organizationId);
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
    organizationId: string,
  ): Promise<Payment> {
    const existingPayment = await this.findById(id, organizationId);

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

  async updateStatus(id: string, status: PaymentStatus, organizationId: string): Promise<Payment> {
    const existingPayment = await this.findById(id, organizationId);

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
    organizationId: string,
  ): Promise<Payment> {
    const existingPayment = await this.findById(id, organizationId);

    const updatedPayment = await this.paymentRepository.uploadProof(
      id,
      uploadProofDto.proofUrl,
      uploadProofDto.notes,
    );

    if (!updatedPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // Update status to waiting_for_confirmation if it was pending
    if (existingPayment.status === 'pending') {
      return await this.updateStatus(id, 'waiting_for_confirmation', organizationId);
    }

    return updatedPayment;
  }

  async confirmPayment(
    id: string,
    confirmPaymentDto: ConfirmPaymentDto,
    organizationId: string,
  ): Promise<Payment> {
    const existingPayment = await this.findById(id, organizationId);

    if (existingPayment.status === 'completed') {
      throw new BadRequestException('Payment is already confirmed');
    }

    // Preparar metadata con información del usuario que confirmó
    const existingMetadata =
      (existingPayment.metadata as Record<string, any>) || {};
    const updatedMetadata: Record<string, any> = {
      ...existingMetadata,
      confirmedBy: confirmPaymentDto.confirmedBy
        ? {
            userId: confirmPaymentDto.confirmedBy.userId,
            name: confirmPaymentDto.confirmedBy.name,
            email: confirmPaymentDto.confirmedBy.email,
            confirmedAt: new Date().toISOString(),
          }
        : existingMetadata.confirmedBy,
    };

    const updatedPayment = await this.paymentRepository.update(id, {
      status: 'completed',
      transactionId: confirmPaymentDto.transactionId,
      externalReference: confirmPaymentDto.externalReference,
      notes: confirmPaymentDto.notes || existingPayment.notes,
      confirmedAt: new Date(),
      paymentDate: new Date(),
      metadata: updatedMetadata,
    });

    if (!updatedPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // Actualizar customStatus de la conversación a "Venta completada"
    try {
      const [cart] = await this.databaseService.db
        .select({ conversationId: carts.conversationId })
        .from(carts)
        .where(eq(carts.id, existingPayment.cartId))
        .limit(1);

      if (cart?.conversationId) {
        await this.conversationsService.updateConversationCustomStatus(
          cart.conversationId,
          CONVERSATION_CUSTOM_STATUS_SALE_COMPLETED,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to update conversation customStatus after payment confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // No lanzar error para no interrumpir el flujo del pago
    }

    return updatedPayment;
  }

  async cancelPayment(id: string, reason: string | undefined, organizationId: string): Promise<Payment> {
    const existingPayment = await this.findById(id, organizationId);

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

  async refundPayment(id: string, reason: string | undefined, organizationId: string): Promise<Payment> {
    const existingPayment = await this.findById(id, organizationId);

    if (existingPayment.status !== 'completed') {
      throw new BadRequestException('Can only refund completed payments');
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

  async delete(id: string, organizationId: string): Promise<void> {
    const existingPayment = await this.findById(id, organizationId);

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
    file: Express.Multer.File | undefined,
    organizationId: string,
  ): Promise<Payment> {
    const orgId = parseInt(organizationId, 10);
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

    // Obtener el organizationId del cart
    const [cart] = await this.databaseService.db
      .select({ organizationId: carts.organizationId })
      .from(carts)
      .where(eq(carts.id, createProofPaymentDto.cartId))
      .limit(1);

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${createProofPaymentDto.cartId} not found`);
    }

    // Validate that cart belongs to organization
    if (cart.organizationId !== orgId) {
      throw new BadRequestException(`Cart with ID ${createProofPaymentDto.cartId} does not belong to the specified organization`);
    }

    const payment = await this.paymentRepository.create({
      cartId: createProofPaymentDto.cartId,
      organizationId: orgId,
      paymentType: createProofPaymentDto.paymentType,
      amount: createProofPaymentDto.amount.toString(),
      status: 'waiting_for_confirmation', // Proof-based payments start in waiting_for_confirmation status
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
    organizationId: string,
  ): Promise<Payment> {
    const existingPayment = await this.findById(id, organizationId);

    if (!existingPayment.proofUrl) {
      throw new BadRequestException(
        'Payment does not have a proof to validate',
      );
    }

    // Preparar metadata con información del usuario que validó/confirmó
    const existingMetadata =
      (existingPayment.metadata as Record<string, any>) || {};
    const updatedMetadata: Record<string, any> = {
      ...existingMetadata,
      confirmedBy: validateProofDto.confirmedBy
        ? {
            userId: validateProofDto.confirmedBy.userId,
            name: validateProofDto.confirmedBy.name,
            email: validateProofDto.confirmedBy.email,
            confirmedAt: new Date().toISOString(),
          }
        : existingMetadata.confirmedBy,
    };

    if (validateProofDto.isValid) {
      // If valid, confirm the payment
      const updatedPayment = await this.paymentRepository.update(id, {
        status: 'completed',
        transactionId: validateProofDto.transactionId,
        notes: validateProofDto.notes || existingPayment.notes,
        confirmedAt: new Date(),
        paymentDate: new Date(),
        metadata: updatedMetadata,
      });

      if (!updatedPayment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      // Actualizar customStatus de la conversación a "Venta completada"
      try {
        const [cart] = await this.databaseService.db
          .select({ conversationId: carts.conversationId })
          .from(carts)
          .where(eq(carts.id, existingPayment.cartId))
          .limit(1);

        if (cart?.conversationId) {
          await this.conversationsService.updateConversationCustomStatus(
            cart.conversationId,
            CONVERSATION_CUSTOM_STATUS_SALE_COMPLETED,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update conversation customStatus after proof validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // No lanzar error para no interrumpir el flujo del pago
      }

      return updatedPayment;
    } else {
      // If invalid, mark as failed
      const updatedPayment = await this.paymentRepository.update(id, {
        status: 'failed',
        notes: validateProofDto.notes || existingPayment.notes,
        metadata: updatedMetadata,
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
      pending: ['waiting_for_confirmation', 'cancelled', 'failed'],
      waiting_for_confirmation: ['completed', 'failed', 'cancelled'],
      completed: [],
      failed: ['pending', 'cancelled'],
      cancelled: ['pending'],
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
  async generateReceipt(id: string, organizationId: string): Promise<Buffer> {
    const payment = await this.findById(id, organizationId);

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return await this.pdfGeneratorService.generatePaymentReceipt(payment);
  }

  /**
   * Maneja el timeout de una transacción WebPay
   * Cancela la transacción en Transbank y actualiza el pago como fallido
   * @param id - ID del pago
   * @param buyOrder - BuyOrder de la transacción
   * @param taskId - ID de la tarea de Trigger.dev que ejecuta el timeout (para trazabilidad)
   * @param organizationId - ID de la organización
   */
  async handleWebpayTimeout(
    id: string,
    buyOrder: string | undefined,
    taskId: string | undefined,
    organizationId: string,
  ): Promise<Payment> {
    this.logger.log(
      `Manejando timeout de WebPay para pago ${id}, buyOrder: ${buyOrder}`,
    );

    const payment = await this.findById(id, organizationId);

    // Si el pago ya está en un estado final, no hacer nada
    if (
      ['completed', 'cancelled', 'failed'].includes(payment.status)
    ) {
      this.logger.log(
        `Pago ${id} ya tiene estado final: ${payment.status}. No se requiere acción.`,
      );
      return payment;
    }

    // Verificar que es un pago WebPay
    if (payment.paymentType !== 'webpay') {
      throw new BadRequestException(
        'Este endpoint solo puede usarse para pagos WebPay',
      );
    }

    // Intentar revertir la transacción en Transbank solo si fue autorizada
    let cancelResult = null;
    let cancelError = null;

    // Obtener información necesaria para revertir la transacción
    const existingMetadata =
      typeof payment.metadata === 'object' && payment.metadata !== null
        ? (payment.metadata as Record<string, unknown>)
        : {};

    const webpayInit = existingMetadata.webpay_init as
      | Record<string, unknown>
      | undefined;
    const webpayCommit = existingMetadata.webpay_commit as
      | Record<string, unknown>
      | undefined;

    // El token puede estar en webpay_init o webpay_commit
    const token = (webpayInit?.token || webpayCommit?.token) as
      | string
      | undefined;
    const childBuyOrder = webpayInit?.childBuyOrder as string | undefined;
    const childCommerceCode = webpayInit?.childCommerceCode as
      | string
      | undefined;
    const transactionBuyOrder = buyOrder || payment.transactionId;

    console.log('cancelando orden de compra ')
    console.log('token', token);

    // Solo intentar revertir si la transacción fue autorizada Y tenemos toda la información necesaria
    // Según la documentación de Transbank, refund necesita: token, buyOrder, commerceCode, amount
    if (token && childBuyOrder && childCommerceCode) {
      try {
        this.logger.log(
          `Intentando revertir transacción WebPay autorizada en Transbank con token: ${token}, childBuyOrder: ${childBuyOrder}, childCommerceCode: ${childCommerceCode}`,
        );

        const amount = parseFloat(payment.amount);

        // Revertir la transacción usando WebpayService
        // Según la documentación: refund(token, childBuyOrder, childCommerceCode, amount)
        cancelResult = await this.webpayService.reverseTransaction(
          token,
          childBuyOrder,
          childCommerceCode,
          amount,
        );

        console.log('token de cancelacion', token);

        this.logger.log(
          `Transacción WebPay revertida exitosamente en Transbank`,
        );
      } catch (error) {
        // Si falla la reversión, no es crítico - puede que la transacción ya no exista
        // o que Transbank no permita revertirla en este estado
        cancelError = error;
        this.logger.warn(
          `No se pudo revertir la transacción en Transbank (puede que ya no exista o esté en un estado que no permite reversión): ${error instanceof Error ? error.message : 'Error desconocido'}`,
        );
      }
    } else {
      this.logger.warn(
        `No se puede revertir la transacción: faltan datos requeridos (token: ${!!token}, childBuyOrder: ${!!childBuyOrder}, childCommerceCode: ${!!childCommerceCode})`,
      );
    }

    // Actualizar el pago como expirado/fallido
    // existingMetadata ya se obtuvo arriba

    const updatedPayment = await this.paymentRepository.update(id, {
      status: 'failed',
      notes: `Transacción WebPay expirada - No se completó en el tiempo límite (3 minutos)`,
      metadata: {
        ...existingMetadata,
        webpay_timeout: {
          expired_at: new Date().toISOString(),
          reason: 'Transaction timeout after 3 minutes',
          original_status: payment.status,
          task_id: taskId || null, // ID de la tarea que ejecutó el timeout (para trazabilidad)
          transbank_cancel_attempted: true,
          transbank_cancel_success: cancelResult !== null,
          transbank_cancel_error: cancelError
            ? cancelError instanceof Error
              ? cancelError.message
              : 'Error desconocido'
            : null,
          transbank_cancel_response: cancelResult,
        },
      },
    });

    if (!updatedPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    this.logger.log(`Pago ${id} marcado como expirado exitosamente`);

    return updatedPayment;
  }
}
