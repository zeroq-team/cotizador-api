import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateOrganizationPaymentMethodDto } from './dto/create-organization-payment-method.dto';
import { UpdateOrganizationPaymentMethodDto } from './dto/update-organization-payment-method.dto';
import { OrganizationPaymentMethodRepository } from './organization-payment-method.repository';
import { OrganizationRepository } from './organization.repository';
import { OrganizationPaymentMethod } from '../database/schemas';

@Injectable()
export class OrganizationPaymentMethodService {
  constructor(
    private readonly paymentMethodRepository: OrganizationPaymentMethodRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async create(
    createDto: CreateOrganizationPaymentMethodDto,
  ): Promise<OrganizationPaymentMethod> {
    // Verify organization exists
    const organization = await this.organizationRepository.findById(
      createDto.organizationId,
    );

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${createDto.organizationId} not found`,
      );
    }

    // Check if payment methods already exist for this organization
    const existing = await this.paymentMethodRepository.findByOrganizationId(
      createDto.organizationId,
    );

    if (existing) {
      throw new ConflictException(
        `Payment methods already exist for organization ID ${createDto.organizationId}`,
      );
    }

    return await this.paymentMethodRepository.create({
      organizationId: createDto.organizationId,
      isCheckActive: createDto.isCheckActive ?? false,
      isWebPayActive: createDto.isWebPayActive ?? false,
      isBankTransferActive: createDto.isBankTransferActive ?? false,
    });
  }

  async findAll(): Promise<OrganizationPaymentMethod[]> {
    return await this.paymentMethodRepository.findAll();
  }

  async findOne(id: number): Promise<OrganizationPaymentMethod> {
    const paymentMethod = await this.paymentMethodRepository.findById(id);

    if (!paymentMethod) {
      throw new NotFoundException(
        `Organization payment methods with ID ${id} not found`,
      );
    }

    return paymentMethod;
  }

  async findByOrganizationId(
    organizationId: number,
  ): Promise<OrganizationPaymentMethod> {
    const paymentMethod =
      await this.paymentMethodRepository.findByOrganizationId(organizationId);

    // if (!paymentMethod) {
    //   throw new NotFoundException(
    //     `Payment methods for organization ID ${organizationId} not found`,
    //   );
    // }

    return paymentMethod;
  }

  async update(
    id: number,
    updateDto: UpdateOrganizationPaymentMethodDto,
  ): Promise<OrganizationPaymentMethod> {
    const paymentMethod = await this.paymentMethodRepository.findById(id);

    if (!paymentMethod) {
      throw new NotFoundException(
        `Organization payment methods with ID ${id} not found`,
      );
    }

    const updated = await this.paymentMethodRepository.update(id, updateDto);

    if (!updated) {
      throw new NotFoundException(
        `Failed to update payment methods with ID ${id}`,
      );
    }

    return updated;
  }

  async updateByOrganizationId(
    organizationId: number,
    updateDto: UpdateOrganizationPaymentMethodDto,
  ): Promise<OrganizationPaymentMethod> {
    // Verify organization exists
    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }

    const paymentMethod =
      await this.paymentMethodRepository.findByOrganizationId(organizationId);

    if (!paymentMethod) {
      throw new NotFoundException(
        `Payment methods for organization ID ${organizationId} not found`,
      );
    }

    const updated = await this.paymentMethodRepository.updateByOrganizationId(
      organizationId,
      updateDto,
    );

    if (!updated) {
      throw new NotFoundException(
        `Failed to update payment methods for organization ID ${organizationId}`,
      );
    }

    return updated;
  }

  async remove(id: number): Promise<{ message: string }> {
    const paymentMethod = await this.paymentMethodRepository.findById(id);

    if (!paymentMethod) {
      throw new NotFoundException(
        `Organization payment methods with ID ${id} not found`,
      );
    }

    const deleted = await this.paymentMethodRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException(
        `Failed to delete payment methods with ID ${id}`,
      );
    }

    return {
      message: `Organization payment methods with ID ${id} has been deleted`,
    };
  }

  async removeByOrganizationId(
    organizationId: number,
  ): Promise<{ message: string }> {
    const paymentMethod =
      await this.paymentMethodRepository.findByOrganizationId(organizationId);

    if (!paymentMethod) {
      throw new NotFoundException(
        `Payment methods for organization ID ${organizationId} not found`,
      );
    }

    const deleted =
      await this.paymentMethodRepository.deleteByOrganizationId(organizationId);

    if (!deleted) {
      throw new NotFoundException(
        `Failed to delete payment methods for organization ID ${organizationId}`,
      );
    }

    return {
      message: `Payment methods for organization ID ${organizationId} has been deleted`,
    };
  }
}

