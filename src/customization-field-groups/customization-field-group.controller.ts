import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { CustomizationFieldGroupService } from './customization-field-group.service';
import { CreateCustomizationFieldGroupDto } from './dto/create-customization-field-group.dto';
import { UpdateCustomizationFieldGroupDto } from './dto/update-customization-field-group.dto';

@ApiTags('customization-field-groups')
@Controller('customization-field-groups')
@ApiHeader({
  name: 'x-organization-id',
  description: 'ID de la organización',
  required: true,
  schema: { type: 'string' },
})
export class CustomizationFieldGroupController {
  constructor(private readonly customizationFieldGroupService: CustomizationFieldGroupService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo grupo de campos de personalización' })
  @ApiResponse({ status: 201, description: 'Grupo creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  create(
    @Body() createDto: CreateCustomizationFieldGroupDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.customizationFieldGroupService.create(createDto, Number(organizationId));
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los grupos de campos' })
  @ApiResponse({ status: 200, description: 'Lista de grupos obtenida exitosamente' })
  findAll(@Headers('x-organization-id') organizationId: string) {
    return this.customizationFieldGroupService.findAll(Number(organizationId));
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener grupos activos' })
  @ApiResponse({ status: 200, description: 'Lista de grupos activos obtenida exitosamente' })
  findAllActive(@Headers('x-organization-id') organizationId: string) {
    return this.customizationFieldGroupService.findAllActive(Number(organizationId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener grupo por ID' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({ status: 200, description: 'Grupo obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  findOne(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.customizationFieldGroupService.findOne(id, Number(organizationId));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({ status: 200, description: 'Grupo actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomizationFieldGroupDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.customizationFieldGroupService.update(id, updateDto, Number(organizationId));
  }

  @Put(':id/toggle-active')
  @ApiOperation({ summary: 'Activar/Desactivar grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  toggleActive(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.customizationFieldGroupService.toggleActive(id, Number(organizationId));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({ status: 204, description: 'Grupo eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  remove(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.customizationFieldGroupService.remove(id, Number(organizationId));
  }
}
