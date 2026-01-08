// Estados personalizados de conversación
export const CONVERSATION_CUSTOM_STATUS_QUOTING =
  process.env.CONVERSATION_CUSTOM_STATUS_QUOTING || 'Cotizando';


export const CONVERSATION_CUSTOM_STATUS_SALE_COMPLETED =
  process.env.CONVERSATION_CUSTOM_STATUS_SALE_COMPLETED || 'Venta completada';

// Configuración de impuestos
// NOTA: Los precios en la BD (totalPrice, item.price) están almacenados SIN IVA (netos)
// El frontend es responsable de aplicar el IVA cuando:
// - Muestra precios a los usuarios
// - Envía montos a procesar pagos (WebPay, transferencias, etc.)
// - Genera PDFs de cotizaciones
export const TAX_RATE = 0.19; // IVA Chile (19%)
export const TAX_MULTIPLIER = 1 + TAX_RATE; // 1.19 para multiplicar directamente

export default () => ({
  database: {
    url: process.env.DATABASE_URL,
  },
  products: {
    apiUrl: process.env.PRODUCTS_API_URL,
  },
  webpay: {
    commerceCode: process.env.WEBPAY_COMMERCE_CODE,
    apiKey: process.env.WEBPAY_API_KEY,
    // childCommerceCode ahora viene de organization_payment_methods en la BD
    environment: process.env.WEBPAY_ENVIRONMENT || 'integration',
    returnBaseUrl: process.env.WEBPAY_RETURN_BASE_URL,
  },
  tax: {
    // IVA Chile (19%) - Los precios en BD están SIN IVA
    rate: TAX_RATE,
    multiplier: TAX_MULTIPLIER,
  },
});

export const ROUTES_PREFIX = process.env.ROUTES_PREFIX || 'services/quotation-api';
