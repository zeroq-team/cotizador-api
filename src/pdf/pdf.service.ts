import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CartService } from '../carts/cart.service';
import { OrganizationService } from '../organization/organization.service';
import { TAX_RATE } from '../config/configuration';
import { PdfGenerateResponseDto } from './dto/pdf-response.dto';

const PDF_API_URL =
  'https://7xpgh2gijh.execute-api.us-east-2.amazonaws.com/v1/pdf/generate/receipt';
const PDF_API_KEY = 'GpZhAIbpSm6CwVUPBS0XUjhZF2Y8f5L7h1i6lw20';

interface PdfGenerateRequest {
  branding: {
    company_name: string;
    logo: {
      type: 'url';
      data: string;
      width: number;
      height: number;
    };
    colors: {
      primary: string;
      secondary: string;
    };
    contact: {
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
    };
  };
  header: {
    greeting: string;
    message: string;
  };
  order: {
    order_number: string;
    dispatch_date?: string;
    status: string;
    payment_status: string;
    shipping: {
      carrier: string;
      status: string;
    };
    delivery_address: {
      company_name?: string;
      region: string;
      city: string;
      office: string;
      street_number: string;
    };
    items: Array<{
      reference: string;
      product: string;
      unit_price: number;
      quantity: number;
      total_price: number;
    }>;
    summary: {
      net: number;
      discounts: number;
      vat: number;
      total: number;
    };
  };
}


interface CompanyConfig {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private readonly cartService: CartService,
    private readonly organizationService: OrganizationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Obtiene la configuración de la empresa desde los settings de la organización
   */
  private getCompanyConfigFromOrganization(
    organization: any,
  ): CompanyConfig {
    const settings = organization.settings || {};
    return {
      companyName: settings.companyName || organization.name || 'ZEROQ',
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor || '#2C3E50',
      secondaryColor: settings.secondaryColor || '#E74C3C',
      tagline: settings.tagline,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      address: settings.address,
    };
  }

  /**
   * Transforma un Cart y CompanyConfig al formato esperado por la API de PDF
   */
  private transformQuoteToPdfRequest(
    cart: any,
    companyConfig: CompanyConfig,
  ): PdfGenerateRequest {
    // Calcular valores del resumen
    const subtotal = cart.items.reduce(
      (sum: number, item: any) => sum + Number(item.price) * item.quantity,
      0,
    );

    const customization = cart.items.reduce((sum: number, item: any) => {
      if (item.customizationValues) {
        // Por ahora retornamos 0, pero aquí se puede agregar lógica para calcular personalización
        return sum;
      }
      return sum;
    }, 0);

    const discount = cart.savings || 0;
    // Calcular IVA (19% IVA Chile)
    const baseForTax = subtotal + customization - discount;
    const tax = baseForTax * TAX_RATE;
    const total = baseForTax + tax;

    // Formatear fecha de dispatch (usar fecha actual o fecha de creación del cart)
    const dispatchDate = cart.createdAt
      ? new Date(cart.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Mapear items
    const items = cart.items.map((item: any) => ({
      reference: item.sku || item.productId?.toString() || '',
      product: item.name,
      unit_price: Math.round(Number(item.price)),
      quantity: item.quantity,
      total_price: Math.round(Number(item.price) * item.quantity),
    }));

    // Obtener dirección de entrega
    const defaultAddress =
      cart.customer?.deliveryAddresses?.find(
        (addr: any) => addr.isDefault,
      ) || cart.customer?.deliveryAddresses?.[0];

    return {
      branding: {
        company_name: companyConfig.companyName || 'ZEROQ',
        logo: {
          type: 'url',
          data:
            companyConfig.logoUrl ||
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvBAvEc9Qpvd1x6zVhQMDmzv-gyX9HjGU6QQ&s',
          width: 6,
          height: 6,
        },
        colors: {
          primary: companyConfig.primaryColor || '#2C3E50',
          secondary: companyConfig.secondaryColor || '#E74C3C',
        },
        contact: {
          address: companyConfig.address,
          phone: companyConfig.contactPhone,
          email: companyConfig.contactEmail,
          website: companyConfig.tagline,
        },
      },
      header: {
        greeting: 'Estimado Cliente,',
        message: 'Gracias por su compra',
      },
      order: {
        order_number: cart.id.slice(-8).toUpperCase(),
        dispatch_date: dispatchDate,
        status: cart.status === 'paid' ? 'Procesado' : 'Pendiente',
        payment_status: cart.status === 'paid' ? 'Pagado' : 'Pendiente',
        shipping: {
          carrier: 'Por definir',
          status: 'Pendiente',
        },
        delivery_address: {
          company_name: cart.customer?.fullName,
          region: defaultAddress?.region || 'Por definir',
          city: defaultAddress?.city || defaultAddress?.commune || 'Por definir',
          office:
            defaultAddress?.office ||
            defaultAddress?.apartment ||
            'Por definir',
          street_number: defaultAddress?.streetNumber
            ? `${defaultAddress.street || ''} ${defaultAddress.streetNumber}`.trim()
            : 'Por definir',
        },
        items,
        summary: {
          net: Math.round(subtotal + customization),
          discounts: Math.round(discount),
          vat: Math.round(tax),
          total: Math.round(total),
        },
      },
    };
  }

  /**
   * Genera un PDF de recibo/cotización y retorna la respuesta del servicio externo
   */
  async generateQuotePdf(quotationId: string): Promise<PdfGenerateResponseDto> {
    try {
      // Obtener el cart
      const cart = await this.cartService.getCartById(quotationId);

      if (!cart) {
        throw new NotFoundException(
          `Cart with ID ${quotationId} not found`,
        );
      }

      // Obtener la organización
      const organization = await this.organizationService.findOne(
        cart.organizationId,
      );

      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${cart.organizationId} not found`,
        );
      }

      // Obtener configuración de la empresa
      const companyConfig = this.getCompanyConfigFromOrganization(organization);

      // Transformar datos al formato esperado
      const requestBody = this.transformQuoteToPdfRequest(cart, companyConfig);

      // Llamar al servicio externo
      const response = await axios.post<PdfGenerateResponseDto>(
        PDF_API_URL,
        requestBody,
        {
          headers: {
            'x-api-key': PDF_API_KEY,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data;

      if (!data.url) {
        throw new Error(
          'La respuesta del servicio no contiene una URL válida',
        );
      }

      return data;
    } catch (error) {
      this.logger.error(`Error generating PDF for quotation ${quotationId}:`, error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Mejorar el mensaje de error para errores de red
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // El servidor respondió con un código de estado fuera del rango 2xx
          throw new Error(
            `Error al generar PDF: ${error.response.status} ${error.response.statusText}. ${JSON.stringify(error.response.data)}`,
          );
        } else if (error.request) {
          // La petición fue hecha pero no se recibió respuesta
          throw new Error(
            'Error de conexión: No se pudo conectar con el servicio de PDF. ' +
              'Verifica que el servidor esté disponible. ' +
              `Error original: ${error.message}`,
          );
        }
      }

      throw error;
    }
  }
}

