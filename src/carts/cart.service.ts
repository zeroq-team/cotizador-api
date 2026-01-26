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
import { DeliveryAddressRepository } from './delivery-address.repository';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { UpdateCustomizationDto } from './dto/update-customization.dto';
import { UpdateCustomerDataDto } from './dto/update-customer-data.dto';
import { Cart, CartItemRecord, NewCartItem, Customer } from '../database/schemas';
import { CartGateway } from './cart.gateway';
import { ProductsService } from '../products/products.service';
import { UpdateCartSuggestionsDto } from './dto/update-cart-suggestions.dto';
import { PaymentService } from '../payments/payment.service';
import { CreateProofPaymentDto } from '../payments/dto/create-proof-payment.dto';
import { ConversationsService } from '../conversations/conversations.service';
import { PriceListEvaluationService } from './services/price-list-evaluation.service';
import { PriceListsService } from '../price-lists/price-lists.service';
import { OrganizationService } from '../organization/organization.service';
import { CustomizationFieldService } from '../customization-fields/customization-field.service';
import { CONVERSATION_CUSTOM_STATUS_QUOTING } from '../config/configuration';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly cartRepository: CartRepository,
    private readonly cartChangelogRepository: CartChangelogRepository,
    private readonly cartSuggestionsRepository: CartSuggestionsRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly deliveryAddressRepository: DeliveryAddressRepository,
    private readonly cartGateway: CartGateway,
    private readonly productsService: ProductsService,
    private readonly paymentService: PaymentService,
    private readonly conversationsService: ConversationsService,
    private readonly priceListEvaluationService: PriceListEvaluationService,
    @Inject(forwardRef(() => PriceListsService))
    private readonly organizationService: OrganizationService,
    private readonly customizationFieldService: CustomizationFieldService,
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
      deliveryType,
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
      deliveryType: deliveryType || 'store_pickup',
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
          { defaultPrice: true },
        );

        if (!product) {
          throw new BadRequestException(
            `Product with ID ${item.productId} not found`,
          );
        }

        if (!product.prices || product.prices.length === 0) {
          throw new BadRequestException(
            `default price not found for product ${item.productId}`,
          );
        }

        const newCartItem: NewCartItem = {
          cartId: newCart.id,
          productId: item.productId,
          name: product.name,
          sku: product.sku,
          size: product.metadata?.size || null,
          color: product.metadata?.color || null,
          price: product.prices[0].amount.toString(),
          quantity: Math.min(
            item.quantity,
            product.inventory?.[0]?.available || item.quantity,
          ),
          imageUrl: product.media?.[0]?.url || null,
          addedManually: item.addedManually ?? false,
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

    // Actualizar customStatus de la conversación a "Cotizando"
    try {
      await this.conversationsService.updateConversationCustomStatus(
        conversationId,
        CONVERSATION_CUSTOM_STATUS_QUOTING,
      );
      this.logger.log(
        `Conversación ${conversationId} actualizada a "${CONVERSATION_CUSTOM_STATUS_QUOTING}"`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to update conversation customStatus after cart creation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // No lanzar error para no interrumpir la creación del carrito
    }

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
            addedManually: item.addedManually ?? false,
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
      updateCartDto.phoneCode !== undefined ||
      updateCartDto.phoneNumber !== undefined ||
      updateCartDto.deliveryStreet !== undefined ||
      updateCartDto.deliveryStreetNumber !== undefined ||
      updateCartDto.deliveryApartment !== undefined ||
      updateCartDto.deliveryCommune !== undefined ||
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
        updateCartDto.deliveryCommune !== undefined ||
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
        if (!updateCartDto.deliveryCommune?.trim()) {
          throw new BadRequestException('La comuna de entrega es requerida');
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
          ...(updateCartDto.phone && { phone: updateCartDto.phone }), // Mantener para compatibilidad
          ...(updateCartDto.phoneCode && { phoneCode: updateCartDto.phoneCode }),
          ...(updateCartDto.phoneNumber && { phoneNumber: updateCartDto.phoneNumber }),
        },
      );
      customerId = customer.id;

      // Handle delivery address if provided (for backward compatibility)
      if (
        updateCartDto.deliveryStreet ||
        updateCartDto.deliveryStreetNumber ||
        updateCartDto.deliveryApartment ||
        updateCartDto.deliveryCommune ||
        updateCartDto.deliveryRegion ||
        updateCartDto.deliveryPostalCode ||
        updateCartDto.deliveryCountry ||
        updateCartDto.deliveryOffice
      ) {
        await this.deliveryAddressRepository.upsert(customer.id, {
          street: updateCartDto.deliveryStreet,
          streetNumber: updateCartDto.deliveryStreetNumber,
          apartment: updateCartDto.deliveryApartment,
          commune: updateCartDto.deliveryCommune,
          region: updateCartDto.deliveryRegion,
          postalCode: updateCartDto.deliveryPostalCode,
          country: updateCartDto.deliveryCountry,
          office: updateCartDto.deliveryOffice,
          isDefault: true,
        });
      }
    }

    // Update cart totals, customer reference, and delivery type
    const updatedCart = await this.cartRepository.update(id, {
      totalItems,
      totalPrice,
      ...(customerId && { customerId }),
      ...(updateCartDto.deliveryType && { deliveryType: updateCartDto.deliveryType }),
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

  async patchCart(
    id: string,
    patchCartDto: { deliveryType?: 'store_pickup' | 'home_delivery'; deliveryAddressId?: string },
    organizationId: string,
  ): Promise<Cart & { items: CartItemRecord[]; customer?: Customer | null }> {
    // Verify cart exists and belongs to organization
    const cart = await this.cartRepository.findById(id);
    if (!cart) {
      throw new NotFoundException(`Carrito con ID ${id} no encontrado`);
    }

    if (cart.organizationId !== Number(organizationId)) {
      throw new BadRequestException('El carrito no pertenece a la organización especificada');
    }

    // Validate deliveryAddressId if deliveryType is home_delivery
    if (patchCartDto.deliveryType === 'home_delivery') {
      if (!patchCartDto.deliveryAddressId) {
        throw new BadRequestException('La dirección de entrega es requerida cuando el tipo de envío es "home_delivery"');
      }
      
      // Verify the address belongs to the cart's customer
      if (cart.customerId) {
        const address = await this.deliveryAddressRepository.findById(patchCartDto.deliveryAddressId);
        if (!address || address.customerId !== cart.customerId) {
          throw new BadRequestException('La dirección de entrega no pertenece al cliente del carrito');
        }
      } else {
        throw new BadRequestException('El carrito no tiene un cliente asociado');
      }
    }

    // Update deliveryType and deliveryAddressId if provided
    const updateData: Partial<Cart> = {};
    if (patchCartDto.deliveryType !== undefined) {
      updateData.deliveryType = patchCartDto.deliveryType;
    }
    
    // Update deliveryAddressId
    if (patchCartDto.deliveryType === 'home_delivery' && patchCartDto.deliveryAddressId) {
      updateData.deliveryAddressId = patchCartDto.deliveryAddressId;
    } else if (patchCartDto.deliveryType === 'store_pickup') {
      // Clear deliveryAddressId when switching to store pickup
      updateData.deliveryAddressId = null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No se proporcionaron campos para actualizar');
    }

    const updatedCart = await this.cartRepository.update(id, updateData);
    if (!updatedCart) {
      throw new BadRequestException('Failed to update cart');
    }

    // Return cart with items
    const cartWithItems = await this.cartRepository.findByIdWithItems(id);
    if (!cartWithItems) {
      throw new BadRequestException('Failed to retrieve updated cart');
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
            { defaultPrice: true },
          );

          if (!product) {
            throw new BadRequestException(
              `Product with ID ${item.productId} not found`,
            );
          }

          if (!product.prices || product.prices.length === 0) {
            throw new BadRequestException(
              `default price not found for product ${item.productId}`,
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
            price: product.prices[0].amount.toString(),
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

    const { itemCustomizations, selectedProductIds, customizationValues } = updateCustomizationDto;

    // Nuevo flujo: personalización por item individual
    if (itemCustomizations && itemCustomizations.length > 0) {
      for (const itemCustomization of itemCustomizations) {
        // Verificar que el item pertenece al carrito
        const itemExists = existingCart.items.some(
          (item) => item.id === itemCustomization.itemId,
        );
        
        if (!itemExists) {
          this.logger.warn(
            `Item ${itemCustomization.itemId} not found in cart ${cartId}`,
          );
          continue;
        }

        // Usar el método helper que calcula los precios automáticamente
        await this.updateCartItemWithCustomizationPrice(
          itemCustomization.itemId,
          {
            customizationValues: itemCustomization.customizationValues,
          },
          existingCart.organizationId,
        );
      }
    }
    // Compatibilidad con versión anterior (deprecated)
    else if (selectedProductIds && customizationValues) {
      this.logger.warn(
        'Using deprecated customization format. Please migrate to itemCustomizations.',
      );

      // Update customization values for selected products
      for (const item of existingCart.items) {
        if (selectedProductIds.includes(item.id)) {
          // Usar el método helper que calcula los precios automáticamente
          await this.updateCartItemWithCustomizationPrice(
            item.id,
            {
              customizationValues,
            },
            existingCart.organizationId,
          );
        }
      }
    } else {
      throw new BadRequestException(
        'Either itemCustomizations or (selectedProductIds and customizationValues) must be provided',
      );
    }

    // Get updated cart
    const updatedCart = await this.cartRepository.findByIdWithItems(cartId);
    if (!updatedCart) {
      throw new BadRequestException('Failed to retrieve updated cart');
    }

 

    return updatedCart;
  }

  /**
   * Busca un cliente por teléfono en la organización
   */
  async findCustomerByPhone(
    organizationId: number,
    phoneCode: string,
    phoneNumber: string,
  ): Promise<Customer | null> {
    return await this.customerRepository.findByPhone(
      organizationId,
      phoneCode,
      phoneNumber,
    );
  }

  /**
   * Actualiza los datos del cliente y dirección de entrega
   */
  async updateCustomerData(
    cartId: string,
    updateCustomerDataDto: UpdateCustomerDataDto,
  ): Promise<Cart & { items: CartItemRecord[]; customer?: Customer | null }> {
    const existingCart = await this.cartRepository.findByIdWithItems(cartId);
    if (!existingCart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    const cartOrganizationId = existingCart.organizationId;

    // Update or create customer
    let customerId: string | undefined;
    if (
      updateCustomerDataDto.fullName ||
      updateCustomerDataDto.documentType ||
      updateCustomerDataDto.documentNumber ||
      updateCustomerDataDto.email ||
      updateCustomerDataDto.phoneCode ||
      updateCustomerDataDto.phoneNumber
    ) {
      try {
        const customer = await this.customerRepository.upsert(
          cartOrganizationId,
          {
            fullName: updateCustomerDataDto.fullName,
            documentType: updateCustomerDataDto.documentType,
            documentNumber: updateCustomerDataDto.documentNumber,
            email: updateCustomerDataDto.email,
            phoneCode: updateCustomerDataDto.phoneCode,
            phoneNumber: updateCustomerDataDto.phoneNumber,
          },
        );
        customerId = customer.id;

        // Update or create delivery address if provided
        if (updateCustomerDataDto.deliveryAddress) {
          await this.deliveryAddressRepository.upsert(customer.id, {
            street: updateCustomerDataDto.deliveryAddress.street,
            streetNumber: updateCustomerDataDto.deliveryAddress.streetNumber,
            apartment: updateCustomerDataDto.deliveryAddress.apartment,
            commune: updateCustomerDataDto.deliveryAddress.commune,
            region: updateCustomerDataDto.deliveryAddress.region,
            postalCode: updateCustomerDataDto.deliveryAddress.postalCode,
            country: updateCustomerDataDto.deliveryAddress.country,
            office: updateCustomerDataDto.deliveryAddress.office,
            isDefault: updateCustomerDataDto.deliveryAddress.isDefault ?? true,
          });
        }
      } catch (error: any) {
        this.logger.error(`Error updating customer data: ${error.message}`, error.stack);
        if (error.message?.includes('organization')) {
          throw new BadRequestException(
            `La organización con ID ${cartOrganizationId} no existe. No se puede crear el cliente.`
          );
        }
        throw error;
      }
    }

    // Update cart with customer reference
    if (customerId) {
      await this.cartRepository.update(cartId, {
        customerId,
      });
    }

    // Return updated cart with items and customer
    const cartWithItems = await this.cartRepository.findByIdWithItems(cartId);
    if (!cartWithItems) {
      throw new BadRequestException('Failed to retrieve updated cart');
    }

    return cartWithItems;
  }

  /**
   * Crea una nueva dirección de entrega para el cliente del carrito
   */
  async createDeliveryAddress(
    cartId: string,
    addressData: {
      street?: string;
      streetNumber?: string;
      apartment?: string;
      commune?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      office?: string;
      isDefault?: boolean;
    },
  ): Promise<Cart & { items: CartItemRecord[]; customer?: Customer | null }> {
    const existingCart = await this.cartRepository.findByIdWithItems(cartId);
    if (!existingCart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    if (!existingCart.customerId) {
      throw new BadRequestException('El carrito no tiene un cliente asociado');
    }

    // Create new address (always create, never update)
    // Only set as default if explicitly requested AND there are no other addresses
    const existingAddresses = await this.deliveryAddressRepository.findByCustomerId(existingCart.customerId);
    const shouldBeDefault = addressData.isDefault === true && existingAddresses.length === 0;
    
    const newAddress = await this.deliveryAddressRepository.create({
      customerId: existingCart.customerId,
      street: addressData.street ?? null,
      streetNumber: addressData.streetNumber ?? null,
      apartment: addressData.apartment ?? null,
      commune: addressData.commune ?? null,
      region: addressData.region ?? null,
      postalCode: addressData.postalCode ?? null,
      country: addressData.country ?? null,
      office: addressData.office ?? null,
      isDefault: shouldBeDefault, // Only default if it's the first address
    });

    // Return updated cart with items and customer
    const cartWithItems = await this.cartRepository.findByIdWithItems(cartId);
    if (!cartWithItems) {
      throw new BadRequestException('Failed to retrieve updated cart');
    }

    return cartWithItems;
  }

  /**
   * Actualiza una dirección de entrega específica
   */
  async updateDeliveryAddress(
    cartId: string,
    addressId: string,
    updateAddressDto: {
      street?: string;
      streetNumber?: string;
      apartment?: string;
      commune?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      office?: string;
      isDefault?: boolean;
    },
  ): Promise<Cart & { items: CartItemRecord[]; customer?: Customer | null }> {
    const existingCart = await this.cartRepository.findByIdWithItems(cartId);
    if (!existingCart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    if (!existingCart.customerId) {
      throw new BadRequestException('Cart does not have a customer associated');
    }

    // Verify address belongs to customer
    const address = await this.deliveryAddressRepository.findById(addressId);
    if (!address || address.customerId !== existingCart.customerId) {
      throw new NotFoundException(`Delivery address with ID ${addressId} not found`);
    }

    // Update the address
    const updatedAddress = await this.deliveryAddressRepository.update(addressId, updateAddressDto);
    if (!updatedAddress) {
      throw new BadRequestException('Failed to update delivery address');
    }

    // Return updated cart
    const cartWithItems = await this.cartRepository.findByIdWithItems(cartId);
    if (!cartWithItems) {
      throw new BadRequestException('Failed to retrieve updated cart');
    }

    return cartWithItems;
  }

  /**
   * Elimina (soft delete) una dirección de entrega
   */
  async deleteDeliveryAddress(
    cartId: string,
    addressId: string,
  ): Promise<Cart & { items: CartItemRecord[]; customer?: Customer | null }> {
    const existingCart = await this.cartRepository.findByIdWithItems(cartId);
    if (!existingCart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    if (!existingCart.customerId) {
      throw new BadRequestException('Cart does not have a customer associated');
    }

    // Verify address belongs to customer
    const address = await this.deliveryAddressRepository.findById(addressId);
    if (!address || address.customerId !== existingCart.customerId) {
      throw new NotFoundException(`Delivery address with ID ${addressId} not found`);
    }

    // Soft delete address
    await this.deliveryAddressRepository.delete(addressId);

    // Return updated cart
    const cartWithItems = await this.cartRepository.findByIdWithItems(cartId);
    if (!cartWithItems) {
      throw new BadRequestException('Failed to retrieve updated cart');
    }

    return cartWithItems;
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
      cart.organizationId.toString(),
    );

    // Actualizar el estado de la conversación a 'Verificando pago'
    // Nota: Este estado no está en la configuración porque es específico de este flujo
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

  private readonly TAX_RATE = 0.19; // 19% IVA

  /**
   * Actualiza un item del carrito y calcula automáticamente los precios de personalización
   * si se están actualizando los customizationValues
   * @param itemId ID del item a actualizar
   * @param updateData Datos a actualizar (puede incluir customizationValues)
   * @param organizationId ID de la organización (necesario para calcular precios)
   * @returns Item actualizado
   */
  async updateCartItemWithCustomizationPrice(
    itemId: string,
    updateData: Partial<CartItemRecord>,
    organizationId: number,
  ): Promise<CartItemRecord | null> {
    // Si se están actualizando los customizationValues, calcular los precios y agregarlos al objeto
    if (updateData.customizationValues !== undefined) {
      await this.calculateAndEnrichCustomizationValues(
        updateData.customizationValues as Record<string, any> | null,
        organizationId,
      );
    }

    // Actualizar el item
    return await this.cartRepository.updateCartItem(itemId, updateData);
  }

  /**
   * Calcula y enriquece los customizationValues con información de precio e impuestos
   * Modifica el objeto directamente agregando price e includesTax a cada campo
   * @param customizationValues Valores de personalización del item (se modifica in-place)
   * @param organizationId ID de la organización
   */
  async calculateAndEnrichCustomizationValues(
    customizationValues: Record<string, any> | null | undefined,
    organizationId: number,
  ): Promise<void> {
    if (!customizationValues || Object.keys(customizationValues).length === 0) {
      return;
    }

    // Convertir valores simples a objetos con value, price, priceWithTax, includesTax
    const enrichedValues: Record<string, {
      value: any;
      price?: number;
      priceWithTax?: number;
      includesTax?: boolean;
    }> = {};

    // Primero, extraer los valores actuales (pueden venir como objetos o valores simples)
    const fieldNames: string[] = [];
    const currentValues: Record<string, any> = {};

    for (const [key, val] of Object.entries(customizationValues)) {
      // Si ya es un objeto con value, usar ese valor
      if (val && typeof val === 'object' && 'value' in val) {
        currentValues[key] = val.value;
      } else {
        // Si es un valor simple, usarlo directamente
        currentValues[key] = val;
      }
      fieldNames.push(key);
    }

    // Obtener los campos de personalización
    const fields = await this.customizationFieldService.findByNames(fieldNames, organizationId);

    // Procesar cada campo
    for (const field of fields) {
      const fieldValue = currentValues[field.name];
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        // Si no hay valor, mantener el valor original del customizationValues si existe
        const originalValue = customizationValues[field.name];
        if (originalValue !== undefined) {
          // Si ya es un objeto con value, mantenerlo; si no, convertirlo
          if (originalValue && typeof originalValue === 'object' && 'value' in originalValue) {
            enrichedValues[field.name] = originalValue;
          } else {
            enrichedValues[field.name] = {
              value: originalValue,
            };
          }
        }
        continue;
      }

      // Verificar si el campo afecta el precio
      if (!field.affectsPrice) {
        // Si no afecta precio, solo guardar el valor
        enrichedValues[field.name] = {
          value: fieldValue,
        };
        continue;
      }

      // Por defecto se cobra IVA
      const chargeTax = field.chargeTax ?? true;
      let fieldPrice = 0;

      // Para campos tipo 'select' con opciones
      if (field.type === 'select' && field.options && field.options.length > 0) {
        const selectedOption = field.options.find(
          (opt: { value: string; label: string; price?: number }) => opt.value === fieldValue
        );

        if (selectedOption && selectedOption.price && selectedOption.price > 0) {
          fieldPrice = selectedOption.price;
        }
      } 
      // Para otros tipos de campos con priceModifier
      else if (field.priceModifier && field.priceModifierType === 'fixed') {
        const priceModifier = parseFloat(field.priceModifier);
        if (!isNaN(priceModifier) && priceModifier > 0) {
          // Para booleanos, solo aplicar si es true
          if (field.type === 'boolean' && fieldValue !== true && fieldValue !== 'true') {
            enrichedValues[field.name] = {
              value: fieldValue,
            };
            continue;
          }
          
          fieldPrice = priceModifier;
        }
      }

      // Agregar el campo enriquecido con precio e información de impuestos
      if (fieldPrice > 0) {
        // Calcular precio con IVA si corresponde
        const priceWithTax = chargeTax 
          ? Math.round(fieldPrice * (1 + this.TAX_RATE))
          : fieldPrice;
        
        enrichedValues[field.name] = {
          value: fieldValue,
          price: fieldPrice,
          priceWithTax: priceWithTax, // Precio con IVA para trazabilidad
          includesTax: chargeTax,
        };
      } else {
        enrichedValues[field.name] = {
          value: fieldValue,
        };
      }
    }

    // Agregar campos que no se encontraron en la base de datos (mantener valores originales)
    for (const [key, val] of Object.entries(customizationValues)) {
      if (!enrichedValues[key]) {
        // Si ya es un objeto, mantenerlo; si no, convertirlo
        if (val && typeof val === 'object' && 'value' in val) {
          enrichedValues[key] = val;
        } else {
          enrichedValues[key] = {
            value: val,
          };
        }
      }
    }

    // Reemplazar el objeto original con el enriquecido
    Object.assign(customizationValues, enrichedValues);
  }

  /**
   * Obtiene una etiqueta descriptiva para el valor de personalización
   */
  private getCustomizationValueLabel(fieldType: string, value: any): string {
    switch (fieldType) {
      case 'boolean':
        return value === true || value === 'true' ? 'Incluido' : 'No incluido';
      case 'image':
        return 'Imagen personalizada';
      case 'text':
        return typeof value === 'string' && value.length > 30 
          ? value.substring(0, 30) + '...' 
          : String(value);
      case 'number':
        return String(value);
      default:
        return String(value);
    }
  }

  /**
   * Calcula el precio total de personalización desde customizationValues enriquecidos
   * @param customizationValues Valores de personalización con price, priceWithTax e includesTax
   * @returns Precio neto y precio con IVA
   */
  private calculateCustomizationPriceFromValues(
    customizationValues: Record<string, { value: any; price?: number; priceWithTax?: number; includesTax?: boolean }> | null | undefined,
  ): { priceNet: number; priceWithTax: number } {
    if (!customizationValues || Object.keys(customizationValues).length === 0) {
      return { priceNet: 0, priceWithTax: 0 };
    }

    let priceNet = 0;
    let priceWithTaxTotal = 0;

    for (const [fieldName, fieldData] of Object.entries(customizationValues)) {
      if (fieldData.price && fieldData.price > 0) {
        priceNet += fieldData.price;
        
        // Si priceWithTax está disponible, usarlo directamente (más preciso para trazabilidad)
        if (fieldData.priceWithTax !== undefined) {
          priceWithTaxTotal += fieldData.priceWithTax;
        } else {
          // Si no está disponible, calcularlo
          // Si includesTax es true, el precio ya incluye IVA, así que no agregamos más
          // Si includesTax es false o undefined, agregamos IVA
          if (fieldData.includesTax !== true) {
            priceWithTaxTotal += fieldData.price * (1 + this.TAX_RATE);
          } else {
            priceWithTaxTotal += fieldData.price;
          }
        }
      }
    }

    return {
      priceNet: Math.round(priceNet),
      priceWithTax: Math.round(priceWithTaxTotal),
    };
  }

  /**
   * Obtiene el carrito con precios de personalización calculados
   * @param cartId ID del carrito
   * @returns Carrito con items que incluyen precios de personalización
   */
  async getCartWithCustomizationPrices(
    cartId: string,
  ): Promise<
    Cart & {
      items: CartItemRecord[];
      customer?: Customer | null;
      totalCustomizationPriceNet?: number;
      totalCustomizationPriceWithTax?: number;
    }
  > {
    const cart = await this.cartRepository.findByIdWithItems(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    let totalCustomizationPriceNet = 0;
    let totalCustomizationPriceWithTax = 0;

    // Calcular precios desde customizationValues enriquecidos
    for (const item of cart.items) {
      const customizationValues = item.customizationValues as Record<string, { value: any; price?: number; priceWithTax?: number; includesTax?: boolean }> | null | undefined;
      
      // Si los valores no están enriquecidos, enriquecerlos primero
      if (customizationValues) {
        let needsEnrichment = false;
        for (const val of Object.values(customizationValues)) {
          if (!val || typeof val !== 'object' || !('value' in val)) {
            needsEnrichment = true;
            break;
          }
        }

        if (needsEnrichment) {
          await this.calculateAndEnrichCustomizationValues(
            customizationValues as any,
            cart.organizationId,
          );
        }

        const { priceNet, priceWithTax } = this.calculateCustomizationPriceFromValues(customizationValues);
        totalCustomizationPriceNet += priceNet * item.quantity;
        totalCustomizationPriceWithTax += priceWithTax * item.quantity;
      }
    }

    return {
      ...cart,
      totalCustomizationPriceNet,
      totalCustomizationPriceWithTax,
    };
  }
}
