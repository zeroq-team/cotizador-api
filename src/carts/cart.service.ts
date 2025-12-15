import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { CartChangelogRepository } from './cart-changelog.repository';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { UpdateCustomizationDto } from './dto/update-customization.dto';
import { Cart, CartItemRecord, NewCartItem } from '../database/schemas';
import { CartGateway } from './cart.gateway';
import { ProductsService } from '../products/products.service';
import { UpdateCartSuggestionsDto } from './dto/update-cart-suggestions.dto';
import { PaymentService } from '../payments/payment.service';
import { CreateProofPaymentDto } from '../payments/dto/create-proof-payment.dto';
import { ConversationsService } from '../conversations/conversations.service';
import { PriceListEvaluationService } from './services/price-list-evaluation.service';
import { PriceListsService } from '../price-lists/price-lists.service';
import { QuotePdfGeneratorService } from './services/quote-pdf-generator.service';
import { OrganizationService } from '../organization/organization.service';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly cartRepository: CartRepository,
    private readonly cartChangelogRepository: CartChangelogRepository,
    private readonly cartGateway: CartGateway,
    private readonly productsService: ProductsService,
    private readonly paymentService: PaymentService,
    private readonly conversationsService: ConversationsService,
    private readonly priceListEvaluationService: PriceListEvaluationService,
    @Inject(forwardRef(() => PriceListsService))
    private readonly priceListsService: PriceListsService,
    private readonly quotePdfGeneratorService: QuotePdfGeneratorService,
    private readonly organizationService: OrganizationService,
  ) {}

  async createCart(
    createCartDto: CreateCartDto,
  ): Promise<Cart & { items: CartItemRecord[] }> {
    const {
      conversationId,
      items,
      fullName,
      documentType,
      documentNumber,
      organizationId,
    } = createCartDto;

    // Create new cart with conversation_id and customer info
    const newCart = await this.cartRepository.create({
      conversationId,
      totalItems: 0,
      totalPrice: '0',
      fullName,
      documentType,
      documentNumber,
    });

    // Add items if provided
    const cartItems: CartItemRecord[] = [];
    if (items && items.length > 0) {
      for (const item of items) {
        // Fetch product data from external API
        const product = await this.productsService.getProductById(
          item.productId,
          organizationId,
        );

        if (!product) {
          throw new NotFoundException(
            `Product with ID ${item.productId} not found`,
          );
        }

        const newCartItem: NewCartItem = {
          cartId: newCart.id,
          productId: item.productId,
          name: product.name,
          sku: product.sku,
          size: product.metadata?.size || null,
          color: product.metadata?.color || null,
          price: product.prices[0].amount,
          quantity: Math.min(
            item.quantity,
            product.inventory?.[0]?.available || item.quantity,
          ),
          imageUrl: product.media?.[0]?.url || null,
        };
        const createdItem =
          await this.cartRepository.createCartItem(newCartItem);
        cartItems.push(createdItem);
      }

      // Recalculate totals if items were added
      const { totalItems, totalPrice } =
        await this.cartRepository.calculateCartTotals(newCart.id);
      await this.cartRepository.update(newCart.id, {
        totalItems,
        totalPrice,
      });
    }

    // Return cart with items
    const cartWithItems = await this.cartRepository.findByIdWithItems(
      newCart.id,
    );
    if (!cartWithItems) {
      throw new BadRequestException('Failed to retrieve created cart');
    }

    // Emit real-time event
    this.cartGateway.emitCartUpdated(newCart.id, cartWithItems);

    return cartWithItems;
  }

  async getAllCarts(): Promise<Cart[]> {
    return await this.cartRepository.findAll();
  }

  async getCartById(
    id: string,
    organizationId?: string,
  ): Promise<
    Cart & {
      items: CartItemRecord[];
      appliedPriceList?: any;
      savings?: number;
      defaultPriceListTotal?: number;
    }
  > {
    const cart = await this.cartRepository.findByIdWithItems(id);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }

    // Si hay organizationId, calcular información de lista de precios aplicada
    if (organizationId && cart.items && cart.items.length > 0) {
      // const pricingInfo = await this.calculateCartPricingInfo(
      //   cart,
      //   organizationId,
      // );

      // Actualizar precios de los items con la lista de precios aplicada
      // const updatedItems = await this.updateCartItemsPrices(
      //   cart.items,
      //   pricingInfo.appliedPriceList,
      //   organizationId,
      // );

      return { ...cart, items: cart.items };
    }

    return cart;
  }

  async getCartByConversationId(
    conversationId: string,
    organizationId?: string,
  ): Promise<
    Cart & {
      items: CartItemRecord[];
      appliedPriceList?: any;
      savings?: number;
      defaultPriceListTotal?: number;
    }
  > {
    const cart =
      await this.cartRepository.findByConversationIdWithItems(conversationId);
    if (!cart) {
      throw new NotFoundException(
        `Cart with conversation ID ${conversationId} not found`,
      );
    }

    // Si hay organizationId, calcular información de lista de precios aplicada
    if (organizationId && cart.items && cart.items.length > 0) {
      // const pricingInfo = await this.calculateCartPricingInfo(
      //   cart,
      //   organizationId,
      // );

      // Actualizar precios de los items con la lista de precios aplicada
      // const updatedItems = await this.updateCartItemsPrices(
      //   cart.items,
      //   pricingInfo.appliedPriceList,
      //   organizationId,
      // );

      return { ...cart, items: cart.items };
    }

    return cart;
  }

  /**
   * Calcula la información de lista de precios aplicada y ahorro para un carrito
   */
  private async calculateCartPricingInfo(
    cart: Cart & { items: CartItemRecord[] },
    organizationId: string,
  ): Promise<{
    appliedPriceList?: any;
    savings?: number;
    defaultPriceListTotal?: number;
  }> {
    try {
      // Preparar items para evaluación de precios
      const items = cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      // Usar el método del servicio de evaluación de precios
      return await this.priceListEvaluationService.calculateCartSavingsInfo(
        items,
        cart,
        organizationId,
      );
    } catch (error) {
      this.logger.warn(
        `Error calculating pricing info for cart ${cart.id}: ${error.message}`,
      );
      // En caso de error, retornar sin información adicional
      return {};
    }
  }

  /**
   * Actualiza los precios de los items del carrito con la lista de precios aplicada
   */
  private async updateCartItemsPrices(
    items: CartItemRecord[],
    appliedPriceList:
      | { id: number; name: string; isDefault: boolean }
      | undefined,
    organizationId: string,
  ): Promise<CartItemRecord[]> {
    // Si no hay lista aplicada o es la lista por defecto, retornar items sin cambios
    if (!appliedPriceList || appliedPriceList.isDefault) {
      return items;
    }

    // Obtener la lista de precios por defecto para usar como fallback
    const priceLists = await this.priceListsService.getPriceLists(
      organizationId,
      { status: 'active' },
    );
    const defaultPriceList = priceLists.priceLists.find((pl) => pl.isDefault);

    if (!defaultPriceList) {
      this.logger.warn(
        'Default price list not found, returning items without price update',
      );
      return items;
    }

    // Actualizar precios de cada item
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        try {
          // Obtener el precio del producto en la lista de precios aplicada
          const { amount } =
            await this.priceListEvaluationService.getProductPrice(
              item.productId,
              appliedPriceList.id,
              organizationId,
            );

          return {
            ...item,
            price: amount,
          };
        } catch (error) {
          // Si no hay precio en la lista aplicada, intentar con la lista por defecto
          try {
            const { amount } =
              await this.priceListEvaluationService.getProductPrice(
                item.productId,
                defaultPriceList.id,
                organizationId,
              );

            this.logger.warn(
              `Price not found for product ${item.productId} in applied price list ${appliedPriceList.id}, using default price`,
            );

            return {
              ...item,
              price: amount,
            };
          } catch (fallbackError) {
            // Si tampoco hay precio por defecto, mantener el precio actual
            this.logger.error(
              `Could not get price for product ${item.productId} in any price list`,
            );
            return item;
          }
        }
      }),
    );

    return updatedItems;
  }

  async getPriceListProgress(id: string, organizationId: string) {
    const cart = await this.cartRepository.findByIdWithItems(id);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }

    // Calcular totales del carrito
    const { totalItems, totalPrice } =
      await this.cartRepository.calculateCartTotals(id);

    // Obtener progreso hacia mejores listas de precios
    const progress =
      await this.priceListEvaluationService.calculatePriceListProgress(
        {
          totalPrice: Number(totalPrice),
          totalQuantity: totalItems,
          cart,
        },
        organizationId,
      );
    return progress;
  }

  async updateCartById(
    id: string,
    updateCartDto: UpdateCartDto,
    organizationId: string,
  ): Promise<Cart & { items: CartItemRecord[] }> {
    const existingCart = await this.cartRepository.findById(id);
    if (!existingCart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }

    if (updateCartDto.suggestions && updateCartDto.suggestions.length > 0) {
      await this.updateCartSuggestions(
        id,
        {
          suggestions: updateCartDto.suggestions,
        },
        organizationId,
      );
    }

    // Add new items
    if (updateCartDto.items && updateCartDto.items.length > 0) {
      // Procesar items con evaluación de lista de precios
      const { processedItems, appliedPriceList } =
        await this.priceListEvaluationService.processCartItemsWithPricing(
          updateCartDto.items,
          existingCart,
          organizationId,
        );
      // Actualizar o crear items manteniendo trazabilidad
      for (const item of processedItems) {
        const itemOperation =
          updateCartDto.items.find((i) => i.productId === item.productId)
            ?.operation || 'add';

        // Buscar si el item ya existe en el carrito
        const existingItem = await this.cartRepository.findCartItemByProductId(
          id,
          item.productId,
        );

        // Item no existe: crear solo si la operación es 'add'
        if (itemOperation === 'add') {
          const cartItem: NewCartItem = {
            cartId: id,
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            price: item.price,
            quantity: item.quantity,
            description: item.description,
            imageUrl: item.imageUrl,
          };

          await this.cartRepository.addCartItemByProductId({
            cartId: id,
            productId: item.productId,
            quantity: item.quantity,
            cartItem,
            organizationId,
          });
        } else {
          try {
            await this.cartRepository.removeCartItemByProductId({
              cartId: id,
              productId: item.productId,
              quantity: item.quantity,
            });
          } catch (error) {
            this.logger?.error?.(
              `Failed to remove cart item (cartId: ${id}, productId: ${item.productId}): ${error.message || error}`,
            );
            // Optionally rethrow or handle gracefully
            throw new BadRequestException(
              `No se pudo eliminar el producto (${item.name || item.productId}) del carrito.`,
            );
          }
        }
      }
    }

    // Recalculate totals
    const { totalItems, totalPrice } =
      await this.cartRepository.calculateCartTotals(id);

    // Update cart totals and customer info if provided
    const updatedCart = await this.cartRepository.update(id, {
      totalItems,
      totalPrice,
      ...(updateCartDto.fullName !== undefined && {
        fullName: updateCartDto.fullName,
      }),
      ...(updateCartDto.documentType !== undefined && {
        documentType: updateCartDto.documentType,
      }),
      ...(updateCartDto.documentNumber !== undefined && {
        documentNumber: updateCartDto.documentNumber,
      }),
    });

    if (!updatedCart) {
      throw new BadRequestException('Failed to update cart');
    }

    // Return cart with items
    const cartWithItems = await this.cartRepository.findByIdWithItems(id);
    if (!cartWithItems) {
      throw new BadRequestException('Failed to retrieve updated cart');
    }

    // Emit real-time event
    if (updateCartDto.items && updateCartDto.items.length > 0) {
      this.cartGateway.emitCartUpdated(id, cartWithItems);
    }

    return cartWithItems;
  }

  async updateCartSuggestions(
    id: string,
    updateCartDto: UpdateCartSuggestionsDto,
    organizationId: string,
  ): Promise<any> {
    const existingCart = await this.cartRepository.findById(id);
    if (!existingCart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }

    // Clear existing items
    // await this.cartRepository.deleteCartItemsByCartId(id)

    const suggestions: NewCartItem[] = [];

    // Add new items
    if (updateCartDto.suggestions && updateCartDto.suggestions.length > 0) {
      for (const item of updateCartDto.suggestions) {
        // Fetch product data for changelog
        try {
          const product = await this.productsService.getProductById(
            item.productId,
            organizationId,
          );

          if (!product) {
            throw new NotFoundException(
              `Product with ID ${item.productId} not found`,
            );
          }

          if (!product.prices || product.prices.length === 0) {
            throw new NotFoundException(
              `Price not found for product ${item.productId}`,
            );
          }

          const newCartItem: NewCartItem = {
            cartId: id,
            productId: item.productId,
            name: product.name,
            sku: product.sku,
            // size: product.?.[0]?.name || null,
            // color: product.color || null,
            description: product.description || null,
            price: product.prices[0].amount,
            // TODO: make this well
            quantity: Math.min(
              item.quantity,
              product.inventory?.[0]?.available || item.quantity,
            ),
            imageUrl: product.media?.[0]?.url || null,
            // @ts-ignore
            metadata: product.metadata || {},
          };

          suggestions.push(newCartItem);
        } catch (error) {
          this.logger?.error?.(
            `Failed to get product ${item.productId}: ${error.message || error}`,
          );
          continue;
        }
      }
    }

    this.cartGateway.emitCartSuggestions(id, suggestions);

    return suggestions;
  }
  async updateCustomization(
    cartId: string,
    updateCustomizationDto: UpdateCustomizationDto,
  ): Promise<Cart & { items: CartItemRecord[] }> {
    const existingCart = await this.cartRepository.findByIdWithItems(cartId);
    if (!existingCart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    const { selectedProductIds, customizationValues } = updateCustomizationDto;

    // Update customization values for selected products
    for (const item of existingCart.items) {
      if (selectedProductIds.includes(item.id)) {
        await this.cartRepository.updateCartItem(item.id, {
          customizationValues,
        });
      }
    }

    // Get updated cart
    const updatedCart = await this.cartRepository.findByIdWithItems(cartId);
    if (!updatedCart) {
      throw new BadRequestException('Failed to retrieve updated cart');
    }

    // Emit real-time event
    this.cartGateway.emitCartUpdated(cartId, updatedCart);

    return updatedCart;
  }

  /**
   * Obtiene el historial completo de cambios de un carrito
   */
  async getCartChangelog(cartId: string) {
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    return await this.cartChangelogRepository.findByCartId(cartId);
  }

  /**
   * Obtiene los últimos N cambios de un carrito
   */
  async getCartChangelogLatest(cartId: string, limit: number = 10) {
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    return await this.cartChangelogRepository.findLatestByCartId(cartId, limit);
  }

  /**
   * Obtiene el historial de cambios filtrado por operación
   */
  async getCartChangelogByOperation(
    cartId: string,
    operation: 'add' | 'remove',
  ) {
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    return await this.cartChangelogRepository.findByCartIdAndOperation(
      cartId,
      operation,
    );
  }

  /**
   * Agrega un pago con comprobante al carrito y actualiza el estado a 'Verificando pago'
   */
  async addPaymentWithProof(
    cartId: string,
    createProofPaymentDto: CreateProofPaymentDto,
    file?: Express.Multer.File,
  ) {
    // Verificar que el carrito existe
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }
    // Crear el pago con comprobante
    const payment = await this.paymentService.createProofPayment(
      { ...createProofPaymentDto, cartId },
      file,
    );

    // Actualizar el estado de la conversación a 'Verificando pago'
    await this.conversationsService.updateConversationCustomStatus(
      cart.conversationId,
      'Verificando pago',
    );

    return payment;
  }

  /**
   * Elimina un carrito por conversation ID
   */
  async deleteCartByConversationId(
    conversationId: string,
  ): Promise<{ id: string; conversationId: string }> {
    const deletedCart =
      await this.cartRepository.deleteByConversationId(conversationId);

    if (!deletedCart) {
      throw new NotFoundException(
        `Cart with conversation ID ${conversationId} not found`,
      );
    }

    this.logger.log(
      `Cart ${deletedCart.id} deleted for conversation ${conversationId}`,
    );

    return {
      id: deletedCart.id,
      conversationId: deletedCart.conversationId,
    };
  }

  /**
   * Genera un PDF de la cotización
   */
  async generateQuotePdf(
    cartId: string,
    organizationId?: string,
  ): Promise<Buffer> {
    const cart = await this.cartRepository.findByIdWithItems(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    let organizationName: string | undefined;

    // Obtener nombre de la organización si se proporciona el ID
    if (organizationId) {
      try {
        const organization = await this.organizationService.findOne(
          Number(organizationId),
        );
        organizationName = organization.name;
      } catch (error) {
        this.logger.warn(
          `Could not fetch organization ${organizationId}: ${error.message}`,
        );
      }
    }

    return this.quotePdfGeneratorService.generateQuotePdf({
      cart,
      organizationName,
    });
  }
}
