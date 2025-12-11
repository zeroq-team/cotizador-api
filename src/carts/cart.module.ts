import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartRepository } from './cart.repository';
import { CartChangelogRepository } from './cart-changelog.repository';
import { CartGateway } from './cart.gateway';
import { PriceListEvaluationService } from './services/price-list-evaluation.service';
import { QuotePdfGeneratorService } from './services/quote-pdf-generator.service';
import { DatabaseModule } from '../database/database.module';
import { ProductsModule } from '../products/products.module';
import { PaymentModule } from '../payments/payment.module';
import { ConversationsService } from '../conversations/conversations.service';
import { PriceListsModule } from '../price-lists/price-lists.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [DatabaseModule, ProductsModule, PaymentModule, PriceListsModule, OrganizationModule],
  controllers: [CartController],
  providers: [
    CartService,
    CartRepository,
    CartChangelogRepository,
    CartGateway,
    ConversationsService,
    PriceListEvaluationService,
    QuotePdfGeneratorService,
  ],
  exports: [CartService, CartGateway, PriceListEvaluationService],
})
export class CartModule {}
