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

  async findByName(name: string, organizationId: number): Promise<any | null> {
    return await this.customizationFieldRepository.findByName(name, organizationId);
  }

  async findByNames(names: string[], organizationId: number): Promise<any[]> {
    return await this.customizationFieldRepository.findByNames(names, organizationId);
  }

  /**
   * Calcula el precio adicional basado en las opciones de personalización seleccionadas
   * @param customizationValues Valores de personalización seleccionados (fieldName -> selectedValue)
   * @param organizationId ID de la organización
   * @returns Precio adicional total de personalización (neto)
   */
  async calculateCustomizationPrice(
    customizationValues: Record<string, any> | null | undefined,
    organizationId: number,
  ): Promise<number> {
    if (!customizationValues || Object.keys(customizationValues).length === 0) {
      return 0;
    }

    const fieldNames = Object.keys(customizationValues);
    const fields = await this.findByNames(fieldNames, organizationId);

    let totalAdditionalPrice = 0;

    for (const field of fields) {
      // Solo procesar campos tipo 'select' con opciones que tienen precio
      if (field.type !== 'select' || !field.options || field.options.length === 0) {
        continue;
      }

      const selectedValue = customizationValues[field.name];
      if (!selectedValue) continue;

      // Buscar la opción seleccionada
      const selectedOption = field.options.find(
        (opt: { value: string; price?: number }) => opt.value === selectedValue
      );

      if (selectedOption && selectedOption.price && selectedOption.price > 0) {
        totalAdditionalPrice += selectedOption.price;
      }
    }

    return totalAdditionalPrice;
  }
}
