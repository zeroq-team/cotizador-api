import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartRepository } from './cart.repository';
import { CartChangelogRepository } from './cart-changelog.repository';
import { CartSuggestionsRepository } from './cart-suggestions.repository';
import { CartGateway } from './cart.gateway';
import { CustomerModule } from '../customers/customer.module';
import { PriceListEvaluationService } from './services/price-list-evaluation.service';
import { DatabaseModule } from '../database/database.module';
import { ProductsModule } from '../products/products.module';
import { PaymentModule } from '../payments/payment.module';
import { ConversationsService } from '../conversations/conversations.service';
import { PriceListsModule } from '../price-lists/price-lists.module';
import { OrganizationModule } from '../organization/organization.module';
import { CustomizationFieldModule } from '../customization-fields/customization-field.module';

@Module({
  imports: [DatabaseModule, ProductsModule, PaymentModule, PriceListsModule, OrganizationModule, CustomizationFieldModule, CustomerModule],
  controllers: [CartController],
  providers: [
    CartService,
    CartRepository,
    CartChangelogRepository,
    CartSuggestionsRepository,
    CartGateway,
    ConversationsService,
    PriceListEvaluationService,
  ],
  exports: [CartService, CartGateway, PriceListEvaluationService],
})
export class CartModule {}
