import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CustomizationFieldModule } from './customization-fields/customization-field.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './carts/cart.module';
import { InventoryModule } from './inventory/inventory.module';
import { S3Module } from './s3/s3.module';
import { PaymentModule } from './payments/payment.module';
import { ConversationsService } from './conversations/conversations.service';
import { OrganizationModule } from './organization/organization.module';
import { PriceListsModule } from './price-lists/price-lists.module';
import { PriceListConditionsModule } from './price-list-conditions/price-list-conditions.module';
import configuration from './config/configuration';
import { CustomizationFieldGroupModule } from './customization-field-groups/customization-field-group.module';
import { ChileLocationsModule } from './chile-locations/chile-locations.module';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    DatabaseModule,
    CustomizationFieldGroupModule,
    CustomizationFieldModule,
    ProductsModule,
    PriceListsModule,
    PriceListConditionsModule,
    CartModule,
    InventoryModule,
    S3Module,
    PaymentModule,
    OrganizationModule,
    ChileLocationsModule,
    PdfModule,
  ],
  controllers: [AppController],
  providers: [AppService, ConversationsService],
})
export class AppModule {}
