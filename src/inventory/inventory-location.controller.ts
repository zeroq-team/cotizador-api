import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { InventoryLocationService } from './inventory-location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('inventory-locations')
@ApiHeader({
  name: 'x-organization-id',
  description: 'ID de la organización',
  required: true,
})
@Controller('inventory/locations')
export class InventoryLocationController {
  constructor(
    private readonly locationService: InventoryLocationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las ubicaciones' })
  @ApiQuery({ name: 'type', required: false, enum: ['warehouse', 'store', 'virtual'] })
  @ApiResponse({ status: 200, description: 'Lista de ubicaciones' })
  async findAll(
    @Headers('x-organization-id') organizationId: string,
    @Query('type') type?: string,
  ) {
    return await this.locationService.findAll(Number(organizationId), type);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de ubicaciones' })
  @ApiResponse({ status: 200, description: 'Estadísticas de ubicaciones' })
  async getStats(@Headers('x-organization-id') organizationId: string) {
    return await this.locationService.getStats(Number(organizationId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una ubicación por ID' })
  @ApiParam({ name: 'id', description: 'ID de la ubicación' })
  @ApiResponse({ status: 200, description: 'Ubicación encontrada' })
  @ApiResponse({ status: 404, description: 'Ubicación no encontrada' })
  async findOne(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return await this.locationService.findOne(Number(id), Number(organizationId));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva ubicación' })
  @ApiResponse({ status: 201, description: 'Ubicación creada' })
  @ApiResponse({ status: 409, description: 'El código ya existe' })
  async create(
    @Body() createLocationDto: CreateLocationDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return await this.locationService.create(
      Number(organizationId),
      createLocationDto,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una ubicación' })
  @ApiParam({ name: 'id', description: 'ID de la ubicación' })
  @ApiResponse({ status: 200, description: 'Ubicación actualizada' })
  @ApiResponse({ status: 404, description: 'Ubicación no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return await this.locationService.update(
      Number(id),
      Number(organizationId),
      updateLocationDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una ubicación' })
  @ApiParam({ name: 'id', description: 'ID de la ubicación' })
  @ApiResponse({ status: 204, description: 'Ubicación eliminada' })
  @ApiResponse({ status: 404, description: 'Ubicación no encontrada' })
  async remove(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    await this.locationService.remove(Number(id), Number(organizationId));
  }
}
