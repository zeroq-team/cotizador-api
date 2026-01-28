import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { CartModule } from '../carts/cart.module';
import { OrganizationModule } from '../organization/organization.module';
import { CustomerService } from '../customers/customer.service';
import { CustomerModule } from '../customers/customer.module';
import { PaymentService } from '../payments/payment.service';
import { WebpayService } from 'src/webpay/webpay.service';
import { S3Service } from 'src/s3/s3.service';
import { PdfGeneratorService } from 'src/payments/services/pdf-generator.service';
import { PaymentRepository } from 'src/payments/payment.repository';
import { ConversationsService } from 'src/conversations/conversations.service';

@Module({
  imports: [CartModule, OrganizationModule, CustomerModule],
  controllers: [PdfController],
  providers: [
    PdfService,
    CustomerService,
    PaymentService,
    WebpayService,
    PdfGeneratorService, // TODO: THIS should be in this module
    PaymentRepository,
    S3Service,
    ConversationsService
  ],
  exports: [PdfService],
})
export class PdfModule {}
