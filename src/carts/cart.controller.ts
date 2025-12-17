import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
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
  ApiBody,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { UpdateCustomizationDto } from './dto/update-customization.dto';
import { AddPaymentProofDto } from './dto/responses/add-payment-proof.dto';
import { CartResponseDto } from './dto/responses/cart-response.dto';
import { QuoteListItemDto } from './dto/responses/quote-list-item.dto';
import { ChangelogItemResponseDto } from './dto/responses/changelog-item-response.dto';
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
}
