import { logger, task } from '@trigger.dev/sdk/v3';
import axios from 'axios';

export const webpayTimeoutTask = task({
  id: 'webpay-timeout',
  maxDuration: 60, // 1 minuto máximo de ejecución
  run: async (
    payload: {
      paymentId: string;
      buyOrder: string;
      cartId: string;
    },
    { ctx },
  ) => {
    const baseUrl = process.env.COTIZADOR_API_URL || 'http://localhost:3002';

    try {
      logger.info(
        `Ejecutando timeout para pago ${payload.paymentId}, buyOrder: ${payload.buyOrder}`,
      );

      // Verificar el estado actual del pago
      const paymentResponse = await axios.get(
        `${baseUrl}/payments/${payload.paymentId}`,
      );

      const payment = paymentResponse.data;

      // Si el pago ya fue completado, cancelado o falló, no hacer nada
      if (['completed', 'cancelled', 'failed', 'refunded'].includes(payment.status)) {
        logger.info(
          `Pago ${payload.paymentId} ya tiene estado final: ${payment.status}. No se requiere acción.`,
        );
        return {
          action: 'skipped',
          reason: `Payment already in final state: ${payment.status}`,
        };
      }

      // Si sigue en pending o processing después de 3 minutos, marcar como expirado
      logger.info(
        `Pago ${payload.paymentId} expiró después de 3 minutos. Estado actual: ${payment.status}`,
      );

      // Actualizar el pago como expirado/fallido
      await axios.patch(`${baseUrl}/payments/${payload.paymentId}`, {
        status: 'failed',
        notes: `Transacción WebPay expirada - No se completó en el tiempo límite (3 minutos)`,
        metadata: {
          ...payment.metadata,
          webpay_timeout: {
            expired_at: new Date().toISOString(),
            reason: 'Transaction timeout after 3 minutes',
            original_status: payment.status,
          },
        },
      });

      logger.info(`Pago ${payload.paymentId} marcado como expirado exitosamente`);

      return {
        action: 'expired',
        paymentId: payload.paymentId,
        buyOrder: payload.buyOrder,
        expiredAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Error al procesar timeout del pago ${payload.paymentId}:`, error);
      throw error;
    }
  },
});

