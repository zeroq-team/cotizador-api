import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ChileLocationsService } from './chile-locations.service';

@ApiTags('chile-locations')
@Controller('chile-locations')
export class ChileLocationsController {
  constructor(private readonly chileLocationsService: ChileLocationsService) {}

  @Get('regions')
  @ApiOperation({
    summary: 'Obtener todas las regiones de Chile',
    description: 'Retorna la lista completa de todas las regiones de Chile',
  })
  @ApiResponse({ status: 200, description: 'Lista de regiones' })
  async getAllRegions() {
    return await this.chileLocationsService.getAllRegions();
  }

  @Get('regions/:regionId/communes')
  @ApiOperation({
    summary: 'Obtener comunas por región',
    description: 'Retorna todas las comunas de una región específica',
  })
  @ApiParam({ name: 'regionId', description: 'ID de la región' })
  @ApiResponse({ status: 200, description: 'Lista de comunas' })
  async getCommunesByRegion(@Param('regionId', ParseIntPipe) regionId: number) {
    return await this.chileLocationsService.getCommunesByRegion(regionId);
  }

  @Get('regions/:regionId')
  @ApiOperation({
    summary: 'Obtener región por ID',
    description: 'Retorna los datos de una región específica',
  })
  @ApiParam({ name: 'regionId', description: 'ID de la región' })
  @ApiResponse({ status: 200, description: 'Datos de la región' })
  @ApiResponse({ status: 404, description: 'Región no encontrada' })
  async getRegionById(@Param('regionId', ParseIntPipe) regionId: number) {
    return await this.chileLocationsService.getRegionById(regionId);
  }

  @Get('communes/:communeId')
  @ApiOperation({
    summary: 'Obtener comuna por ID',
    description: 'Retorna los datos de una comuna específica',
  })
  @ApiParam({ name: 'communeId', description: 'ID de la comuna' })
  @ApiResponse({ status: 200, description: 'Datos de la comuna' })
  @ApiResponse({ status: 404, description: 'Comuna no encontrada' })
  async getCommuneById(@Param('communeId', ParseIntPipe) communeId: number) {
    return await this.chileLocationsService.getCommuneById(communeId);
  }
}

