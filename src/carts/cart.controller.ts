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
  ApiHeader,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { UpdateCustomizationDto } from './dto/update-customization.dto';
import { AddPaymentProofDto } from './dto/responses/add-payment-proof.dto';
import { CreateProofPaymentDto } from '../payments/dto/create-proof-payment.dto';
import { CartResponseDto } from './dto/responses/cart-response.dto';
import { QuoteListItemDto } from './dto/responses/quote-list-item.dto';
import { ChangelogItemResponseDto } from './dto/responses/changelog-item-response.dto';
import { ErrorResponseDto } from './dto/responses/error-response.dto';
import { PaymentResponseDto } from '../payments/dto/payment-response.dto';

@ApiTags('carts')
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
  ) {}

  @ApiOperation({
    summary: 'Obtener progreso hacia mejores precios',
    description:
      'Muestra cuánto le falta al cliente para obtener mejores precios (tipo Amazon: "Te faltan $X para obtener envío gratis")',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del carrito',
    example: 'cart_123456',
    type: String,
  })
  @ApiHeader({
    name: 'X-Organization-ID',
    description: 'ID de la organización',
    required: true,
    example: 2,
  })
  @ApiResponse({
    status: 200,
    description: 'Progreso hacia listas de precios disponibles',
    schema: {
      properties: {
        progress: {
          type: 'array',
          items: {
            properties: {
              priceListId: { type: 'number' },
              priceListName: { type: 'string' },
              potentialSavings: { 
                type: 'number', 
                description: 'Ahorro potencial si se cumple esta lista de precios' 
              },
              currentTotal: { 
                type: 'number', 
                description: 'Total actual del carrito' 
              },
              projectedTotal: { 
                type: 'number', 
                description: 'Total proyectado con esta lista de precios' 
              },
              conditions: {
                type: 'array',
                items: {
                  properties: {
                    conditionId: { type: 'number' },
                    conditionType: { type: 'string' },
                    isMet: { type: 'boolean' },
                    progress: { type: 'number' },
                    currentValue: { type: 'number' },
                    targetValue: { type: 'number' },
                    remaining: { type: 'number' },
                    unit: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
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
    description:
      'Retorna una lista de todos los carritos (cotizaciones) con información resumida para mostrar en la interfaz de cotizaciones',
  })
  @ApiResponse({ status: 200, type: [QuoteListItemDto] })
  @Get()
  async getAllCarts() {
    const carts = await this.cartService.getAllCarts();

    // Format response for quotes
    const quotes = carts.map((cart) => ({
      id: cart.id,
      conversationId: cart.conversationId,
      totalItems: cart.totalItems,
      totalPrice: parseFloat(cart.totalPrice),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      // Additional info for UI
      displayName: `Cotización #${cart.id.slice(-6)}`,
      lastUpdated: cart.updatedAt.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    return quotes;
  }

  @ApiOperation({
    summary: 'Obtener carrito por conversation ID',
    description:
      'Busca y retorna un carrito específico asociado a un conversation_id. Retorna el carrito con todos sus items.',
  })
  @ApiParam({
    name: 'conversationId',
    description: 'ID de la conversación',
    type: String,
    example: 'conv_abc123xyz',
  })
  @ApiHeader({
    name: 'X-Organization-ID',
    description: 'ID de la organización (opcional, necesario para calcular información de ahorro)',
    required: false,
    example: 2,
  })
  @ApiResponse({ status: 200, type: CartResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @Get('conversation/:conversationId')
  async getCartByConversationId(
    @Param('conversationId') conversationId: string,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    const cart = await this.cartService.getCartByConversationId(conversationId, organizationId);
    return cart;
  }

  @ApiOperation({
    summary: 'Eliminar carrito por conversation ID',
    description:
      'Elimina un carrito específico y todos sus items asociados a un conversation_id.',
  })
  @ApiParam({
    name: 'conversationId',
    description: 'ID de la conversación',
    type: String,
    example: 'conv_abc123xyz',
  })
  @ApiResponse({
    status: 200,
    description: 'Carrito eliminado exitosamente',
    schema: {
      properties: {
        id: { type: 'string', example: 'cart_123456' },
        conversationId: { type: 'string', example: 'conv_abc123xyz' },
        message: { type: 'string', example: 'Carrito eliminado exitosamente' },
      },
    },
  })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @Delete('conversation/:conversationId')
  @HttpCode(HttpStatus.OK)
  async deleteCartByConversationId(
    @Param('conversationId') conversationId: string,
  ) {
    const result = await this.cartService.deleteCartByConversationId(conversationId);
    return {
      ...result,
      message: 'Carrito eliminado exitosamente',
    };
  }

  @ApiOperation({
    summary: 'Obtener carrito por ID',
    description:
      'Retorna un carrito específico con todos sus items y detalles completos. Incluye información de lista de precios aplicada y ahorro si se proporciona el header X-Organization-ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del carrito',
    example: 'cart_123456',
    type: String,
  })
  @ApiHeader({
    name: 'X-Organization-ID',
    description: 'ID de la organización (opcional, necesario para calcular información de ahorro)',
    required: false,
    example: 2,
  })
  @ApiResponse({ status: 200, type: CartResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @Get(':id')
  async getCartById(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    const cart = await this.cartService.getCartById(id, organizationId);
    return cart;
  }

  @ApiOperation({
    summary: 'Crear nuevo carrito',
    description:
      'Crea un nuevo carrito asociado a una conversación. Opcionalmente puede incluir items iniciales.',
  })
  @ApiResponse({ status: 201, type: CartResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCart(@Body() createCartDto: CreateCartDto) {
    const cart = await this.cartService.createCart(createCartDto);
    return {
      id: cart.id,
      conversationId: cart.conversationId,
      items: cart.items,
      totalItems: cart.totalItems,
      totalPrice: parseFloat(cart.totalPrice),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  @ApiOperation({
    summary: 'Actualizar carrito por ID',
    description:
      'Actualiza un carrito específico reemplazando todos sus items con los nuevos items proporcionados.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del carrito a actualizar',
    example: 'cart_123456',
    type: String,
  })
  @ApiBody({ type: UpdateCartDto })
  @ApiResponse({ status: 200, type: CartResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
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
    summary: 'Actualizar personalización de productos en el carrito',
    description:
      'Actualiza los valores de personalización para los productos seleccionados en un carrito.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del carrito',
    example: 'cart_123456',
    type: String,
  })
  @ApiBody({ type: UpdateCustomizationDto })
  @ApiResponse({ status: 200, type: CartResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @Patch(':id/customization')
  async updateCustomization(
    @Param('id') id: string,
    @Body() updateCustomizationDto: UpdateCustomizationDto,
  ) {
    const cart = await this.cartService.updateCustomization(
      id,
      updateCustomizationDto,
    );
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
    summary: 'Obtener historial de cambios del carrito',
    description:
      'Retorna el historial completo de todos los cambios realizados en el carrito (items agregados y eliminados).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del carrito',
    example: 'cart_123456',
    type: String,
  })
  @ApiResponse({ status: 200, type: [ChangelogItemResponseDto] })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @Get(':id/changelog')
  async getCartChangelog(@Param('id') id: string) {
    return await this.cartService.getCartChangelog(id);
  }

  @ApiOperation({
    summary: 'Generar PDF de la cotización',
    description:
      'Genera y descarga un documento PDF con el detalle completo de la cotización, incluyendo información del cliente, productos y totales.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del carrito/cotización',
    example: 'cart_123456',
    type: String,
  })
  @ApiHeader({
    name: 'X-Organization-ID',
    description: 'ID de la organización (opcional, se usa para incluir el nombre de la organización en el PDF)',
    required: false,
    example: 2,
  })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'PDF de la cotización generado exitosamente',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
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
    summary: 'Agregar pago con comprobante al carrito',
    description:
      'Crea un pago con comprobante (cheque o transferencia) para el carrito. El archivo del comprobante se sube automáticamente a S3.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del carrito',
    example: 'cart_123456',
    type: String,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: AddPaymentProofDto })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @Post(':id/payment-proof')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async addPaymentWithProof(
    @Param('id') cartId: string,
    @Body() addPaymentProofDto: AddPaymentProofDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const payment = await this.cartService.addPaymentWithProof(
      cartId,
      { ...addPaymentProofDto, cartId },
      file,
    );

    return payment;
  }
}
