import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Headers,
  BadRequestException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { UpdateCustomizationDto } from './dto/update-customization.dto';
import { UpdateCustomerDataDto } from './dto/update-customer-data.dto';
import { UpdateDeliveryAddressDto } from './dto/update-delivery-address.dto';
import { AddPaymentProofDto } from './dto/responses/add-payment-proof.dto';
import { CartResponseDto } from './dto/responses/cart-response.dto';
import { QuoteListItemDto } from './dto/responses/quote-list-item.dto';
import { ChangelogItemResponseDto } from './dto/responses/changelog-item-response.dto';
import { CartSuggestionResponseDto } from './dto/responses/cart-suggestion-response.dto';
import { CreateCartSuggestionDto, CreateCartSuggestionsDto } from './dto/create-cart-suggestion.dto';
import { PaymentResponseDto } from '../payments/dto/payment-response.dto';

@ApiTags('carts')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiOperation({
    summary: 'Obtener progreso hacia mejores precios',
    description: 'Muestra cuánto le falta al cliente para obtener mejores precios',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiResponse({ status: 200, description: 'Progreso hacia listas de precios disponibles' })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Get(':id/price-list-progress')
  async getPriceListProgress(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    const progress = await this.cartService.getPriceListProgress(id, organizationId);
    return { progress };
  }

  @ApiOperation({
    summary: 'Obtener todas las cotizaciones',
    description: 'Retorna una lista de todos los carritos (cotizaciones) con información resumida',
  })
  @ApiResponse({ status: 200, description: 'Lista de cotizaciones', type: [QuoteListItemDto] })
  @Get()
  async getAllCarts() {
    const carts = await this.cartService.getAllCarts();
    return carts.map((cart) => ({
      id: cart.id,
      conversationId: cart.conversationId,
      organizationId: cart.organizationId,
      totalItems: cart.totalItems,
      totalPrice: parseFloat(cart.totalPrice),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      displayName: `Cotización #${cart.id.slice(-6)}`,
      lastUpdated: cart.updatedAt.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));
  }

  @ApiOperation({
    summary: 'Obtener carrito por conversation ID',
    description: 'Busca y retorna un carrito asociado a un conversation_id',
  })
  @ApiParam({ name: 'conversationId', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Carrito encontrado', type: CartResponseDto })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Get('conversation/:conversationId')
  async getCartByConversationId(
    @Param('conversationId') conversationId: string,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return await this.cartService.getCartByConversationId(conversationId, organizationId);
  }

  @ApiOperation({
    summary: 'Eliminar carrito por conversation ID',
    description: 'Elimina un carrito y todos sus items asociados a un conversation_id',
  })
  @ApiParam({ name: 'conversationId', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Carrito eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Delete('conversation/:conversationId')
  @HttpCode(HttpStatus.OK)
  async deleteCartByConversationId(@Param('conversationId') conversationId: string) {
    const result = await this.cartService.deleteCartByConversationId(conversationId);
    return { ...result, message: 'Carrito eliminado exitosamente' };
  }

  @ApiOperation({
    summary: 'Obtener carrito por ID',
    description: 'Retorna un carrito con todos sus items y detalles completos',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiResponse({ status: 200, description: 'Carrito encontrado', type: CartResponseDto })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Get(':id')
  async getCartById(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return await this.cartService.getCartById(id, organizationId);
  }

  @ApiOperation({
    summary: 'Crear nuevo carrito',
    description: 'Crea un nuevo carrito asociado a una conversación',
  })
  @ApiResponse({ status: 201, description: 'Carrito creado', type: CartResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCart(@Body() createCartDto: CreateCartDto) {
    const cart = await this.cartService.createCart(createCartDto);
    return {
      id: cart.id,
      conversationId: cart.conversationId,
      organizationId: cart.organizationId,
      items: cart.items,
      totalItems: cart.totalItems,
      totalPrice: parseFloat(cart.totalPrice),
      customer: (cart as any).customer,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  @ApiOperation({
    summary: 'Actualizar carrito por ID',
    description: 'Actualiza un carrito reemplazando todos sus items',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiBody({ type: UpdateCartDto })
  @ApiResponse({ status: 200, description: 'Carrito actualizado', type: CartResponseDto })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @Put(':id')
  async updateCartById(
    @Param('id') id: string,
    @Body() updateCartDto: UpdateCartDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    const cart = await this.cartService.updateCartById(id, updateCartDto, organizationId);
    return {
      id: cart.id,
      items: cart.items,
      totalItems: cart.totalItems,
      totalPrice: parseFloat(cart.totalPrice),
    };
  }

  @ApiOperation({
    summary: 'Actualizar personalización de productos',
    description: 'Actualiza los valores de personalización para productos seleccionados',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiBody({ type: UpdateCustomizationDto })
  @ApiResponse({ status: 200, description: 'Personalización actualizada', type: CartResponseDto })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Patch(':id/customization')
  async updateCustomization(
    @Param('id') id: string,
    @Body() updateCustomizationDto: UpdateCustomizationDto,
  ) {
    const cart = await this.cartService.updateCustomization(id, updateCustomizationDto);
    return {
      id: cart.id,
      items: cart.items.map((item) => ({
        ...item,
        price: parseFloat(item.price.toString()),
      })),
      totalItems: cart.totalItems,
      totalPrice: parseFloat(cart.totalPrice),
    };
  }

  @ApiOperation({
    summary: 'Actualizar datos del cliente y dirección de entrega',
    description: 'Actualiza los datos del cliente y su dirección de entrega',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiBody({ type: UpdateCustomerDataDto })
  @ApiResponse({ status: 200, description: 'Datos del cliente actualizados', type: CartResponseDto })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Patch(':id/customer-data')
  async updateCustomerData(
    @Param('id') id: string,
    @Body() updateCustomerDataDto: UpdateCustomerDataDto,
  ) {
    const cart = await this.cartService.updateCustomerData(id, updateCustomerDataDto);
    return {
      id: cart.id,
      items: cart.items.map((item) => ({
        ...item,
        price: parseFloat(item.price.toString()),
      })),
      totalItems: cart.totalItems,
      totalPrice: parseFloat(cart.totalPrice),
      customer: cart.customer,
    };
  }

  @ApiOperation({
    summary: 'Actualizar dirección de entrega',
    description: 'Actualiza una dirección de entrega específica del cliente',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiParam({ name: 'addressId', description: 'ID único de la dirección de entrega' })
  @ApiBody({ type: UpdateDeliveryAddressDto })
  @ApiResponse({ status: 200, description: 'Dirección actualizada', type: CartResponseDto })
  @ApiResponse({ status: 404, description: 'Carrito o dirección no encontrada' })
  @Patch(':id/delivery-address/:addressId')
  async updateDeliveryAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateDeliveryAddressDto,
  ) {
    const cart = await this.cartService.updateDeliveryAddress(id, addressId, updateAddressDto);
    return {
      id: cart.id,
      items: cart.items.map((item) => ({
        ...item,
        price: parseFloat(item.price.toString()),
      })),
      totalItems: cart.totalItems,
      totalPrice: parseFloat(cart.totalPrice),
      customer: cart.customer,
    };
  }

  @ApiOperation({
    summary: 'Eliminar dirección de entrega',
    description: 'Elimina (soft delete) una dirección de entrega del cliente',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiParam({ name: 'addressId', description: 'ID único de la dirección de entrega' })
  @ApiResponse({ status: 200, description: 'Dirección eliminada', type: CartResponseDto })
  @ApiResponse({ status: 404, description: 'Carrito o dirección no encontrada' })
  @Delete(':id/delivery-address/:addressId')
  async deleteDeliveryAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    const cart = await this.cartService.deleteDeliveryAddress(id, addressId);
    return {
      id: cart.id,
      items: cart.items.map((item) => ({
        ...item,
        price: parseFloat(item.price.toString()),
      })),
      totalItems: cart.totalItems,
      totalPrice: parseFloat(cart.totalPrice),
      customer: cart.customer,
    };
  }

  @ApiOperation({
    summary: 'Obtener historial de cambios',
    description: 'Retorna el historial de cambios realizados en el carrito',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiResponse({ status: 200, description: 'Historial de cambios', type: [ChangelogItemResponseDto] })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Get(':id/changelog')
  async getCartChangelog(@Param('id') id: string) {
    return await this.cartService.getCartChangelog(id);
  }

  @ApiOperation({
    summary: 'Generar PDF de la cotización',
    description: 'Genera y descarga un PDF con el detalle completo de la cotización',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito/cotización' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF generado exitosamente' })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Get(':id/pdf')
  async generateQuotePdf(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.cartService.generateQuotePdf(id, organizationId);
    const quoteNumber = id.slice(-8).toUpperCase();
    const filename = `cotizacion-${quoteNumber}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    return new StreamableFile(pdfBuffer);
  }

  @ApiOperation({
    summary: 'Agregar pago con comprobante',
    description: 'Crea un pago con comprobante (cheque o transferencia) para el carrito',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: AddPaymentProofDto })
  @ApiResponse({ status: 201, description: 'Pago creado', type: PaymentResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Post(':id/payment-proof')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async addPaymentWithProof(
    @Param('id') cartId: string,
    @Body() addPaymentProofDto: AddPaymentProofDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.cartService.addPaymentWithProof(
      cartId,
      { ...addPaymentProofDto, cartId },
      file,
    );
  }

  @ApiOperation({
    summary: 'Obtener sugerencias del carrito',
    description: 'Retorna las sugerencias de productos para el carrito. Opcionalmente puede limitar la cantidad con el query param limit',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Número máximo de sugerencias a retornar (si no se especifica, retorna todas)' })
  @ApiResponse({ status: 200, description: 'Lista de sugerencias', type: [CartSuggestionResponseDto] })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Get(':id/suggestions')
  async getCartSuggestions(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    if (limit) {
      const limitNumber = parseInt(limit, 10);
      return await this.cartService.getCartSuggestionsLatest(id, limitNumber);
    }
    return await this.cartService.getCartSuggestions(id);
  }

  @ApiOperation({
    summary: 'Crear sugerencias para el carrito',
    description: 'Agrega múltiples sugerencias de productos al carrito en una sola operación. Se genera automáticamente un interactionId único que agrupa todas las sugerencias del bulk',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiBody({ type: CreateCartSuggestionsDto })
  @ApiResponse({ status: 201, description: 'Sugerencias creadas con interactionId generado automáticamente', type: [CartSuggestionResponseDto] })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Post(':id/suggestions')
  @HttpCode(HttpStatus.CREATED)
  async createCartSuggestions(
    @Param('id') cartId: string,
    @Body() createSuggestionsDto: CreateCartSuggestionsDto,
  ) {
    return await this.cartService.createCartSuggestions(
      cartId,
      createSuggestionsDto.suggestions,
    );
  }

  @ApiOperation({
    summary: 'Obtener sugerencias por interacción',
    description: 'Retorna todas las sugerencias asociadas a una interacción específica del flujo',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiParam({ name: 'interactionId', description: 'ID de la interacción del flujo' })
  @ApiResponse({ status: 200, description: 'Lista de sugerencias de la interacción', type: [CartSuggestionResponseDto] })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Get(':id/suggestions/interaction/:interactionId')
  async getCartSuggestionsByInteraction(
    @Param('id') cartId: string,
    @Param('interactionId') interactionId: string,
  ) {
    return await this.cartService.getCartSuggestionsByCartAndInteraction(cartId, interactionId);
  }

  @ApiOperation({
    summary: 'Eliminar todas las sugerencias del carrito',
    description: 'Elimina todas las sugerencias asociadas a un carrito',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiResponse({ status: 200, description: 'Sugerencias eliminadas exitosamente' })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Delete(':id/suggestions')
  @HttpCode(HttpStatus.OK)
  async deleteCartSuggestions(@Param('id') id: string) {
    return await this.cartService.deleteCartSuggestions(id);
  }

  @ApiOperation({
    summary: 'Eliminar sugerencias por interacción',
    description: 'Elimina todas las sugerencias asociadas a una interacción específica del flujo',
  })
  @ApiParam({ name: 'id', description: 'ID único del carrito' })
  @ApiParam({ name: 'interactionId', description: 'ID de la interacción del flujo' })
  @ApiResponse({ status: 200, description: 'Sugerencias eliminadas exitosamente' })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @Delete(':id/suggestions/interaction/:interactionId')
  @HttpCode(HttpStatus.OK)
  async deleteCartSuggestionsByInteraction(
    @Param('id') cartId: string,
    @Param('interactionId') interactionId: string,
  ) {
    return await this.cartService.deleteCartSuggestionsByCartAndInteraction(cartId, interactionId);
  }
}
