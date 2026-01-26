import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CustomerRepository } from './customer.repository';
import { DeliveryAddressRepository } from './delivery-address.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateDeliveryAddressDto } from './dto/create-delivery-address.dto';
import { UpdateDeliveryAddressDto } from './dto/update-delivery-address.dto';
import { Customer, DeliveryAddress } from '../database/schemas';
import { OrganizationService } from '../organization/organization.service';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly deliveryAddressRepository: DeliveryAddressRepository,
    private readonly organizationService: OrganizationService,
  ) {}

  /**
   * Crea un nuevo cliente
   */
  async create(
    createCustomerDto: CreateCustomerDto,
  ): Promise<Customer & { deliveryAddresses?: DeliveryAddress[] }> {
    // Verificar que la organización existe
    try {
      await this.organizationService.findOne(createCustomerDto.organizationId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException(
          `La organización con ID ${createCustomerDto.organizationId} no existe`,
        );
      }
      throw error;
    }

    const customer = await this.customerRepository.create({
      organizationId: createCustomerDto.organizationId,
      fullName: createCustomerDto.fullName,
      documentType: createCustomerDto.documentType,
      documentNumber: createCustomerDto.documentNumber,
      email: createCustomerDto.email,
      phoneCode: createCustomerDto.phoneCode,
      phoneNumber: createCustomerDto.phoneNumber,
    });

    // Obtener direcciones de entrega
    const addresses = await this.deliveryAddressRepository.findByCustomerId(
      customer.id,
    );

    return {
      ...customer,
      deliveryAddresses: addresses,
    } as any;
  }

  /**
   * Obtiene un cliente por ID con sus direcciones
   */
  async findOne(id: string): Promise<Customer & { deliveryAddresses?: DeliveryAddress[] }> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Obtener direcciones de entrega
    const addresses = await this.deliveryAddressRepository.findByCustomerId(
      customer.id,
    );

    return {
      ...customer,
      deliveryAddresses: addresses,
    } as any;
  }

  /**
   * Actualiza un cliente
   */
  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer & { deliveryAddresses?: DeliveryAddress[] }> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const updated = await this.customerRepository.update(id, {
      fullName: updateCustomerDto.fullName,
      documentType: updateCustomerDto.documentType,
      documentNumber: updateCustomerDto.documentNumber,
      email: updateCustomerDto.email,
      phoneCode: updateCustomerDto.phoneCode,
      phoneNumber: updateCustomerDto.phoneNumber,
    });

    if (!updated) {
      throw new BadRequestException('Failed to update customer');
    }

    // Obtener direcciones de entrega
    const addresses = await this.deliveryAddressRepository.findByCustomerId(
      updated.id,
    );

    return {
      ...updated,
      deliveryAddresses: addresses,
    } as any;
  }

  /**
   * Elimina un cliente (soft delete si está implementado, o hard delete)
   */
  async remove(id: string): Promise<void> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Por ahora no implementamos soft delete para customers
    // Si se necesita, se puede agregar un campo deletedAt
    throw new BadRequestException('Customer deletion is not implemented');
  }

  /**
   * Busca un cliente por teléfono en una organización
   */
  async findByPhone(
    organizationId: number,
    phoneCode: string,
    phoneNumber: string,
  ): Promise<(Customer & { deliveryAddresses?: DeliveryAddress[] }) | null> {
    const customer = await this.customerRepository.findByPhone(
      organizationId,
      phoneCode,
      phoneNumber,
    );

    if (!customer) {
      return null;
    }

    // Obtener direcciones de entrega
    const addresses = await this.deliveryAddressRepository.findByCustomerId(
      customer.id,
    );

    return {
      ...customer,
      deliveryAddresses: addresses,
    } as any;
  }

  /**
   * Busca un cliente por documento en una organización
   */
  async findByDocument(
    organizationId: number,
    documentType: string,
    documentNumber: string,
  ): Promise<(Customer & { deliveryAddresses?: DeliveryAddress[] }) | null> {
    const customer = await this.customerRepository.findByOrganizationAndDocument(
      organizationId,
      documentType,
      documentNumber,
    );

    if (!customer) {
      return null;
    }

    // Obtener direcciones de entrega
    const addresses = await this.deliveryAddressRepository.findByCustomerId(
      customer.id,
    );

    return {
      ...customer,
      deliveryAddresses: addresses,
    } as any;
  }

  /**
   * Crea o actualiza un cliente (upsert)
   */
  async upsert(
    organizationId: number,
    customerData: {
      fullName?: string;
      documentType?: string;
      documentNumber?: string;
      email?: string;
      phoneCode?: string;
      phoneNumber?: string;
    },
  ): Promise<Customer & { deliveryAddresses?: DeliveryAddress[] }> {
    // Verificar que la organización existe
    try {
      await this.organizationService.findOne(organizationId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException(
          `La organización con ID ${organizationId} no existe`,
        );
      }
      throw error;
    }

    const customer = await this.customerRepository.upsert(
      organizationId,
      customerData,
    );

    // Obtener direcciones de entrega
    const addresses = await this.deliveryAddressRepository.findByCustomerId(
      customer.id,
    );

    return {
      ...customer,
      deliveryAddresses: addresses,
    } as any;
  }

  /**
   * Crea una nueva dirección de entrega para un cliente
   */
  async createDeliveryAddress(
    customerId: string,
    createAddressDto: CreateDeliveryAddressDto,
  ): Promise<Customer & { deliveryAddresses?: DeliveryAddress[] }> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const address = await this.deliveryAddressRepository.create({
      customerId,
      street: createAddressDto.street,
      streetNumber: createAddressDto.streetNumber,
      apartment: createAddressDto.apartment,
      commune: createAddressDto.commune,
      region: createAddressDto.region,
      postalCode: createAddressDto.postalCode,
      country: createAddressDto.country,
      office: createAddressDto.office,
      isDefault: createAddressDto.isDefault ?? false,
    });

    // Obtener todas las direcciones actualizadas
    const addresses = await this.deliveryAddressRepository.findByCustomerId(
      customerId,
    );

    return {
      ...customer,
      deliveryAddresses: addresses,
    } as any;
  }

  /**
   * Actualiza una dirección de entrega
   */
  async updateDeliveryAddress(
    customerId: string,
    addressId: string,
    updateAddressDto: UpdateDeliveryAddressDto,
  ): Promise<Customer & { deliveryAddresses?: DeliveryAddress[] }> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Verificar que la dirección pertenece al cliente
    const address = await this.deliveryAddressRepository.findById(addressId);
    if (!address || address.customerId !== customerId) {
      throw new NotFoundException(
        `Delivery address with ID ${addressId} not found for customer ${customerId}`,
      );
    }

    await this.deliveryAddressRepository.update(addressId, {
      street: updateAddressDto.street,
      streetNumber: updateAddressDto.streetNumber,
      apartment: updateAddressDto.apartment,
      commune: updateAddressDto.commune,
      region: updateAddressDto.region,
      postalCode: updateAddressDto.postalCode,
      country: updateAddressDto.country,
      office: updateAddressDto.office,
      isDefault: updateAddressDto.isDefault,
    });

    // Obtener todas las direcciones actualizadas
    const addresses = await this.deliveryAddressRepository.findByCustomerId(
      customerId,
    );

    return {
      ...customer,
      deliveryAddresses: addresses,
    } as any;
  }

  /**
   * Elimina una dirección de entrega (soft delete)
   */
  async deleteDeliveryAddress(
    customerId: string,
    addressId: string,
  ): Promise<Customer & { deliveryAddresses?: DeliveryAddress[] }> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Verificar que la dirección pertenece al cliente
    const address = await this.deliveryAddressRepository.findById(addressId);
    if (!address || address.customerId !== customerId) {
      throw new NotFoundException(
        `Delivery address with ID ${addressId} not found for customer ${customerId}`,
      );
    }

    await this.deliveryAddressRepository.delete(addressId);

    // Obtener todas las direcciones actualizadas
    const addresses = await this.deliveryAddressRepository.findByCustomerId(
      customerId,
    );

    return {
      ...customer,
      deliveryAddresses: addresses,
    } as any;
  }

  async findDeliveryAddressById(addressId: string): Promise<DeliveryAddress | null> {
    const address = await this.deliveryAddressRepository.findById(addressId);
    if (!address) {
      throw new NotFoundException(`Delivery address with ID ${addressId} not found`);
    }
    return address;
  }
}
