import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PriceListsService } from '../../price-lists/price-lists.service';
import { ProductsService } from '../../products/products.service';
import { Cart, CartItemRecord } from '../../database/schemas';

export interface PriceListEvaluationContext {
  totalPrice: number;
  totalQuantity: number;
  cart: Cart & {
    items?: Array<{ productId: number; quantity: number; price?: string }>;
  };
}

export interface ProductPriceResult {
  productId: number;
  priceListId: number;
  priceListName: string;
  amount: string;
  appliedConditions?: string[];
}

export interface CartItemWithPrice {
  productId: number;
  name: string;
  sku: string;
  price: string;
  quantity: number;
  description?: string | null;
  imageUrl?: string | null;
  addedManually?: boolean;
}

export interface PriceListProgress {
  priceListId: number;
  priceListName: string;
  conditions: ConditionProgress[];
  potentialSavings?: number; // Ahorro potencial si cumple todas las condiciones
  currentTotal?: number; // Total actual del carrito
  projectedTotal?: number; // Total proyectado con esta lista de precios
}

export interface ConditionProgress {
  conditionId: number;
  conditionType: string;
  isMet: boolean;
  progress: number; // Porcentaje 0-100
  currentValue: number;
  targetValue: number;
  remaining: number;
  unit: string; // 'amount', 'quantity', 'days'
  message: string;
}

@Injectable()
export class PriceListEvaluationService {
  private readonly logger = new Logger(PriceListEvaluationService.name);

  constructor(
    private readonly priceListsService: PriceListsService,
    private readonly productsService: ProductsService,
  ) {}

  /**
   * Construye un mapa productId -> (priceListId -> amount) a partir de productos con precios
   */
  private buildProductPricesMap(
    products: Array<{
      id: number;
      prices?: Array<{ price_list_id: number; amount: string }>;
    }>,
  ): Map<number, Map<number, string>> {
    const map = new Map<number, Map<number, string>>();
    for (const product of products) {
      const priceMap = new Map<number, string>();
      for (const price of product.prices || []) {
        priceMap.set(price.price_list_id, price.amount);
      }
      map.set(product.id, priceMap);
    }
    return map;
  }

  /**
   * Procesa items del carrito y calcula sus precios con la lista de precios aplicable
   * @param items Items a agregar o quitar (operation: 'add' | 'remove'); si no se indica, se asume 'add'
   * @param cart Carrito existente
   * @param organizationId ID de la organización
   * @param existingCartItems Items existentes en el carrito (opcional, para calcular total completo)
   * @returns Array de items con precios y información de la lista de precios aplicada
   */
  async processCartItemsWithPricing(
    items: Array<{
      productId: number;
      quantity: number;
      operation?: 'add' | 'remove';
    }>,
    cart: Cart,
    organizationId: string,
    existingCartItems?: CartItemRecord[],
  ): Promise<{
    processedItems: CartItemWithPrice[];
    appliedPriceList: any;
    shouldUpdateAllItems: boolean; // Indica si se debe actualizar todos los items del carrito
  }> {
    // Obtener la lista de precios por defecto
    const priceLists = await this.priceListsService.getPriceLists(
      organizationId,
      { status: 'active' },
    );

    const defaultPriceList = priceLists.priceLists.find(
      (priceList) => priceList.isDefault,
    );

    if (!defaultPriceList) {
      throw new NotFoundException('Default price list not found');
    }

    // Paso 1: Cargar todos los productos de los items en una sola llamada (batch)
    const uniqueItemIds = [...new Set(items.map((item) => item.productId))];
    const { data: requestProducts } = await this.productsService.getProducts(
      organizationId,
      {
        ids: uniqueItemIds,
        include: 'prices,media',
        limit: 100,
      },
    );
    const productById = new Map(requestProducts.map((p) => [p.id, p]));
    const requestItemPricesMap = this.buildProductPricesMap(requestProducts);

    const itemsWithDefaultPrices: CartItemWithPrice[] = [];
    for (const item of items) {
      const product = productById.get(item.productId);
      if (!product) {
        throw new NotFoundException(
          `Product with ID ${item.productId} not found`,
        );
      }
      const defaultPrice = requestItemPricesMap
        .get(item.productId)
        ?.get(defaultPriceList.id);
      if (!defaultPrice) {
        throw new NotFoundException(
          `Price not found for product ${item.productId} in default price list`,
        );
      }
      itemsWithDefaultPrices.push({
        productId: item.productId,
        name: product.name,
        sku: product.sku,
        price: defaultPrice,
        quantity: item.quantity,
        description: product.description || null,
        imageUrl: product.media?.[0]?.url || null,
      });
    }

    // Paso 2: Calcular totales con precios por defecto
    // Primero: total del carrito existente
    let totalPrice = 0;
    let totalQuantity = 0;

    if (existingCartItems && existingCartItems.length > 0) {
      const existingProductIds = [
        ...new Set(existingCartItems.map((i) => i.productId)),
      ];
      const { data: existingProducts } =
        await this.productsService.getProducts(organizationId, {
          ids: existingProductIds,
          include: 'prices',
          limit: 100,
        });
      const existingPricesMap = this.buildProductPricesMap(existingProducts);

      for (const existingItem of existingCartItems) {
        const defaultAmount = existingPricesMap
          .get(existingItem.productId)
          ?.get(defaultPriceList.id);
        if (defaultAmount !== undefined) {
          totalPrice += Number(defaultAmount) * existingItem.quantity;
          totalQuantity += existingItem.quantity;
        } else {
          this.logger.warn(
            `Could not get default price for existing product ${existingItem.productId}, using current price`,
          );
          totalPrice += Number(existingItem.price) * existingItem.quantity;
          totalQuantity += existingItem.quantity;
        }
      }
    }

    // Segundo: sumar o restar la contribución de los items del request según operation
    for (const item of items) {
      const defaultAmount = requestItemPricesMap
        .get(item.productId)
        ?.get(defaultPriceList.id);
      if (!defaultAmount) continue;
      const contrib = Number(defaultAmount) * item.quantity;
      const op = item.operation || 'add';
      if (op === 'remove') {
        totalPrice -= contrib;
        totalQuantity -= item.quantity;
      } else {
        totalPrice += contrib;
        totalQuantity += item.quantity;
      }
    }
    totalPrice = Math.max(0, totalPrice);
    totalQuantity = Math.max(0, totalQuantity);

    this.logger.log(
      `Total cart evaluation: ${totalQuantity} items, $${totalPrice.toFixed(2)} (including ${existingCartItems?.length || 0} existing items)`,
    );

    // Paso 3: Encontrar la lista de precios aplicable
    const bestPriceList = await this.findApplicablePriceListByPriority(
      { totalPrice, totalQuantity, cart },
      organizationId,
    );

    this.logger.log(
      `Selected price list "${bestPriceList.name}" (ID: ${bestPriceList.id})`,
    );

    // Paso 4: Calcular total con lista seleccionada usando map (sin más llamadas)
    let lowestTotalPrice = totalPrice;
    if (bestPriceList.id !== defaultPriceList.id) {
      let currentTotal = 0;
      for (const item of items) {
        const prices = requestItemPricesMap.get(item.productId);
        const amount =
          prices?.get(bestPriceList.id) ?? prices?.get(defaultPriceList.id);
        if (amount !== undefined) {
          currentTotal += Number(amount) * item.quantity;
        } else {
          const defaultItem = itemsWithDefaultPrices.find(
            (i) => i.productId === item.productId,
          );
          if (defaultItem) {
            currentTotal += Number(defaultItem.price) * item.quantity;
          }
        }
      }
      lowestTotalPrice = currentTotal;
    }

    // Paso 5: Actualizar precios en memoria con la mejor lista (usando map)
    if (bestPriceList.id !== defaultPriceList.id) {
      for (const item of itemsWithDefaultPrices) {
        const amount = requestItemPricesMap
          .get(item.productId)
          ?.get(bestPriceList.id);
        if (amount !== undefined) {
          item.price = amount;
        }
      }
      const savings = totalPrice - lowestTotalPrice;
      this.logger.log(
        `Prices updated with price list "${bestPriceList.name}". Savings: ${savings} (${((savings / totalPrice) * 100).toFixed(2)}%)`,
      );
    }

    // Determinar si se debe actualizar todos los items del carrito
    // Esto ocurre cuando se aplica una lista de precios diferente a la por defecto
    const shouldUpdateAllItems =
      bestPriceList.id !== defaultPriceList.id &&
      existingCartItems &&
      existingCartItems.length > 0;

    return {
      processedItems: itemsWithDefaultPrices,
      appliedPriceList: bestPriceList,
      shouldUpdateAllItems,
    };
  }

  /**
   * Recalcula los precios de items existentes del carrito con una nueva lista de precios
   * @param existingCartItems Items existentes en el carrito
   * @param priceListId ID de la lista de precios a aplicar
   * @param organizationId ID de la organización
   * @returns Map de productId -> nuevo precio
   */
  async recalculateExistingItemsPrices(
    existingCartItems: CartItemRecord[],
    priceListId: number,
    organizationId: string,
  ): Promise<Map<number, string>> {
    const priceMap = new Map<number, string>();
    if (existingCartItems.length === 0) return priceMap;

    const defaultPriceList = (
      await this.priceListsService.getPriceLists(organizationId, {
        status: 'active',
      })
    ).priceLists.find((pl) => pl.isDefault);

    if (!defaultPriceList) {
      this.logger.warn('Default price list not found for recalculation');
      return priceMap;
    }

    // Cargar precios de todos los productos en una sola llamada
    const productIds = [
      ...new Set(existingCartItems.map((item) => item.productId)),
    ];
    const { data: products } = await this.productsService.getProducts(
      organizationId,
      { ids: productIds, include: 'prices', limit: 100 },
    );
    const pricesByProduct = this.buildProductPricesMap(products);

    for (const item of existingCartItems) {
      const productPrices = pricesByProduct.get(item.productId);
      const amount =
        productPrices?.get(priceListId) ??
        productPrices?.get(defaultPriceList.id);
      if (amount !== undefined) {
        priceMap.set(item.productId, amount);
      } else {
        this.logger.warn(
          `No price found for product ${item.productId} in price list ${priceListId}, keeping current price`,
        );
        priceMap.set(item.productId, item.price.toString());
      }
    }

    return priceMap;
  }

  /**
   * Calcula el progreso hacia las listas de precios disponibles
   *
   * Reglas:
   * 1. La lista por defecto NUNCA se muestra (siempre está aplicada)
   * 2. Solo se muestran listas que el usuario AÚN NO ha alcanzado
   * 3. Motiva al usuario mostrando cuánto le falta para desbloquear mejores precios
   *
   * Tipo Amazon: "Te faltan $50 para desbloquear precios mayoristas"
   */
  async calculatePriceListProgress(
    context: PriceListEvaluationContext,
    organizationId: string,
  ): Promise<PriceListProgress[]> {
    const priceLists = await this.priceListsService.getPriceLists(
      organizationId,
      { status: 'active' },
    );

    const progressList: PriceListProgress[] = [];

    this.logger.debug(
      `Evaluating ${priceLists.priceLists.length} price lists for progress calculation`,
    );

    // OPTIMIZACIÓN 1: Pre-calcular la lista de precios por defecto UNA SOLA VEZ
    const defaultPriceList = priceLists.priceLists.find(
      (pl) => pl.isDefault,
    );

    if (!defaultPriceList) {
      this.logger.warn(
        'Default price list not found for savings calculation',
      );
      // Continuar sin calcular ahorros potenciales
    }

    // OPTIMIZACIÓN 2: Pre-cargar todos los productos con precios UNA SOLA VEZ
    // Solo si hay items en el carrito y hay lista por defecto
    let productPricesMap: Map<number, Map<number, number>> | null = null;
    let defaultTotal = 0;
    const hasItems = context.cart.items && context.cart.items.length > 0;

    if (hasItems && defaultPriceList) {
      try {
        const startTime = performance.now();
        const itemsWithPrices = await this.productsService.getProducts(
          organizationId,
          {
            ids: context.cart.items!.map((item) => item.productId),
            include: ['prices'],
          },
        );

        // OPTIMIZACIÓN 3: Crear Map anidado para búsquedas O(1)
        // Estructura: Map<productId, Map<priceListId, amount>>
        productPricesMap = new Map();
        
        for (const product of itemsWithPrices.data) {
          const pricesMap = new Map<number, number>();
          for (const price of product.prices || []) {
            pricesMap.set(price.price_list_id, Number(price.amount));
          }
          productPricesMap.set(product.id, pricesMap);
        }

        // OPTIMIZACIÓN 4: Calcular defaultTotal UNA SOLA VEZ antes del loop
        for (const item of context.cart.items!) {
          const productPrices = productPricesMap.get(item.productId);
          const defaultAmount = productPrices?.get(defaultPriceList.id);
          
          if (defaultAmount !== undefined) {
            defaultTotal += defaultAmount * item.quantity;
          } else {
            this.logger.warn(
              `Could not get default price for product ${item.productId} in price list ${defaultPriceList.id}`,
            );
            defaultTotal = Infinity;
            break;
          }
        }

        const endTime = performance.now();
        this.logger.debug(
          `Pre-loaded ${itemsWithPrices.data.length} products with prices in ${Math.round(endTime - startTime)}ms`,
        );
      } catch (error) {
        this.logger.warn(
          `Could not pre-load products for savings calculation: ${error.message}`,
        );
        // Continuar sin calcular ahorros potenciales
      }
    }

    // OPTIMIZACIÓN 5: Pre-formatear el ahorro para evitar formatear múltiples veces
    const formatSavings = (savings: number): string => {
      return savings.toLocaleString('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    };

    // Evaluar cada lista de precios
    for (const priceList of priceLists.priceLists) {
      // REGLA 1: Excluir lista por defecto (siempre está aplicada, no hay que motivar)
      if (priceList.isDefault) {
        this.logger.debug(
          `Skipping default price list "${priceList.name}" (ID: ${priceList.id})`,
        );
        continue;
      }

      // REGLA 2: Solo listas con condiciones (sin condiciones no hay progreso que mostrar)
      if (!priceList.conditions || priceList.conditions.length === 0) {
        continue;
      }

      const activeConditions = priceList.conditions.filter(
        (c) => c.status === 'active',
      );

      if (activeConditions.length === 0) {
        continue;
      }

      const conditionProgresses: ConditionProgress[] = [];
      let allConditionsMet = true;

      // OPTIMIZACIÓN 6: Calcular progreso de condiciones (ya optimizado, no cambia)
      for (const condition of activeConditions) {
        const progress = this.calculateConditionProgress(
          condition,
          context.totalPrice,
          context.totalQuantity,
          context.cart,
        );

        conditionProgresses.push(progress);

        if (!progress.isMet) {
          allConditionsMet = false;
        }
      }

      // REGLA 3: Solo incluir listas que AÚN NO están completamente cumplidas
      if (!allConditionsMet) {
        this.logger.debug(
          `Including price list "${priceList.name}" (ID: ${priceList.id}) - not all conditions met`,
        );

        // Calcular ahorro potencial con esta lista de precios
        let potentialSavings = 0;
        let projectedTotal = 0;

        // OPTIMIZACIÓN 7: Usar los precios pre-cargados en lugar de hacer queries individuales
        if (hasItems && defaultPriceList && productPricesMap && defaultTotal !== Infinity) {
          try {
            // OPTIMIZACIÓN 8: Calcular projectedTotal en un solo loop usando Map
            for (const item of context.cart.items!) {
              const productPrices = productPricesMap.get(item.productId);
              const amount = productPrices?.get(priceList.id);
              
              if (amount !== undefined) {
                projectedTotal += amount * item.quantity;
              } else {
                this.logger.warn(
                  `Could not get price for product ${item.productId} in price list ${priceList.id}`,
                );
                projectedTotal = Infinity;
                break;
              }
            }

            // El ahorro es la diferencia entre el total por defecto y el total con esta lista
            if (projectedTotal !== Infinity && defaultTotal > 0) {
              potentialSavings = defaultTotal - projectedTotal;

              this.logger.debug(
                `Price list "${priceList.name}": Default total: ${defaultTotal}, Projected total: ${projectedTotal}, Savings: ${potentialSavings}`,
              );

              // OPTIMIZACIÓN 9: Actualizar mensajes solo si hay ahorro positivo
              if (potentialSavings > 0) {
                const savingsFormatted = formatSavings(potentialSavings);
                
                for (const conditionProgress of conditionProgresses) {
                  if (!conditionProgress.isMet) {
                    // Actualizar el mensaje según el tipo de condición
                    if (conditionProgress.conditionType === 'amount') {
                      conditionProgress.message = `Agrega $${conditionProgress.remaining.toFixed(0)} para obtener un descuento de $${savingsFormatted}`;
                    } else if (conditionProgress.conditionType === 'quantity') {
                      conditionProgress.message = `Agrega ${conditionProgress.remaining} producto${conditionProgress.remaining > 1 ? 's' : ''} más para obtener un descuento de $${savingsFormatted}`;
                    }
                  }
                }
              }
            }
          } catch (error) {
            this.logger.warn(
              `Could not calculate potential savings for price list "${priceList.name}": ${error.message}`,
            );
            // Si no se puede calcular, continuar sin el ahorro
          }
        }

        progressList.push({
          priceListId: priceList.id,
          priceListName: priceList.name,
          conditions: conditionProgresses,
          potentialSavings: potentialSavings > 0 ? potentialSavings : undefined,
          currentTotal: context.totalPrice,
          projectedTotal: projectedTotal > 0 && projectedTotal !== Infinity ? projectedTotal : undefined,
        });
      } else {
        this.logger.debug(
          `Skipping price list "${priceList.name}" (ID: ${priceList.id}) - all conditions already met`,
        );
      }
    }

    this.logger.log(
      `Found ${progressList.length} price lists with unfulfilled conditions to show progress`,
    );

    return progressList;
  }

  /**
   * Calcula el progreso de una condición específica
   */
  private calculateConditionProgress(
    condition: any,
    totalPrice: number,
    totalQuantity: number,
    cart: Cart,
  ): ConditionProgress {
    let isMet = false;
    let progress = 0;
    let currentValue = 0;
    let targetValue = 0;
    let remaining = 0;
    let unit = '';
    let message = '';

    switch (condition.conditionType) {
      case 'amount': {
        const minAmount = condition.conditionValue?.min_amount || 0;
        currentValue = totalPrice;
        targetValue = minAmount;
        remaining = Math.max(0, targetValue - currentValue);
        unit = 'amount';
        progress = Math.min(100, (currentValue / targetValue) * 100);
        isMet = this.evaluateAmountCondition(condition, totalPrice);

        if (isMet) {
          message = `¡Excelente! Ya cumples con el monto mínimo`;
        } else {
          // El mensaje se actualizará después con el ahorro potencial si está disponible
          message = `Agrega $${remaining.toFixed(0)} para obtener un descuento`;
        }
        break;
      }

      case 'quantity': {
        const minQuantity = condition.conditionValue?.min_quantity || 0;
        currentValue = totalQuantity;
        targetValue = minQuantity;
        remaining = Math.max(0, targetValue - currentValue);
        unit = 'quantity';
        progress = Math.min(100, (currentValue / targetValue) * 100);
        isMet = this.evaluateQuantityCondition(condition, totalQuantity);

        if (isMet) {
          message = `¡Excelente! Ya cumples con la cantidad mínima`;
        } else {
          // El mensaje se actualizará después con el ahorro potencial si está disponible
          message = `Agrega ${remaining} producto${remaining > 1 ? 's' : ''} más para obtener un descuento`;
        }
        break;
      }

      case 'date_range': {
        const now = new Date();
        const fromDate = condition.conditionValue?.from_date
          ? new Date(condition.conditionValue.from_date)
          : null;
        const toDate = condition.conditionValue?.to_date
          ? new Date(condition.conditionValue.to_date)
          : null;

        isMet = this.evaluateDateRangeCondition(condition);
        unit = 'days';

        if (isMet) {
          message = `¡Lista de precios disponible hasta ${toDate?.toLocaleDateString('es-ES')}!`;
          progress = 100;
          currentValue = 1;
          targetValue = 1;
        } else if (fromDate && now < fromDate) {
          const daysRemaining = Math.ceil(
            (fromDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          remaining = daysRemaining;
          message = `Esta lista de precios estará disponible en ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}`;
          progress = 0;
        } else {
          message = 'Esta lista de precios ya no está disponible';
          progress = 0;
        }
        break;
      }

      case 'customer_type': {
        isMet = this.evaluateCustomerTypeCondition(condition, cart);
        unit = 'customer_type';
        progress = isMet ? 100 : 0;
        currentValue = isMet ? 1 : 0;
        targetValue = 1;

        if (isMet) {
          message = `Tienes acceso a precios para clientes ${condition.conditionValue?.customer_type}`;
        } else {
          message = `Esta lista de precios es solo para clientes ${condition.conditionValue?.customer_type}`;
        }
        break;
      }

      default:
        message = 'Condición no reconocida';
        this.logger.warn(
          `Unknown condition type: ${condition.conditionType} for condition ID ${condition.id}`,
        );
    }

    return {
      conditionId: condition.id,
      conditionType: condition.conditionType,
      isMet,
      progress,
      currentValue,
      targetValue,
      remaining,
      unit,
      message,
    };
  }

  /**
   * Obtiene el min_amount de una lista de precios basado en sus condiciones de tipo "amount"
   * Retorna Infinity si no tiene condiciones de tipo "amount"
   */
  private getMinAmountFromPriceList(priceList: any): number {
    if (!priceList.conditions || priceList.conditions.length === 0) {
      return Infinity;
    }

    const amountConditions = priceList.conditions.filter(
      (c: any) => c.status === 'active' && c.conditionType === 'amount',
    );

    if (amountConditions.length === 0) {
      return Infinity;
    }

    // Obtener el menor min_amount de todas las condiciones de tipo amount
    const minAmounts = amountConditions.map((condition: any) => {
      return condition.conditionValue?.min_amount || 0;
    });

    return Math.min(...minAmounts);
  }

  /**
   * Encuentra la lista de precios aplicable basada en prioridad de condiciones
   * Las listas con condiciones de tipo "amount" se ordenan por min_amount (menor a mayor)
   * y se evalúan en ese orden. Si no cumple la primera, no se evalúa la segunda.
   */
  async findApplicablePriceListByPriority(
    context: PriceListEvaluationContext,
    organizationId: string,
  ): Promise<any> {
    const priceLists = await this.priceListsService.getPriceLists(
      organizationId,
      { status: 'active' },
    );

    const defaultPriceList = priceLists.priceLists.find(
      (priceList) => priceList.isDefault,
    );

    if (!defaultPriceList) {
      throw new NotFoundException('Default price list not found');
    }

    // Filtrar listas de precios que tienen condiciones de tipo "amount"
    const priceListsWithAmountConditions = priceLists.priceLists
      .filter((pl) => !pl.isDefault && pl.status === 'active')
      .filter((pl) => {
        if (!pl.conditions || pl.conditions.length === 0) {
          return false;
        }
        return pl.conditions.some(
          (c: any) => c.status === 'active' && c.conditionType === 'amount',
        );
      });

    // Ordenar por min_amount de menor a mayor
    priceListsWithAmountConditions.sort((a, b) => {
      const minAmountA = this.getMinAmountFromPriceList(a);
      const minAmountB = this.getMinAmountFromPriceList(b);
      return minAmountA - minAmountB;
    });

    this.logger.debug(
      `Found ${priceListsWithAmountConditions.length} price lists with amount conditions, sorted by min_amount`,
    );

    // Evaluar cada lista en orden de prioridad (menor a mayor min_amount)
    for (const priceList of priceListsWithAmountConditions) {
      const activeConditions = priceList.conditions.filter(
        (c: any) => c.status === 'active',
      );

      if (activeConditions.length === 0) {
        continue;
      }

      // Verificar si TODAS las condiciones activas se cumplen
      const allConditionsMet = activeConditions.every((condition: any) =>
        this.evaluateCondition(
          condition,
          context.totalPrice,
          context.totalQuantity,
          context.cart,
        ),
      );

      if (allConditionsMet) {
        this.logger.log(
          `Price list "${priceList.name}" (ID: ${priceList.id}) meets all conditions and will be applied`,
        );
        return priceList;
      } else {
        // Si no cumple esta lista, no evaluar las siguientes (ya están ordenadas por min_amount)
        this.logger.debug(
          `Price list "${priceList.name}" (ID: ${priceList.id}) does not meet conditions, stopping evaluation`,
        );
        break;
      }
    }

    // Si ninguna lista cumple las condiciones, retornar la lista por defecto
    this.logger.log('No price list meets conditions, using default price list');
    return defaultPriceList;
  }

  /**
   * Encuentra TODAS las listas de precios aplicables según las condiciones
   * Retorna lista por defecto + todas las que cumplan sus condiciones
   * @deprecated Use findApplicablePriceListByPriority for priority-based selection
   */
  async findAllApplicablePriceLists(
    context: PriceListEvaluationContext,
    organizationId: string,
  ): Promise<any[]> {
    const priceLists = await this.priceListsService.getPriceLists(
      organizationId,
      { status: 'active' },
    );

    const defaultPriceList = priceLists.priceLists.find(
      (priceList) => priceList.isDefault,
    );

    if (!defaultPriceList) {
      throw new NotFoundException('Default price list not found');
    }

    const applicableLists: any[] = [defaultPriceList]; // Siempre incluir la lista por defecto

    // Evaluar cada lista de precios (excepto la por defecto)
    for (const priceList of priceLists.priceLists) {
      if (
        priceList.isDefault ||
        !priceList.conditions ||
        priceList.conditions.length === 0
      ) {
        continue;
      }

      const activeConditions = priceList.conditions.filter(
        (c) => c.status === 'active',
      );

      if (activeConditions.length === 0) {
        continue;
      }

      // Verificar si TODAS las condiciones activas se cumplen
      const allConditionsMet = activeConditions.every((condition) =>
        this.evaluateCondition(
          condition,
          context.totalPrice,
          context.totalQuantity,
          context.cart,
        ),
      );

      if (allConditionsMet) {
        applicableLists.push(priceList);
        this.logger.log(
          `Price list "${priceList.name}" (ID: ${priceList.id}) meets all conditions`,
        );
      }
    }

    return applicableLists;
  }

  /**
   * Encuentra la lista de precios aplicable según las condiciones
   * @deprecated Use findAllApplicablePriceLists for better price selection
   * This method now returns the first applicable price list found
   */
  async findApplicablePriceList(
    context: PriceListEvaluationContext,
    organizationId: string,
  ): Promise<any> {
    const priceLists = await this.priceListsService.getPriceLists(
      organizationId,
      { status: 'active' },
    );

    const defaultPriceList = priceLists.priceLists.find(
      (priceList) => priceList.isDefault,
    );

    if (!defaultPriceList) {
      throw new NotFoundException('Default price list not found');
    }

    // Evaluar cada lista de precios (sin prioridad, simplemente en orden)
    const sortedPriceLists = [...priceLists.priceLists].filter(
      (pl) => !pl.isDefault && pl.status === 'active',
    );

    // Evaluar cada lista de precios
    for (const priceList of sortedPriceLists) {
      if (!priceList.conditions || priceList.conditions.length === 0) {
        continue;
      }

      const activeConditions = priceList.conditions.filter(
        (c) => c.status === 'active',
      );

      if (activeConditions.length === 0) {
        continue;
      }

      const allConditionsMet = activeConditions.every((condition) =>
        this.evaluateCondition(
          condition,
          context.totalPrice,
          context.totalQuantity,
          context.cart,
        ),
      );

      if (allConditionsMet) {
        this.logger.log(
          `Price list "${priceList.name}" (ID: ${priceList.id}) applies to cart ${context.cart.id}`,
        );
        return priceList;
      }
    }

    // Si ninguna lista cumple, retornar la lista por defecto
    return defaultPriceList;
  }

  /**
   * Obtiene el precio de un producto según la lista de precios aplicable
   */
  async getProductPrice(
    productId: number,
    priceListId: number,
    organizationId: string,
  ): Promise<{ amount: string; priceListId: number }> {
    const product = await this.productsService.getProductById(
      productId,
      organizationId,
    );

    const productPrice = product.prices.find(
      (price) => price.price_list_id === priceListId,
    );

    if (!productPrice) {
      throw new NotFoundException(
        `Price not found for product ${productId} in price list ${priceListId}`,
      );
    }

    return {
      amount: productPrice.amount,
      priceListId: priceListId,
    };
  }

  /**
   * Calcula la información de lista de precios aplicada y ahorro para un carrito existente
   * Sin modificar los items del carrito
   */
  async calculateCartSavingsInfo(
    items: Array<{ productId: number; quantity: number }>,
    cart: Cart,
    organizationId: string,
  ): Promise<{
    appliedPriceList?: { id: number; name: string; isDefault: boolean };
    savings?: number;
    defaultPriceListTotal?: number;
  }> {
    if (!items || items.length === 0) {
      return {};
    }

    try {
      // Obtener la lista de precios por defecto
      const priceLists = await this.priceListsService.getPriceLists(
        organizationId,
        { status: 'active' },
      );

      const defaultPriceList = priceLists.priceLists.find(
        (priceList) => priceList.isDefault,
      );

      if (!defaultPriceList) {
        this.logger.warn('Default price list not found');
        return {};
      }

      // Calcular total con lista de precios por defecto
      let defaultTotal = 0;
      for (const item of items) {
        try {
          const { amount } = await this.getProductPrice(
            item.productId,
            defaultPriceList.id,
            organizationId,
          );
          defaultTotal += Number(amount) * item.quantity;
        } catch (error) {
          this.logger.warn(
            `Could not get default price for product ${item.productId}: ${error.message}`,
          );
          return {};
        }
      }

      // Calcular totales para evaluación
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // Encontrar la lista de precios aplicable basada en prioridad
      const bestPriceList = await this.findApplicablePriceListByPriority(
        {
          totalPrice: defaultTotal,
          totalQuantity,
          cart,
        },
        organizationId,
      );

      // Calcular el precio total con la lista seleccionada
      let lowestTotalPrice = defaultTotal;
      if (bestPriceList.id !== defaultPriceList.id) {
        let currentTotal = 0;
        // Pre-calcular precios por defecto para cada item
        const defaultPrices = new Map<number, string>();
        for (const item of items) {
          try {
            const { amount } = await this.getProductPrice(
              item.productId,
              defaultPriceList.id,
              organizationId,
            );
            defaultPrices.set(item.productId, amount);
          } catch (error) {
            this.logger.warn(
              `Could not get default price for product ${item.productId}: ${error.message}`,
            );
          }
        }

        // Calcular total con la lista aplicada, usando precios por defecto como fallback
        for (const item of items) {
          try {
            // Intentar obtener el precio de la lista aplicada
            const { amount } = await this.getProductPrice(
              item.productId,
              bestPriceList.id,
              organizationId,
            );
            currentTotal += Number(amount) * item.quantity;
          } catch (error) {
            // Si no hay precio en esta lista, usar el precio de la lista por defecto
            this.logger.warn(
              `No price found for product ${item.productId} in price list ${bestPriceList.id}, using default price`,
            );
            const defaultPrice = defaultPrices.get(item.productId);
            if (defaultPrice) {
              currentTotal += Number(defaultPrice) * item.quantity;
            } else {
              this.logger.error(
                `Could not get price for product ${item.productId} in any price list`,
              );
              // Si no hay precio en ninguna lista, usar 0 (no debería pasar)
              currentTotal += 0;
            }
          }
        }
        lowestTotalPrice = currentTotal;
      }

      // Si la lista aplicada es diferente a la por defecto, calcular ahorro
      if (bestPriceList.id !== defaultPriceList.id) {
        const savings = defaultTotal - lowestTotalPrice;

        return {
          appliedPriceList: {
            id: bestPriceList.id,
            name: bestPriceList.name,
            isDefault: bestPriceList.isDefault,
          },
          savings: savings > 0 ? savings : 0,
          defaultPriceListTotal: defaultTotal,
        };
      }

      return {};
    } catch (error) {
      this.logger.warn(`Error calculating savings info: ${error.message}`);
      return {};
    }
  }

  /**
   * Evalúa si una condición de lista de precios se cumple
   */
  private evaluateCondition(
    condition: any,
    totalPrice: number,
    totalQuantity: number,
    cart: Cart,
  ): boolean {
    const now = new Date();

    // Verificar validez temporal de la condición
    if (condition.validFrom) {
      const validFrom = new Date(condition.validFrom);
      if (now < validFrom) {
        return false;
      }
    }

    if (condition.validTo) {
      const validTo = new Date(condition.validTo);
      if (now > validTo) {
        return false;
      }
    }

    // Evaluar según el tipo de condición
    switch (condition.conditionType) {
      case 'amount':
        return this.evaluateAmountCondition(condition, totalPrice);

      case 'quantity':
        return this.evaluateQuantityCondition(condition, totalQuantity);

      case 'date_range':
        return this.evaluateDateRangeCondition(condition);

      case 'customer_type':
        return this.evaluateCustomerTypeCondition(condition, cart);

      default:
        this.logger.warn(`Unknown condition type: ${condition.conditionType}`);
        return false;
    }
  }

  /**
   * Evalúa condición de monto
   */
  private evaluateAmountCondition(condition: any, totalPrice: number): boolean {
    const minAmount = condition.conditionValue?.min_amount || 0;
    const maxAmount = condition.conditionValue?.max_amount;

    switch (condition.operator) {
      case 'greater_than':
        return totalPrice > minAmount;

      case 'greater_or_equal':
        return totalPrice >= minAmount;

      case 'less_than':
        return totalPrice < minAmount;

      case 'less_or_equal':
        return totalPrice <= minAmount;

      case 'equals':
        return totalPrice === minAmount;

      case 'between':
        return totalPrice >= minAmount && totalPrice <= (maxAmount || Infinity);

      default:
        this.logger.warn(
          `Unknown operator for amount condition: ${condition.operator}`,
        );
        return false;
    }
  }

  /**
   * Evalúa condición de cantidad
   */
  private evaluateQuantityCondition(
    condition: any,
    totalQuantity: number,
  ): boolean {
    const minQuantity = condition.conditionValue?.min_quantity || 0;
    const maxQuantity = condition.conditionValue?.max_quantity;

    switch (condition.operator) {
      case 'greater_than':
        return totalQuantity > minQuantity;

      case 'greater_or_equal':
        return totalQuantity >= minQuantity;

      case 'less_than':
        return totalQuantity < minQuantity;

      case 'less_or_equal':
        return totalQuantity <= minQuantity;

      case 'equals':
        return totalQuantity === minQuantity;

      case 'between':
        return (
          totalQuantity >= minQuantity &&
          totalQuantity <= (maxQuantity || Infinity)
        );

      default:
        this.logger.warn(
          `Unknown operator for quantity condition: ${condition.operator}`,
        );
        return false;
    }
  }

  /**
   * Evalúa condición de rango de fechas
   */
  private evaluateDateRangeCondition(condition: any): boolean {
    const now = new Date();
    const fromDate = condition.conditionValue?.from_date
      ? new Date(condition.conditionValue.from_date)
      : null;
    const toDate = condition.conditionValue?.to_date
      ? new Date(condition.conditionValue.to_date)
      : null;

    switch (condition.operator) {
      case 'between':
        if (!fromDate || !toDate) {
          return false;
        }
        return now >= fromDate && now <= toDate;

      case 'after':
        if (!fromDate) {
          return false;
        }
        return now > fromDate;

      case 'before':
        if (!toDate) {
          return false;
        }
        return now < toDate;

      default:
        this.logger.warn(
          `Unknown operator for date_range condition: ${condition.operator}`,
        );
        return false;
    }
  }

  /**
   * Evalúa condición de tipo de cliente
   * TODO: Implementar lógica basada en información del cliente
   */
  private evaluateCustomerTypeCondition(condition: any, cart: Cart): boolean {
    const requiredCustomerType = condition.conditionValue?.customer_type;

    if (!requiredCustomerType) {
      return false;
    }

    // TODO: Agregar campo customer_type al schema de Cart
    // Por ahora, se puede inferir del documentType o agregar un campo específico
    // Ejemplo: si documentType es 'RUT', puede ser B2B; si es 'RUN', puede ser B2C

    // Placeholder: siempre retorna false hasta que se implemente la lógica de customer_type
    this.logger.warn(
      'Customer type condition not fully implemented. Add customer_type field to Cart schema.',
    );
    return false;
  }
}
