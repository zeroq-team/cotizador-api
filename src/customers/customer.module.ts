import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerRepository } from './customer.repository';
import { DeliveryAddressRepository } from './delivery-address.repository';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [DatabaseModule, OrganizationModule],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerRepository, DeliveryAddressRepository],
  exports: [CustomerService, CustomerRepository, DeliveryAddressRepository],
})
export class CustomerModule {}
