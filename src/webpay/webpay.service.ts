import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateWebpayTransactionDto } from './dto/create-webpay-transaction.dto';
import { CommitWebpayTransactionDto } from './dto/commit-webpay-transaction.dto';
import {
  WebpayTransactionResponseDto,
  WebpayCommitResponseDto,
} from './dto/webpay-transaction-response.dto';
import { PaymentService } from '../payments/payment.service';
import { OrganizationPaymentMethodRepository } from '../organization/organization-payment-method.repository';
import { webpayTimeoutTask } from '../trigger/webpay-timeout';
import { runs } from '@trigger.dev/sdk/v3';
import { PaymentStatus } from '../database/schemas';

// Importar SDK de Transbank
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WebpayPlus, TransactionDetail } = require('transbank-sdk');

// Tiempo de timeout para transacciones WebPay (3 minutos)
const WEBPAY_TIMEOUT_MINUTES = 3;

@Injectable()
export class WebpayService {
  private readonly logger = new Logger(WebpayService.name);
  private readonly commerceCode: string;
  private readonly apiKey: string;
  private readonly childCommerceCode: string;
  private readonly environment: string;
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    private readonly organizationPaymentMethodRepository: OrganizationPaymentMethodRepository,
  ) {
    // Cargar configuración desde variables de entorno
    this.commerceCode = this.configService.get<string>('WEBPAY_COMMERCE_CODE');
    this.apiKey = this.configService.get<string>('WEBPAY_API_KEY');
    // childCommerceCode ahora viene de la BD por organización
    this.childCommerceCode = null;
    this.environment =
      this.configService.get<string>('WEBPAY_ENVIRONMENT') || 'integration';
    this.baseUrl =
      this.configService.get<string>('WEBPAY_RETURN_BASE_URL')

    // Validar configuración básica al iniciar
    if (!this.commerceCode || !this.apiKey || !this.baseUrl || !this.environment) {
      this.logger.error('Configuración de Webpay incompleta');
      throw new Error('Configuración de Webpay incompleta');
    }

    this.logger.log(
      `WebpayService inicializado - Ambiente: ${this.environment}`,
    );
  }

  /**
   * Crea una instancia de MallTransaction según el ambiente configurado
   */
  private getMallTransaction() {
    if (this.environment === 'production') {
      return new WebpayPlus.MallTransaction(this.commerceCode, this.apiKey);
    } else {
      return WebpayPlus.MallTransaction.buildForIntegration(
        this.commerceCode,
        this.apiKey,
      );
    }
  }

  /**
   * Genera identificadores únicos para la transacción
   * Formato: prefix-timestamp-cartIdSuffix (máximo 26 caracteres para Transbank)
   * 
   * El timestamp asegura que cada intento de pago genere un identificador único,
   * incluso si es para el mismo carrito.
   */
  private generateTransactionIdentifiers(
    cartId: string,
    prefix = 'zeroq',
  ): {
    buyOrder: string;
    sessionId: string;
    childBuyOrder: string;
  } {
    // Generar timestamp corto (últimos 7 dígitos de timestamp en base36)
    // Esto nos da ~78 millones de combinaciones únicas
    const timestamp = Date.now().toString(36).slice(-7);

    // Remover guiones del UUID
    const cartIdClean = cartId.replace(/-/g, '');

    // Calcular cuántos caracteres del UUID podemos usar
    // Total: prefix + guion (1) + timestamp (7) + guion (1) + suffix = 26 caracteres máximo
    const maxUuidChars = 26 - prefix.length - 1 - timestamp.length - 1;

    if (maxUuidChars < 1) {
      throw new BadRequestException(
        `El prefix "${prefix}" es muy largo. Máximo 9 caracteres para permitir timestamp y sufijo.`,
      );
    }

    // Tomar los últimos caracteres del UUID
    const cartIdSuffix = cartIdClean.slice(-maxUuidChars);
    const identifier = `${prefix}-${timestamp}-${cartIdSuffix}`;

    // Validar longitud
    if (identifier.length > 26) {
      throw new BadRequestException(
        `Identificador muy largo (${identifier.length} caracteres). Máximo 26.`,
      );
    }

    return {
      buyOrder: identifier,
      sessionId: identifier,
      childBuyOrder: identifier,
    };
  }

  /**
   * Crea una transacción en Webpay Plus Mall
   */
  async createTransaction(
    dto: CreateWebpayTransactionDto,
  ): Promise<WebpayTransactionResponseDto> {
    const { cartId, amount, organizationId } = dto;

    this.logger.log(
      `Creando transacción WebPay para cart ${cartId}, org ${organizationId}`,
    );

    try {
      // PASO 1: Obtener configuración de WebPay desde la BD
      const orgPaymentMethod =
        await this.organizationPaymentMethodRepository.findByOrganizationId(
          organizationId,
        );

      if (!orgPaymentMethod) {
        throw new NotFoundException(
          `No se encontró configuración de pagos para la organización ${organizationId}`,
        );
      }

      // Validar que WebPay esté activo
      if (!orgPaymentMethod.isWebPayActive) {
        throw new BadRequestException(
          `WebPay no está activo para la organización ${organizationId}`,
        );
      }

      // Validar que tenga configurado el child commerce code
      if (!orgPaymentMethod.webPayChildCommerceCode) {
        throw new BadRequestException(
          `La organización ${organizationId} no tiene configurado el código de comercio de WebPay`,
        );
      }

      const webPayPrefix = orgPaymentMethod.webPayPrefix || 'zeroq';
      const childCommerceCode = orgPaymentMethod.webPayChildCommerceCode;

      this.logger.debug(
        `WebPay config - Prefix: ${webPayPrefix}, Child Commerce: ${childCommerceCode}`,
      );

      // PASO 1.5: Verificar si ya existe un pago pendiente para este carrito
      this.logger.log(`Verificando si existe un pago pendiente para cart ${cartId}...`);
      const existingPendingPayment = await this.paymentService.findPendingPaymentByCartId(cartId);
      
      if (existingPendingPayment) {
        this.logger.warn(
          `❌ Ya existe un pago pendiente para el cart ${cartId}. Payment ID: ${existingPendingPayment.id}, Status: ${existingPendingPayment.status}`,
        );
        throw new BadRequestException(
          'Ya existe un pago en proceso para este carrito. Por favor, espera a que se complete o expire antes de intentar nuevamente.',
        );
      }
      
      this.logger.log('✅ No hay pagos pendientes, procediendo a crear transacción...');

      // PASO 2: Generar identificadores únicos
      const { buyOrder, sessionId, childBuyOrder } =
        this.generateTransactionIdentifiers(cartId, webPayPrefix);

      this.logger.debug(`Buy Order: ${buyOrder}`);

      // PASO 3: Crear registro del pago en estado "pending" ANTES de ir a WebPay
      this.logger.log('Creando registro de pago en BD (status: pending)...');

      const payment = await this.paymentService.create({
        cartId,
        amount,
        paymentType: 'webpay',
        status: 'pending',
        transactionId: buyOrder,
        notes: `Pago WebPay iniciado - ${buyOrder}`,
        metadata: {
          webpay_init: {
            buyOrder,
            sessionId,
            organizationId,
            timestamp: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Pago creado en BD: ${payment.id}`);

      // PASO 4: Crear instancia de MallTransaction
      const mallTransaction = this.getMallTransaction();

      // URL de retorno (incluir cartId y paymentId para actualizar después)
      const returnUrl = `${this.baseUrl}/webpay/retorno?cartId=${cartId}&paymentId=${payment.id}`;

      // Crear los detalles de la transacción con el child commerce code de la org
      const details = [
        new TransactionDetail(amount, childCommerceCode, childBuyOrder),
      ];

      this.logger.debug(`Return URL: ${returnUrl}`);

      // PASO 5: Crear la transacción en Webpay
      const response = await mallTransaction.create(
        buyOrder,
        sessionId,
        returnUrl,
        details,
      );

      this.logger.log('Transacción WebPay creada exitosamente');
      this.logger.debug(`Token: ${response.token}`);

      // PASO 6: Programar tarea de timeout en Trigger.dev (3 minutos)
      try {
        const timeoutDate = new Date(
          Date.now() + WEBPAY_TIMEOUT_MINUTES * 60 * 1000,
        );

        const timeoutTask = await webpayTimeoutTask.trigger(
          {
            paymentId: payment.id,
            buyOrder,
            cartId,
          },
          {
            delay: timeoutDate,
          },
        );

        this.logger.log(
          `Tarea de timeout programada: ${timeoutTask.id} para ${timeoutDate.toISOString()}`,
        );

        // Actualizar el pago con el task_id para poder cancelarlo después
        const existingPaymentMetadata =
          typeof payment.metadata === 'object' && payment.metadata !== null
            ? (payment.metadata as Record<string, unknown>)
            : {};

        await this.paymentService.update(payment.id, {
          metadata: {
            ...existingPaymentMetadata,
            webpay_init: {
              buyOrder,
              sessionId,
              childBuyOrder,
              childCommerceCode,
              organizationId,
              token: response.token, // Guardar el token para poder hacer refund después
              timestamp: new Date().toISOString(),
            },
            timeout_task_id: timeoutTask.id,
            timeout_scheduled_for: timeoutDate.toISOString(),
          },
        });
      } catch (taskError) {
        // Si falla la creación de la tarea de timeout, solo logueamos
        // No queremos que falle la transacción por esto
        this.logger.warn(
          `No se pudo programar la tarea de timeout: ${taskError.message}`,
        );
      }

      return {
        token: response.token,
        url: response.url,
        buyOrder,
        sessionId,
        paymentId: payment.id,
        message: 'Transacción creada exitosamente',
      };
    } catch (error) {
      this.logger.error('Error al crear transacción WebPay:', error);

      // Si es una excepción HTTP de NestJS, dejarla pasar sin modificar
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error al crear la transacción',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    }
  }

  /**
   * Confirma una transacción en Webpay Plus Mall y actualiza el pago en la BD
   */
  async commitTransaction(
    dto: CommitWebpayTransactionDto,
  ): Promise<WebpayCommitResponseDto> {
    const { token } = dto;

    this.logger.log(`Confirmando transacción WebPay con token: ${token}`);

    try {
      const mallTransaction = this.getMallTransaction();

      // PASO 1: Confirmar la transacción con Transbank
      const response = await mallTransaction.commit(token);

      this.logger.log('Transacción confirmada exitosamente con Transbank');

      // En Mall Transaction, los datos están en details[0]
      const mainDetail =
        response.details && response.details[0] ? response.details[0] : {};

      // PASO 2: Buscar el pago asociado usando el buy_order (transactionId)
      const buyOrder = response.buy_order;
      this.logger.log(`Buscando pago con buy_order: ${buyOrder}`);

      const payment = await this.paymentService.findByTransactionId(buyOrder);

      if (!payment) {
        this.logger.warn(
          `No se encontró pago con buy_order: ${buyOrder}. La transacción fue exitosa pero no se actualizará el pago.`,
        );
      } else {
        // PASO 2.5: Cancelar la tarea de timeout INMEDIATAMENTE cuando el usuario regresa
        // Esto debe hacerse ANTES de cualquier validación para evitar que se ejecute el timeout
        const existingMetadata =
          typeof payment.metadata === 'object' && payment.metadata !== null
            ? payment.metadata
            : {};
        
        const timeoutTaskId = (existingMetadata as Record<string, unknown>)
          ?.timeout_task_id as string | undefined;
        
        if (timeoutTaskId) {
          try {
            await runs.cancel(timeoutTaskId);
            this.logger.log(
              `✅ Tarea de timeout ${timeoutTaskId} cancelada exitosamente (usuario regresó de WebPay)`,
            );
          } catch (cancelError) {
            // Si falla la cancelación, solo logueamos (puede que ya haya expirado o ejecutado)
            this.logger.warn(
              `⚠️ No se pudo cancelar la tarea de timeout ${timeoutTaskId}:`,
              cancelError instanceof Error ? cancelError.message : 'Error desconocido',
            );
          }
        } else {
          this.logger.warn('No se encontró timeout_task_id en los metadatos del pago');
        }

        // Validar que el pago esté en un estado que permita confirmación
        const finalStates: PaymentStatus[] = ['completed', 'cancelled', 'refunded', 'failed'];
        if (finalStates.includes(payment.status)) {
          this.logger.warn(
            `El pago ${payment.id} ya está en estado final: ${payment.status}. No se puede actualizar.`,
          );
          
          // Mensajes específicos según el estado
          let errorMessage: string;
          if (payment.status === 'failed') {
            errorMessage = 'La transacción ha expirado. El tiempo límite de 3 minutos para completar el pago fue excedido. Por favor, inicia un nuevo proceso de pago.';
          } else if (payment.status === 'completed') {
            errorMessage = 'Este pago ya fue procesado y completado exitosamente. No se puede procesar nuevamente.';
          } else if (payment.status === 'cancelled') {
            errorMessage = 'Este pago fue cancelado y no puede ser procesado. Por favor, inicia un nuevo proceso de pago.';
          } else {
            errorMessage = `El pago ya fue procesado y está en estado: ${payment.status}. No se puede confirmar una transacción finalizada.`;
          }
          
          throw new BadRequestException(errorMessage);
        }

        // PASO 3: Actualizar el pago con los datos de Transbank
        const isAuthorized = mainDetail.status === 'AUTHORIZED';
        const newStatus = isAuthorized ? 'completed' : 'failed';

        this.logger.log(
          `Actualizando pago ${payment.id} a status: ${newStatus}`,
        );

        // Reutilizar existingMetadata que ya se obtuvo al inicio
        await this.paymentService.update(payment.id, {
          status: newStatus,
          authorizationCode: mainDetail.authorization_code,
          cardLastFourDigits: response.card_detail?.card_number?.slice(-4),
          metadata: {
            ...existingMetadata,
            webpay_commit: {
              token: dto.token, // Guardar el token también en commit para referencia
              vci: response.vci,
              amount: mainDetail.amount,
              status: mainDetail.status,
              payment_type_code: mainDetail.payment_type_code,
              response_code: mainDetail.response_code,
              installments_number: mainDetail.installments_number,
              accounting_date: response.accounting_date,
              transaction_date: response.transaction_date,
              committed_at: new Date().toISOString(),
            },
          },
        });

        this.logger.log(`Pago ${payment.id} actualizado exitosamente`);
        
        // La tarea de timeout ya fue cancelada al principio del método
      }

      // PASO 4: Retornar respuesta
      return {
        success: true,
        transaction: {
          vci: response.vci,
          amount: mainDetail.amount,
          status: mainDetail.status,
          authorization_code: mainDetail.authorization_code,
          payment_type_code: mainDetail.payment_type_code,
          response_code: mainDetail.response_code,
          installments_number: mainDetail.installments_number,
          buy_order: response.buy_order,
          session_id: response.session_id,
          card_detail: {
            card_number: response.card_detail?.card_number,
          },
          accounting_date: response.accounting_date,
          transaction_date: response.transaction_date,
          details: response.details,
        },
      };
    } catch (error) {
      this.logger.error('Error al confirmar transacción:', error);

      // Si es una excepción HTTP de NestJS, dejarla pasar sin modificar
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error al confirmar la transacción',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    }
  }

  /**
   * Reversa o anula una transacción autorizada en Webpay Plus Mall
   * Nota: Solo funciona para transacciones que fueron autorizadas (tienen authorizationCode)
   * Para transacciones que no fueron autorizadas (timeout), no hay nada que revertir en Transbank
   * 
   * Según la documentación de Transbank:
   * https://www.transbankdevelopers.cl/documentacion/webpay-plus#webpay-plus
   * El método refund requiere: token, buyOrder (childBuyOrder), commerceCode, amount
   * 
   * @param token - Token de la transacción WebPay
   * @param childBuyOrder - El childBuyOrder de la transacción
   * @param childCommerceCode - El código de comercio hijo (child commerce code)
   * @param amount - Monto de la transacción
   */
  async reverseTransaction(
    token: string,
    childBuyOrder: string,
    childCommerceCode: string,
    amount: number,
  ): Promise<any> {
    this.logger.log(
      `Revirtiendo transacción WebPay con token: ${token}, childBuyOrder: ${childBuyOrder}, childCommerceCode: ${childCommerceCode}, amount: ${amount}`,
    );

    if (!token || !childBuyOrder || !childCommerceCode) {
      throw new BadRequestException(
        'Token, childBuyOrder y childCommerceCode son requeridos para revertir una transacción',
      );
    }

    const mallTransaction = this.getMallTransaction();

    // Revertir la transacción con Transbank usando refund
    // Según la documentación: refund(token, buyOrder, commerceCode, amount)
    const response = await mallTransaction.refund(
      token,
      childBuyOrder,
      childCommerceCode,
      amount,
    );

    this.logger.log('Transacción revertida exitosamente en Transbank');

    return response;
  }
}

