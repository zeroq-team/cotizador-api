import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ProductRepository } from './repositories/product.repository';
import { ProductMediaRepository } from './repositories/product-media.repository';
import { ProductRelationRepository } from './repositories/product-relation.repository';
import {
  Product,
  ProductMedia as ProductMediaType,
  ProductWithPricesAndMedia,
  ProductPrice,
  ProductInventory,
} from './products.types';
import {
  products as productsSchema,
  productPrices,
  inventoryLevels,
  inventoryLocations,
} from '../database/schemas';
import { DatabaseService } from '../database/database.service';
import { eq, and, inArray, sql, or, isNull, gte, lte } from 'drizzle-orm';
import { InventoryService } from '../inventory/inventory.service';
import { PriceListsService } from '../price-lists/price-lists.service';
import { ProductPriceRepository } from '../price-lists/repositories/product-price.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productMediaRepository: ProductMediaRepository,
    private readonly productRelationRepository: ProductRelationRepository,
    private readonly databaseService: DatabaseService,
    private readonly inventoryService: InventoryService,
    @Inject(forwardRef(() => PriceListsService))
    private readonly priceListService: PriceListsService,
    private readonly productPriceRepository: ProductPriceRepository,
  ) {}

  /**
   * Convierte media de la BD al formato ProductMedia esperado
   */
  private mapToProductMediaType(
    dbMedia: Array<{
      id: number;
      type: string;
      url: string;
      position: number;
      altText: string | null;
      title: string | null;
      description: string | null;
      fileSize: number | null;
      mimeType: string | null;
      isPrimary: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): ProductMediaType[] {
    return dbMedia.map((m) => ({
      id: m.id,
      type: m.type,
      url: m.url,
      position: m.position,
      alt_text: m.altText || null,
      title: m.title || null,
      description: m.description || null,
      file_size: m.fileSize || null,
      mime_type: m.mimeType || null,
      is_primary: m.isPrimary,
      created_at: m.createdAt.toISOString(),
      updated_at: m.updatedAt.toISOString(),
    }));
  }

  /**
   * Convierte un producto de la BD al formato Product esperado
   */
  private mapToProductType(
    dbProduct: typeof productsSchema.$inferSelect,
    includeMedia: boolean = false,
    media?: ProductMediaType[],
    inventory?: ProductInventory[],
    prices?: ProductPrice[],
  ): Product {
    return {
      id: dbProduct.id,
      organizationId: dbProduct.organizationId,
      sku: dbProduct.sku,
      externalSku: dbProduct.externalSku || null,
      externalName: dbProduct.externalName || null,
      name: dbProduct.name,
      description: dbProduct.description || null,
      productType: dbProduct.productType,
      status: dbProduct.status,
      unitOfMeasure: dbProduct.unitOfMeasure || null,
      brand: dbProduct.brand || null,
      model: dbProduct.model || null,
      taxClassId: dbProduct.taxClassId || null,
      weight: dbProduct.weight || null,
      height: dbProduct.height || null,
      width: dbProduct.width || null,
      length: dbProduct.length || null,
      metadata: dbProduct.metadata || null,
      prices: prices || [], // Se poblará si se necesita
      media: includeMedia && media ? media : [],
      inventory: inventory || [], // Se poblará si se necesita
    };
  }

  /**
   * Obtiene un producto por ID
   */
  async getProductById(
    id: number,
    organizationId: string,
    params?: any,
  ): Promise<ProductWithPricesAndMedia> {
    const orgId = parseInt(organizationId, 10);
    const product = await this.productRepository.findById(id, orgId);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Obtiene productos relacionados para un producto específico
   */
  async getRelatedProducts(
    productId: number,
    organizationId: string,
    relationType?: string,
    limit: number = 10,
  ): Promise<Product[]> {
    const orgId = parseInt(organizationId, 10);

    // Verificar que el producto existe
    const product = await this.productRepository.findById(productId, orgId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Validar y convertir relationType
    const validRelationTypes = [
      'related',
      'upsell',
      'crosssell',
      'bundle_item',
      'substitute',
      'complement',
    ] as const;
    const typedRelationType =
      relationType && validRelationTypes.includes(relationType as any)
        ? (relationType as (typeof validRelationTypes)[number])
        : undefined;

    // Obtener relaciones
    const relations = await this.productRelationRepository.findRelatedProducts(
      productId,
      orgId,
      typedRelationType,
      limit,
    );

    if (relations.length === 0) {
      return [];
    }

    // Obtener IDs de productos relacionados
    const relatedProductIds = relations.map((r) => r.relatedProduct.id);

    // Obtener todos los precios de los productos relacionados en una sola query
    const allPrices = await this.databaseService.db
      .select()
      .from(productPrices)
      .where(
        and(
          eq(productPrices.organizationId, orgId),
          inArray(productPrices.productId, relatedProductIds),
        ),
      );

    // Agrupar precios por productId
    const pricesByProductId = new Map<
      number,
      (typeof productPrices.$inferSelect)[]
    >();
    allPrices.forEach((price) => {
      if (!pricesByProductId.has(price.productId)) {
        pricesByProductId.set(price.productId, []);
      }
      pricesByProductId.get(price.productId)!.push(price);
    });

    // Obtener todos los media de los productos relacionados
    const allMedia = await this.productMediaRepository.findByProductIds(
      relatedProductIds,
      orgId,
    );

    // Agrupar media por productId
    const mediaByProductId = new Map<number, typeof allMedia>();
    allMedia.forEach((m) => {
      if (!mediaByProductId.has(m.productId)) {
        mediaByProductId.set(m.productId, []);
      }
      mediaByProductId.get(m.productId)!.push(m);
    });

    // Obtener inventario de todos los productos relacionados usando el servicio
    const allInventory =
      await this.inventoryService.getInventoryWithLocationsByProductIds(
        relatedProductIds,
        orgId,
      );

    // Agrupar inventario por productId
    const inventoryByProductId = new Map<number, typeof allInventory>();
    allInventory.forEach((inv) => {
      if (!inventoryByProductId.has(inv.productId)) {
        inventoryByProductId.set(inv.productId, []);
      }
      inventoryByProductId.get(inv.productId)!.push(inv);
    });

    // Mapear a formato Product con precios, media e inventario
    return relations.map((relation) => {
      const relatedProduct = relation.relatedProduct;
      const productPrices = pricesByProductId.get(relatedProduct.id) || [];
      const productMedia = mediaByProductId.get(relatedProduct.id) || [];
      const productInventory =
        inventoryByProductId.get(relatedProduct.id) || [];

      // Mapear precios al formato esperado
      const mappedPrices: ProductPrice[] = productPrices.map((price) => ({
        id: price.id,
        price_list_id: price.priceListId,
        currency: price.currency,
        amount: price.amount,
        tax_included: price.taxIncluded,
        valid_from: price.validFrom?.toISOString() || null,
        valid_to: price.validTo?.toISOString() || null,
        created_at: price.createdAt.toISOString(),
        price_list_name: '', // TODO: obtener nombre de la lista de precios si es necesario
        price_list_is_default: false, // TODO: obtener si es default si es necesario
      }));

      // Mapear media al formato esperado
      const mappedMedia: ProductMediaType[] =
        this.mapToProductMediaType(productMedia);

      // Mapear inventario al formato esperado
      const mappedInventory: ProductInventory[] = productInventory.map(
        (inv) => {
          const onHand = Number(inv.onHand);
          const reserved = Number(inv.reserved);
          const available = onHand - reserved;

          return {
            id: inv.id,
            product_id: inv.productId,
            location_id: inv.locationId,
            on_hand: inv.onHand,
            reserved: inv.reserved,
            updated_at:
              inv.updatedAt?.toISOString() || new Date().toISOString(),
            location_code: '',
            location_name: '',
            location_type: '',
            available: available,
          };
        },
      );

      return {
        ...this.mapToProductType(relatedProduct, true, mappedMedia),
        prices: mappedPrices,
        inventory: mappedInventory,
      };
    });
  }

  /**
   * Obtiene productos con filtros y paginación
   */
  async getProducts(
    organizationId: string,
    params?: any,
  ): Promise<{
    data: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const orgId = parseInt(organizationId, 10);

    // Configurar paginación
    const page = params?.page ? Math.max(1, parseInt(params.page, 10)) : 1;
    const limit = params?.limit
      ? Math.max(1, Math.min(parseInt(params.limit, 10), 100))
      : 20;
    const offset = (page - 1) * limit;

    const filters: any = {};

    if (params?.ids) {
      const ids = Array.isArray(params.ids)
        ? params.ids.map((id: string) => parseInt(id, 10))
        : params.ids.split(',').map((id: string) => parseInt(id.trim(), 10));
      filters.ids = ids;
    }

    if (params?.status) {
      filters.status = params.status;
    }

    if (params?.productType) {
      filters.productType = params.productType;
    }

    if (params?.search) {
      filters.search = params.search;
    }

    if (params?.brand) {
      filters.brand = params.brand;
    }

    // Obtener total de productos (sin paginación)
    const total = await this.productRepository.count(orgId, filters);

    // Aplicar paginación para la consulta
    filters.limit = limit;
    filters.offset = offset;

    // Obtener productos paginados
    const dbProducts = await this.productRepository.findMany(orgId, filters);

    // Verificar si se solicitan media
    const includeMedia = params?.include?.includes('media');
    let mediaMap: Map<number, ProductMediaType[]> = new Map();

    const productIds = dbProducts.map((p) => p.id);
    if (includeMedia && dbProducts.length > 0) {
      const allMedia = await this.productMediaRepository.findByProductIds(
        productIds,
        orgId,
      );

      // Agrupar media por productId
      allMedia.forEach((m) => {
        const mediaArray = mediaMap.get(m.productId) || [];
        mediaArray.push({
          id: m.id,
          type: m.type,
          url: m.url,
          position: m.position,
          alt_text: m.altText || null,
          title: m.title || null,
          description: m.description || null,
          file_size: m.fileSize || null,
          mime_type: m.mimeType || null,
          is_primary: m.isPrimary,
          created_at: m.createdAt.toISOString(),
          updated_at: m.updatedAt.toISOString(),
        });
        mediaMap.set(m.productId, mediaArray);
      });
    }

    // verificar si pide inventario
    const inventoryMap: Map<number, any[]> = new Map();
    const includeInventory = params?.include?.includes('inventory');
    if (includeInventory) {
      const allInventory = await this.inventoryService.getInventoryByProductIds(
        productIds,
        orgId,
      );

      allInventory.forEach((inv) => {
        const inventoryArray = inventoryMap.get(inv.productId) || [];
        inventoryArray.push(inv);
        inventoryMap.set(inv.productId, inventoryArray);
      });
    }

    // verificar si pide precios
    const priceMap: Map<number, ProductPrice[]> = new Map();
    const includePrices = params?.include?.includes('prices');
    if (includePrices && productIds.length > 0) {
      // Obtener precios usando el servicio de listas de precios
      const allPrices =
        await this.priceListService.getProductPricesByProductIds(
          productIds,
          organizationId,
        );

      // Necesitamos obtener el productId de cada precio
      // El método del servicio retorna precios pero necesitamos mapearlos por productId
      // Por eso obtenemos los precios del repositorio que incluye productId
      const pricesWithProductId =
        await this.productPriceRepository.findByProductIds(productIds, orgId);

      // Crear un mapa de precios del servicio por price_list_id para obtener info adicional
      const servicePriceMap = new Map(
        allPrices.map((p) => [p.price_list_id, p]),
      );

      // Agrupar precios por productId
      pricesWithProductId.forEach((price) => {
        const priceArray = priceMap.get(price.productId) || [];
        const servicePrice = servicePriceMap.get(price.priceListId);

        priceArray.push({
          id: price.id,
          price_list_id: price.priceListId,
          currency: price.currency,
          amount: price.amount,
          tax_included: price.taxIncluded,
          valid_from: price.validFrom?.toISOString() || null,
          valid_to: price.validTo?.toISOString() || null,
          created_at: price.createdAt.toISOString(),
          price_list_name: servicePrice?.price_list_name || '',
          price_list_is_default: servicePrice?.price_list_is_default || false,
        });
        priceMap.set(price.productId, priceArray);
      });
    }

    const products = dbProducts.map((p) => {
      const media = mediaMap.get(p.id) || [];
      const inventory = inventoryMap.get(p.id) || [];
      const prices = priceMap.get(p.id) || [];

      const product = this.mapToProductType(p, includeMedia, media, inventory);
      if (includePrices) {
        product.prices = prices;
      }

      return product;
    });

    // Calcular total de páginas
    const totalPages = Math.ceil(total / limit);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Obtiene productos por IDs
   */
  async getProductsByIds(
    ids: number[],
    organizationId: string,
  ): Promise<Product[]> {
    const orgId = parseInt(organizationId, 10);
    const dbProducts = await this.productRepository.findByIds(ids, orgId);

    // Obtener media para todos los productos
    let mediaMap: Map<number, ProductMediaType[]> = new Map();
    if (dbProducts.length > 0) {
      const allMedia = await this.productMediaRepository.findByProductIds(
        ids,
        orgId,
      );

      // Agrupar media por productId
      allMedia.forEach((m) => {
        const mediaArray = mediaMap.get(m.productId) || [];
        mediaArray.push({
          id: m.id,
          type: m.type,
          url: m.url,
          position: m.position,
          alt_text: m.altText || null,
          title: m.title || null,
          description: m.description || null,
          file_size: m.fileSize || null,
          mime_type: m.mimeType || null,
          is_primary: m.isPrimary,
          created_at: m.createdAt.toISOString(),
          updated_at: m.updatedAt.toISOString(),
        });
        mediaMap.set(m.productId, mediaArray);
      });
    }

    return dbProducts.map((p) => {
      const media = mediaMap.get(p.id) || [];
      return this.mapToProductType(p, true, media);
    });
  }

  /**
   * Convierte valores vacíos a null (para campos numéricos)
   */
  private toNullIfEmpty<T>(value: T | null | undefined | ''): T | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return value;
  }

  /**
   * Convierte valores vacíos a null para números (asegura tipo correcto)
   */
  private toNullableNumber(value: any): number | null {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      isNaN(Number(value))
    ) {
      return null;
    }
    return Number(value);
  }

  /**
   * POST request - Crear producto
   */
  async post<T = any>(
    url: string,
    data?: any,
    organizationId?: string,
  ): Promise<T> {
    if (url === '/products' || url === 'products') {
      const orgId = parseInt(organizationId || '0', 10);
      const newProduct = await this.productRepository.create({
        organizationId: orgId,
        sku: data.sku,
        externalSku: this.toNullIfEmpty(data.externalSku),
        externalName: this.toNullIfEmpty(data.externalName),
        name: data.name,
        description: this.toNullIfEmpty(data.description),
        productType: data.productType || 'simple',
        status: data.status || 'active',
        unitOfMeasure: this.toNullIfEmpty(data.unitOfMeasure),
        brand: this.toNullIfEmpty(data.brand),
        model: this.toNullIfEmpty(data.model),
        taxClassId: this.toNullableNumber(data.taxClassId),
        weight: this.toNullIfEmpty(data.weight),
        height: this.toNullIfEmpty(data.height),
        width: this.toNullIfEmpty(data.width),
        length: this.toNullIfEmpty(data.length),
        metadata: data.metadata || null,
      });
      return this.mapToProductType(newProduct) as T;
    }

    throw new Error(`Unsupported POST URL: ${url}`);
  }

  /**
   * PUT request - Actualizar producto
   */
  async put<T = any>(
    url: string,
    data?: any,
    organizationId?: string,
  ): Promise<T> {
    const match = url.match(/\/products\/(\d+)/);
    if (match) {
      const id = parseInt(match[1], 10);
      const orgId = parseInt(organizationId || '0', 10);

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.sku !== undefined) updateData.sku = data.sku;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.productType !== undefined)
        updateData.productType = data.productType;
      if (data.brand !== undefined) updateData.brand = data.brand;
      if (data.model !== undefined) updateData.model = data.model;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;

      const updated = await this.productRepository.update(
        id,
        orgId,
        updateData,
      );
      if (!updated) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      return this.mapToProductType(updated) as T;
    }

    throw new Error(`Unsupported PUT URL: ${url}`);
  }

  /**
   * DELETE request - Eliminar producto
   */
  async delete<T = any>(url: string, organizationId?: string): Promise<T> {
    const match = url.match(/\/products\/(\d+)/);
    if (match) {
      const id = parseInt(match[1], 10);
      const orgId = parseInt(organizationId || '0', 10);

      const deleted = await this.productRepository.delete(id, orgId);
      if (!deleted) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      return {} as T;
    }

    throw new Error(`Unsupported DELETE URL: ${url}`);
  }

  /**
   * Obtiene productos aleatorios con stock y precios
   */
  async getRandomProducts(
    organizationId: string,
    limit: number = 10,
  ): Promise<Product[]> {
    const orgId = parseInt(organizationId, 10);

    // Obtener productos aleatorios usando SQL RANDOM()
    const dbProducts = await this.databaseService.db
      .select()
      .from(productsSchema)
      .where(eq(productsSchema.organizationId, orgId))
      .orderBy(sql`RANDOM()`)
      .limit(limit);

    if (dbProducts.length === 0) {
      return [];
    }

    const productIds = dbProducts.map((p) => p.id);

    // Obtener todos los precios de los productos en una sola query
    const allPrices = await this.databaseService.db
      .select()
      .from(productPrices)
      .where(
        and(
          eq(productPrices.organizationId, orgId),
          inArray(productPrices.productId, productIds),
        ),
      );

    // Agrupar precios por productId
    const pricesByProductId = new Map<
      number,
      (typeof productPrices.$inferSelect)[]
    >();
    allPrices.forEach((price) => {
      if (!pricesByProductId.has(price.productId)) {
        pricesByProductId.set(price.productId, []);
      }
      pricesByProductId.get(price.productId)!.push(price);
    });

    // Obtener todos los media de los productos
    const allMedia = await this.productMediaRepository.findByProductIds(
      productIds,
      orgId,
    );

    // Agrupar media por productId
    const mediaByProductId = new Map<number, typeof allMedia>();
    allMedia.forEach((m) => {
      if (!mediaByProductId.has(m.productId)) {
        mediaByProductId.set(m.productId, []);
      }
      mediaByProductId.get(m.productId)!.push(m);
    });

    // Obtener inventario de todos los productos
    const allInventory = await this.databaseService.db
      .select({
        id: inventoryLevels.id,
        productId: inventoryLevels.productId,
        locationId: inventoryLevels.locationId,
        onHand: inventoryLevels.onHand,
        reserved: inventoryLevels.reserved,
        updatedAt: inventoryLevels.updatedAt,
        location: inventoryLocations,
      })
      .from(inventoryLevels)
      .innerJoin(
        inventoryLocations,
        eq(inventoryLevels.locationId, inventoryLocations.id),
      )
      .where(
        and(
          eq(inventoryLevels.organizationId, orgId),
          inArray(inventoryLevels.productId, productIds),
        ),
      )
      .orderBy(inventoryLevels.productId, inventoryLevels.updatedAt);

    // Agrupar inventario por productId
    const inventoryByProductId = new Map<number, typeof allInventory>();
    allInventory.forEach((inv) => {
      if (!inventoryByProductId.has(inv.productId)) {
        inventoryByProductId.set(inv.productId, []);
      }
      inventoryByProductId.get(inv.productId)!.push(inv);
    });

    // Mapear a formato Product con precios, media e inventario
    return dbProducts.map((product) => {
      const productPrices = pricesByProductId.get(product.id) || [];
      const productMedia = mediaByProductId.get(product.id) || [];
      const productInventory = inventoryByProductId.get(product.id) || [];

      // Mapear precios al formato esperado
      const mappedPrices: ProductPrice[] = productPrices.map((price) => ({
        id: price.id,
        price_list_id: price.priceListId,
        currency: price.currency,
        amount: price.amount,
        tax_included: price.taxIncluded,
        valid_from: price.validFrom?.toISOString() || null,
        valid_to: price.validTo?.toISOString() || null,
        created_at: price.createdAt.toISOString(),
        price_list_name: '', // TODO: obtener nombre de la lista de precios si es necesario
        price_list_is_default: false, // TODO: obtener si es default si es necesario
      }));

      // Mapear media al formato esperado
      const mappedMedia: ProductMediaType[] =
        this.mapToProductMediaType(productMedia);

      // Mapear inventario al formato esperado
      const mappedInventory: ProductInventory[] = productInventory.map(
        (inv) => {
          const onHand = Number(inv.onHand);
          const reserved = Number(inv.reserved);
          const available = onHand - reserved;

          return {
            id: inv.id,
            product_id: inv.productId,
            location_id: inv.locationId,
            on_hand: inv.onHand,
            reserved: inv.reserved,
            updated_at:
              inv.updatedAt?.toISOString() || new Date().toISOString(),
            location_code: '',
            location_name: '',
            location_type: '',
            available: available,
          };
        },
      );
      console.log('mappedInventory', mappedInventory);

      return {
        ...this.mapToProductType(product, true, mappedMedia),
        prices: mappedPrices,
        inventory: mappedInventory,
      };
    });
  }

  // ============================================
  // MEDIA MANAGEMENT - Direct Database Methods
  // ============================================

  /**
   * Obtiene todos los medios de un producto
   */
  async getProductMedia(productId: number, organizationId: string) {
    const orgId = parseInt(organizationId, 10);

    // Verificar que el producto existe
    const product = await this.productRepository.findById(productId, orgId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const media = await this.productMediaRepository.findByProductId(
      productId,
      orgId,
    );
    return this.mapToProductMediaType(media);
  }

  /**
   * Agrega un nuevo medio a un producto
   */
  async addProductMedia(
    productId: number,
    organizationId: string,
    data: {
      url: string;
      type: string;
      alt_text?: string;
      is_primary?: boolean;
      sort_order?: number;
    },
  ) {
    const orgId = parseInt(organizationId, 10);

    // Verificar que el producto existe
    const product = await this.productRepository.findById(productId, orgId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const newMedia = await this.productMediaRepository.create({
      productId,
      organizationId: orgId,
      url: data.url,
      type: data.type,
      altText: data.alt_text || null,
      isPrimary: data.is_primary || false,
      position: data.sort_order || 0,
    });

    return {
      id: newMedia.id,
      type: newMedia.type,
      url: newMedia.url,
      position: newMedia.position,
      alt_text: newMedia.altText,
      is_primary: newMedia.isPrimary,
      created_at: newMedia.createdAt.toISOString(),
      updated_at: newMedia.updatedAt.toISOString(),
    };
  }

  /**
   * Actualiza un medio existente
   */
  async updateProductMedia(
    productId: number,
    mediaId: number,
    organizationId: string,
    data: {
      url?: string;
      type?: string;
      alt_text?: string;
      is_primary?: boolean;
      sort_order?: number;
    },
  ) {
    const orgId = parseInt(organizationId, 10);

    // Verificar que el producto existe
    const product = await this.productRepository.findById(productId, orgId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const updateData: any = {};
    if (data.url !== undefined) updateData.url = data.url;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.alt_text !== undefined) updateData.altText = data.alt_text;
    if (data.is_primary !== undefined) updateData.isPrimary = data.is_primary;
    if (data.sort_order !== undefined) updateData.position = data.sort_order;

    const updatedMedia = await this.productMediaRepository.update(
      mediaId,
      orgId,
      updateData,
    );

    if (!updatedMedia) {
      throw new NotFoundException(`Media with ID ${mediaId} not found`);
    }

    return {
      id: updatedMedia.id,
      type: updatedMedia.type,
      url: updatedMedia.url,
      position: updatedMedia.position,
      alt_text: updatedMedia.altText,
      is_primary: updatedMedia.isPrimary,
      created_at: updatedMedia.createdAt.toISOString(),
      updated_at: updatedMedia.updatedAt.toISOString(),
    };
  }

  /**
   * Elimina un medio
   */
  async deleteProductMedia(
    productId: number,
    mediaId: number,
    organizationId: string,
  ) {
    const orgId = parseInt(organizationId, 10);

    // Verificar que el producto existe
    const product = await this.productRepository.findById(productId, orgId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const deleted = await this.productMediaRepository.delete(mediaId, orgId);

    if (!deleted) {
      throw new NotFoundException(`Media with ID ${mediaId} not found`);
    }

    return { success: true };
  }

  // ============================================
  // PRODUCT PRICES METHODS
  // ============================================

  /**
   * Obtiene todos los precios de un producto
   */
  async getProductPrices(productId: number, organizationId: string) {
    const orgId = parseInt(organizationId, 10);

    // Verificar que el producto existe
    const product = await this.productRepository.findById(productId, orgId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Obtener todos los precios del producto
    const prices = await this.productPriceRepository.findAllByProductId(
      productId,
      orgId,
    );

    // Obtener información de las listas de precios
    const priceListIds = [...new Set(prices.map((p) => p.priceListId))];
    const priceLists = await Promise.all(
      priceListIds.map((id) =>
        this.priceListService.getPriceListById(id.toString(), organizationId),
      ),
    );

    const priceListMap = new Map(
      priceLists.map((pl) => [pl.id, pl]),
    );

    // Mapear al formato esperado
    return prices.map((price) => {
      const priceList = priceListMap.get(price.priceListId);

      return {
        id: price.id,
        product_id: price.productId,
        price_list_id: price.priceListId,
        price_list_name: priceList?.name || '',
        price_list_is_default: priceList?.isDefault || false,
        currency: price.currency,
        amount: price.amount,
        tax_included: price.taxIncluded,
        valid_from: price.validFrom?.toISOString() || null,
        valid_to: price.validTo?.toISOString() || null,
        created_at: price.createdAt.toISOString(),
        updated_at: price.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Crea o actualiza un precio de producto
   */
  async upsertProductPrice(
    productId: number,
    organizationId: string,
    data: {
      priceListId: number;
      amount: string;
      currency: string;
      taxIncluded: boolean;
      validFrom?: Date;
      validTo?: Date;
    },
  ) {
    const orgId = parseInt(organizationId, 10);

    // Verificar que el producto existe
    const product = await this.productRepository.findById(productId, orgId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Verificar que la lista de precios existe
    const priceList = await this.priceListService.getPriceListById(
      data.priceListId.toString(),
      organizationId,
    );
    if (!priceList) {
      throw new NotFoundException(
        `Price list with ID ${data.priceListId} not found`,
      );
    }

    // Crear o actualizar el precio
    const price = await this.productPriceRepository.upsert({
      organizationId: orgId,
      productId,
      priceListId: data.priceListId,
      currency: data.currency,
      amount: data.amount,
      taxIncluded: data.taxIncluded,
      validFrom: data.validFrom || null,
      validTo: data.validTo || null,
    });

    return {
      id: price.id,
      product_id: price.productId,
      price_list_id: price.priceListId,
      price_list_name: priceList.name,
      price_list_is_default: priceList.isDefault,
      currency: price.currency,
      amount: price.amount,
      tax_included: price.taxIncluded,
      valid_from: price.validFrom?.toISOString() || null,
      valid_to: price.validTo?.toISOString() || null,
      created_at: price.createdAt.toISOString(),
      updated_at: price.updatedAt.toISOString(),
    };
  }

  /**
   * Elimina un precio de producto
   */
  async deleteProductPrice(
    productId: number,
    priceListId: number,
    organizationId: string,
  ) {
    const orgId = parseInt(organizationId, 10);

    // Verificar que el producto existe
    const product = await this.productRepository.findById(productId, orgId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Verificar que existe el precio
    const price = await this.productPriceRepository.findByProductAndPriceList(
      productId,
      priceListId,
      orgId,
    );

    if (!price) {
      throw new NotFoundException(
        `Price not found for product ${productId} in price list ${priceListId}`,
      );
    }

    await this.productPriceRepository.delete(productId, priceListId, orgId);

    return { success: true };
  }
}
