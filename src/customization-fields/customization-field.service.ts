import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomizationFieldRepository } from './customization-field.repository';
import { CreateCustomizationFieldDto } from './dto/create-customization-field.dto';
import { UpdateCustomizationFieldDto } from './dto/update-customization-field.dto';
import { ReorderCustomizationFieldsDto } from './dto/reorder-customization-fields.dto';

@Injectable()
export class CustomizationFieldService {
  constructor(
    private readonly customizationFieldRepository: CustomizationFieldRepository,
  ) {}

  async findAll(organizationId: number): Promise<any[]> {
    return await this.customizationFieldRepository.findAll(organizationId);
  }

  async findAllGrouped(organizationId: number): Promise<any[]> {
    return await this.customizationFieldRepository.findAllGrouped(organizationId);
  }

  async findById(id: string, organizationId: number): Promise<any> {
    const field = await this.customizationFieldRepository.findById(id, organizationId);
    if (!field) {
      throw new NotFoundException(`Customization field with ID ${id} not found`);
    }
    return field;
  }

  async create(createCustomizationFieldDto: CreateCustomizationFieldDto, organizationId: number): Promise<any> {
    return await this.customizationFieldRepository.create({
      ...createCustomizationFieldDto,
      organizationId,
    });
  }

  async update(id: string, updateCustomizationFieldDto: UpdateCustomizationFieldDto, organizationId: number): Promise<any> {
    const field = await this.customizationFieldRepository.findById(id, organizationId);
    if (!field) {
      throw new NotFoundException(`Customization field with ID ${id} not found`);
    }

    return await this.customizationFieldRepository.update(id, organizationId, updateCustomizationFieldDto);
  }

  async delete(id: string, organizationId: number): Promise<void> {
    const field = await this.customizationFieldRepository.findById(id, organizationId);
    if (!field) {
      throw new NotFoundException(`Customization field with ID ${id} not found`);
    }

    await this.customizationFieldRepository.delete(id, organizationId);
  }

  async toggleActive(id: string, organizationId: number): Promise<any> {
    return await this.customizationFieldRepository.toggleActive(id, organizationId);
  }

  async reorder(reorderCustomizationFieldsDto: ReorderCustomizationFieldsDto, organizationId: number): Promise<void> {
    await this.customizationFieldRepository.reorder(reorderCustomizationFieldsDto.fieldOrders, organizationId);
  }
}
