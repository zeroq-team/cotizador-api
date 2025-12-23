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

      // Llamar al endpoint de la API que maneja el timeout
      // Este endpoint se encargará de cancelar la transacción en Transbank y actualizar el pago
      // Incluir el ID de la tarea/run para trazabilidad
      const taskId = (ctx as any)?.run?.id || (ctx as any)?.id || null;
      
      logger.info(
        `Enviando timeout con taskId: ${taskId} para pago ${payload.paymentId}`,
      );

      const response = await axios.post(
        `${baseUrl}/payments/${payload.paymentId}/webpay-timeout`,
        {
          buyOrder: payload.buyOrder,
          taskId, // ID del run/task para trazabilidad
        },
      );

      logger.info(
        `Timeout de WebPay procesado exitosamente para pago ${payload.paymentId}`,
      );

      return {
        action: 'expired',
        paymentId: payload.paymentId,
        buyOrder: payload.buyOrder,
        expiredAt: new Date().toISOString(),
        payment: response.data,
      };
    } catch (error) {
      logger.error(`Error al procesar timeout del pago ${payload.paymentId}:`, error);
      
      // Si el error es porque el pago ya está en estado final, no es un error crítico
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        logger.info(
          `Pago ${payload.paymentId} ya está en estado final o no es un pago WebPay. No se requiere acción.`,
        );
        return {
          action: 'skipped',
          reason: error.response?.data?.message || 'Payment already in final state',
        };
      }

      throw error;
    }
  },
});
