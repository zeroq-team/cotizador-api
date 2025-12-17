import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InventoryLocationRepository } from './inventory-location.repository';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class InventoryLocationService {
  constructor(
    private readonly locationRepository: InventoryLocationRepository,
  ) {}

  /**
   * Obtiene todas las ubicaciones
   */
  async findAll(organizationId: number, type?: string) {
    const filters: any = { organizationId };
    
    if (type && (type === 'warehouse' || type === 'store' || type === 'virtual')) {
      filters.type = type;
    }

    const locations = await this.locationRepository.findAll(filters);

    return locations.map((loc) => ({
      id: `loc_${loc.id}`,
      code: loc.code,
      name: loc.name,
      type: loc.type,
      address: loc.address,
      createdAt: loc.createdAt?.toISOString(),
      updatedAt: loc.updatedAt.toISOString(),
    }));
  }

  /**
   * Obtiene una ubicación por ID
   */
  async findOne(id: number, organizationId: number) {
    const location = await this.locationRepository.findById(id, organizationId);

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return {
      id: `loc_${location.id}`,
      code: location.code,
      name: location.name,
      type: location.type,
      address: location.address,
      createdAt: location.createdAt?.toISOString(),
      updatedAt: location.updatedAt.toISOString(),
    };
  }

  /**
   * Crea una nueva ubicación
   */
  async create(organizationId: number, createLocationDto: CreateLocationDto) {
    // Verificar que no exista una ubicación con el mismo código
    const existing = await this.locationRepository.findByCode(
      createLocationDto.code,
      organizationId,
    );

    if (existing) {
      throw new ConflictException(
        `Location with code ${createLocationDto.code} already exists`,
      );
    }

    const location = await this.locationRepository.create({
      organizationId,
      code: createLocationDto.code,
      name: createLocationDto.name,
      type: createLocationDto.type,
      address: createLocationDto.address || null,
    });

    return {
      id: `loc_${location.id}`,
      code: location.code,
      name: location.name,
      type: location.type,
      address: location.address,
      createdAt: location.createdAt?.toISOString(),
      updatedAt: location.updatedAt.toISOString(),
    };
  }

  /**
   * Actualiza una ubicación existente
   */
  async update(
    id: number,
    organizationId: number,
    updateLocationDto: UpdateLocationDto,
  ) {
    // Verificar que exista
    const existing = await this.locationRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    // Si se está actualizando el código, verificar que no esté en uso
    if (updateLocationDto.code && updateLocationDto.code !== existing.code) {
      const codeInUse = await this.locationRepository.findByCode(
        updateLocationDto.code,
        organizationId,
      );
      if (codeInUse) {
        throw new ConflictException(
          `Location with code ${updateLocationDto.code} already exists`,
        );
      }
    }

    const updated = await this.locationRepository.update(
      id,
      organizationId,
      updateLocationDto,
    );

    return {
      id: `loc_${updated.id}`,
      code: updated.code,
      name: updated.name,
      type: updated.type,
      address: updated.address,
      createdAt: updated.createdAt?.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Elimina una ubicación
   */
  async remove(id: number, organizationId: number) {
    const existing = await this.locationRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    await this.locationRepository.delete(id, organizationId);

    return { success: true, message: 'Location deleted successfully' };
  }

  /**
   * Obtiene estadísticas de ubicaciones
   */
  async getStats(organizationId: number) {
    const countByType = await this.locationRepository.countByType(organizationId);
    const allLocations = await this.locationRepository.findAll({ organizationId });

    return {
      total: allLocations.length,
      byType: countByType,
    };
  }
}
