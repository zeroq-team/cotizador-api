import { Injectable } from '@nestjs/common';
import { Cart, CartItemRecord } from '../../database/schemas';

const PDFDocument = require('pdfkit');

interface QuoteData {
  cart: Cart & { items: CartItemRecord[]; customer?: any };
  organizationName?: string;
  organizationLogo?: string;
}

@Injectable()
export class QuotePdfGeneratorService {
  /**
   * Genera un PDF de la cotización
   */
  generateQuotePdf(data: QuoteData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const { cart, organizationName, organizationLogo } = data;

        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // ==========================================
        // ENCABEZADO
        // ==========================================
        this.addHeader(doc, cart, organizationName);

        // ==========================================
        // INFORMACIÓN DEL CLIENTE
        // ==========================================
        this.addCustomerInfo(doc, cart);

        // ==========================================
        // TABLA DE PRODUCTOS
        // ==========================================
        this.addProductsTable(doc, cart.items);

        // ==========================================
        // TOTALES
        // ==========================================
        this.addTotals(doc, cart);

        // ==========================================
        // INFORMACIÓN ADICIONAL
        // ==========================================
        this.addFooterInfo(doc, cart);

        // ==========================================
        // PIE DE PÁGINA
        // ==========================================
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(
    doc: PDFKit.PDFDocument,
    cart: Cart,
    organizationName?: string,
  ): void {
    // Título
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .text('COTIZACIÓN', { align: 'center' });

    doc.moveDown(0.5);

    // Número de cotización
    const quoteNumber = cart.id.slice(-8).toUpperCase();
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(`N° ${quoteNumber}`, { align: 'center' });

    // Nombre de la organización si está disponible
    if (organizationName) {
      doc.moveDown(0.3);
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#374151')
        .text(organizationName, { align: 'center' });
    }

    doc.moveDown(1);

    // Línea separadora
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .stroke();

    doc.moveDown(1);
  }

  private addCustomerInfo(doc: PDFKit.PDFDocument, cart: Cart & { customer?: any }): void {
    if (!cart.customer) {
      return;
    }

    const customer = cart.customer;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1f2937').text('Información del Cliente');
    doc.moveDown(0.5);

    const startX = doc.page.margins.left;
    const labelWidth = 150;

    // Nombre completo
    if (customer.fullName) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('Nombre:', startX, doc.y, { continued: true, width: labelWidth });
      doc.font('Helvetica-Bold').fillColor('#374151').text(` ${customer.fullName}`);
    }

    // Tipo de documento
    if (customer.documentType) {
      const documentTypeLabels: Record<string, string> = {
        rut: 'RUT',
        passport: 'Pasaporte',
        other: 'Otro',
      };
      doc
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('Tipo de Documento:', startX, doc.y, { continued: true, width: labelWidth });
      doc
        .font('Helvetica-Bold')
        .fillColor('#374151')
        .text(` ${documentTypeLabels[customer.documentType] || customer.documentType}`);
    }

    // Número de documento
    if (customer.documentNumber) {
      doc
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('N° de Documento:', startX, doc.y, { continued: true, width: labelWidth });
      doc.font('Helvetica-Bold').fillColor('#374151').text(` ${customer.documentNumber}`);
    }

    // Email
    if (customer.email) {
      doc
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('Email:', startX, doc.y, { continued: true, width: labelWidth });
      doc.font('Helvetica-Bold').fillColor('#374151').text(` ${customer.email}`);
    }

    // Teléfono
    if (customer.phone) {
      doc
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('Teléfono:', startX, doc.y, { continued: true, width: labelWidth });
      doc.font('Helvetica-Bold').fillColor('#374151').text(` ${customer.phone}`);
    }

    // Dirección de entrega
    if (
      customer.deliveryStreet ||
      customer.deliveryCity ||
      customer.deliveryRegion
    ) {
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#1f2937')
        .text('Dirección de Entrega');
      doc.moveDown(0.3);

      let addressParts: string[] = [];
      if (customer.deliveryStreet) {
        const street = customer.deliveryStreetNumber
          ? `${customer.deliveryStreet} ${customer.deliveryStreetNumber}`.trim()
          : customer.deliveryStreet;
        addressParts.push(street);
      }
      if (customer.deliveryApartment) {
        addressParts.push(`Depto/Oficina: ${customer.deliveryApartment}`);
      }
      if (customer.deliveryOffice) {
        addressParts.push(`Edificio: ${customer.deliveryOffice}`);
      }
      if (customer.deliveryCity) {
        addressParts.push(customer.deliveryCity);
      }
      if (customer.deliveryRegion) {
        addressParts.push(customer.deliveryRegion);
      }
      if (customer.deliveryPostalCode) {
        addressParts.push(`Código Postal: ${customer.deliveryPostalCode}`);
      }
      if (customer.deliveryCountry) {
        addressParts.push(customer.deliveryCountry);
      }

      if (addressParts.length > 0) {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#374151')
          .text(addressParts.join(', '), startX, doc.y);
      }
    }

    // Fechas
    doc.moveDown(0.5);
    doc
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Fecha de Emisión:', startX, doc.y, { continued: true, width: labelWidth });
    doc
      .font('Helvetica-Bold')
      .fillColor('#374151')
      .text(` ${new Date(cart.createdAt).toLocaleDateString('es-CL')}`);

    if (cart.validUntil) {
      doc
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('Válida Hasta:', startX, doc.y, { continued: true, width: labelWidth });
      doc
        .font('Helvetica-Bold')
        .fillColor('#374151')
        .text(` ${new Date(cart.validUntil).toLocaleDateString('es-CL')}`);
    }

    // Estado
    const statusLabels: Record<string, string> = {
      draft: 'Borrador',
      active: 'Activa',
      expired: 'Expirada',
      paid: 'Pagada',
      cancelled: 'Cancelada',
    };

    doc
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Estado:', startX, doc.y, { continued: true, width: labelWidth });
    doc
      .font('Helvetica-Bold')
      .fillColor('#374151')
      .text(` ${statusLabels[cart.status] || cart.status}`);

    doc.moveDown(1.5);
  }

  private addProductsTable(doc: PDFKit.PDFDocument, items: CartItemRecord[]): void {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1f2937').text('Detalle de Productos');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Anchos de columnas
    const colWidths = {
      product: pageWidth * 0.4,
      sku: pageWidth * 0.15,
      quantity: pageWidth * 0.1,
      unitPrice: pageWidth * 0.15,
      total: pageWidth * 0.2,
    };

    // Posiciones X de cada columna
    const colX = {
      product: doc.page.margins.left,
      sku: doc.page.margins.left + colWidths.product,
      quantity: doc.page.margins.left + colWidths.product + colWidths.sku,
      unitPrice: doc.page.margins.left + colWidths.product + colWidths.sku + colWidths.quantity,
      total:
        doc.page.margins.left +
        colWidths.product +
        colWidths.sku +
        colWidths.quantity +
        colWidths.unitPrice,
    };

    // Encabezado de la tabla
    doc
      .rect(doc.page.margins.left, tableTop, pageWidth, 20)
      .fillColor('#f3f4f6')
      .fill();

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#374151')
      .text('Producto', colX.product + 5, tableTop + 6, { width: colWidths.product - 10 })
      .text('SKU', colX.sku + 5, tableTop + 6, { width: colWidths.sku - 10 })
      .text('Cant.', colX.quantity + 5, tableTop + 6, { width: colWidths.quantity - 10 })
      .text('P. Unit.', colX.unitPrice + 5, tableTop + 6, { width: colWidths.unitPrice - 10 })
      .text('Total', colX.total + 5, tableTop + 6, { width: colWidths.total - 10, align: 'right' });

    let currentY = tableTop + 25;

    // Filas de productos
    for (const item of items) {
      // Verificar si necesitamos nueva página
      if (currentY > doc.page.height - 150) {
        doc.addPage();
        currentY = doc.page.margins.top;
      }

      const unitPrice = parseFloat(item.price.toString());
      const totalPrice = unitPrice * item.quantity;

      // Fondo alternado
      const rowIndex = items.indexOf(item);
      if (rowIndex % 2 === 0) {
        doc
          .rect(doc.page.margins.left, currentY - 3, pageWidth, 20)
          .fillColor('#fafafa')
          .fill();
      }

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#374151')
        .text(item.name, colX.product + 5, currentY, {
          width: colWidths.product - 10,
          ellipsis: true,
        })
        .text(item.sku, colX.sku + 5, currentY, { width: colWidths.sku - 10 })
        .text(item.quantity.toString(), colX.quantity + 5, currentY, {
          width: colWidths.quantity - 10,
        })
        .text(`$${unitPrice.toLocaleString('es-CL')}`, colX.unitPrice + 5, currentY, {
          width: colWidths.unitPrice - 10,
        })
        .text(`$${totalPrice.toLocaleString('es-CL')}`, colX.total + 5, currentY, {
          width: colWidths.total - 10,
          align: 'right',
        });

      currentY += 20;
    }

    doc.y = currentY + 10;
  }

  private addTotals(doc: PDFKit.PDFDocument, cart: Cart): void {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const rightX = doc.page.margins.left + pageWidth - 200;

    // Línea separadora
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(rightX, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .stroke();

    doc.moveDown(0.5);

    // Cantidad de items
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(`Total de Productos: ${cart.totalItems}`, rightX, doc.y, {
        width: 200,
        align: 'right',
      });

    doc.moveDown(0.3);

    // Total
    const totalPrice = parseFloat(cart.totalPrice.toString());
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .text(`Total: $${totalPrice.toLocaleString('es-CL')} CLP`, rightX, doc.y, {
        width: 200,
        align: 'right',
      });

    // Si hubo cambio de precio aprobado
    if (cart.priceChangeApproved && cart.originalTotalPrice) {
      const originalPrice = parseFloat(cart.originalTotalPrice.toString());
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#ef4444')
        .text(`Precio Original: $${originalPrice.toLocaleString('es-CL')} CLP`, rightX, doc.y, {
          width: 200,
          align: 'right',
        });
    }

    doc.moveDown(1.5);
  }

  private addFooterInfo(doc: PDFKit.PDFDocument, cart: Cart): void {
    // Verificar si necesitamos nueva página
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }

    // Línea separadora
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .stroke();

    doc.moveDown(1);

    // Nota informativa
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Nota: Los precios indicados pueden estar sujetos a cambios sin previo aviso.', {
        align: 'left',
      });

    if (cart.validUntil) {
      doc.moveDown(0.3);
      doc.text(
        `Esta cotización es válida hasta el ${new Date(cart.validUntil).toLocaleDateString('es-CL')}.`,
        { align: 'left' },
      );
    }
  }

  private addFooter(doc: PDFKit.PDFDocument): void {
    const bottomY = doc.page.height - 60;

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#9ca3af')
      .text('Documento generado automáticamente', doc.page.margins.left, bottomY, {
        align: 'center',
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      });

    doc.text(
      `Generado el ${new Date().toLocaleString('es-CL')}`,
      doc.page.margins.left,
      bottomY + 12,
      {
        align: 'center',
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      },
    );
  }
}
