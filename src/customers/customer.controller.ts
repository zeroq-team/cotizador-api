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
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { SearchCustomerByPhoneDto } from './dto/search-customer-by-phone.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { CreateDeliveryAddressDto } from './dto/create-delivery-address.dto';
import { UpdateDeliveryAddressDto } from './dto/update-delivery-address.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo cliente',
    description: 'Crea un nuevo cliente en la organización especificada',
  })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({
    status: 201,
    description: 'Cliente creado exitosamente',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    // Si no viene en el body, usar el header
    if (!createCustomerDto.organizationId && organizationId) {
      createCustomerDto.organizationId = parseInt(organizationId);
    }

    if (!createCustomerDto.organizationId) {
      throw new BadRequestException(
        'Organization ID is required (in body or X-Organization-ID header)',
      );
    }

    return await this.customerService.create(createCustomerDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener cliente por ID',
    description: 'Retorna un cliente con todas sus direcciones de entrega',
  })
  @ApiParam({ name: 'id', description: 'ID único del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async findOne(@Param('id') id: string) {
    return await this.customerService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar cliente',
    description: 'Actualiza los datos de un cliente existente',
  })
  @ApiParam({ name: 'id', description: 'ID único del cliente' })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({
    status: 200,
    description: 'Cliente actualizado exitosamente',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return await this.customerService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar cliente',
    description: 'Elimina un cliente (actualmente no implementado)',
  })
  @ApiParam({ name: 'id', description: 'ID único del cliente' })
  @ApiResponse({ status: 204, description: 'Cliente eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.customerService.remove(id);
  }

  @Get('search/phone')
  @ApiOperation({
    summary: 'Buscar cliente por teléfono',
    description:
      'Busca un cliente existente por código de país y número telefónico en la organización',
  })
  @ApiQuery({ name: 'phoneCode', description: 'Código de país (ej: +56, +1)', required: true })
  @ApiQuery({ name: 'phoneNumber', description: 'Número telefónico sin código', required: true })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async searchByPhone(
    @Query() searchDto: SearchCustomerByPhoneDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }

    const customer = await this.customerService.findByPhone(
      parseInt(organizationId),
      searchDto.phoneCode,
      searchDto.phoneNumber,
    );

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return customer;
  }

  @Get('search/document')
  @ApiOperation({
    summary: 'Buscar cliente por documento',
    description:
      'Busca un cliente existente por tipo y número de documento en la organización',
  })
  @ApiQuery({ name: 'documentType', description: 'Tipo de documento (ej: DNI, RUT)', required: true })
  @ApiQuery({ name: 'documentNumber', description: 'Número de documento', required: true })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async searchByDocument(
    @Query('documentType') documentType: string,
    @Query('documentNumber') documentNumber: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }

    const customer = await this.customerService.findByDocument(
      parseInt(organizationId),
      documentType,
      documentNumber,
    );

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return customer;
  }

  @Post(':customerId/delivery-addresses')
  @ApiOperation({
    summary: 'Crear nueva dirección de entrega',
    description: 'Crea una nueva dirección de entrega para el cliente',
  })
  @ApiParam({ name: 'customerId', description: 'ID único del cliente' })
  @ApiBody({ type: CreateDeliveryAddressDto })
  @ApiResponse({
    status: 201,
    description: 'Dirección creada exitosamente',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @HttpCode(HttpStatus.CREATED)
  async createDeliveryAddress(
    @Param('customerId') customerId: string,
    @Body() createAddressDto: CreateDeliveryAddressDto,
  ) {
    return await this.customerService.createDeliveryAddress(
      customerId,
      createAddressDto,
    );
  }

  @Put(':customerId/delivery-addresses/:addressId')
  @ApiOperation({
    summary: 'Actualizar dirección de entrega',
    description: 'Actualiza una dirección de entrega específica del cliente',
  })
  @ApiParam({ name: 'customerId', description: 'ID único del cliente' })
  @ApiParam({ name: 'addressId', description: 'ID único de la dirección de entrega' })
  @ApiBody({ type: UpdateDeliveryAddressDto })
  @ApiResponse({
    status: 200,
    description: 'Dirección actualizada exitosamente',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cliente o dirección no encontrada' })
  async updateDeliveryAddress(
    @Param('customerId') customerId: string,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateDeliveryAddressDto,
  ) {
    return await this.customerService.updateDeliveryAddress(
      customerId,
      addressId,
      updateAddressDto,
    );
  }

  @Delete(':customerId/delivery-addresses/:addressId')
  @ApiOperation({
    summary: 'Eliminar dirección de entrega',
    description: 'Elimina una dirección de entrega del cliente (soft delete)',
  })
  @ApiParam({ name: 'customerId', description: 'ID único del cliente' })
  @ApiParam({ name: 'addressId', description: 'ID único de la dirección de entrega' })
  @ApiResponse({
    status: 200,
    description: 'Dirección eliminada exitosamente',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cliente o dirección no encontrada' })
  async deleteDeliveryAddress(
    @Param('customerId') customerId: string,
    @Param('addressId') addressId: string,
  ) {
    return await this.customerService.deleteDeliveryAddress(customerId, addressId);
  }
}
