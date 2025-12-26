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
import { CartSuggestionsRepository } from './cart-suggestions.repository';
import { CustomerRepository } from './customer.repository';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { UpdateCustomizationDto } from './dto/update-customization.dto';
import { Cart, CartItemRecord, NewCartItem, Customer } from '../database/schemas';
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
    private readonly cartSuggestionsRepository: CartSuggestionsRepository,
    private readonly customerRepository: CustomerRepository,
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
  ): Promise<Cart & { items: CartItemRecord[]; customer?: Customer | null }> {
    const {
      conversationId,
      items,
      fullName,
      documentType,
      documentNumber,
      organizationId,
    } = createCartDto;

    // Create new cart with conversation_id
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    
    // Create customer if customer data is provided
    let customerId: string | undefined;
    if (fullName || documentType || documentNumber) {
      const customer = await this.customerRepository.upsert(
        parseInt(organizationId),
        {
          fullName,
          documentType,
          documentNumber,
        },
      );
      customerId = customer.id;
    }
    
    const newCart = await this.cartRepository.create({
      conversationId,
      organizationId: parseInt(organizationId),
      totalItems: 0,
      totalPrice: '0',
      ...(customerId && { customerId }),
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
      customer?: Customer | null;
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
      customer?: Customer | null;
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
  ): Promise<Cart & { items: CartItemRecord[]; customer?: Customer | null }> {
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

    // Get cart to find organizationId
    const cart = await this.cartRepository.findById(id);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }

    // Use organizationId from cart, not from parameter
    const cartOrganizationId = cart.organizationId;

    // Create or update customer if customer data is provided
    let customerId: string | undefined;
    if (
      updateCartDto.fullName !== undefined ||
      updateCartDto.documentType !== undefined ||
      updateCartDto.documentNumber !== undefined ||
      updateCartDto.email !== undefined ||
      updateCartDto.phone !== undefined ||
      updateCartDto.deliveryStreet !== undefined ||
      updateCartDto.deliveryStreetNumber !== undefined ||
      updateCartDto.deliveryApartment !== undefined ||
      updateCartDto.deliveryCity !== undefined ||
      updateCartDto.deliveryRegion !== undefined ||
      updateCartDto.deliveryPostalCode !== undefined ||
      updateCartDto.deliveryCountry !== undefined ||
      updateCartDto.deliveryOffice !== undefined
    ) {
      // Validate that if any delivery field is provided, required fields are present
      const hasAnyDeliveryField =
        updateCartDto.deliveryStreet !== undefined ||
        updateCartDto.deliveryStreetNumber !== undefined ||
        updateCartDto.deliveryApartment !== undefined ||
        updateCartDto.deliveryCity !== undefined ||
        updateCartDto.deliveryRegion !== undefined ||
        updateCartDto.deliveryPostalCode !== undefined ||
        updateCartDto.deliveryCountry !== undefined ||
        updateCartDto.deliveryOffice !== undefined;

      if (hasAnyDeliveryField) {
        if (!updateCartDto.deliveryStreet?.trim()) {
          throw new BadRequestException('La calle de entrega es requerida');
        }
        if (!updateCartDto.deliveryStreetNumber?.trim()) {
          throw new BadRequestException('El número de calle de entrega es requerido');
        }
        if (!updateCartDto.deliveryCity?.trim()) {
          throw new BadRequestException('La ciudad de entrega es requerida');
        }
        if (!updateCartDto.deliveryRegion?.trim()) {
          throw new BadRequestException('La región de entrega es requerida');
        }
        if (!updateCartDto.deliveryCountry?.trim()) {
          throw new BadRequestException('El país de entrega es requerido');
        }
      }

      // Verify organization exists before creating customer
      try {
        await this.organizationService.findOne(cartOrganizationId);
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new BadRequestException(
            `La organización con ID ${cartOrganizationId} no existe. No se puede crear el cliente.`
          );
        }
        throw error;
      }

      const customer = await this.customerRepository.upsert(
        cartOrganizationId,
        {
          fullName: updateCartDto.fullName,
          documentType: updateCartDto.documentType,
          documentNumber: updateCartDto.documentNumber,
          email: updateCartDto.email,
          phone: updateCartDto.phone,
          deliveryStreet: updateCartDto.deliveryStreet,
          deliveryStreetNumber: updateCartDto.deliveryStreetNumber,
          deliveryApartment: updateCartDto.deliveryApartment,
          deliveryCity: updateCartDto.deliveryCity,
          deliveryRegion: updateCartDto.deliveryRegion,
          deliveryPostalCode: updateCartDto.deliveryPostalCode,
          deliveryCountry: updateCartDto.deliveryCountry,
          deliveryOffice: updateCartDto.deliveryOffice,
        },
      );
      customerId = customer.id;
    }

    // Update cart totals and customer reference
    const updatedCart = await this.cartRepository.update(id, {
      totalItems,
      totalPrice,
      ...(customerId && { customerId }),
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

  /**
   * Obtiene todas las sugerencias de un carrito
   */
  async getCartSuggestions(cartId: string) {
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    return await this.cartSuggestionsRepository.findByCartId(cartId);
  }

  /**
   * Obtiene las últimas N sugerencias de un carrito
   */
  async getCartSuggestionsLatest(cartId: string, limit: number = 10) {
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    return await this.cartSuggestionsRepository.findLatestByCartId(cartId, limit);
  }

  /**
   * Crea múltiples sugerencias para un carrito
   * Genera automáticamente un interactionId único y lo asigna a todas las sugerencias del bulk
   */
  async createCartSuggestions(
    cartId: string,
    suggestions: Array<{
      productId: string;
      productName: string;
      sku?: string;
      description?: string;
    }>,
  ) {
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    // Generar un interactionId único para este bulk de sugerencias
    // Formato: interaction-{timestamp}-{random}
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    const interactionId = `interaction-${timestamp}-${random}`;

    this.logger.log(
      `Creando ${suggestions.length} sugerencias para carrito ${cartId} con interactionId: ${interactionId}`,
    );

    // Asignar el mismo interactionId a todas las sugerencias del bulk
    const suggestionsData = suggestions.map(s => ({
      cartId,
      interactionId,
      ...s,
    }));

    const createdSuggestions = await this.cartSuggestionsRepository.createMany(suggestionsData);

    this.logger.log(
      `Sugerencias creadas exitosamente. InteractionId: ${interactionId}, Cantidad: ${createdSuggestions.length}`,
    );

    return createdSuggestions;
  }

  /**
   * Elimina una sugerencia por ID
   */
  async deleteCartSuggestion(id: string) {
    const suggestion = await this.cartSuggestionsRepository.findById(id);
    if (!suggestion) {
      throw new NotFoundException(`Suggestion with ID ${id} not found`);
    }

    const deleted = await this.cartSuggestionsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Suggestion with ID ${id} not found`);
    }

    return { success: true, message: 'Suggestion deleted successfully' };
  }

  /**
   * Elimina todas las sugerencias de un carrito
   */
  async deleteCartSuggestions(cartId: string) {
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    const deletedCount = await this.cartSuggestionsRepository.deleteByCartId(cartId);
    return { success: true, deletedCount, message: `${deletedCount} suggestions deleted successfully` };
  }

  /**
   * Elimina todas las sugerencias de una interacción específica
   */
  async deleteCartSuggestionsByInteraction(interactionId: string) {
    const deletedCount = await this.cartSuggestionsRepository.deleteByInteractionId(interactionId);
    return { success: true, deletedCount, message: `${deletedCount} suggestions deleted successfully for interaction ${interactionId}` };
  }

  /**
   * Elimina todas las sugerencias de una interacción específica en un carrito
   */
  async deleteCartSuggestionsByCartAndInteraction(cartId: string, interactionId: string) {
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    const deletedCount = await this.cartSuggestionsRepository.deleteByCartIdAndInteractionId(cartId, interactionId);
    return { success: true, deletedCount, message: `${deletedCount} suggestions deleted successfully for interaction ${interactionId} in cart ${cartId}` };
  }

  /**
   * Obtiene sugerencias de una interacción específica
   */
  async getCartSuggestionsByInteraction(interactionId: string) {
    return await this.cartSuggestionsRepository.findByInteractionId(interactionId);
  }

  /**
   * Obtiene sugerencias de una interacción específica en un carrito
   */
  async getCartSuggestionsByCartAndInteraction(cartId: string, interactionId: string) {
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    return await this.cartSuggestionsRepository.findByCartIdAndInteractionId(cartId, interactionId);
  }
}
