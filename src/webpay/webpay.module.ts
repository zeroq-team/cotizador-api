import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebpayController } from './webpay.controller';
import { WebpayService } from './webpay.service';
import { PaymentModule } from '../payments/payment.module';
import { DatabaseModule } from '../database/database.module';
import { S3Module } from '../s3/s3.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    S3Module,
    OrganizationModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [WebpayController],
  providers: [WebpayService],
  exports: [WebpayService],
})
export class WebpayModule {}

