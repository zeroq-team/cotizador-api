import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { CartModule } from '../carts/cart.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [CartModule, OrganizationModule],
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}

